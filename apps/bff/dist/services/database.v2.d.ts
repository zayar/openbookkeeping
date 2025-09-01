import { PrismaClient } from '@prisma/client';
declare class EnhancedPrismaService {
    private static instance;
    private static connectionCount;
    private static maxConnections;
    static getInstance(): PrismaClient;
    static healthCheck(): Promise<{
        healthy: boolean;
        connectionCount?: number;
        latency?: number;
        error?: string;
    }>;
    static executeWithRetry<T>(operation: () => Promise<T>, context: {
        requestId: string;
        organizationId: string;
        operation: string;
    }, maxRetries?: number): Promise<T>;
}
export declare class SecureOrganizationService {
    static hasAccess(userId: string, organizationId: string): Promise<boolean>;
    static getUserRole(userId: string, organizationId: string): Promise<string | null>;
    static getUserOrganizations(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    static createOrganization(data: {
        name: string;
        slug: string;
        description?: string;
        ownerId: string;
        oaOrganizationId: string;
        baseCurrency?: string;
        timezone?: string;
    }): Promise<any>;
}
export declare class AuditService {
    static log(data: {
        organizationId: string;
        userId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        oldValues?: any;
        newValues?: any;
        requestId?: string;
    }): Promise<void>;
}
export declare class EnhancedHealthService {
    static getSystemHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        timestamp: string;
        uptime: number;
        checks: {
            bffDatabase: boolean;
            oaServer?: boolean;
            circuitBreakers?: Record<string, any>;
        };
        version: string;
        memory: NodeJS.MemoryUsage;
    }>;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { EnhancedPrismaService, SecureOrganizationService as OrganizationService };
//# sourceMappingURL=database.v2.d.ts.map