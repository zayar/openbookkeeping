"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardenedOAClient = exports.oaClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = require("../utils/logger");
class HardenedOAClient {
    constructor(config = {}) {
        this.circuitBreaker = new Map();
        this.config = {
            baseUrl: process.env.OA_BASE_URL || 'http://localhost:8080',
            apiKey: process.env.OA_API_KEY || '',
            acceptVersion: process.env.OA_ACCEPT_VERSION || '1.4.0',
            timeout: 5000,
            retries: 3,
            retryDelay: 1000,
            circuitBreakerThreshold: 5,
            circuitBreakerTimeout: 30000,
            ...config
        };
    }
    async request(endpoint, options) {
        const { method = 'GET', body, headers = {}, organizationId, requestId, timeout } = options;
        const url = `${this.config.baseUrl}/organizations/${organizationId}${endpoint}`;
        const circuitKey = `${method}:${endpoint}`;
        if (this.isCircuitOpen(circuitKey)) {
            logger_1.logger.warn('Circuit breaker OPEN - rejecting request', {
                requestId,
                endpoint,
                method,
                organizationId
            });
            return {
                success: false,
                error: 'Service temporarily unavailable (circuit breaker open)',
                status: 503,
                duration: 0,
                retryCount: 0
            };
        }
        const startTime = Date.now();
        let retryCount = 0;
        let lastError;
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const requestHeaders = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Version': this.config.acceptVersion,
                    'X-Request-ID': requestId || 'unknown',
                    ...headers
                };
                if (this.config.apiKey) {
                    requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
                }
                requestHeaders['X-Organization-ID'] = organizationId;
                logger_1.logger.debug('OA API Request', {
                    requestId,
                    method,
                    url,
                    attempt: attempt + 1,
                    headers: { ...requestHeaders, Authorization: '[REDACTED]' }
                });
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout || this.config.timeout);
                const response = await (0, node_fetch_1.default)(url, {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                const responseText = await response.text();
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                }
                catch {
                    responseData = responseText;
                }
                logger_1.logger.debug('OA API Response', {
                    requestId,
                    method,
                    url,
                    status: response.status,
                    duration: `${duration}ms`,
                    attempt: attempt + 1
                });
                if (response.ok) {
                    this.recordSuccess(circuitKey);
                    return {
                        success: true,
                        data: responseData,
                        status: response.status,
                        duration,
                        retryCount
                    };
                }
                const error = this.mapOAError(response.status, responseData);
                if (response.status >= 400 && response.status < 500) {
                    this.recordSuccess(circuitKey);
                    return {
                        success: false,
                        error,
                        status: response.status,
                        duration,
                        retryCount
                    };
                }
                lastError = error;
                this.recordFailure(circuitKey);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                lastError = error.name === 'AbortError' ? 'Request timeout' : error.message;
                this.recordFailure(circuitKey);
                logger_1.logger.error('OA API Request failed', {
                    requestId,
                    method,
                    url,
                    attempt: attempt + 1,
                    error: lastError,
                    duration: `${duration}ms`
                });
            }
            if (attempt < this.config.retries) {
                retryCount++;
                const delay = this.config.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
                logger_1.logger.info('Retrying OA request', {
                    requestId,
                    method,
                    url,
                    attempt: attempt + 1,
                    delayMs: Math.round(delay)
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        const totalDuration = Date.now() - startTime;
        return {
            success: false,
            error: lastError || 'Request failed after retries',
            status: 0,
            duration: totalDuration,
            retryCount
        };
    }
    mapOAError(status, responseData) {
        const oaError = responseData?.error || responseData?.message || 'Unknown error';
        switch (status) {
            case 400:
                return `Invalid request: ${oaError}`;
            case 401:
                return 'OpenAccounting authentication failed';
            case 403:
                return 'Access denied to OpenAccounting resource';
            case 404:
                return 'Resource not found in OpenAccounting';
            case 409:
                return `Conflict: ${oaError}`;
            case 422:
                return `Validation failed: ${oaError}`;
            case 429:
                return 'OpenAccounting rate limit exceeded';
            case 500:
                return 'OpenAccounting server error';
            case 502:
            case 503:
            case 504:
                return 'OpenAccounting service unavailable';
            default:
                return `OpenAccounting error (${status}): ${oaError}`;
        }
    }
    isCircuitOpen(key) {
        const state = this.circuitBreaker.get(key);
        if (!state)
            return false;
        const now = Date.now();
        if (state.state === 'OPEN') {
            if (now - state.lastFailure > this.config.circuitBreakerTimeout) {
                state.state = 'HALF_OPEN';
                state.failures = 0;
                return false;
            }
            return true;
        }
        return false;
    }
    recordSuccess(key) {
        const state = this.circuitBreaker.get(key);
        if (state) {
            state.failures = 0;
            state.state = 'CLOSED';
        }
    }
    recordFailure(key) {
        const state = this.circuitBreaker.get(key) || {
            failures: 0,
            lastFailure: 0,
            state: 'CLOSED'
        };
        state.failures++;
        state.lastFailure = Date.now();
        if (state.failures >= this.config.circuitBreakerThreshold) {
            state.state = 'OPEN';
            logger_1.logger.warn('Circuit breaker OPENED', {
                key,
                failures: state.failures,
                threshold: this.config.circuitBreakerThreshold
            });
        }
        this.circuitBreaker.set(key, state);
    }
    async listAccounts(organizationId, options = {}) {
        const { limit = 20, offset = 0, requestId } = options;
        return this.request(`/accounts?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            organizationId,
            requestId
        });
    }
    async createAccount(organizationId, accountData, requestId) {
        return this.request('/accounts', {
            method: 'POST',
            organizationId,
            body: accountData,
            requestId
        });
    }
    async getAccount(organizationId, accountId, requestId) {
        return this.request(`/accounts/${accountId}`, {
            method: 'GET',
            organizationId,
            requestId
        });
    }
    async updateAccount(organizationId, accountId, updates, requestId) {
        return this.request(`/accounts/${accountId}`, {
            method: 'PUT',
            organizationId,
            body: updates,
            requestId
        });
    }
    async deleteAccount(organizationId, accountId, requestId) {
        return this.request(`/accounts/${accountId}`, {
            method: 'DELETE',
            organizationId,
            requestId
        });
    }
    async listTransactions(organizationId, options = {}) {
        const { limit = 20, offset = 0, startDate, endDate, requestId } = options;
        let query = `limit=${limit}&offset=${offset}`;
        if (startDate)
            query += `&startDate=${startDate}`;
        if (endDate)
            query += `&endDate=${endDate}`;
        return this.request(`/transactions?${query}`, {
            method: 'GET',
            organizationId,
            requestId
        });
    }
    async createOrganization(data, requestId) {
        return this.request('/organizations', {
            method: 'POST',
            organizationId: 'system',
            body: data,
            requestId
        });
    }
    async healthCheck(requestId) {
        const startTime = Date.now();
        try {
            const response = await (0, node_fetch_1.default)(`${this.config.baseUrl}/health`, {
                method: 'GET',
                timeout: 2000
            });
            const duration = Date.now() - startTime;
            const isHealthy = response.ok;
            return {
                success: isHealthy,
                data: { status: isHealthy ? 'healthy' : 'unhealthy' },
                status: response.status,
                duration,
                retryCount: 0
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                error: error.message || 'Health check failed',
                status: 0,
                duration,
                retryCount: 0
            };
        }
    }
    getCircuitBreakerStatus() {
        return Object.fromEntries(this.circuitBreaker.entries());
    }
}
exports.HardenedOAClient = HardenedOAClient;
exports.oaClient = new HardenedOAClient();
//# sourceMappingURL=oaClient.v2.js.map