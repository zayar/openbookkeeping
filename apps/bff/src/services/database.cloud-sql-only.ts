import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// =============================================
// CLOUD SQL ONLY DATABASE SERVICE
// =============================================

class CloudSQLPrismaService {
  private static instance: PrismaClient
  
  static getInstance(): PrismaClient {
    if (!CloudSQLPrismaService.instance) {
      const databaseUrl = process.env.BFF_DATABASE_URL
      
      if (!databaseUrl) {
        throw new Error('BFF_DATABASE_URL environment variable is required')
      }

      // Ensure we're connecting to Cloud SQL only
      if (!databaseUrl.includes('34.173.128.29')) {
        throw new Error(`❌ SECURITY: Only Cloud SQL connections allowed. Current URL does not point to Cloud SQL (34.173.128.29)`)
      }

      logger.info('🔒 Initializing Cloud SQL connection ONLY', {
        host: '34.173.128.29',
        database: 'cashflowdb',
        user: 'cashflowadmin'
      })

      CloudSQLPrismaService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      })

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await CloudSQLPrismaService.instance.$disconnect()
      })
    }
    
    return CloudSQLPrismaService.instance
  }

  static async disconnect() {
    if (CloudSQLPrismaService.instance) {
      await CloudSQLPrismaService.instance.$disconnect()
    }
  }
}

// Export singleton instance
export const prisma = CloudSQLPrismaService.getInstance()

// =============================================
// CLOUD SQL HEALTH SERVICE
// =============================================

export class CloudSQLHealthService {
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'unhealthy'
    checks: {
      cloudSQLDatabase: boolean
    }
    timestamp: string
  }> {
    try {
      // Test Cloud SQL connection
      await prisma.$queryRaw`SELECT 1`
      
      logger.info('✅ Cloud SQL health check passed')
      
      return {
        status: 'healthy',
        checks: {
          cloudSQLDatabase: true
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error('❌ Cloud SQL health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: '34.173.128.29',
        database: 'cashflowdb'
      })
      
      return {
        status: 'unhealthy',
        checks: {
          cloudSQLDatabase: false
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      logger.info('✅ Cloud SQL connection test successful')
      return true
    } catch (error) {
      logger.error('❌ Cloud SQL connection test failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: '34.173.128.29'
      })
      return false
    }
  }
}

// =============================================
// DATABASE INITIALIZATION (CLOUD SQL ONLY)
// =============================================

export async function initializeCloudSQLDatabase(): Promise<void> {
  try {
    logger.info('🚀 Initializing Cloud SQL database connection...')
    
    // Verify we're connecting to Cloud SQL
    const databaseUrl = process.env.BFF_DATABASE_URL
    if (!databaseUrl?.includes('34.173.128.29')) {
      throw new Error('❌ SECURITY: Only Cloud SQL connections allowed')
    }

    // Test connection
    const isConnected = await CloudSQLHealthService.testConnection()
    if (!isConnected) {
      throw new Error('❌ Failed to connect to Cloud SQL')
    }

    logger.info('✅ Cloud SQL database initialized successfully', {
      host: '34.173.128.29',
      database: 'cashflowdb',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('❌ Failed to initialize Cloud SQL database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      host: '34.173.128.29',
      database: 'cashflowdb'
    })
    throw error
  }
}

// Export health service for backward compatibility
export const HealthService = CloudSQLHealthService

// Export initialization function for backward compatibility
export const initializeDatabase = initializeCloudSQLDatabase
