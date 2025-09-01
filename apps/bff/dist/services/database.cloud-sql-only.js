"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.HealthService = exports.CloudSQLHealthService = exports.prisma = void 0;
exports.initializeCloudSQLDatabase = initializeCloudSQLDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
class CloudSQLPrismaService {
    static getInstance() {
        if (!CloudSQLPrismaService.instance) {
            const databaseUrl = process.env.BFF_DATABASE_URL;
            if (!databaseUrl) {
                throw new Error('BFF_DATABASE_URL environment variable is required');
            }
            if (!databaseUrl.includes('34.173.128.29')) {
                throw new Error(`❌ SECURITY: Only Cloud SQL connections allowed. Current URL does not point to Cloud SQL (34.173.128.29)`);
            }
            logger_1.logger.info('🔒 Initializing Cloud SQL connection ONLY', {
                host: '34.173.128.29',
                database: 'cashflowdb',
                user: 'cashflowadmin'
            });
            CloudSQLPrismaService.instance = new client_1.PrismaClient({
                log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
                datasources: {
                    db: {
                        url: databaseUrl
                    }
                }
            });
            process.on('beforeExit', async () => {
                await CloudSQLPrismaService.instance.$disconnect();
            });
        }
        return CloudSQLPrismaService.instance;
    }
    static async disconnect() {
        if (CloudSQLPrismaService.instance) {
            await CloudSQLPrismaService.instance.$disconnect();
        }
    }
}
exports.prisma = CloudSQLPrismaService.getInstance();
class CloudSQLHealthService {
    static async getSystemHealth() {
        try {
            await exports.prisma.$queryRaw `SELECT 1`;
            logger_1.logger.info('✅ Cloud SQL health check passed');
            return {
                status: 'healthy',
                checks: {
                    cloudSQLDatabase: true
                },
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Cloud SQL health check failed:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                host: '34.173.128.29',
                database: 'cashflowdb'
            });
            return {
                status: 'unhealthy',
                checks: {
                    cloudSQLDatabase: false
                },
                timestamp: new Date().toISOString()
            };
        }
    }
    static async testConnection() {
        try {
            await exports.prisma.$queryRaw `SELECT 1 as test`;
            logger_1.logger.info('✅ Cloud SQL connection test successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error('❌ Cloud SQL connection test failed:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                host: '34.173.128.29'
            });
            return false;
        }
    }
}
exports.CloudSQLHealthService = CloudSQLHealthService;
async function initializeCloudSQLDatabase() {
    try {
        logger_1.logger.info('🚀 Initializing Cloud SQL database connection...');
        const databaseUrl = process.env.BFF_DATABASE_URL;
        if (!databaseUrl?.includes('34.173.128.29')) {
            throw new Error('❌ SECURITY: Only Cloud SQL connections allowed');
        }
        const isConnected = await CloudSQLHealthService.testConnection();
        if (!isConnected) {
            throw new Error('❌ Failed to connect to Cloud SQL');
        }
        logger_1.logger.info('✅ Cloud SQL database initialized successfully', {
            host: '34.173.128.29',
            database: 'cashflowdb',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialize Cloud SQL database:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            host: '34.173.128.29',
            database: 'cashflowdb'
        });
        throw error;
    }
}
exports.HealthService = CloudSQLHealthService;
exports.initializeDatabase = initializeCloudSQLDatabase;
//# sourceMappingURL=database.cloud-sql-only.js.map