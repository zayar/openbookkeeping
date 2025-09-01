import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare class OrganizationService {
    static createOrganization(data: {
        name: string;
        slug: string;
        description?: string;
        ownerId: string;
        oaOrganizationId: string;
        baseCurrency?: string;
        timezone?: string;
    }): Promise<any>;
    static getByOAId(oaOrganizationId: string): Promise<any>;
    static getUserOrganizations(userId: string): Promise<any>;
    static hasAccess(userId: string, organizationId: string): Promise<boolean>;
    static getUserRole(userId: string, organizationId: string): Promise<string | null>;
}
export declare class CacheService {
    static set(key: string, value: any, expiresInSeconds?: number, tags?: string[]): Promise<void>;
    static get<T = any>(key: string): Promise<T | null>;
    static delete(key: string): Promise<void>;
    static deleteByTags(tags: string[]): Promise<void>;
    static cleanup(): Promise<number>;
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
        method?: string;
        url?: string;
        oldValues?: any;
        newValues?: any;
        metadata?: any;
    }): Promise<void>;
    static getOrganizationLogs(organizationId: string, options?: {
        limit?: number;
        offset?: number;
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<any>;
}
export declare class SyncService {
    static updateStatus(organizationId: string, resource: string, status: 'pending' | 'syncing' | 'completed' | 'failed', metadata?: {
        recordsProcessed?: number;
        totalRecords?: number;
        errorMessage?: string;
    }): Promise<void>;
    static getOrganizationStatus(organizationId: string): Promise<any>;
    static needsSync(organizationId: string, resource: string): Promise<boolean>;
}
export declare class HealthService {
    static getSystemHealth(): Promise<{
        status: string;
        checks: {
            bffDatabase: boolean;
            timestamp: string;
            uptime: number;
            memory: NodeJS.MemoryUsage;
            version: string;
        };
    }>;
}
export declare function initializeDatabase(): Promise<boolean>;
//# sourceMappingURL=database.d.ts.map