"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAwareCacheService = exports.cacheService = void 0;
const logger_1 = require("../utils/logger");
const database_cloud_sql_only_1 = require("./database.cloud-sql-only");
class TenantAwareCacheService {
    constructor() {
        this.memoryCache = new Map();
        this.MAX_MEMORY_ENTRIES = 5000;
        this.DEFAULT_TTL = 300;
    }
    getTenantKey(key, organizationId) {
        return `org:${organizationId}:${key}`;
    }
    async get(key, options) {
        const tenantKey = this.getTenantKey(key, options.organizationId);
        try {
            const memoryEntry = this.memoryCache.get(tenantKey);
            if (memoryEntry && (!memoryEntry.expiresAt || memoryEntry.expiresAt > new Date())) {
                logger_1.logger.debug('Cache hit (memory)', {
                    key,
                    organizationId: options.organizationId,
                    tenantKey
                });
                return memoryEntry.value;
            }
            const dbEntry = await database_cloud_sql_only_1.prisma.cache_entries.findUnique({
                where: { key: tenantKey }
            });
            if (dbEntry && (!dbEntry.expiresAt || dbEntry.expiresAt > new Date())) {
                this.memoryCache.set(tenantKey, {
                    key: tenantKey,
                    value: dbEntry.value,
                    expiresAt: dbEntry.expiresAt,
                    organizationId: options.organizationId,
                    tags: Array.isArray(dbEntry.tags) ? dbEntry.tags : [],
                    createdAt: dbEntry.createdAt
                });
                logger_1.logger.debug('Cache hit (database)', {
                    key,
                    organizationId: options.organizationId,
                    tenantKey
                });
                return dbEntry.value;
            }
            logger_1.logger.debug('Cache miss', {
                key,
                organizationId: options.organizationId,
                tenantKey
            });
            return null;
        }
        catch (error) {
            logger_1.logger.error('Cache get error', {
                key,
                organizationId: options.organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async set(key, value, options) {
        const { ttl = this.DEFAULT_TTL, organizationId, tags = [] } = options;
        const tenantKey = this.getTenantKey(key, organizationId);
        const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : null;
        try {
            const entry = {
                key: tenantKey,
                value,
                expiresAt,
                organizationId,
                tags,
                createdAt: new Date()
            };
            this.memoryCache.set(tenantKey, entry);
            if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
                this.evictOldestMemoryEntries();
            }
            await database_cloud_sql_only_1.prisma.cache_entries.upsert({
                where: { key: tenantKey },
                create: {
                    key: tenantKey,
                    value: value,
                    expiresAt,
                    tags: tags
                },
                update: {
                    value: value,
                    expiresAt,
                    tags: tags,
                    updatedAt: new Date()
                }
            });
            logger_1.logger.debug('Cache set', {
                key,
                organizationId,
                tenantKey,
                ttl,
                tags
            });
        }
        catch (error) {
            logger_1.logger.error('Cache set error', {
                key,
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async delete(key, options) {
        const tenantKey = this.getTenantKey(key, options.organizationId);
        try {
            this.memoryCache.delete(tenantKey);
            await database_cloud_sql_only_1.prisma.cache_entries.delete({
                where: { key: tenantKey }
            }).catch(() => { });
            logger_1.logger.debug('Cache deleted', {
                key,
                organizationId: options.organizationId,
                tenantKey
            });
        }
        catch (error) {
            logger_1.logger.error('Cache delete error', {
                key,
                organizationId: options.organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async invalidateByTags(tags, organizationId) {
        try {
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.organizationId === organizationId &&
                    entry.tags.some(tag => tags.includes(tag))) {
                    this.memoryCache.delete(key);
                }
            }
            const entries = await database_cloud_sql_only_1.prisma.cache_entries.findMany({
                where: {
                    key: { startsWith: `org:${organizationId}:` }
                }
            });
            for (const entry of entries) {
                const entryTags = Array.isArray(entry.tags) ? entry.tags : [];
                if (entryTags.some(tag => tags.includes(tag))) {
                    await database_cloud_sql_only_1.prisma.cache_entries.delete({ where: { id: entry.id } });
                }
            }
            logger_1.logger.info('Cache invalidated by tags', {
                tags,
                organizationId,
                entriesChecked: entries.length
            });
        }
        catch (error) {
            logger_1.logger.error('Cache tag invalidation error', {
                tags,
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getOrSet(key, fetcher, options) {
        const cached = await this.get(key, { organizationId: options.organizationId });
        if (cached !== null) {
            return cached;
        }
        const startTime = Date.now();
        const data = await fetcher();
        const fetchDuration = Date.now() - startTime;
        await this.set(key, data, options);
        logger_1.logger.debug('Cache miss - fetched and cached', {
            key,
            organizationId: options.organizationId,
            fetchDuration: `${fetchDuration}ms`,
            ttl: options.ttl
        });
        return data;
    }
    async clearOrganization(organizationId) {
        try {
            const orgPrefix = `org:${organizationId}:`;
            for (const key of this.memoryCache.keys()) {
                if (key.startsWith(orgPrefix)) {
                    this.memoryCache.delete(key);
                }
            }
            await database_cloud_sql_only_1.prisma.cache_entries.deleteMany({
                where: {
                    key: { startsWith: orgPrefix }
                }
            });
            logger_1.logger.info('Organization cache cleared', { organizationId });
        }
        catch (error) {
            logger_1.logger.error('Clear organization cache error', {
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async cleanup() {
        try {
            const now = new Date();
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.expiresAt && entry.expiresAt <= now) {
                    this.memoryCache.delete(key);
                }
            }
            const deleted = await database_cloud_sql_only_1.prisma.cache_entries.deleteMany({
                where: {
                    expiresAt: { lte: now }
                }
            });
            if (deleted.count > 0) {
                logger_1.logger.info('Cache cleanup completed', {
                    deletedEntries: deleted.count
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Cache cleanup error', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    getCacheStats() {
        const memoryEntries = this.memoryCache.size;
        const memorySize = `${(JSON.stringify(Array.from(this.memoryCache.values())).length / 1024).toFixed(1)}KB`;
        return {
            memoryEntries,
            memorySize
        };
    }
    evictOldestMemoryEntries() {
        const entries = Array.from(this.memoryCache.entries());
        entries.sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
        const toRemove = Math.floor(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.memoryCache.delete(entries[i][0]);
        }
        logger_1.logger.debug('Memory cache eviction', {
            removed: toRemove,
            remaining: this.memoryCache.size
        });
    }
}
exports.TenantAwareCacheService = TenantAwareCacheService;
exports.cacheService = new TenantAwareCacheService();
setInterval(() => {
    exports.cacheService.cleanup();
}, 5 * 60 * 1000);
//# sourceMappingURL=cache.js.map