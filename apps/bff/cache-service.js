const Redis = require('ioredis')

// =============================================
// REDIS CACHE SERVICE FOR MULTI-TENANT SAAS
// =============================================

class RedisCacheService {
  constructor() {
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

    this.isConnected = false
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully')
      this.isConnected = true
    })

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message)
      this.isConnected = false
    })

    this.redis.on('close', () => {
      console.warn('⚠️ Redis connection closed')
      this.isConnected = false
    })
  }

  // =============================================
  // ORGANIZATION-SCOPED CACHING
  // =============================================

  /**
   * Get cached data for a specific organization
   */
  async getOrgData(orgId, key) {
    try {
      if (!this.isConnected) return null
      
      const cacheKey = `org:${orgId}:${key}`
      const data = await this.redis.get(cacheKey)
      
      if (data) {
        console.log(`🎯 Cache HIT: ${cacheKey}`)
        return JSON.parse(data)
      }
      
      console.log(`❌ Cache MISS: ${cacheKey}`)
      return null
    } catch (error) {
      console.error('Redis get error:', error.message)
      return null // Graceful degradation
    }
  }

  /**
   * Set cached data for a specific organization
   */
  async setOrgData(orgId, key, data, ttl = 3600) {
    try {
      if (!this.isConnected) return
      
      const cacheKey = `org:${orgId}:${key}`
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data))
      
      console.log(`💾 Cache SET: ${cacheKey} (TTL: ${ttl}s)`)
    } catch (error) {
      console.error('Redis set error:', error.message)
    }
  }

  /**
   * Delete cached data for a specific organization
   */
  async deleteOrgData(orgId, key) {
    try {
      if (!this.isConnected) return
      
      const cacheKey = `org:${orgId}:${key}`
      await this.redis.del(cacheKey)
      
      console.log(`🗑️ Cache DELETED: ${cacheKey}`)
    } catch (error) {
      console.error('Redis delete error:', error.message)
    }
  }

  /**
   * Invalidate multiple keys for an organization using pattern
   */
  async invalidateOrgPattern(orgId, pattern) {
    try {
      if (!this.isConnected) return
      
      const searchPattern = `openaccounting:org:${orgId}:${pattern}`
      const keys = await this.redis.keys(searchPattern)
      
      if (keys.length > 0) {
        // Remove prefix for deletion
        const keysToDelete = keys.map(key => key.replace('openaccounting:', ''))
        await this.redis.del(...keysToDelete)
        
        console.log(`🧹 Cache INVALIDATED: ${pattern} (${keys.length} keys)`)
      }
    } catch (error) {
      console.error('Redis pattern invalidation error:', error.message)
    }
  }

  // =============================================
  // METRICS CACHING (MOST IMPORTANT)
  // =============================================

  /**
   * Cache expensive metrics aggregations
   */
  async cacheMetrics(orgId, metrics, ttl = 300) {
    await this.setOrgData(orgId, 'metrics', metrics, ttl)
  }

  /**
   * Get cached metrics
   */
  async getCachedMetrics(orgId) {
    return await this.getOrgData(orgId, 'metrics')
  }

  // =============================================
  // RATE LIMITING
  // =============================================

  /**
   * Check rate limit using Redis
   */
  async checkRateLimit(identifier, limit, window) {
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
      console.error('Rate limit check error:', error.message)
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 }
    }
  }

  // =============================================
  // HEALTH CHECK
  // =============================================

  /**
   * Check Redis health
   */
  async healthCheck() {
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start
      
      return { healthy: true, latency }
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      }
    }
  }

  /**
   * Get Redis memory and connection stats
   */
  async getStats() {
    try {
      if (!this.isConnected) return null
      
      const info = await this.redis.info('memory')
      const keyspace = await this.redis.info('keyspace')
      const stats = await this.redis.info('stats')
      
      return { info, keyspace, stats }
    } catch (error) {
      console.error('Redis stats error:', error.message)
      return null
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    try {
      await this.redis.quit()
      console.log('✅ Redis disconnected gracefully')
    } catch (error) {
      console.error('Redis disconnect error:', error.message)
    }
  }
}

// =============================================
// CACHE TTL CONSTANTS
// =============================================

const CACHE_TTL = {
  // Static data (rarely changes)
  ACCOUNTS: 3600,        // 1 hour
  ORGANIZATIONS: 7200,   // 2 hours
  BANK_ACCOUNTS: 3600,   // 1 hour
  
  // Semi-dynamic data
  ITEMS: 1800,          // 30 minutes
  CUSTOMERS: 900,       // 15 minutes
  VENDORS: 900,         // 15 minutes
  
  // Dynamic data
  METRICS: 300,         // 5 minutes (MOST IMPORTANT)
  INVOICES: 60,         // 1 minute
  TRANSACTIONS: 60,     // 1 minute
  
  // Session data
  USER_SESSION: 86400,  // 24 hours
}

// =============================================
// CACHE MIDDLEWARE FUNCTIONS
// =============================================

/**
 * Generic cache middleware
 */
function createCacheMiddleware(key, ttl) {
  return async (req, res, next) => {
    const orgId = req.auth?.organizationId
    if (!orgId) {
      return next()
    }

    try {
      // Try to get from cache
      const cachedData = await cacheService.getOrgData(orgId, key)
      if (cachedData) {
        return res.json(cachedData)
      }

      // Cache miss - override res.json to cache the response
      const originalJson = res.json.bind(res)
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data) {
          cacheService.setOrgData(orgId, key, data, ttl)
            .catch(error => console.error('Cache set error:', error.message))
        }
        return originalJson(data)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error.message)
      next() // Continue without caching on error
    }
  }
}

/**
 * Cache invalidation middleware
 */
function createInvalidationMiddleware(patterns) {
  return async (req, res, next) => {
    const orgId = req.auth?.organizationId
    if (!orgId) {
      return next()
    }

    // Override res.json to invalidate cache after successful response
    const originalJson = res.json.bind(res)
    res.json = function(data) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          cacheService.invalidateOrgPattern(orgId, pattern)
            .catch(error => console.error('Cache invalidation error:', error.message))
        })
      }
      return originalJson(data)
    }

    next()
  }
}

// Create singleton instance
const cacheService = new RedisCacheService()

// Export everything
module.exports = {
  cacheService,
  CACHE_TTL,
  createCacheMiddleware,
  createInvalidationMiddleware,
  
  // Pre-configured middleware
  accountsCacheMiddleware: createCacheMiddleware('accounts', CACHE_TTL.ACCOUNTS),
  itemsCacheMiddleware: createCacheMiddleware('items', CACHE_TTL.ITEMS),
  customersCacheMiddleware: createCacheMiddleware('customers', CACHE_TTL.CUSTOMERS),
  bankAccountsCacheMiddleware: createCacheMiddleware('bank-accounts', CACHE_TTL.BANK_ACCOUNTS),
  vendorsCacheMiddleware: createCacheMiddleware('vendors', CACHE_TTL.VENDORS),
  metricsCacheMiddleware: createCacheMiddleware('metrics', CACHE_TTL.METRICS),
  
  // Pre-configured invalidation middleware
  invalidateAccountsCache: createInvalidationMiddleware(['accounts*', 'metrics*']),
  invalidateItemsCache: createInvalidationMiddleware(['items*', 'metrics*']),
  invalidateCustomersCache: createInvalidationMiddleware(['customers*', 'metrics*']),
  invalidateBankAccountsCache: createInvalidationMiddleware(['bank-accounts*', 'metrics*']),
  invalidateVendorsCache: createInvalidationMiddleware(['vendors*', 'metrics*']),
  invalidateInvoicesCache: createInvalidationMiddleware(['invoices*', 'metrics*']),
}
