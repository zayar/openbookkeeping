import { OAAccount, OATransaction, OAOrganization, CreateTransactionRequest, ApiResponse } from '@/types';
export declare class OpenAccountingService {
    private baseUrl;
    private apiVersion;
    constructor();
    private makeRequest;
    getOrganizations(): Promise<ApiResponse<OAOrganization[]>>;
    getOrganization(orgId: string): Promise<ApiResponse<OAOrganization>>;
    createOrganization(data: {
        name: string;
        currency: string;
        precision?: number;
    }): Promise<ApiResponse<OAOrganization>>;
    updateOrganization(orgId: string, data: Partial<OAOrganization>): Promise<ApiResponse<OAOrganization>>;
    getAccounts(orgId: string): Promise<ApiResponse<OAAccount[]>>;
    getAccount(orgId: string, accountId: string): Promise<ApiResponse<OAAccount>>;
    createAccount(orgId: string, data: {
        name: string;
        parent?: string;
        currency?: string;
        precision?: number;
        debitBalance?: boolean;
    }): Promise<ApiResponse<OAAccount>>;
    updateAccount(orgId: string, accountId: string, data: Partial<OAAccount>): Promise<ApiResponse<OAAccount>>;
    deleteAccount(orgId: string, accountId: string): Promise<ApiResponse<void>>;
    getTransactions(orgId: string, options?: {
        limit?: number;
        offset?: number;
        accountId?: string;
    }): Promise<ApiResponse<OATransaction[]>>;
    createTransaction(orgId: string, data: CreateTransactionRequest): Promise<ApiResponse<OATransaction>>;
    updateTransaction(orgId: string, transactionId: string, data: Partial<CreateTransactionRequest>): Promise<ApiResponse<OATransaction>>;
    deleteTransaction(orgId: string, transactionId: string): Promise<ApiResponse<void>>;
    createInvoiceTransaction(orgId: string, customerArAccountId: string, revenueAccountId: string, amount: number, description: string, date?: string): Promise<ApiResponse<OATransaction>>;
    createBillTransaction(orgId: string, vendorApAccountId: string, expenseAccountId: string, amount: number, description: string, date?: string): Promise<ApiResponse<OATransaction>>;
    createPaymentReceiveTransaction(orgId: string, bankAccountId: string, customerArAccountId: string, amount: number, description: string, date?: string): Promise<ApiResponse<OATransaction>>;
    createPaymentPayTransaction(orgId: string, vendorApAccountId: string, bankAccountId: string, amount: number, description: string, date?: string): Promise<ApiResponse<OATransaction>>;
    createExpenseTransaction(orgId: string, expenseAccountId: string, bankAccountId: string, amount: number, description: string, date?: string): Promise<ApiResponse<OATransaction>>;
}
//# sourceMappingURL=openAccounting.d.ts.map