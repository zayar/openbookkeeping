import { Request, Response, NextFunction } from 'express';
interface CacheOptions {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request) => boolean;
    invalidateOn?: string[];
}
export declare function cacheMiddleware(options?: CacheOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function orgCacheMiddleware(key: string, ttl?: number): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function userCacheMiddleware(key: string, ttl?: number): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function paginatedCacheMiddleware(baseKey: string, ttl?: number): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function invalidateCacheMiddleware(patterns: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const accountsCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const itemsCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const customersCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const bankAccountsCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const vendorsCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const metricsCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const organizationsCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const invoicesCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const invalidateAccountsCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateItemsCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateCustomersCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateInvoicesCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateBankAccountsCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateAllOrgCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
interface RateLimitOptions {
    limit: number;
    window: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
}
export declare function rateLimitMiddleware(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const expensiveOperationRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=cache-middleware.d.ts.map