import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { oaClient } from './oaClient'

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

      // Auto-generate String IDs for models with String @id when missing
      const modelsWithStringId = new Set([
        'accounts','api_keys','audit_logs','bank_accounts','bank_transactions','cache_entries','customers',
        'inventory_layers','inventory_movements','inventory_opening_balances','inventory_transfer_items',
        'inventory_transfers','invoice_items','invoice_payments','invoices','journal_entries','journals',
        'organization_invitations','organization_members','organization_profiles','organization_settings',
        'organizations','products','salespersons','sessions','sync_status','taxes','user_preferences','users',
        'vendors','warehouses','warehouse_permissions','year_end_closing_runs','reconciliation_runs',
        'reconciliation_variances','idempotency_keys'
      ])

      CloudSQLPrismaService.instance.$use(async (params, next) => {
        const { model, action } = params
        if (!model || !modelsWithStringId.has(model)) {
          return next(params)
        }

        // create
        if (action === 'create') {
          if (!params.args?.data?.id) {
            params.args.data.id = uuidv4()
          }
          if (params.args?.data && params.args.data.updatedAt === undefined) {
            params.args.data.updatedAt = new Date()
          }
        }

        // createMany
        if (action === 'createMany' && Array.isArray(params.args?.data)) {
          params.args.data = params.args.data.map((row: any) => ({
            id: row.id || uuidv4(),
            updatedAt: row.updatedAt ?? new Date(),
            ...row,
          }))
        }

        // upsert (ensure create has id)
        if (action === 'upsert') {
          if (!params.args?.create?.id) {
            params.args.create.id = uuidv4()
          }
          if (params.args?.create && params.args.create.updatedAt === undefined) {
            params.args.create.updatedAt = new Date()
          }
          if (params.args?.update) {
            params.args.update.updatedAt = new Date()
          }
        }

        // update
        if (action === 'update') {
          if (params.args?.data) {
            params.args.data.updatedAt = new Date()
          }
        }

        // updateMany
        if (action === 'updateMany') {
          if (params.args?.data) {
            params.args.data.updatedAt = new Date()
          }
        }

        return next(params)
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
      openAccounting: boolean
    }
    timestamp: string
  }> {
    try {
      // Test Cloud SQL connection
      await prisma.$queryRaw`SELECT 1`
      
      logger.info('✅ Cloud SQL health check passed')
      
      const oaOk = await oaClient.healthCheck()
      const isHealthy = oaOk.success
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks: {
          cloudSQLDatabase: true,
          openAccounting: isHealthy
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
          cloudSQLDatabase: false,
          openAccounting: false
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
