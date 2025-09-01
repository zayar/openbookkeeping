"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = exports.SyncService = exports.AuditService = exports.CacheService = exports.OrganizationService = exports.prisma = void 0;
exports.initializeDatabase = initializeDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
class PrismaService {
    static getInstance() {
        if (!PrismaService.instance) {
            PrismaService.instance = new client_1.PrismaClient({
                log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
                datasources: {
                    db: {
                        url: process.env.BFF_DATABASE_URL
                    }
                }
            });
            process.on('beforeExit', async () => {
                await PrismaService.instance.$disconnect();
            });
        }
        return PrismaService.instance;
    }
    static async healthCheck() {
        try {
            await PrismaService.getInstance().$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            logger_1.logger.error('BFF Database health check failed:', error);
            return false;
        }
    }
}
exports.prisma = PrismaService.getInstance();
class OrganizationService {
    static async createOrganization(data) {
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
        logger_1.logger.info(`Created organization: ${organization.name} (${organization.id})`);
        return organization;
    }
    static async getByOAId(oaOrganizationId) {
        return exports.prisma.organization.findUnique({
            where: { oaOrganizationId },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });
    }
    static async getUserOrganizations(userId) {
        return exports.prisma.organization.findMany({
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
                    include: {
                        user: true
                    }
                }
            }
        });
    }
    static async hasAccess(userId, organizationId) {
        const member = await exports.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId
                }
            }
        });
        return member?.status === 'active';
    }
    static async getUserRole(userId, organizationId) {
        const member = await exports.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId
                }
            }
        });
        return member?.role || null;
    }
}
exports.OrganizationService = OrganizationService;
class CacheService {
    static async set(key, value, expiresInSeconds, tags) {
        const expiresAt = expiresInSeconds
            ? new Date(Date.now() + expiresInSeconds * 1000)
            : undefined;
        await exports.prisma.cacheEntry.upsert({
            where: { key },
            create: {
                key,
                value,
                expiresAt,
                tags: tags || []
            },
            update: {
                value,
                expiresAt,
                tags: tags || [],
                updatedAt: new Date()
            }
        });
    }
    static async get(key) {
        const entry = await exports.prisma.cacheEntry.findUnique({
            where: { key }
        });
        if (!entry)
            return null;
        if (entry.expiresAt && entry.expiresAt < new Date()) {
            await exports.prisma.cacheEntry.delete({ where: { key } });
            return null;
        }
        return entry.value;
    }
    static async delete(key) {
        await exports.prisma.cacheEntry.deleteMany({
            where: { key }
        });
    }
    static async deleteByTags(tags) {
        const entries = await exports.prisma.cacheEntry.findMany({
            where: {
                tags: {
                    not: null
                }
            }
        });
        const entriesToDelete = entries.filter(entry => {
            const entryTags = Array.isArray(entry.tags) ? entry.tags : [];
            return tags.some(tag => entryTags.includes(tag));
        });
        if (entriesToDelete.length > 0) {
            await exports.prisma.cacheEntry.deleteMany({
                where: {
                    id: {
                        in: entriesToDelete.map(e => e.id)
                    }
                }
            });
        }
    }
    static async cleanup() {
        const deleted = await exports.prisma.cache_entries.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
        logger_1.logger.info(`Cleaned up ${deleted.count} expired cache entries`);
        return deleted.count;
    }
}
exports.CacheService = CacheService;
class AuditService {
    static async log(data) {
        await exports.prisma.auditLog.create({
            data
        });
    }
    static async getOrganizationLogs(organizationId, options = {}) {
        const where = { organizationId };
        if (options.userId)
            where.userId = options.userId;
        if (options.action)
            where.action = options.action;
        if (options.resource)
            where.resource = options.resource;
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate)
                where.createdAt.gte = options.startDate;
            if (options.endDate)
                where.createdAt.lte = options.endDate;
        }
        return exports.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options.limit || 50,
            skip: options.offset || 0
        });
    }
}
exports.AuditService = AuditService;
class SyncService {
    static async updateStatus(organizationId, resource, status, metadata) {
        await exports.prisma.syncStatus.upsert({
            where: {
                organizationId_resource: {
                    organizationId,
                    resource
                }
            },
            create: {
                organizationId,
                resource,
                status,
                recordsProcessed: metadata?.recordsProcessed || 0,
                totalRecords: metadata?.totalRecords || 0,
                errorMessage: metadata?.errorMessage
            },
            update: {
                status,
                lastSyncAt: status === 'completed' ? new Date() : undefined,
                recordsProcessed: metadata?.recordsProcessed,
                totalRecords: metadata?.totalRecords,
                errorMessage: metadata?.errorMessage,
                updatedAt: new Date()
            }
        });
    }
    static async getOrganizationStatus(organizationId) {
        return exports.prisma.syncStatus.findMany({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' }
        });
    }
    static async needsSync(organizationId, resource) {
        const status = await exports.prisma.syncStatus.findUnique({
            where: {
                organizationId_resource: {
                    organizationId,
                    resource
                }
            }
        });
        if (!status)
            return true;
        const syncIntervalMs = (parseInt(process.env.SYNC_INTERVAL_MINUTES || '30') * 60 * 1000);
        const lastSync = status.lastSyncAt;
        if (!lastSync)
            return true;
        return (Date.now() - lastSync.getTime()) > syncIntervalMs;
    }
}
exports.SyncService = SyncService;
class HealthService {
    static async getSystemHealth() {
        const checks = {
            bffDatabase: await PrismaService.healthCheck(),
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || 'unknown'
        };
        const isHealthy = Object.values(checks).every(check => typeof check === 'boolean' ? check : true);
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            checks
        };
    }
}
exports.HealthService = HealthService;
async function initializeDatabase() {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('BFF Database connected successfully');
        if (process.env.NODE_ENV === 'production') {
        }
        await CacheService.cleanup();
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize BFF database:', error);
        throw error;
    }
}
process.on('SIGTERM', async () => {
    logger_1.logger.info('Received SIGTERM, shutting down gracefully');
    await exports.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('Received SIGINT, shutting down gracefully');
    await exports.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=database.js.map