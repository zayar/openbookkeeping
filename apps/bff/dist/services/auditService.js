"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const database_cloud_sql_only_1 = require("./database.cloud-sql-only");
const logger_1 = require("../utils/logger");
class AuditService {
    static async log(data) {
        try {
            const auditLog = await database_cloud_sql_only_1.prisma.audit_logs.create({
                data: {
                    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    organizationId: data.organizationId,
                    userId: data.userId,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
                    newValues: data.newValues ? JSON.stringify(data.newValues) : null,
                    metadata: data.requestId ? JSON.stringify({ requestId: data.requestId }) : null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            logger_1.logger.info('Audit log created', {
                auditId: auditLog.id,
                organizationId: data.organizationId,
                userId: data.userId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId
            });
            return auditLog;
        }
        catch (error) {
            logger_1.logger.error('Failed to create audit log:', {
                data,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async getOrganizationLogs(organizationId, options = {}) {
        try {
            const { limit = 50, offset = 0, resource, action, userId } = options;
            const where = { organizationId };
            if (resource)
                where.resource = resource;
            if (action)
                where.action = action;
            if (userId)
                where.userId = userId;
            const [logs, total] = await Promise.all([
                database_cloud_sql_only_1.prisma.audit_logs.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }),
                database_cloud_sql_only_1.prisma.audit_logs.count({ where })
            ]);
            return {
                logs: logs.map(log => ({
                    ...log,
                    oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
                    newValues: log.newValues ? JSON.parse(log.newValues) : null,
                    metadata: log.metadata ? JSON.parse(log.metadata) : null
                })),
                total,
                hasMore: offset + limit < total
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get audit logs:', {
                organizationId,
                options,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to get audit logs');
        }
    }
    static async getResourceLogs(organizationId, resource, resourceId, limit = 20) {
        try {
            const logs = await database_cloud_sql_only_1.prisma.audit_logs.findMany({
                where: {
                    organizationId,
                    resource,
                    resourceId
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    users: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            return logs.map(log => ({
                ...log,
                oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
                newValues: log.newValues ? JSON.parse(log.newValues) : null,
                metadata: log.metadata ? JSON.parse(log.metadata) : null
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to get resource audit logs:', {
                organizationId,
                resource,
                resourceId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to get resource audit logs');
        }
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map