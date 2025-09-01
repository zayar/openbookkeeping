"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAccountingService = void 0;
const logger_1 = require("@/utils/logger");
class OpenAccountingService {
    constructor() {
        this.baseUrl = process.env.OA_SERVER_URL || 'https://oa-server-291129507535.us-central1.run.app';
        this.apiVersion = '1.4.0';
    }
    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const headers = {
                'Accept-Version': this.apiVersion,
                'Content-Type': 'application/json',
                ...options.headers,
            };
            logger_1.logger.info(`Making request to OA Server: ${options.method || 'GET'} ${url}`);
            const response = await fetch(url, {
                ...options,
                headers,
            });
            const data = await response.json();
            if (!response.ok) {
                logger_1.logger.error(`OA Server error: ${response.status} ${response.statusText}`, data);
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}: ${response.statusText}`,
                };
            }
            return {
                success: true,
                data,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to make request to OA Server:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async getOrganizations() {
        return this.makeRequest('/orgs');
    }
    async getOrganization(orgId) {
        return this.makeRequest(`/orgs/${orgId}`);
    }
    async createOrganization(data) {
        return this.makeRequest('/orgs', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async updateOrganization(orgId, data) {
        return this.makeRequest(`/orgs/${orgId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async getAccounts(orgId) {
        return this.makeRequest(`/orgs/${orgId}/accounts`);
    }
    async getAccount(orgId, accountId) {
        return this.makeRequest(`/orgs/${orgId}/accounts/${accountId}`);
    }
    async createAccount(orgId, data) {
        return this.makeRequest(`/orgs/${orgId}/accounts`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async updateAccount(orgId, accountId, data) {
        return this.makeRequest(`/orgs/${orgId}/accounts/${accountId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async deleteAccount(orgId, accountId) {
        return this.makeRequest(`/orgs/${orgId}/accounts/${accountId}`, {
            method: 'DELETE',
        });
    }
    async getTransactions(orgId, options) {
        const searchParams = new URLSearchParams();
        if (options?.limit)
            searchParams.set('limit', options.limit.toString());
        if (options?.offset)
            searchParams.set('offset', options.offset.toString());
        if (options?.accountId)
            searchParams.set('accountId', options.accountId);
        const query = searchParams.toString();
        const endpoint = `/orgs/${orgId}/transactions${query ? `?${query}` : ''}`;
        return this.makeRequest(endpoint);
    }
    async createTransaction(orgId, data) {
        const totalDebits = data.splits
            .filter(split => split.amount > 0)
            .reduce((sum, split) => sum + split.amount, 0);
        const totalCredits = data.splits
            .filter(split => split.amount < 0)
            .reduce((sum, split) => sum + Math.abs(split.amount), 0);
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            return {
                success: false,
                error: `Transaction not balanced: debits ${totalDebits} != credits ${totalCredits}`,
            };
        }
        return this.makeRequest(`/orgs/${orgId}/transactions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async updateTransaction(orgId, transactionId, data) {
        return this.makeRequest(`/orgs/${orgId}/transactions/${transactionId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async deleteTransaction(orgId, transactionId) {
        return this.makeRequest(`/orgs/${orgId}/transactions/${transactionId}`, {
            method: 'DELETE',
        });
    }
    async createInvoiceTransaction(orgId, customerArAccountId, revenueAccountId, amount, description, date = new Date().toISOString().split('T')[0]) {
        return this.createTransaction(orgId, {
            date,
            description,
            splits: [
                {
                    accountId: customerArAccountId,
                    amount: amount,
                },
                {
                    accountId: revenueAccountId,
                    amount: -amount,
                }
            ]
        });
    }
    async createBillTransaction(orgId, vendorApAccountId, expenseAccountId, amount, description, date = new Date().toISOString().split('T')[0]) {
        return this.createTransaction(orgId, {
            date,
            description,
            splits: [
                {
                    accountId: expenseAccountId,
                    amount: amount,
                },
                {
                    accountId: vendorApAccountId,
                    amount: -amount,
                }
            ]
        });
    }
    async createPaymentReceiveTransaction(orgId, bankAccountId, customerArAccountId, amount, description, date = new Date().toISOString().split('T')[0]) {
        return this.createTransaction(orgId, {
            date,
            description,
            splits: [
                {
                    accountId: bankAccountId,
                    amount: amount,
                },
                {
                    accountId: customerArAccountId,
                    amount: -amount,
                }
            ]
        });
    }
    async createPaymentPayTransaction(orgId, vendorApAccountId, bankAccountId, amount, description, date = new Date().toISOString().split('T')[0]) {
        return this.createTransaction(orgId, {
            date,
            description,
            splits: [
                {
                    accountId: vendorApAccountId,
                    amount: amount,
                },
                {
                    accountId: bankAccountId,
                    amount: -amount,
                }
            ]
        });
    }
    async createExpenseTransaction(orgId, expenseAccountId, bankAccountId, amount, description, date = new Date().toISOString().split('T')[0]) {
        return this.createTransaction(orgId, {
            date,
            description,
            splits: [
                {
                    accountId: expenseAccountId,
                    amount: amount,
                },
                {
                    accountId: bankAccountId,
                    amount: -amount,
                }
            ]
        });
    }
}
exports.OpenAccountingService = OpenAccountingService;
//# sourceMappingURL=openAccounting.js.map