import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// =============================================
// BFF DATABASE (Prisma) - Application Data
// =============================================

class PrismaService {
  private static instance: PrismaClient
  
  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.BFF_DATABASE_URL
          }
        }
      })

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await PrismaService.instance.$disconnect()
      })
    }
    
    return PrismaService.instance
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await PrismaService.getInstance().$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.error('BFF Database health check failed:', error)
      return false
    }
  }
}

export const prisma = PrismaService.getInstance()

// =============================================
// ORGANIZATION & TENANT MANAGEMENT
// =============================================

export class OrganizationService {
  /**
   * Create a new organization with OA mapping
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

    logger.info(`Created organization: ${organization.name} (${organization.id})`)
    return organization
  }

  /**
   * Get organization by OA organization ID
   */
  static async getByOAId(oaOrganizationId: string) {
    return prisma.organization.findUnique({
      where: { oaOrganizationId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })
  }

  /**
   * Get user's organizations
   */
  static async getUserOrganizations(userId: string) {
    return prisma.organization.findMany({
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
    })
  }

  /**
   * Check if user has access to organization
   */
  static async hasAccess(userId: string, organizationId: string): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    })

    return member?.status === 'active'
  }

  /**
   * Get user's role in organization
   */
  static async getUserRole(userId: string, organizationId: string): Promise<string | null> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    })

    return member?.role || null
  }
}

// =============================================
// CACHING SERVICE
// =============================================

export class CacheService {
  /**
   * Set cache entry with optional expiration
   */
  static async set(key: string, value: any, expiresInSeconds?: number, tags?: string[]) {
    const expiresAt = expiresInSeconds 
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : undefined

    await prisma.cacheEntry.upsert({
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
    })
  }

  /**
   * Get cache entry
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const entry = await prisma.cacheEntry.findUnique({
      where: { key }
    })

    if (!entry) return null

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await prisma.cacheEntry.delete({ where: { key } })
      return null
    }

    return entry.value as T
  }

  /**
   * Delete cache entry
   */
  static async delete(key: string) {
    await prisma.cacheEntry.deleteMany({
      where: { key }
    })
  }

  /**
   * Delete cache entries by tags
   */
  static async deleteByTags(tags: string[]) {
    // For MySQL with JSON arrays, we need to use raw query or find another approach
    const entries = await prisma.cacheEntry.findMany({
      where: {
        tags: {
          not: null
        }
      }
    })

    const entriesToDelete = entries.filter(entry => {
      const entryTags = Array.isArray(entry.tags) ? entry.tags : []
      return tags.some(tag => entryTags.includes(tag))
    })

    if (entriesToDelete.length > 0) {
      await prisma.cacheEntry.deleteMany({
        where: {
          id: {
            in: entriesToDelete.map(e => e.id)
          }
        }
      })
    }
  }

  /**
   * Clean expired cache entries
   */
  static async cleanup() {
    const deleted = await prisma.cache_entries.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    logger.info(`Cleaned up ${deleted.count} expired cache entries`)
    return deleted.count
  }
}

// =============================================
// AUDIT LOGGING
// =============================================

export class AuditService {
  /**
   * Log user action
   */
  static async log(data: {
    organizationId: string
    userId?: string
    action: string
    resource: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
    method?: string
    url?: string
    oldValues?: any
    newValues?: any
    metadata?: any
  }) {
    await prisma.auditLog.create({
      data
    })
  }

  /**
   * Get audit logs for organization
   */
  static async getOrganizationLogs(
    organizationId: string,
    options: {
      limit?: number
      offset?: number
      userId?: string
      action?: string
      resource?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ) {
    const where: any = { organizationId }

    if (options.userId) where.userId = options.userId
    if (options.action) where.action = options.action
    if (options.resource) where.resource = options.resource
    if (options.startDate || options.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    })
  }
}

// =============================================
// SYNC STATUS MANAGEMENT
// =============================================

export class SyncService {
  /**
   * Update sync status
   */
  static async updateStatus(
    organizationId: string,
    resource: string,
    status: 'pending' | 'syncing' | 'completed' | 'failed',
    metadata?: {
      recordsProcessed?: number
      totalRecords?: number
      errorMessage?: string
    }
  ) {
    await prisma.syncStatus.upsert({
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
    })
  }

  /**
   * Get sync status for organization
   */
  static async getOrganizationStatus(organizationId: string) {
    return prisma.syncStatus.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' }
    })
  }

  /**
   * Check if resource needs sync
   */
  static async needsSync(organizationId: string, resource: string): Promise<boolean> {
    const status = await prisma.syncStatus.findUnique({
      where: {
        organizationId_resource: {
          organizationId,
          resource
        }
      }
    })

    if (!status) return true

    // Check if last sync was more than SYNC_INTERVAL_MINUTES ago
    const syncIntervalMs = (parseInt(process.env.SYNC_INTERVAL_MINUTES || '30') * 60 * 1000)
    const lastSync = status.lastSyncAt
    
    if (!lastSync) return true
    
    return (Date.now() - lastSync.getTime()) > syncIntervalMs
  }
}

// =============================================
// HEALTH CHECKS
// =============================================

export class HealthService {
  static async getSystemHealth() {
    const checks = {
      bffDatabase: await PrismaService.healthCheck(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || 'unknown'
    }

    const isHealthy = Object.values(checks).every(check => 
      typeof check === 'boolean' ? check : true
    )

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks
    }
  }
}

// =============================================
// DATABASE INITIALIZATION
// =============================================

export async function initializeDatabase() {
  try {
    // Test BFF database connection
    await prisma.$connect()
    logger.info('BFF Database connected successfully')

    // Run any pending migrations in production
    if (process.env.NODE_ENV === 'production') {
      // This would typically be done in deployment pipeline
      // await prisma.$executeRaw`/* migration commands */`
    }

    // Clean up expired cache entries on startup
    await CacheService.cleanup()
    
    return true
  } catch (error) {
    logger.error('Failed to initialize BFF database:', error)
    throw error
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})
