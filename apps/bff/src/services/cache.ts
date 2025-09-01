import { logger } from '../utils/logger'
import { prisma } from './database.cloud-sql-only'

// =============================================
// TENANT-AWARE CACHING SERVICE
// =============================================

interface CacheOptions {
  ttl?: number // Time to live in seconds
  organizationId: string
  tags?: string[] // For cache invalidation
}

interface CacheEntry {
  key: string
  value: any
  expiresAt: Date | null
  organizationId: string
  tags: string[]
  createdAt: Date
}

class TenantAwareCacheService {
  private memoryCache = new Map<string, CacheEntry>()
  private readonly MAX_MEMORY_ENTRIES = 5000
  private readonly DEFAULT_TTL = 300 // 5 minutes

  /**
   * Generate tenant-scoped cache key
   */
  private getTenantKey(key: string, organizationId: string): string {
    return `org:${organizationId}:${key}`
  }

  /**
   * Get cached value with tenant isolation
   */
  async get<T = any>(
    key: string, 
    options: { organizationId: string }
  ): Promise<T | null> {
    const tenantKey = this.getTenantKey(key, options.organizationId)
    
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(tenantKey)
      if (memoryEntry && (!memoryEntry.expiresAt || memoryEntry.expiresAt > new Date())) {
        logger.debug('Cache hit (memory)', { 
          key, 
          organizationId: options.organizationId,
          tenantKey 
        })
        return memoryEntry.value
      }

      // Check database cache
      const dbEntry = await prisma.cache_entries.findUnique({
        where: { key: tenantKey }
      })

      if (dbEntry && (!dbEntry.expiresAt || dbEntry.expiresAt > new Date())) {
        // Promote to memory cache
        this.memoryCache.set(tenantKey, {
          key: tenantKey,
          value: dbEntry.value,
          expiresAt: dbEntry.expiresAt,
          organizationId: options.organizationId,
          tags: Array.isArray(dbEntry.tags) ? dbEntry.tags as string[] : [],
          createdAt: dbEntry.createdAt
        })

        logger.debug('Cache hit (database)', { 
          key, 
          organizationId: options.organizationId,
          tenantKey 
        })
        return dbEntry.value as T
      }

      logger.debug('Cache miss', { 
        key, 
        organizationId: options.organizationId,
        tenantKey 
      })
      return null

    } catch (error) {
      logger.error('Cache get error', {
        key,
        organizationId: options.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Set cached value with tenant isolation
   */
  async set<T = any>(
    key: string,
    value: T,
    options: CacheOptions
  ): Promise<void> {
    const { ttl = this.DEFAULT_TTL, organizationId, tags = [] } = options
    const tenantKey = this.getTenantKey(key, organizationId)
    const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : null

    try {
      const entry: CacheEntry = {
        key: tenantKey,
        value,
        expiresAt,
        organizationId,
        tags,
        createdAt: new Date()
      }

      // Store in memory cache
      this.memoryCache.set(tenantKey, entry)
      
      // Manage memory cache size
      if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
        this.evictOldestMemoryEntries()
      }

      // Store in database cache for persistence
      await prisma.cache_entries.upsert({
        where: { key: tenantKey },
        create: {
          key: tenantKey,
          value: value as any,
          expiresAt,
          tags: tags as any
        },
        update: {
          value: value as any,
          expiresAt,
          tags: tags as any,
          updatedAt: new Date()
        }
      })

      logger.debug('Cache set', { 
        key, 
        organizationId,
        tenantKey,
        ttl,
        tags 
      })

    } catch (error) {
      logger.error('Cache set error', {
        key,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Delete cached value with tenant isolation
   */
  async delete(key: string, options: { organizationId: string }): Promise<void> {
    const tenantKey = this.getTenantKey(key, options.organizationId)
    
    try {
      // Remove from memory
      this.memoryCache.delete(tenantKey)
      
      // Remove from database
      await prisma.cache_entries.delete({
        where: { key: tenantKey }
      }).catch(() => {}) // Ignore if not found

      logger.debug('Cache deleted', { 
        key, 
        organizationId: options.organizationId,
        tenantKey 
      })

    } catch (error) {
      logger.error('Cache delete error', {
        key,
        organizationId: options.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Invalidate cache by tags (tenant-scoped)
   */
  async invalidateByTags(tags: string[], organizationId: string): Promise<void> {
    try {
      // Clear from memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.organizationId === organizationId && 
            entry.tags.some(tag => tags.includes(tag))) {
          this.memoryCache.delete(key)
        }
      }

      // Clear from database cache
      // Note: This is a simplified implementation
      // In production, you'd want more efficient tag-based invalidation
      const entries = await prisma.cache_entries.findMany({
        where: {
          key: { startsWith: `org:${organizationId}:` }
        }
      })

      for (const entry of entries) {
        const entryTags = Array.isArray(entry.tags) ? entry.tags as string[] : []
        if (entryTags.some(tag => tags.includes(tag))) {
          await prisma.cache_entries.delete({ where: { id: entry.id } })
        }
      }

      logger.info('Cache invalidated by tags', { 
        tags, 
        organizationId,
        entriesChecked: entries.length 
      })

    } catch (error) {
      logger.error('Cache tag invalidation error', {
        tags,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get or set pattern with tenant isolation
   */
  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, { organizationId: options.organizationId })
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const startTime = Date.now()
    const data = await fetcher()
    const fetchDuration = Date.now() - startTime

    // Cache the result
    await this.set(key, data, options)

    logger.debug('Cache miss - fetched and cached', {
      key,
      organizationId: options.organizationId,
      fetchDuration: `${fetchDuration}ms`,
      ttl: options.ttl
    })

    return data
  }

  /**
   * Clear all cache entries for an organization
   */
  async clearOrganization(organizationId: string): Promise<void> {
    try {
      const orgPrefix = `org:${organizationId}:`
      
      // Clear memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(orgPrefix)) {
          this.memoryCache.delete(key)
        }
      }

      // Clear database cache
      await prisma.cache_entries.deleteMany({
        where: {
          key: { startsWith: orgPrefix }
        }
      })

      logger.info('Organization cache cleared', { organizationId })

    } catch (error) {
      logger.error('Clear organization cache error', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    try {
      const now = new Date()
      
      // Clear expired memory entries
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt && entry.expiresAt <= now) {
          this.memoryCache.delete(key)
        }
      }

      // Clear expired database entries
      const deleted = await prisma.cache_entries.deleteMany({
        where: {
          expiresAt: { lte: now }
        }
      })

      if (deleted.count > 0) {
        logger.info('Cache cleanup completed', { 
          deletedEntries: deleted.count 
        })
      }

    } catch (error) {
      logger.error('Cache cleanup error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryEntries: number
    memorySize: string
    hitRate?: number
  } {
    const memoryEntries = this.memoryCache.size
    const memorySize = `${(JSON.stringify(Array.from(this.memoryCache.values())).length / 1024).toFixed(1)}KB`

    return {
      memoryEntries,
      memorySize
    }
  }

  private evictOldestMemoryEntries() {
    const entries = Array.from(this.memoryCache.entries())
    entries.sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())
    
    // Remove oldest 10%
    const toRemove = Math.floor(entries.length * 0.1)
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0])
    }

    logger.debug('Memory cache eviction', { 
      removed: toRemove,
      remaining: this.memoryCache.size 
    })
  }
}

// Singleton cache service
export const cacheService = new TenantAwareCacheService()

// Start cleanup interval
setInterval(() => {
  cacheService.cleanup()
}, 5 * 60 * 1000) // Every 5 minutes

export { TenantAwareCacheService }
