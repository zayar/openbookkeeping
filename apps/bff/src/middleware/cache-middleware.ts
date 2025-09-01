import { Request, Response, NextFunction } from 'express'
import { cacheService, CACHE_TTL } from '../services/redis-cache'
import { logger } from '../utils/logger'

// =============================================
// CACHE MIDDLEWARE FOR EXPRESS ROUTES
// =============================================

interface CacheOptions {
  ttl?: number
  keyGenerator?: (req: Request) => string
  condition?: (req: Request) => boolean
  invalidateOn?: string[]
}

/**
 * Generic cache middleware for Express routes
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = CACHE_TTL.ACCOUNTS,
    keyGenerator = (req) => `${req.method}:${req.path}`,
    condition = () => true,
    invalidateOn = []
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition not met
    if (!condition(req)) {
      return next()
    }

    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const orgId = (req as any).auth?.organizationId
    if (!orgId) {
      return next()
    }

    const cacheKey = keyGenerator(req)
    
    try {
      // Try to get from cache
      const cachedData = await cacheService.getOrgData(orgId, cacheKey)
      if (cachedData) {
        logger.debug('Cache hit', { orgId, cacheKey })
        return res.json(cachedData)
      }

      // Cache miss - continue to route handler
      logger.debug('Cache miss', { orgId, cacheKey })

      // Override res.json to cache the response
      const originalJson = res.json.bind(res)
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode === 200 && data) {
          cacheService.setOrgData(orgId, cacheKey, data, ttl)
            .catch(error => logger.error('Cache set error', { error }))
        }
        return originalJson(data)
      }

      next()
    } catch (error) {
      logger.error('Cache middleware error', { error, orgId, cacheKey })
      next() // Continue without caching on error
    }
  }
}

/**
 * Cache middleware for organization-scoped data
 */
export function orgCacheMiddleware(key: string, ttl: number = CACHE_TTL.ACCOUNTS) {
  return cacheMiddleware({
    ttl,
    keyGenerator: () => key,
    condition: (req) => Boolean((req as any).auth?.organizationId)
  })
}

/**
 * Cache middleware for user-specific data
 */
export function userCacheMiddleware(key: string, ttl: number = CACHE_TTL.USER_SESSION) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => `user:${(req as any).auth?.userId}:${key}`,
    condition: (req) => Boolean((req as any).auth?.userId)
  })
}

/**
 * Cache middleware for paginated data
 */
export function paginatedCacheMiddleware(baseKey: string, ttl: number = CACHE_TTL.ACCOUNTS) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const { page = 1, limit = 50, sort, filter } = req.query
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(sort && { sort: sort.toString() }),
        ...(filter && { filter: filter.toString() })
      })
      return `${baseKey}:${params.toString()}`
    }
  })
}

// =============================================
// CACHE INVALIDATION MIDDLEWARE
// =============================================

/**
 * Middleware to invalidate cache after successful mutations
 */
export function invalidateCacheMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const orgId = (req as any).auth?.organizationId
    if (!orgId) {
      return next()
    }

    // Override res.json to invalidate cache after successful response
    const originalJson = res.json.bind(res)
    res.json = function(data: any) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          cacheService.invalidateOrgPattern(orgId, pattern)
            .catch(error => logger.error('Cache invalidation error', { error, pattern }))
        })
      }
      return originalJson(data)
    }

    next()
  }
}

// =============================================
// SPECIALIZED CACHE MIDDLEWARE
// =============================================

/**
 * Cache middleware for Chart of Accounts
 */
export const accountsCacheMiddleware = orgCacheMiddleware('accounts', CACHE_TTL.ACCOUNTS)

/**
 * Cache middleware for Items/Products
 */
export const itemsCacheMiddleware = orgCacheMiddleware('items', CACHE_TTL.ITEMS)

/**
 * Cache middleware for Customers
 */
export const customersCacheMiddleware = orgCacheMiddleware('customers', CACHE_TTL.CUSTOMERS)

/**
 * Cache middleware for Bank Accounts
 */
export const bankAccountsCacheMiddleware = orgCacheMiddleware('bank-accounts', CACHE_TTL.BANK_ACCOUNTS)

/**
 * Cache middleware for Vendors
 */
export const vendorsCacheMiddleware = orgCacheMiddleware('vendors', CACHE_TTL.VENDORS)

/**
 * Cache middleware for Dashboard Metrics (expensive aggregations)
 */
export const metricsCacheMiddleware = orgCacheMiddleware('metrics', CACHE_TTL.METRICS)

/**
 * Cache middleware for Organizations
 */
export const organizationsCacheMiddleware = cacheMiddleware({
  ttl: CACHE_TTL.ORGANIZATIONS,
  keyGenerator: () => 'organizations',
  condition: () => true
})

/**
 * Cache middleware for Invoices with pagination
 */
export const invoicesCacheMiddleware = paginatedCacheMiddleware('invoices', CACHE_TTL.INVOICES)

// =============================================
// CACHE INVALIDATION PATTERNS
// =============================================

/**
 * Invalidate accounts-related cache
 */
export const invalidateAccountsCache = invalidateCacheMiddleware([
  'accounts*',
  'metrics*',
  'summary*'
])

/**
 * Invalidate items-related cache
 */
export const invalidateItemsCache = invalidateCacheMiddleware([
  'items*',
  'metrics*'
])

/**
 * Invalidate customers-related cache
 */
export const invalidateCustomersCache = invalidateCacheMiddleware([
  'customers*',
  'metrics*'
])

/**
 * Invalidate invoices-related cache
 */
export const invalidateInvoicesCache = invalidateCacheMiddleware([
  'invoices*',
  'metrics*',
  'summary*'
])

/**
 * Invalidate bank accounts-related cache
 */
export const invalidateBankAccountsCache = invalidateCacheMiddleware([
  'bank-accounts*',
  'metrics*'
])

/**
 * Invalidate all organization cache (nuclear option)
 */
export const invalidateAllOrgCache = invalidateCacheMiddleware(['*'])

// =============================================
// RATE LIMITING MIDDLEWARE
// =============================================

interface RateLimitOptions {
  limit: number
  window: number // seconds
  keyGenerator?: (req: Request) => string
  skipSuccessfulRequests?: boolean
}

/**
 * Rate limiting middleware using Redis
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
  const {
    limit,
    window,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = keyGenerator(req)
    
    try {
      const result = await cacheService.checkRateLimit(identifier, limit, window)
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      })

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        })
      }

      next()
    } catch (error) {
      logger.error('Rate limit middleware error', { error, identifier })
      next() // Continue without rate limiting on error
    }
  }
}

/**
 * API rate limiting (general)
 */
export const apiRateLimit = rateLimitMiddleware({
  limit: 100,
  window: 60, // 100 requests per minute
  keyGenerator: (req) => `api:${req.ip}`
})

/**
 * Authentication rate limiting
 */
export const authRateLimit = rateLimitMiddleware({
  limit: 5,
  window: 300, // 5 attempts per 5 minutes
  keyGenerator: (req) => `auth:${req.ip}`
})

/**
 * Expensive operations rate limiting
 */
export const expensiveOperationRateLimit = rateLimitMiddleware({
  limit: 10,
  window: 60, // 10 requests per minute
  keyGenerator: (req) => `expensive:${(req as any).auth?.userId || req.ip}`
})
