import Redis from 'ioredis'
import { logger } from '../utils/logger'

// =============================================
// REDIS CACHE SERVICE FOR MULTI-TENANT SAAS
// =============================================

export class RedisCacheService {
  private static instance: RedisCacheService
  private redis: Redis
  private isConnected: boolean = false

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'openaccounting:',
      connectTimeout: 10000,
      commandTimeout: 5000,
    })

    this.setupEventHandlers()
  }

  static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService()
    }
    return RedisCacheService.instance
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connected successfully')
      this.isConnected = true
    })

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error })
      this.isConnected = false
    })

    this.redis.on('close', () => {
      logger.warn('Redis connection closed')
      this.isConnected = false
    })
  }

  // =============================================
  // ORGANIZATION-SCOPED CACHING
  // =============================================

  /**
   * Get cached data for a specific organization
   */
  async getOrgData<T>(orgId: string, key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null
      
      const cacheKey = `org:${orgId}:${key}`
      const data = await this.redis.get(cacheKey)
      
      if (data) {
        logger.debug('Cache hit', { orgId, key })
        return JSON.parse(data)
      }
      
      logger.debug('Cache miss', { orgId, key })
      return null
    } catch (error) {
      logger.error('Redis get error', { orgId, key, error })
      return null // Graceful degradation
    }
  }

  /**
   * Set cached data for a specific organization
   */
  async setOrgData<T>(orgId: string, key: string, data: T, ttl: number = 3600): Promise<void> {
    try {
      if (!this.isConnected) return
      
      const cacheKey = `org:${orgId}:${key}`
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data))
      
      logger.debug('Cache set', { orgId, key, ttl })
    } catch (error) {
      logger.error('Redis set error', { orgId, key, error })
    }
  }

  /**
   * Delete cached data for a specific organization
   */
  async deleteOrgData(orgId: string, key: string): Promise<void> {
    try {
      if (!this.isConnected) return
      
      const cacheKey = `org:${orgId}:${key}`
      await this.redis.del(cacheKey)
      
      logger.debug('Cache deleted', { orgId, key })
    } catch (error) {
      logger.error('Redis delete error', { orgId, key, error })
    }
  }

  /**
   * Invalidate multiple keys for an organization using pattern
   */
  async invalidateOrgPattern(orgId: string, pattern: string): Promise<void> {
    try {
      if (!this.isConnected) return
      
      const searchPattern = `openaccounting:org:${orgId}:${pattern}`
      const keys = await this.redis.keys(searchPattern)
      
      if (keys.length > 0) {
        // Remove prefix for deletion
        const keysToDelete = keys.map(key => key.replace('openaccounting:', ''))
        await this.redis.del(...keysToDelete)
        
        logger.info('Cache pattern invalidated', { orgId, pattern, count: keys.length })
      }
    } catch (error) {
      logger.error('Redis pattern invalidation error', { orgId, pattern, error })
    }
  }

  // =============================================
  // USER SESSION MANAGEMENT
  // =============================================

  /**
   * Store user session data
   */
  async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    try {
      if (!this.isConnected) return
      
      const sessionKey = `session:${userId}`
      await this.redis.setex(sessionKey, ttl, JSON.stringify(sessionData))
      
      logger.debug('User session stored', { userId })
    } catch (error) {
      logger.error('Redis session set error', { userId, error })
    }
  }

  /**
   * Get user session data
   */
  async getUserSession(userId: string): Promise<any | null> {
    try {
      if (!this.isConnected) return null
      
      const sessionKey = `session:${userId}`
      const data = await this.redis.get(sessionKey)
      
      return data ? JSON.parse(data) : null
    } catch (error) {
      logger.error('Redis session get error', { userId, error })
      return null
    }
  }

  /**
   * Delete user session
   */
  async deleteUserSession(userId: string): Promise<void> {
    try {
      if (!this.isConnected) return
      
      const sessionKey = `session:${userId}`
      await this.redis.del(sessionKey)
      
      logger.debug('User session deleted', { userId })
    } catch (error) {
      logger.error('Redis session delete error', { userId, error })
    }
  }

  // =============================================
  // METRICS AND AGGREGATIONS
  // =============================================

  /**
   * Cache expensive aggregation results
   */
  async cacheMetrics(orgId: string, metrics: any, ttl: number = 300): Promise<void> {
    await this.setOrgData(orgId, 'metrics', metrics, ttl)
  }

  /**
   * Get cached metrics
   */
  async getCachedMetrics(orgId: string): Promise<any | null> {
    return await this.getOrgData(orgId, 'metrics')
  }

  // =============================================
  // RATE LIMITING
  // =============================================

  /**
   * Implement rate limiting using Redis
   */
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
  }> {
    try {
      if (!this.isConnected) {
        return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 }
      }

      const key = `ratelimit:${identifier}`
      const current = await this.redis.incr(key)
      
      if (current === 1) {
        await this.redis.expire(key, window)
      }
      
      const ttl = await this.redis.ttl(key)
      const resetTime = Date.now() + ttl * 1000
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime
      }
    } catch (error) {
      logger.error('Rate limit check error', { identifier, error })
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 }
    }
  }

  // =============================================
  // PUB/SUB FOR REAL-TIME UPDATES
  // =============================================

  /**
   * Publish real-time updates
   */
  async publish(channel: string, message: any): Promise<void> {
    try {
      if (!this.isConnected) return
      
      await this.redis.publish(channel, JSON.stringify(message))
      logger.debug('Message published', { channel })
    } catch (error) {
      logger.error('Redis publish error', { channel, error })
    }
  }

  /**
   * Subscribe to real-time updates
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = this.redis.duplicate()
      
      subscriber.subscribe(channel)
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message)
            callback(parsedMessage)
          } catch (error) {
            logger.error('Message parsing error', { channel, error })
          }
        }
      })
      
      logger.info('Subscribed to channel', { channel })
    } catch (error) {
      logger.error('Redis subscribe error', { channel, error })
    }
  }

  // =============================================
  // HEALTH CHECK AND MONITORING
  // =============================================

  /**
   * Check Redis health
   */
  async healthCheck(): Promise<{
    healthy: boolean
    latency?: number
    error?: string
  }> {
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start
      
      return { healthy: true, latency }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get Redis info and stats
   */
  async getStats(): Promise<any> {
    try {
      if (!this.isConnected) return null
      
      const info = await this.redis.info()
      const memory = await this.redis.info('memory')
      const stats = await this.redis.info('stats')
      
      return { info, memory, stats }
    } catch (error) {
      logger.error('Redis stats error', { error })
      return null
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit()
      logger.info('Redis disconnected gracefully')
    } catch (error) {
      logger.error('Redis disconnect error', { error })
    }
  }
}

// =============================================
// CACHE TTL CONSTANTS
// =============================================

export const CACHE_TTL = {
  // Static data (rarely changes)
  ACCOUNTS: 3600,        // 1 hour
  ORGANIZATIONS: 7200,   // 2 hours
  BANK_ACCOUNTS: 3600,   // 1 hour
  
  // Semi-dynamic data
  ITEMS: 1800,          // 30 minutes
  CUSTOMERS: 900,       // 15 minutes
  VENDORS: 900,         // 15 minutes
  
  // Dynamic data
  METRICS: 300,         // 5 minutes
  INVOICES: 60,         // 1 minute
  TRANSACTIONS: 60,     // 1 minute
  
  // Session data
  USER_SESSION: 86400,  // 24 hours
  
  // Real-time data
  NOTIFICATIONS: 30,    // 30 seconds
  RATES: 3600,         // 1 hour
} as const

// Export singleton instance
export const cacheService = RedisCacheService.getInstance()
