export interface AuditLogData {
    organizationId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    oldValues?: any;
    newValues?: any;
    requestId?: string;
}
export declare class AuditService {
    static log(data: AuditLogData): Promise<{
        url: string | null;
        userId: string | null;
        organizationId: string;
        id: string;
        createdAt: Date;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        method: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    } | undefined>;
    static getOrganizationLogs(organizationId: string, options?: {
        limit?: number;
        offset?: number;
        resource?: string;
        action?: string;
        userId?: string;
    }): Promise<{
        logs: {
            oldValues: any;
            newValues: any;
            metadata: any;
            url: string | null;
            userId: string | null;
            organizationId: string;
            id: string;
            createdAt: Date;
            action: string;
            resource: string;
            resourceId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            method: string | null;
        }[];
        total: number;
        hasMore: boolean;
    }>;
    static getResourceLogs(organizationId: string, resource: string, resourceId: string, limit?: number): Promise<{
        oldValues: any;
        newValues: any;
        metadata: any;
        url: string | null;
        userId: string | null;
        organizationId: string;
        id: string;
        createdAt: Date;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        method: string | null;
    }[]>;
}
//# sourceMappingURL=auditService.d.ts.map