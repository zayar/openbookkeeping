import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare class CloudSQLHealthService {
    static getSystemHealth(): Promise<{
        status: 'healthy' | 'unhealthy';
        checks: {
            cloudSQLDatabase: boolean;
        };
        timestamp: string;
    }>;
    static testConnection(): Promise<boolean>;
}
export declare function initializeCloudSQLDatabase(): Promise<void>;
export declare const HealthService: typeof CloudSQLHealthService;
export declare const initializeDatabase: typeof initializeCloudSQLDatabase;
//# sourceMappingURL=database.cloud-sql-only.d.ts.map