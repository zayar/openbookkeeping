import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { validateQuery, validateBody, validateParams, requestContext } from '../middleware/validation'
import { 
  AccountSchema, 
  CreateAccountRequestSchema, 
  UpdateAccountRequestSchema,
  ListAccountsQuerySchema 
} from '../schemas/accounts'
import { CuidSchema } from '../schemas/common'
import { prisma } from '../services/database.cloud-sql-only'
import { oaClient } from '../services/oaClient.v2'
import { logger } from '../utils/logger'
import { z } from 'zod'

const router = express.Router()

// Add request context to all routes
router.use(requestContext)

// =============================================
// SECURE ACCOUNTS ENDPOINTS
// =============================================

/**
 * List accounts with pagination and tenant isolation
 * GET /api/accounts?page=1&limit=20&type=asset&search=bank
 */
router.get('/', 
  requireJwtAuth,
  validateQuery(ListAccountsQuerySchema),
  async (req, res) => {
    const { organizationId } = req.auth!
    const { page, limit, type, search, isActive, sortBy, sortOrder } = req.query
    const { requestId } = req

    try {
      // Build secure where clause with tenant isolation
      const where: any = { organizationId }
      
      if (type) where.type = type
      if (isActive !== undefined) where.isActive = isActive
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } }
        ]
      }

      // Calculate pagination
      const offset = (page - 1) * limit

      // Execute queries in parallel for performance
      const [accounts, total] = await Promise.all([
        prisma.ledger_accounts.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset
        }),
        prisma.ledger_accounts.count({ where })
      ])

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      logger.info('Accounts listed successfully', {
        requestId,
        organizationId,
        count: accounts.length,
        total,
        page,
        limit
      })

      res.json({
        success: true,
        data: accounts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        },
        timestamp: new Date().toISOString(),
        requestId
      })

    } catch (error) {
      logger.error('Failed to list accounts', {
        requestId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      })

      res.status(500).json({
        success: false,
        error: 'Failed to fetch accounts',
        code: 'BFF_DATABASE_ERROR',
        requestId
      })
    }
  }
)

/**
 * Create account with OA integration and validation
 * POST /api/accounts
 */
router.post('/',
  requireJwtAuth,
  validateBody(CreateAccountRequestSchema),
  async (req, res) => {
    const { organizationId } = req.auth!
    const { requestId } = req
    const accountData = req.body

    try {
      // Check for duplicate account code within organization
      const existingAccount = await prisma.ledger_accounts.findFirst({
        where: {
          organizationId,
          code: accountData.code
        }
      })

      if (existingAccount) {
        return res.status(409).json({
          success: false,
          error: 'Account code already exists in this organization',
          code: 'BFF_DUPLICATE_ACCOUNT_CODE',
          requestId
        })
      }

      // Create account in BFF database with tenant isolation
      const account = await prisma.ledger_accounts.create({
        data: {
          ...accountData,
          organizationId, // Ensure tenant isolation
          isActive: accountData.isActive ?? true
        }
      })

      logger.info('Account created successfully', {
        requestId,
        organizationId,
        accountId: account.id,
        accountCode: account.code
      })

      res.status(201).json({
        success: true,
        data: account,
        timestamp: new Date().toISOString(),
        requestId
      })

    } catch (error) {
      logger.error('Failed to create account', {
        requestId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        accountData
      })

      // Map Prisma errors to user-friendly messages
      if (error instanceof Error && 'code' in error) {
        if (error.code === 'P2002') {
          return res.status(409).json({
            success: false,
            error: 'Account code already exists',
            code: 'BFF_DUPLICATE_ACCOUNT_CODE',
            requestId
          })
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create account',
        code: 'BFF_DATABASE_ERROR',
        requestId
      })
    }
  }
)

/**
 * Get account by ID with tenant isolation
 * GET /api/accounts/:id
 */
router.get('/:id',
  requireJwtAuth,
  validateParams(z.object({ id: CuidSchema })),
  async (req, res) => {
    const { organizationId } = req.auth!
    const { id } = req.params
    const { requestId } = req

    try {
      const account = await prisma.ledger_accounts.findFirst({
        where: { 
          id,
          organizationId // CRITICAL: Tenant isolation
        }
      })

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
          code: 'BFF_RESOURCE_NOT_FOUND',
          requestId
        })
      }

      logger.info('Account retrieved successfully', {
        requestId,
        organizationId,
        accountId: account.id
      })

      res.json({
        success: true,
        data: account,
        timestamp: new Date().toISOString(),
        requestId
      })

    } catch (error) {
      logger.error('Failed to get account', {
        requestId,
        organizationId,
        accountId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      res.status(500).json({
        success: false,
        error: 'Failed to fetch account',
        code: 'BFF_DATABASE_ERROR',
        requestId
      })
    }
  }
)

/**
 * Update account with tenant isolation
 * PUT /api/accounts/:id
 */
router.put('/:id',
  requireJwtAuth,
  validateParams(z.object({ id: CuidSchema })),
  validateBody(UpdateAccountRequestSchema),
  async (req, res) => {
    const { organizationId } = req.auth!
    const { id } = req.params
    const { requestId } = req
    const updates = req.body

    try {
      // CRITICAL: Verify account exists and belongs to organization
      const existingAccount = await prisma.ledger_accounts.findFirst({
        where: { 
          id,
          organizationId // CRITICAL: Tenant isolation
        }
      })

      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          error: 'Account not found or access denied',
          code: 'BFF_RESOURCE_NOT_FOUND',
          requestId
        })
      }

      // Check for duplicate code if being updated
      if (updates.code && updates.code !== existingAccount.code) {
        const duplicateAccount = await prisma.ledger_accounts.findFirst({
          where: {
            organizationId,
            code: updates.code,
            id: { not: id } // Exclude current account
          }
        })

        if (duplicateAccount) {
          return res.status(409).json({
            success: false,
            error: 'Account code already exists in this organization',
            code: 'BFF_DUPLICATE_ACCOUNT_CODE',
            requestId
          })
        }
      }

      // Update with tenant isolation
      const updatedAccount = await prisma.ledger_accounts.update({
        where: { 
          id,
          organizationId // CRITICAL: Double-check tenant isolation
        },
        data: updates
      })

      logger.info('Account updated successfully', {
        requestId,
        organizationId,
        accountId: id,
        updates: Object.keys(updates)
      })

      res.json({
        success: true,
        data: updatedAccount,
        timestamp: new Date().toISOString(),
        requestId
      })

    } catch (error) {
      logger.error('Failed to update account', {
        requestId,
        organizationId,
        accountId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        updates
      })

      res.status(500).json({
        success: false,
        error: 'Failed to update account',
        code: 'BFF_DATABASE_ERROR',
        requestId
      })
    }
  }
)

/**
 * Delete account with tenant isolation
 * DELETE /api/accounts/:id
 */
router.delete('/:id',
  requireJwtAuth,
  validateParams(z.object({ id: CuidSchema })),
  async (req, res) => {
    const { organizationId } = req.auth!
    const { id } = req.params
    const { requestId } = req

    try {
      // CRITICAL: Verify account exists and belongs to organization
      const existingAccount = await prisma.ledger_accounts.findFirst({
        where: { 
          id,
          organizationId // CRITICAL: Tenant isolation
        }
      })

      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          error: 'Account not found or access denied',
          code: 'BFF_RESOURCE_NOT_FOUND',
          requestId
        })
      }

      // TODO: Check if account has transactions before deletion
      // This should integrate with OA to verify account can be safely deleted

      await prisma.ledger_accounts.delete({
        where: { 
          id,
          organizationId // CRITICAL: Tenant isolation
        }
      })

      logger.info('Account deleted successfully', {
        requestId,
        organizationId,
        accountId: id,
        accountCode: existingAccount.code
      })

      res.json({
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString(),
        requestId
      })

    } catch (error) {
      logger.error('Failed to delete account', {
        requestId,
        organizationId,
        accountId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        code: 'BFF_DATABASE_ERROR',
        requestId
      })
    }
  }
)

export default router
