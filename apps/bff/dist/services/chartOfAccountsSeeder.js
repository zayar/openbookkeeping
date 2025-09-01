"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountsSeeder = void 0;
const chartOfAccounts_1 = require("../data/chartOfAccounts");
const logger_1 = require("../utils/logger");
class ChartOfAccountsSeeder {
    static async seedDefaultAccounts(organizationId, baseCurrency = 'MMK') {
        const createdAccounts = [];
        try {
            logger_1.logger.info('Starting to seed default chart of accounts', {
                organizationId,
                baseCurrency,
                accountCount: chartOfAccounts_1.defaultChartOfAccounts.length
            });
            const sortedAccounts = this.sortAccountsByHierarchy(chartOfAccounts_1.defaultChartOfAccounts);
            for (const account of sortedAccounts) {
                try {
                    const createdAccount = await this.createAccount(organizationId, account, baseCurrency);
                    if (createdAccount) {
                        createdAccounts.push(createdAccount);
                        logger_1.logger.debug('Created account successfully', {
                            accountCode: account.code,
                            accountName: account.name
                        });
                    }
                }
                catch (error) {
                    logger_1.logger.warn('Failed to create account', {
                        accountCode: account.code,
                        accountName: account.name,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            logger_1.logger.info('Completed seeding default chart of accounts', {
                organizationId,
                totalAccounts: chartOfAccounts_1.defaultChartOfAccounts.length,
                createdAccounts: createdAccounts.length
            });
            return createdAccounts;
        }
        catch (error) {
            logger_1.logger.error('Failed to seed default chart of accounts', {
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    static async createAccount(organizationId, account, baseCurrency) {
        try {
            const baseUrl = process.env.OA_BASE_URL;
            if (!baseUrl) {
                throw new Error('OA_BASE_URL environment variable not set');
            }
            const response = await fetch(`${baseUrl}/organizations/${organizationId}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: account.name,
                    parent: account.parentCode || '0',
                    currency: baseCurrency,
                    precision: 2,
                    debitBalance: this.isDebitBalanceAccount(account.type)
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create account: ${response.status} ${errorText}`);
            }
            const createdAccount = await response.json();
            return {
                id: createdAccount.id,
                code: account.code,
                name: account.name,
                type: account.type,
                parentCode: account.parentCode,
                description: account.description,
                organizationId
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating account', {
                accountCode: account.code,
                accountName: account.name,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    static sortAccountsByHierarchy(accounts) {
        const accountMap = new Map();
        const rootAccounts = [];
        const childAccounts = [];
        for (const account of accounts) {
            accountMap.set(account.code, account);
            if (account.parentCode) {
                childAccounts.push(account);
            }
            else {
                rootAccounts.push(account);
            }
        }
        const sortedAccounts = [...rootAccounts];
        for (const child of childAccounts) {
            const parentIndex = sortedAccounts.findIndex(acc => acc.code === child.parentCode);
            if (parentIndex !== -1) {
                sortedAccounts.splice(parentIndex + 1, 0, child);
            }
            else {
                sortedAccounts.push(child);
            }
        }
        return sortedAccounts;
    }
    static isDebitBalanceAccount(accountType) {
        const debitBalanceTypes = [
            'other_asset', 'other_current_asset', 'cash', 'bank', 'fixed_asset',
            'accounts_receivable', 'stock', 'payment_clearing_account', 'input_tax',
            'intangible_asset', 'non_current_asset', 'deferred_tax_asset',
            'expense', 'cost_of_goods_sold', 'other_expense'
        ];
        return debitBalanceTypes.includes(accountType);
    }
    static getDefaultChartSummary() {
        const summary = {
            totalAccounts: chartOfAccounts_1.defaultChartOfAccounts.length,
            assetAccounts: 0,
            liabilityAccounts: 0,
            equityAccounts: 0,
            incomeAccounts: 0,
            expenseAccounts: 0
        };
        for (const account of chartOfAccounts_1.defaultChartOfAccounts) {
            if (account.type.includes('asset')) {
                summary.assetAccounts++;
            }
            else if (account.type.includes('liability')) {
                summary.liabilityAccounts++;
            }
            else if (account.type.includes('equity')) {
                summary.equityAccounts++;
            }
            else if (account.type.includes('income')) {
                summary.incomeAccounts++;
            }
            else if (account.type.includes('expense')) {
                summary.expenseAccounts++;
            }
        }
        return summary;
    }
    static validateDefaultChart() {
        const requiredTypes = [
            'cash', 'bank', 'accounts_receivable', 'accounts_payable',
            'equity', 'income', 'expense'
        ];
        const presentTypes = new Set(chartOfAccounts_1.defaultChartOfAccounts.map(acc => acc.type));
        const missingTypes = requiredTypes.filter(type => !presentTypes.has(type));
        return {
            isValid: missingTypes.length === 0,
            missingTypes
        };
    }
}
exports.ChartOfAccountsSeeder = ChartOfAccountsSeeder;
//# sourceMappingURL=chartOfAccountsSeeder.js.map