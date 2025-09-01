export declare class RedisCacheService {
    private static instance;
    private redis;
    private isConnected;
    private constructor();
    static getInstance(): RedisCacheService;
    private setupEventHandlers;
    getOrgData<T>(orgId: string, key: string): Promise<T | null>;
    setOrgData<T>(orgId: string, key: string, data: T, ttl?: number): Promise<void>;
    deleteOrgData(orgId: string, key: string): Promise<void>;
    invalidateOrgPattern(orgId: string, pattern: string): Promise<void>;
    setUserSession(userId: string, sessionData: any, ttl?: number): Promise<void>;
    getUserSession(userId: string): Promise<any | null>;
    deleteUserSession(userId: string): Promise<void>;
    cacheMetrics(orgId: string, metrics: any, ttl?: number): Promise<void>;
    getCachedMetrics(orgId: string): Promise<any | null>;
    checkRateLimit(identifier: string, limit: number, window: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    publish(channel: string, message: any): Promise<void>;
    subscribe(channel: string, callback: (message: any) => void): Promise<void>;
    healthCheck(): Promise<{
        healthy: boolean;
        latency?: number;
        error?: string;
    }>;
    getStats(): Promise<any>;
    disconnect(): Promise<void>;
}
export declare const CACHE_TTL: {
    readonly ACCOUNTS: 3600;
    readonly ORGANIZATIONS: 7200;
    readonly BANK_ACCOUNTS: 3600;
    readonly ITEMS: 1800;
    readonly CUSTOMERS: 900;
    readonly VENDORS: 900;
    readonly METRICS: 300;
    readonly INVOICES: 60;
    readonly TRANSACTIONS: 60;
    readonly USER_SESSION: 86400;
    readonly NOTIFICATIONS: 30;
    readonly RATES: 3600;
};
export declare const cacheService: RedisCacheService;
//# sourceMappingURL=redis-cache.d.ts.map