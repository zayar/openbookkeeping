interface OAConfig {
    baseUrl: string;
    apiKey?: string;
    acceptVersion: string;
    timeout: number;
    retries: number;
    retryDelay: number;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
}
interface OAResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    status: number;
    duration: number;
    retryCount: number;
}
interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
declare class HardenedOAClient {
    private config;
    private circuitBreaker;
    constructor(config?: Partial<OAConfig>);
    request<T = any>(endpoint: string, options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        body?: any;
        headers?: Record<string, string>;
        organizationId: string;
        requestId?: string;
        timeout?: number;
    }): Promise<OAResponse<T>>;
    private mapOAError;
    private isCircuitOpen;
    private recordSuccess;
    private recordFailure;
    listAccounts(organizationId: string, options?: {
        limit?: number;
        offset?: number;
        requestId?: string;
    }): Promise<OAResponse>;
    createAccount(organizationId: string, accountData: {
        name: string;
        parent?: string;
        currency: string;
        precision?: number;
        debitBalance?: boolean;
    }, requestId?: string): Promise<OAResponse>;
    getAccount(organizationId: string, accountId: string, requestId?: string): Promise<OAResponse>;
    updateAccount(organizationId: string, accountId: string, updates: any, requestId?: string): Promise<OAResponse>;
    deleteAccount(organizationId: string, accountId: string, requestId?: string): Promise<OAResponse>;
    listTransactions(organizationId: string, options?: {
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
        requestId?: string;
    }): Promise<OAResponse>;
    createOrganization(data: {
        name: string;
        description?: string;
        currency?: string;
    }, requestId?: string): Promise<OAResponse>;
    healthCheck(requestId?: string): Promise<OAResponse>;
    getCircuitBreakerStatus(): Record<string, CircuitBreakerState>;
}
export declare const oaClient: HardenedOAClient;
export { HardenedOAClient };
//# sourceMappingURL=oaClient.v2.d.ts.map