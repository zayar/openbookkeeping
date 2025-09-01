export interface SeededAccount {
    id: string;
    code: string;
    name: string;
    type: string;
    parentCode?: string;
    description?: string;
    organizationId: string;
}
export declare class ChartOfAccountsSeeder {
    static seedDefaultAccounts(organizationId: string, baseCurrency?: string): Promise<SeededAccount[]>;
    private static createAccount;
    private static sortAccountsByHierarchy;
    private static isDebitBalanceAccount;
    static getDefaultChartSummary(): {
        totalAccounts: number;
        assetAccounts: number;
        liabilityAccounts: number;
        equityAccounts: number;
        incomeAccounts: number;
        expenseAccounts: number;
    };
    static validateDefaultChart(): {
        isValid: boolean;
        missingTypes: string[];
    };
}
//# sourceMappingURL=chartOfAccountsSeeder.d.ts.map