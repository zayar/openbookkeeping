"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oaClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = require("../utils/logger");
const database_1 = require("./database");
class OpenAccountingClient {
    constructor(config = {}) {
        this.config = {
            baseUrl: process.env.OA_BASE_URL || 'http://localhost:8080',
            apiKey: process.env.OA_API_KEY || '',
            acceptVersion: process.env.OA_ACCEPT_VERSION || '1.4.0',
            timeout: 30000,
            ...config
        };
    }
    async request(endpoint, options = {}) {
        const url = `${this.config.baseUrl}${endpoint}`;
        const { method = 'GET', body, headers = {}, organizationId } = options;
        try {
            const requestHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Version': this.config.acceptVersion,
                ...headers
            };
            if (this.config.apiKey) {
                requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
            }
            if (organizationId) {
                requestHeaders['X-Organization-ID'] = organizationId;
            }
            logger_1.logger.debug(`OA API Request: ${method} ${url}`, {
                headers: { ...requestHeaders, Authorization: '[REDACTED]' },
                body: body ? JSON.stringify(body).substring(0, 200) + '...' : undefined
            });
            const response = await (0, node_fetch_1.default)(url, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
                timeout: this.config.timeout
            });
            const responseText = await response.text();
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            }
            catch {
                responseData = responseText;
            }
            logger_1.logger.debug(`OA API Response: ${response.status}`, {
                status: response.status,
                data: JSON.stringify(responseData).substring(0, 200) + '...'
            });
            return {
                success: response.ok,
                data: responseData,
                error: response.ok ? undefined : responseData?.error || `HTTP ${response.status}`,
                status: response.status
            };
        }
        catch (error) {
            logger_1.logger.error(`OA API Error: ${method} ${url}`, error);
            return {
                success: false,
                error: error.message || 'Network error',
                status: 0
            };
        }
    }
    async createOrganization(data) {
        return this.request('/organizations', {
            method: 'POST',
            body: data
        });
    }
    async getOrganization(organizationId) {
        return this.request(`/organizations/${organizationId}`, {
            organizationId
        });
    }
    async getAccounts(organizationId, cached = true) {
        const cacheKey = `oa:accounts:${organizationId}`;
        if (cached) {
            const cachedData = await database_1.CacheService.get(cacheKey);
            if (cachedData)
                return { success: true, data: cachedData, status: 200 };
        }
        const response = await this.request('/accounts', {
            organizationId
        });
        if (response.success) {
            await database_1.CacheService.set(cacheKey, response.data, 300, [`org:${organizationId}`, 'accounts']);
        }
        return response;
    }
    async createAccount(organizationId, data) {
        const response = await this.request('/accounts', {
            method: 'POST',
            body: data,
            organizationId
        });
        if (response.success) {
            await database_1.CacheService.deleteByTags([`org:${organizationId}`, 'accounts']);
        }
        return response;
    }
    async healthCheck() {
        try {
            const response = await this.request('/health');
            return response.success;
        }
        catch {
            return false;
        }
    }
}
exports.oaClient = new OpenAccountingClient();
//# sourceMappingURL=oaClient.js.map