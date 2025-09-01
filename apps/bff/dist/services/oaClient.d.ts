interface OAConfig {
    baseUrl: string;
    apiKey?: string;
    acceptVersion: string;
    timeout: number;
}
interface OAResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    status: number;
}
declare class OpenAccountingClient {
    private config;
    constructor(config?: Partial<OAConfig>);
    private request;
    createOrganization(data: {
        name: string;
        description?: string;
        currency?: string;
    }): Promise<OAResponse<any>>;
    getOrganization(organizationId: string): Promise<OAResponse<any>>;
    getAccounts(organizationId: string, cached?: boolean): Promise<OAResponse<any>>;
    createAccount(organizationId: string, data: {
        name: string;
        type: string;
        code?: string;
        description?: string;
        parent?: string;
    }): Promise<OAResponse<any>>;
    healthCheck(): Promise<boolean>;
}
export declare const oaClient: OpenAccountingClient;
export {};
//# sourceMappingURL=oaClient.d.ts.map