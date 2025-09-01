import { prisma } from './database.cloud-sql-only'
import { logger } from '../utils/logger'

// =============================================
// AUDIT SERVICE - Cloud SQL Only
// =============================================

export interface AuditLogData {
  organizationId: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  oldValues?: any
  newValues?: any
  requestId?: string
}

export class AuditService {
  
  /**
   * Log audit event
   */
  static async log(data: AuditLogData) {
    try {
      const auditLog = await prisma.audit_logs.create({
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
      })

      logger.info('Audit log created', {
        auditId: auditLog.id,
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId
      })

      return auditLog
    } catch (error) {
      logger.error('Failed to create audit log:', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Don't throw error - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs for organization
   */
  static async getOrganizationLogs(
    organizationId: string,
    options: {
      limit?: number
      offset?: number
      resource?: string
      action?: string
      userId?: string
    } = {}
  ) {
    try {
      const {
        limit = 50,
        offset = 0,
        resource,
        action,
        userId
      } = options

      const where: any = { organizationId }
      if (resource) where.resource = resource
      if (action) where.action = action
      if (userId) where.userId = userId

      const [logs, total] = await Promise.all([
        prisma.audit_logs.findMany({
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
        prisma.audit_logs.count({ where })
      ])

      return {
        logs: logs.map(log => ({
          ...log,
          oldValues: log.oldValues ? JSON.parse(log.oldValues as string) : null,
          newValues: log.newValues ? JSON.parse(log.newValues as string) : null,
          metadata: log.metadata ? JSON.parse(log.metadata as string) : null
        })),
        total,
        hasMore: offset + limit < total
      }
    } catch (error) {
      logger.error('Failed to get audit logs:', {
        organizationId,
        options,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to get audit logs')
    }
  }

  /**
   * Get audit logs for specific resource
   */
  static async getResourceLogs(
    organizationId: string,
    resource: string,
    resourceId: string,
    limit: number = 20
  ) {
    try {
      const logs = await prisma.audit_logs.findMany({
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
      })

      return logs.map(log => ({
        ...log,
        oldValues: log.oldValues ? JSON.parse(log.oldValues as string) : null,
        newValues: log.newValues ? JSON.parse(log.newValues as string) : null,
        metadata: log.metadata ? JSON.parse(log.metadata as string) : null
      }))
    } catch (error) {
      logger.error('Failed to get resource audit logs:', {
        organizationId,
        resource,
        resourceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to get resource audit logs')
    }
  }
}
