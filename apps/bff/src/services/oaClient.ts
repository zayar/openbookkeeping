import fetch from 'node-fetch'
import { logger } from '../utils/logger'
import { CacheService, OrganizationService } from './database'

// =============================================
// OPEN ACCOUNTING API CLIENT
// =============================================

interface OAConfig {
  baseUrl: string
  apiKey?: string
  acceptVersion: string
  timeout: number
}

interface OAResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
}

class OpenAccountingClient {
  private config: OAConfig

  constructor(config: Partial<OAConfig> = {}) {
    this.config = {
      baseUrl: process.env.OA_BASE_URL || 'http://localhost:8080',
      apiKey: process.env.OA_API_KEY || '',
      acceptVersion: process.env.OA_ACCEPT_VERSION || '1.4.0',
      timeout: 30000,
      ...config
    }
  }

  /**
   * Make authenticated request to OA server
   */
  private async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: any
      headers?: Record<string, string>
      organizationId?: string
    } = {}
  ): Promise<OAResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`
    const { method = 'GET', body, headers = {}, organizationId } = options

    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Version': this.config.acceptVersion,
        ...headers
      }

      // Add API key if configured
      if (this.config.apiKey) {
        requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`
      }

      // Add organization context if provided
      if (organizationId) {
        requestHeaders['X-Organization-ID'] = organizationId
      }

      logger.debug(`OA API Request: ${method} ${url}`, {
        headers: { ...requestHeaders, Authorization: '[REDACTED]' },
        body: body ? JSON.stringify(body).substring(0, 200) + '...' : undefined
      })

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        timeout: this.config.timeout
      })

      const responseText = await response.text()
      let responseData: any

      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      logger.debug(`OA API Response: ${response.status}`, {
        status: response.status,
        data: JSON.stringify(responseData).substring(0, 200) + '...'
      })

      return {
        success: response.ok,
        data: responseData,
        error: response.ok ? undefined : responseData?.error || `HTTP ${response.status}`,
        status: response.status
      }
    } catch (error: any) {
      logger.error(`OA API Error: ${method} ${url}`, error)
      return {
        success: false,
        error: error.message || 'Network error',
        status: 0
      }
    }
  }

  // =============================================
  // ORGANIZATION MANAGEMENT
  // =============================================

  async createOrganization(data: {
    name: string
    description?: string
    currency?: string
  }) {
    return this.request('/organizations', {
      method: 'POST',
      body: data
    })
  }

  async getOrganization(organizationId: string) {
    return this.request(`/organizations/${organizationId}`, {
      organizationId
    })
  }

  // =============================================
  // CHART OF ACCOUNTS
  // =============================================

  async getAccounts(organizationId: string, cached = true) {
    const cacheKey = `oa:accounts:${organizationId}`
    
    if (cached) {
      const cachedData = await CacheService.get(cacheKey)
      if (cachedData) return { success: true, data: cachedData, status: 200 }
    }

    const response = await this.request('/accounts', {
      organizationId
    })

    if (response.success) {
      await CacheService.set(cacheKey, response.data, 300, [`org:${organizationId}`, 'accounts'])
    }

    return response
  }

  async createAccount(organizationId: string, data: {
    name: string
    type: string
    code?: string
    description?: string
    parent?: string
  }) {
    const response = await this.request('/accounts', {
      method: 'POST',
      body: data,
      organizationId
    })

    if (response.success) {
      await CacheService.deleteByTags([`org:${organizationId}`, 'accounts'])
    }

    return response
  }

  // =============================================
  // HEALTH CHECK
  // =============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('/health')
      return response.success
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const oaClient = new OpenAccountingClient()
