"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = exports.EnhancedPrismaService = exports.prisma = exports.EnhancedHealthService = exports.AuditService = exports.SecureOrganizationService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
class EnhancedPrismaService {
    static getInstance() {
        if (!EnhancedPrismaService.instance) {
            EnhancedPrismaService.instance = new client_1.PrismaClient({
                log: process.env.NODE_ENV === 'development'
                    ? ['query', 'info', 'warn', 'error']
                    : ['error'],
                datasources: {
                    db: {
                        url: process.env.BFF_DATABASE_URL
                    }
                },
                __internal: {
                    engine: {
                        connectionLimit: EnhancedPrismaService.maxConnections,
                        poolTimeout: 10000,
                        idleTimeout: 300000,
                    }
                }
            });
            EnhancedPrismaService.instance.$on('error', (error) => {
                logger_1.logger.error('Prisma error event', { error });
            });
            EnhancedPrismaService.instance.$on('query', (event) => {
                if (event.duration > 1000) {
                    logger_1.logger.warn('Slow query detected', {
                        query: event.query,
                        params: event.params,
                        duration: `${event.duration}ms`,
                        target: event.target
                    });
                }
            });
            const gracefulShutdown = async () => {
                logger_1.logger.info('Shutting down database connections...');
                await EnhancedPrismaService.instance.$disconnect();
                process.exit(0);
            };
            process.on('SIGINT', gracefulShutdown);
            process.on('SIGTERM', gracefulShutdown);
            process.on('beforeExit', async () => {
                await EnhancedPrismaService.instance.$disconnect();
            });
        }
        return EnhancedPrismaService.instance;
    }
    static async healthCheck() {
        try {
            const startTime = Date.now();
            await EnhancedPrismaService.getInstance().$queryRaw `SELECT 1 as health_check`;
            const latency = Date.now() - startTime;
            return {
                healthy: true,
                connectionCount: EnhancedPrismaService.connectionCount,
                latency
            };
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return {
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async executeWithRetry(operation, context, maxRetries = 2) {
        const { requestId, organizationId, operation } = context;
        let lastError;
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                const startTime = Date.now();
                const result = await operation();
                const duration = Date.now() - startTime;
                if (attempt > 1) {
                    logger_1.logger.info('Database operation succeeded after retry', {
                        requestId,
                        organizationId,
                        operation,
                        attempt,
                        duration: `${duration}ms`
                    });
                }
                return result;
            }
            catch (error) {
                lastError = error;
                logger_1.logger.warn('Database operation failed', {
                    requestId,
                    organizationId,
                    operation,
                    attempt,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                if (error instanceof Error && 'code' in error) {
                    const prismaError = error;
                    if (prismaError.code === 'P2002' || prismaError.code === 'P2025') {
                        throw error;
                    }
                }
                if (attempt <= maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
}
exports.EnhancedPrismaService = EnhancedPrismaService;
EnhancedPrismaService.connectionCount = 0;
EnhancedPrismaService.maxConnections = 25;
class SecureOrganizationService {
    static async hasAccess(userId, organizationId) {
        try {
            const membership = await exports.prisma.organizationMember.findFirst({
                where: {
                    userId,
                    organizationId,
                    status: 'active'
                }
            });
            return !!membership;
        }
        catch (error) {
            logger_1.logger.error('Failed to check organization access', {
                userId,
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    static async getUserRole(userId, organizationId) {
        try {
            const membership = await exports.prisma.organizationMember.findFirst({
                where: {
                    userId,
                    organizationId,
                    status: 'active'
                },
                select: { role: true }
            });
            return membership?.role || null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user role', {
                userId,
                organizationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    static async getUserOrganizations(userId, options = {}) {
        const { limit = 20, offset = 0 } = options;
        try {
            const organizations = await exports.prisma.organization.findMany({
                where: {
                    members: {
                        some: {
                            userId,
                            status: 'active'
                        }
                    }
                },
                include: {
                    members: {
                        where: { userId },
                        select: {
                            role: true,
                            status: true,
                            joinedAt: true
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { name: 'asc' }
            });
            return organizations;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user organizations', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    static async createOrganization(data) {
        try {
            const organization = await exports.prisma.organization.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    description: data.description,
                    oaOrganizationId: data.oaOrganizationId,
                    baseCurrency: data.baseCurrency || 'MMK',
                    timezone: data.timezone || 'Asia/Yangon',
                    members: {
                        create: {
                            userId: data.ownerId,
                            role: 'owner',
                            status: 'active'
                        }
                    }
                },
                include: {
                    members: {
                        include: {
                            user: true
                        }
                    }
                }
            });
            logger_1.logger.info('Organization created successfully', {
                organizationId: organization.id,
                name: organization.name,
                ownerId: data.ownerId
            });
            return organization;
        }
        catch (error) {
            logger_1.logger.error('Failed to create organization', {
                data,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
exports.SecureOrganizationService = SecureOrganizationService;
exports.OrganizationService = SecureOrganizationService;
class AuditService {
    static async log(data) {
        try {
            await exports.prisma.auditLog.create({
                data: {
                    organizationId: data.organizationId,
                    userId: data.userId,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    oldValues: data.oldValues,
                    newValues: data.newValues,
                    metadata: {
                        requestId: data.requestId
                    }
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to write audit log', {
                ...data,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.AuditService = AuditService;
class EnhancedHealthService {
    static async getSystemHealth() {
        const timestamp = new Date().toISOString();
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        const version = process.env.npm_package_version || '1.0.0';
        const dbHealth = await EnhancedPrismaService.healthCheck();
        const checks = {
            bffDatabase: dbHealth.healthy,
        };
        let status;
        if (checks.bffDatabase) {
            status = 'healthy';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            timestamp,
            uptime,
            checks,
            version,
            memory
        };
    }
}
exports.EnhancedHealthService = EnhancedHealthService;
exports.prisma = EnhancedPrismaService.getInstance();
//# sourceMappingURL=database.v2.js.map