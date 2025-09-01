import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// =============================================
// ENHANCED DATABASE SERVICE V2
// =============================================

class EnhancedPrismaService {
  private static instance: PrismaClient
  private static connectionCount = 0
  private static maxConnections = 25
  
  static getInstance(): PrismaClient {
    if (!EnhancedPrismaService.instance) {
      EnhancedPrismaService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error'] 
          : ['error'],
        datasources: {
          db: {
            url: process.env.BFF_DATABASE_URL
          }
        },
        // Enhanced connection pooling
        __internal: {
          engine: {
            connectionLimit: EnhancedPrismaService.maxConnections,
            poolTimeout: 10000, // 10s
            idleTimeout: 300000, // 5min
          }
        }
      })

      // Enhanced error handling
      EnhancedPrismaService.instance.$on('error', (error) => {
        logger.error('Prisma error event', { error })
      })

      // Connection monitoring
      EnhancedPrismaService.instance.$on('query', (event) => {
        if (event.duration > 1000) { // Log slow queries
          logger.warn('Slow query detected', {
            query: event.query,
            params: event.params,
            duration: `${event.duration}ms`,
            target: event.target
          })
        }
      })

      // Graceful shutdown handling
      const gracefulShutdown = async () => {
        logger.info('Shutting down database connections...')
        await EnhancedPrismaService.instance.$disconnect()
        process.exit(0)
      }

      process.on('SIGINT', gracefulShutdown)
      process.on('SIGTERM', gracefulShutdown)
      process.on('beforeExit', async () => {
        await EnhancedPrismaService.instance.$disconnect()
      })
    }
    
    return EnhancedPrismaService.instance
  }

  static async healthCheck(): Promise<{
    healthy: boolean
    connectionCount?: number
    latency?: number
    error?: string
  }> {
    try {
      const startTime = Date.now()
      await EnhancedPrismaService.getInstance().$queryRaw`SELECT 1 as health_check`
      const latency = Date.now() - startTime
      
      return {
        healthy: true,
        connectionCount: EnhancedPrismaService.connectionCount,
        latency
      }
    } catch (error) {
      logger.error('Database health check failed:', error)
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Execute query with automatic retry and monitoring
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      requestId: string
      organizationId: string
      operation: string
    },
    maxRetries = 2
  ): Promise<T> {
    const { requestId, organizationId, operation } = context
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const startTime = Date.now()
        const result = await operation()
        const duration = Date.now() - startTime

        if (attempt > 1) {
          logger.info('Database operation succeeded after retry', {
            requestId,
            organizationId,
            operation,
            attempt,
            duration: `${duration}ms`
          })
        }

        return result
      } catch (error) {
        lastError = error
        
        logger.warn('Database operation failed', {
          requestId,
          organizationId,
          operation,
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        // Don't retry on validation errors
        if (error instanceof Error && 'code' in error) {
          const prismaError = error as any
          if (prismaError.code === 'P2002' || prismaError.code === 'P2025') {
            throw error // Don't retry constraint violations or not found
          }
        }

        if (attempt <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}

// =============================================
// TENANT-AWARE ORGANIZATION SERVICE
// =============================================

export class SecureOrganizationService {
  /**
   * Verify user has access to organization
   */
  static async hasAccess(userId: string, organizationId: string): Promise<boolean> {
    try {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId,
          status: 'active'
        }
      })
      
      return !!membership
    } catch (error) {
      logger.error('Failed to check organization access', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get user's role in organization
   */
  static async getUserRole(userId: string, organizationId: string): Promise<string | null> {
    try {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId,
          status: 'active'
        },
        select: { role: true }
      })
      
      return membership?.role || null
    } catch (error) {
      logger.error('Failed to get user role', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Get user's organizations with pagination
   */
  static async getUserOrganizations(userId: string, options: {
    limit?: number
    offset?: number
  } = {}): Promise<any[]> {
    const { limit = 20, offset = 0 } = options
    
    try {
      const organizations = await prisma.organization.findMany({
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
      })
      
      return organizations
    } catch (error) {
      logger.error('Failed to get user organizations', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return []
    }
  }

  /**
   * Create organization with proper tenant setup
   */
  static async createOrganization(data: {
    name: string
    slug: string
    description?: string
    ownerId: string
    oaOrganizationId: string
    baseCurrency?: string
    timezone?: string
  }) {
    try {
      const organization = await prisma.organization.create({
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
      })

      logger.info('Organization created successfully', {
        organizationId: organization.id,
        name: organization.name,
        ownerId: data.ownerId
      })
      
      return organization
    } catch (error) {
      logger.error('Failed to create organization', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// =============================================
// AUDIT SERVICE FOR COMPLIANCE
// =============================================

export class AuditService {
  static async log(data: {
    organizationId: string
    userId?: string
    action: string
    resource: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
    oldValues?: any
    newValues?: any
    requestId?: string
  }) {
    try {
      await prisma.auditLog.create({
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
      })
    } catch (error) {
      logger.error('Failed to write audit log', {
        ...data,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Don't throw - audit logging shouldn't break business operations
    }
  }
}

// =============================================
// ENHANCED HEALTH SERVICE
// =============================================

export class EnhancedHealthService {
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    checks: {
      bffDatabase: boolean
      oaServer?: boolean
      circuitBreakers?: Record<string, any>
    }
    version: string
    memory: NodeJS.MemoryUsage
  }> {
    const timestamp = new Date().toISOString()
    const uptime = process.uptime()
    const memory = process.memoryUsage()
    const version = process.env.npm_package_version || '1.0.0'

    // Check BFF database
    const dbHealth = await EnhancedPrismaService.healthCheck()
    
    // TODO: Check OA server health
    // const oaHealth = await oaClient.healthCheck()

    const checks = {
      bffDatabase: dbHealth.healthy,
      // oaServer: oaHealth.success
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (checks.bffDatabase) {
      status = 'healthy'
    } else {
      status = 'unhealthy'
    }

    return {
      status,
      timestamp,
      uptime,
      checks,
      version,
      memory
    }
  }
}

// Export singleton instance
export const prisma = EnhancedPrismaService.getInstance()
export { EnhancedPrismaService, SecureOrganizationService as OrganizationService }
