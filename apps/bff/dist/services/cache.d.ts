interface CacheOptions {
    ttl?: number;
    organizationId: string;
    tags?: string[];
}
declare class TenantAwareCacheService {
    private memoryCache;
    private readonly MAX_MEMORY_ENTRIES;
    private readonly DEFAULT_TTL;
    private getTenantKey;
    get<T = any>(key: string, options: {
        organizationId: string;
    }): Promise<T | null>;
    set<T = any>(key: string, value: T, options: CacheOptions): Promise<void>;
    delete(key: string, options: {
        organizationId: string;
    }): Promise<void>;
    invalidateByTags(tags: string[], organizationId: string): Promise<void>;
    getOrSet<T = any>(key: string, fetcher: () => Promise<T>, options: CacheOptions): Promise<T>;
    clearOrganization(organizationId: string): Promise<void>;
    cleanup(): Promise<void>;
    getCacheStats(): {
        memoryEntries: number;
        memorySize: string;
        hitRate?: number;
    };
    private evictOldestMemoryEntries;
}
export declare const cacheService: TenantAwareCacheService;
export { TenantAwareCacheService };
//# sourceMappingURL=cache.d.ts.map