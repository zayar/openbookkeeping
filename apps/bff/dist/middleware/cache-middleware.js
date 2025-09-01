"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensiveOperationRateLimit = exports.authRateLimit = exports.apiRateLimit = exports.invalidateAllOrgCache = exports.invalidateBankAccountsCache = exports.invalidateInvoicesCache = exports.invalidateCustomersCache = exports.invalidateItemsCache = exports.invalidateAccountsCache = exports.invoicesCacheMiddleware = exports.organizationsCacheMiddleware = exports.metricsCacheMiddleware = exports.vendorsCacheMiddleware = exports.bankAccountsCacheMiddleware = exports.customersCacheMiddleware = exports.itemsCacheMiddleware = exports.accountsCacheMiddleware = void 0;
exports.cacheMiddleware = cacheMiddleware;
exports.orgCacheMiddleware = orgCacheMiddleware;
exports.userCacheMiddleware = userCacheMiddleware;
exports.paginatedCacheMiddleware = paginatedCacheMiddleware;
exports.invalidateCacheMiddleware = invalidateCacheMiddleware;
exports.rateLimitMiddleware = rateLimitMiddleware;
const redis_cache_1 = require("../services/redis-cache");
const logger_1 = require("../utils/logger");
function cacheMiddleware(options = {}) {
    const { ttl = redis_cache_1.CACHE_TTL.ACCOUNTS, keyGenerator = (req) => `${req.method}:${req.path}`, condition = () => true, invalidateOn = [] } = options;
    return async (req, res, next) => {
        if (!condition(req)) {
            return next();
        }
        if (req.method !== 'GET') {
            return next();
        }
        const orgId = req.auth?.organizationId;
        if (!orgId) {
            return next();
        }
        const cacheKey = keyGenerator(req);
        try {
            const cachedData = await redis_cache_1.cacheService.getOrgData(orgId, cacheKey);
            if (cachedData) {
                logger_1.logger.debug('Cache hit', { orgId, cacheKey });
                return res.json(cachedData);
            }
            logger_1.logger.debug('Cache miss', { orgId, cacheKey });
            const originalJson = res.json.bind(res);
            res.json = function (data) {
                if (res.statusCode === 200 && data) {
                    redis_cache_1.cacheService.setOrgData(orgId, cacheKey, data, ttl)
                        .catch(error => logger_1.logger.error('Cache set error', { error }));
                }
                return originalJson(data);
            };
            next();
        }
        catch (error) {
            logger_1.logger.error('Cache middleware error', { error, orgId, cacheKey });
            next();
        }
    };
}
function orgCacheMiddleware(key, ttl = redis_cache_1.CACHE_TTL.ACCOUNTS) {
    return cacheMiddleware({
        ttl,
        keyGenerator: () => key,
        condition: (req) => Boolean(req.auth?.organizationId)
    });
}
function userCacheMiddleware(key, ttl = redis_cache_1.CACHE_TTL.USER_SESSION) {
    return cacheMiddleware({
        ttl,
        keyGenerator: (req) => `user:${req.auth?.userId}:${key}`,
        condition: (req) => Boolean(req.auth?.userId)
    });
}
function paginatedCacheMiddleware(baseKey, ttl = redis_cache_1.CACHE_TTL.ACCOUNTS) {
    return cacheMiddleware({
        ttl,
        keyGenerator: (req) => {
            const { page = 1, limit = 50, sort, filter } = req.query;
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(sort && { sort: sort.toString() }),
                ...(filter && { filter: filter.toString() })
            });
            return `${baseKey}:${params.toString()}`;
        }
    });
}
function invalidateCacheMiddleware(patterns) {
    return async (req, res, next) => {
        const orgId = req.auth?.organizationId;
        if (!orgId) {
            return next();
        }
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                patterns.forEach(pattern => {
                    redis_cache_1.cacheService.invalidateOrgPattern(orgId, pattern)
                        .catch(error => logger_1.logger.error('Cache invalidation error', { error, pattern }));
                });
            }
            return originalJson(data);
        };
        next();
    };
}
exports.accountsCacheMiddleware = orgCacheMiddleware('accounts', redis_cache_1.CACHE_TTL.ACCOUNTS);
exports.itemsCacheMiddleware = orgCacheMiddleware('items', redis_cache_1.CACHE_TTL.ITEMS);
exports.customersCacheMiddleware = orgCacheMiddleware('customers', redis_cache_1.CACHE_TTL.CUSTOMERS);
exports.bankAccountsCacheMiddleware = orgCacheMiddleware('bank-accounts', redis_cache_1.CACHE_TTL.BANK_ACCOUNTS);
exports.vendorsCacheMiddleware = orgCacheMiddleware('vendors', redis_cache_1.CACHE_TTL.VENDORS);
exports.metricsCacheMiddleware = orgCacheMiddleware('metrics', redis_cache_1.CACHE_TTL.METRICS);
exports.organizationsCacheMiddleware = cacheMiddleware({
    ttl: redis_cache_1.CACHE_TTL.ORGANIZATIONS,
    keyGenerator: () => 'organizations',
    condition: () => true
});
exports.invoicesCacheMiddleware = paginatedCacheMiddleware('invoices', redis_cache_1.CACHE_TTL.INVOICES);
exports.invalidateAccountsCache = invalidateCacheMiddleware([
    'accounts*',
    'metrics*',
    'summary*'
]);
exports.invalidateItemsCache = invalidateCacheMiddleware([
    'items*',
    'metrics*'
]);
exports.invalidateCustomersCache = invalidateCacheMiddleware([
    'customers*',
    'metrics*'
]);
exports.invalidateInvoicesCache = invalidateCacheMiddleware([
    'invoices*',
    'metrics*',
    'summary*'
]);
exports.invalidateBankAccountsCache = invalidateCacheMiddleware([
    'bank-accounts*',
    'metrics*'
]);
exports.invalidateAllOrgCache = invalidateCacheMiddleware(['*']);
function rateLimitMiddleware(options) {
    const { limit, window, keyGenerator = (req) => req.ip, skipSuccessfulRequests = false } = options;
    return async (req, res, next) => {
        const identifier = keyGenerator(req);
        try {
            const result = await redis_cache_1.cacheService.checkRateLimit(identifier, limit, window);
            res.set({
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
            });
            if (!result.allowed) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Rate limit middleware error', { error, identifier });
            next();
        }
    };
}
exports.apiRateLimit = rateLimitMiddleware({
    limit: 100,
    window: 60,
    keyGenerator: (req) => `api:${req.ip}`
});
exports.authRateLimit = rateLimitMiddleware({
    limit: 5,
    window: 300,
    keyGenerator: (req) => `auth:${req.ip}`
});
exports.expensiveOperationRateLimit = rateLimitMiddleware({
    limit: 10,
    window: 60,
    keyGenerator: (req) => `expensive:${req.auth?.userId || req.ip}`
});
//# sourceMappingURL=cache-middleware.js.map