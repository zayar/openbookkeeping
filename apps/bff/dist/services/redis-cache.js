"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CACHE_TTL = exports.RedisCacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class RedisCacheService {
    constructor() {
        this.isConnected = false;
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keyPrefix: 'openaccounting:',
            connectTimeout: 10000,
            commandTimeout: 5000,
        });
        this.setupEventHandlers();
    }
    static getInstance() {
        if (!RedisCacheService.instance) {
            RedisCacheService.instance = new RedisCacheService();
        }
        return RedisCacheService.instance;
    }
    setupEventHandlers() {
        this.redis.on('connect', () => {
            logger_1.logger.info('Redis connected successfully');
            this.isConnected = true;
        });
        this.redis.on('error', (error) => {
            logger_1.logger.error('Redis connection error', { error });
            this.isConnected = false;
        });
        this.redis.on('close', () => {
            logger_1.logger.warn('Redis connection closed');
            this.isConnected = false;
        });
    }
    async getOrgData(orgId, key) {
        try {
            if (!this.isConnected)
                return null;
            const cacheKey = `org:${orgId}:${key}`;
            const data = await this.redis.get(cacheKey);
            if (data) {
                logger_1.logger.debug('Cache hit', { orgId, key });
                return JSON.parse(data);
            }
            logger_1.logger.debug('Cache miss', { orgId, key });
            return null;
        }
        catch (error) {
            logger_1.logger.error('Redis get error', { orgId, key, error });
            return null;
        }
    }
    async setOrgData(orgId, key, data, ttl = 3600) {
        try {
            if (!this.isConnected)
                return;
            const cacheKey = `org:${orgId}:${key}`;
            await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
            logger_1.logger.debug('Cache set', { orgId, key, ttl });
        }
        catch (error) {
            logger_1.logger.error('Redis set error', { orgId, key, error });
        }
    }
    async deleteOrgData(orgId, key) {
        try {
            if (!this.isConnected)
                return;
            const cacheKey = `org:${orgId}:${key}`;
            await this.redis.del(cacheKey);
            logger_1.logger.debug('Cache deleted', { orgId, key });
        }
        catch (error) {
            logger_1.logger.error('Redis delete error', { orgId, key, error });
        }
    }
    async invalidateOrgPattern(orgId, pattern) {
        try {
            if (!this.isConnected)
                return;
            const searchPattern = `openaccounting:org:${orgId}:${pattern}`;
            const keys = await this.redis.keys(searchPattern);
            if (keys.length > 0) {
                const keysToDelete = keys.map(key => key.replace('openaccounting:', ''));
                await this.redis.del(...keysToDelete);
                logger_1.logger.info('Cache pattern invalidated', { orgId, pattern, count: keys.length });
            }
        }
        catch (error) {
            logger_1.logger.error('Redis pattern invalidation error', { orgId, pattern, error });
        }
    }
    async setUserSession(userId, sessionData, ttl = 86400) {
        try {
            if (!this.isConnected)
                return;
            const sessionKey = `session:${userId}`;
            await this.redis.setex(sessionKey, ttl, JSON.stringify(sessionData));
            logger_1.logger.debug('User session stored', { userId });
        }
        catch (error) {
            logger_1.logger.error('Redis session set error', { userId, error });
        }
    }
    async getUserSession(userId) {
        try {
            if (!this.isConnected)
                return null;
            const sessionKey = `session:${userId}`;
            const data = await this.redis.get(sessionKey);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            logger_1.logger.error('Redis session get error', { userId, error });
            return null;
        }
    }
    async deleteUserSession(userId) {
        try {
            if (!this.isConnected)
                return;
            const sessionKey = `session:${userId}`;
            await this.redis.del(sessionKey);
            logger_1.logger.debug('User session deleted', { userId });
        }
        catch (error) {
            logger_1.logger.error('Redis session delete error', { userId, error });
        }
    }
    async cacheMetrics(orgId, metrics, ttl = 300) {
        await this.setOrgData(orgId, 'metrics', metrics, ttl);
    }
    async getCachedMetrics(orgId) {
        return await this.getOrgData(orgId, 'metrics');
    }
    async checkRateLimit(identifier, limit, window) {
        try {
            if (!this.isConnected) {
                return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
            }
            const key = `ratelimit:${identifier}`;
            const current = await this.redis.incr(key);
            if (current === 1) {
                await this.redis.expire(key, window);
            }
            const ttl = await this.redis.ttl(key);
            const resetTime = Date.now() + ttl * 1000;
            return {
                allowed: current <= limit,
                remaining: Math.max(0, limit - current),
                resetTime
            };
        }
        catch (error) {
            logger_1.logger.error('Rate limit check error', { identifier, error });
            return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
        }
    }
    async publish(channel, message) {
        try {
            if (!this.isConnected)
                return;
            await this.redis.publish(channel, JSON.stringify(message));
            logger_1.logger.debug('Message published', { channel });
        }
        catch (error) {
            logger_1.logger.error('Redis publish error', { channel, error });
        }
    }
    async subscribe(channel, callback) {
        try {
            const subscriber = this.redis.duplicate();
            subscriber.subscribe(channel);
            subscriber.on('message', (receivedChannel, message) => {
                if (receivedChannel === channel) {
                    try {
                        const parsedMessage = JSON.parse(message);
                        callback(parsedMessage);
                    }
                    catch (error) {
                        logger_1.logger.error('Message parsing error', { channel, error });
                    }
                }
            });
            logger_1.logger.info('Subscribed to channel', { channel });
        }
        catch (error) {
            logger_1.logger.error('Redis subscribe error', { channel, error });
        }
    }
    async healthCheck() {
        try {
            const start = Date.now();
            await this.redis.ping();
            const latency = Date.now() - start;
            return { healthy: true, latency };
        }
        catch (error) {
            return {
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getStats() {
        try {
            if (!this.isConnected)
                return null;
            const info = await this.redis.info();
            const memory = await this.redis.info('memory');
            const stats = await this.redis.info('stats');
            return { info, memory, stats };
        }
        catch (error) {
            logger_1.logger.error('Redis stats error', { error });
            return null;
        }
    }
    async disconnect() {
        try {
            await this.redis.quit();
            logger_1.logger.info('Redis disconnected gracefully');
        }
        catch (error) {
            logger_1.logger.error('Redis disconnect error', { error });
        }
    }
}
exports.RedisCacheService = RedisCacheService;
exports.CACHE_TTL = {
    ACCOUNTS: 3600,
    ORGANIZATIONS: 7200,
    BANK_ACCOUNTS: 3600,
    ITEMS: 1800,
    CUSTOMERS: 900,
    VENDORS: 900,
    METRICS: 300,
    INVOICES: 60,
    TRANSACTIONS: 60,
    USER_SESSION: 86400,
    NOTIFICATIONS: 30,
    RATES: 3600,
};
exports.cacheService = RedisCacheService.getInstance();
//# sourceMappingURL=redis-cache.js.map