import fetch from 'node-fetch'
import { logger } from '../utils/logger'
import { z } from 'zod'

// =============================================
// HARDENED OPEN ACCOUNTING CLIENT V2
// =============================================

interface OAConfig {
  baseUrl: string
  apiKey?: string
  acceptVersion: string
  timeout: number
  retries: number
  retryDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
}

interface OAResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
  duration: number
  retryCount: number
}

interface CircuitBreakerState {
  failures: number
  lastFailure: number
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

class HardenedOAClient {
  private config: OAConfig
  private circuitBreaker: Map<string, CircuitBreakerState> = new Map()

  constructor(config: Partial<OAConfig> = {}) {
    this.config = {
      baseUrl: process.env.OA_BASE_URL || 'http://localhost:8080',
      apiKey: process.env.OA_API_KEY || '',
      acceptVersion: process.env.OA_ACCEPT_VERSION || '1.4.0',
      timeout: 5000, // 5s timeout
      retries: 3,
      retryDelay: 1000, // 1s base delay
      circuitBreakerThreshold: 5, // Open after 5 failures
      circuitBreakerTimeout: 30000, // 30s timeout
      ...config
    }
  }

  /**
   * Make resilient request to OA server with circuit breaker
   */
  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: any
      headers?: Record<string, string>
      organizationId: string
      requestId?: string
      timeout?: number
    }
  ): Promise<OAResponse<T>> {
    const { method = 'GET', body, headers = {}, organizationId, requestId, timeout } = options
    const url = `${this.config.baseUrl}/organizations/${organizationId}${endpoint}`
    const circuitKey = `${method}:${endpoint}`
    
    // Check circuit breaker
    if (this.isCircuitOpen(circuitKey)) {
      logger.warn('Circuit breaker OPEN - rejecting request', {
        requestId,
        endpoint,
        method,
        organizationId
      })
      
      return {
        success: false,
        error: 'Service temporarily unavailable (circuit breaker open)',
        status: 503,
        duration: 0,
        retryCount: 0
      }
    }

    const startTime = Date.now()
    let retryCount = 0
    let lastError: any

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const requestHeaders = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Version': this.config.acceptVersion,
          'X-Request-ID': requestId || 'unknown',
          ...headers
        }

        // Add API key if configured
        if (this.config.apiKey) {
          requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`
        }

        // Add organization context
        requestHeaders['X-Organization-ID'] = organizationId

        logger.debug('OA API Request', {
          requestId,
          method,
          url,
          attempt: attempt + 1,
          headers: { ...requestHeaders, Authorization: '[REDACTED]' }
        })

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout || this.config.timeout)

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        const duration = Date.now() - startTime

        const responseText = await response.text()
        let responseData: any

        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        logger.debug('OA API Response', {
          requestId,
          method,
          url,
          status: response.status,
          duration: `${duration}ms`,
          attempt: attempt + 1
        })

        // Success - reset circuit breaker
        if (response.ok) {
          this.recordSuccess(circuitKey)
          
          return {
            success: true,
            data: responseData,
            status: response.status,
            duration,
            retryCount
          }
        }

        // Handle OA API errors
        const error = this.mapOAError(response.status, responseData)
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          this.recordSuccess(circuitKey) // Don't count 4xx as circuit breaker failures
          
          return {
            success: false,
            error,
            status: response.status,
            duration,
            retryCount
          }
        }

        // Server error - will retry
        lastError = error
        this.recordFailure(circuitKey)
        
      } catch (error: any) {
        const duration = Date.now() - startTime
        lastError = error.name === 'AbortError' ? 'Request timeout' : error.message
        this.recordFailure(circuitKey)
        
        logger.error('OA API Request failed', {
          requestId,
          method,
          url,
          attempt: attempt + 1,
          error: lastError,
          duration: `${duration}ms`
        })
      }

      // Exponential backoff with jitter
      if (attempt < this.config.retries) {
        retryCount++
        const delay = this.config.retryDelay * Math.pow(2, attempt) + Math.random() * 1000
        logger.info('Retrying OA request', {
          requestId,
          method,
          url,
          attempt: attempt + 1,
          delayMs: Math.round(delay)
        })
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // All retries exhausted
    const totalDuration = Date.now() - startTime
    
    return {
      success: false,
      error: lastError || 'Request failed after retries',
      status: 0,
      duration: totalDuration,
      retryCount
    }
  }

  /**
   * Map OA API errors to BFF error codes
   */
  private mapOAError(status: number, responseData: any): string {
    const oaError = responseData?.error || responseData?.message || 'Unknown error'
    
    switch (status) {
      case 400:
        return `Invalid request: ${oaError}`
      case 401:
        return 'OpenAccounting authentication failed'
      case 403:
        return 'Access denied to OpenAccounting resource'
      case 404:
        return 'Resource not found in OpenAccounting'
      case 409:
        return `Conflict: ${oaError}`
      case 422:
        return `Validation failed: ${oaError}`
      case 429:
        return 'OpenAccounting rate limit exceeded'
      case 500:
        return 'OpenAccounting server error'
      case 502:
      case 503:
      case 504:
        return 'OpenAccounting service unavailable'
      default:
        return `OpenAccounting error (${status}): ${oaError}`
    }
  }

  /**
   * Circuit breaker logic
   */
  private isCircuitOpen(key: string): boolean {
    const state = this.circuitBreaker.get(key)
    if (!state) return false

    const now = Date.now()
    
    if (state.state === 'OPEN') {
      if (now - state.lastFailure > this.config.circuitBreakerTimeout) {
        // Transition to HALF_OPEN
        state.state = 'HALF_OPEN'
        state.failures = 0
        return false
      }
      return true
    }
    
    return false
  }

  private recordSuccess(key: string) {
    const state = this.circuitBreaker.get(key)
    if (state) {
      state.failures = 0
      state.state = 'CLOSED'
    }
  }

  private recordFailure(key: string) {
    const state = this.circuitBreaker.get(key) || {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED' as const
    }
    
    state.failures++
    state.lastFailure = Date.now()
    
    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.state = 'OPEN'
      logger.warn('Circuit breaker OPENED', {
        key,
        failures: state.failures,
        threshold: this.config.circuitBreakerThreshold
      })
    }
    
    this.circuitBreaker.set(key, state)
  }

  // =============================================
  // OA API METHODS (Contract-Compliant)
  // =============================================

  /**
   * List accounts with OA-compliant pagination
   */
  async listAccounts(organizationId: string, options: {
    limit?: number
    offset?: number
    requestId?: string
  } = {}): Promise<OAResponse> {
    const { limit = 20, offset = 0, requestId } = options
    
    return this.request(`/accounts?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      organizationId,
      requestId
    })
  }

  /**
   * Create account in OA
   */
  async createAccount(organizationId: string, accountData: {
    name: string
    parent?: string
    currency: string
    precision?: number
    debitBalance?: boolean
  }, requestId?: string): Promise<OAResponse> {
    return this.request('/accounts', {
      method: 'POST',
      organizationId,
      body: accountData,
      requestId
    })
  }

  /**
   * Get account by ID
   */
  async getAccount(organizationId: string, accountId: string, requestId?: string): Promise<OAResponse> {
    return this.request(`/accounts/${accountId}`, {
      method: 'GET',
      organizationId,
      requestId
    })
  }

  /**
   * Update account in OA
   */
  async updateAccount(organizationId: string, accountId: string, updates: any, requestId?: string): Promise<OAResponse> {
    return this.request(`/accounts/${accountId}`, {
      method: 'PUT',
      organizationId,
      body: updates,
      requestId
    })
  }

  /**
   * Delete account in OA
   */
  async deleteAccount(organizationId: string, accountId: string, requestId?: string): Promise<OAResponse> {
    return this.request(`/accounts/${accountId}`, {
      method: 'DELETE',
      organizationId,
      requestId
    })
  }

  /**
   * List transactions with pagination
   */
  async listTransactions(organizationId: string, options: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
    requestId?: string
  } = {}): Promise<OAResponse> {
    const { limit = 20, offset = 0, startDate, endDate, requestId } = options
    
    let query = `limit=${limit}&offset=${offset}`
    if (startDate) query += `&startDate=${startDate}`
    if (endDate) query += `&endDate=${endDate}`
    
    return this.request(`/transactions?${query}`, {
      method: 'GET',
      organizationId,
      requestId
    })
  }

  /**
   * Create organization in OA
   */
  async createOrganization(data: {
    name: string
    description?: string
    currency?: string
  }, requestId?: string): Promise<OAResponse> {
    return this.request('/organizations', {
      method: 'POST',
      organizationId: 'system', // Special case for org creation
      body: data,
      requestId
    })
  }

  /**
   * Health check for OA server
   */
  async healthCheck(requestId?: string): Promise<OAResponse> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        timeout: 2000 // Short timeout for health checks
      })
      
      const duration = Date.now() - startTime
      const isHealthy = response.ok
      
      return {
        success: isHealthy,
        data: { status: isHealthy ? 'healthy' : 'unhealthy' },
        status: response.status,
        duration,
        retryCount: 0
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      return {
        success: false,
        error: error.message || 'Health check failed',
        status: 0,
        duration,
        retryCount: 0
      }
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    return Object.fromEntries(this.circuitBreaker.entries())
  }
}

// Singleton instance
export const oaClient = new HardenedOAClient()

// Export for testing
export { HardenedOAClient }
