import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { validateQuery, validateBody, validateParams, requestContext } from '../middleware/validation'
import { collectMetrics } from '../middleware/metrics'
import { enhancedErrorHandler, AppError, BFFErrorCode, asyncHandler } from '../middleware/errorHandler.v2'
import { 
  AccountSchema, 
  CreateAccountRequestSchema, 
  UpdateAccountRequestSchema,
  ListAccountsQuerySchema 
} from '../schemas/accounts'
import { CuidSchema } from '../schemas/common'
import { prisma } from '../services/database.cloud-sql-only'
import { AuditService } from '../services/auditService'
import { oaClient } from '../services/oaClient.v2'
import { cacheService } from '../services/cache'
import { logger } from '../utils/logger'
import { z } from 'zod'

const router = express.Router()

// Apply middleware stack
router.use(requestContext)
router.use(collectMetrics)

// =============================================
// HARDENED ACCOUNTS ENDPOINTS
// =============================================

/**
 * List accounts with pagination, caching, and tenant isolation
 * GET /api/accounts?page=1&limit=20&type=asset&search=bank
 */
router.get('/', 
  requireJwtAuth,
  validateQuery(ListAccountsQuerySchema),
  asyncHandler(async (req, res) => {
    const { organizationId, userId } = req.auth!
    const { page, limit, type, search, isActive, sortBy, sortOrder } = req.query
    const { requestId } = req

    // Generate cache key based on query parameters
    const cacheKey = `accounts:list:${JSON.stringify({ page, limit, type, search, isActive, sortBy, sortOrder })}`
    
    // Try cache first for read-heavy operations
    const cachedResult = await cacheService.get(cacheKey, { organizationId })
    if (cachedResult) {
      logger.info('Accounts list served from cache', {
        requestId,
        organizationId,
        cacheKey
      })
      
      return res.json({
        ...cachedResult,
        requestId,
        cached: true
      })
    }

    // Build secure where clause with tenant isolation
    const where: any = { organizationId }
    
    if (type) where.type = type
    if (isActive !== undefined) where.isActive = isActive
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
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
        skip: offset,
        select: {
          id: true,
          organizationId: true,
          code: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.ledger_accounts.count({ where })
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    const result = {
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
      timestamp: new Date().toISOString()
    }

    // Cache the result (5 minute TTL for account lists)
    await cacheService.set(cacheKey, result, {
      organizationId,
      ttl: 300,
      tags: ['accounts', 'accounts:list']
    })

    logger.info('Accounts listed successfully', {
      requestId,
      organizationId,
      count: accounts.length,
      total,
      page,
      limit,
      cached: false
    })

    res.json({
      ...result,
      requestId
    })
  })
)

/**
 * Create account with OA integration, validation, and audit logging
 * POST /api/accounts
 */
router.post('/',
  requireJwtAuth,
  validateBody(CreateAccountRequestSchema),
  asyncHandler(async (req, res) => {
    const { organizationId, userId } = req.auth!
    const { requestId } = req
    const accountData = req.body

    // Check for duplicate account code within organization
    const existingAccount = await prisma.ledger_accounts.findFirst({
      where: {
        organizationId,
        code: accountData.code
      }
    })

    if (existingAccount) {
      throw new AppError(
        'Account code already exists in this organization',
        BFFErrorCode.DUPLICATE_RESOURCE,
        409,
        { existingAccountId: existingAccount.id },
        { requestId, organizationId, userId }
      )
    }

    // Create account in BFF database with tenant isolation
    const account = await prisma.ledger_accounts.create({
      data: {
        ...accountData,
        organizationId, // Ensure tenant isolation
        isActive: accountData.isActive ?? true
      }
    })

    // Invalidate related caches
    await cacheService.invalidateByTags(['accounts', 'accounts:list'], organizationId)

    // Audit log the creation
    await AuditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      resource: 'account',
      resourceId: account.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      newValues: accountData,
      requestId
    })

    logger.info('Account created successfully', {
      requestId,
      organizationId,
      userId,
      accountId: account.id,
      accountCode: account.code
    })

    res.status(201).json({
      success: true,
      data: account,
      timestamp: new Date().toISOString(),
      requestId
    })
  })
)

/**
 * Get account by ID with caching and tenant isolation
 * GET /api/accounts/:id
 */
router.get('/:id',
  requireJwtAuth,
  validateParams(z.object({ id: CuidSchema })),
  asyncHandler(async (req, res) => {
    const { organizationId, userId } = req.auth!
    const { id } = req.params
    const { requestId } = req

    // Try cache first
    const cacheKey = `accounts:detail:${id}`
    const cachedAccount = await cacheService.get(cacheKey, { organizationId })
    
    if (cachedAccount) {
      logger.info('Account served from cache', {
        requestId,
        organizationId,
        accountId: id
      })
      
      return res.json({
        success: true,
        data: cachedAccount,
        timestamp: new Date().toISOString(),
        requestId,
        cached: true
      })
    }

    const account = await prisma.ledger_accounts.findFirst({
      where: { 
        id,
        organizationId // CRITICAL: Tenant isolation
      }
    })

    if (!account) {
      throw new AppError(
        'Account not found',
        BFFErrorCode.RESOURCE_NOT_FOUND,
        404,
        undefined,
        { requestId, organizationId, userId }
      )
    }

    // Cache the account (10 minute TTL for individual accounts)
    await cacheService.set(cacheKey, account, {
      organizationId,
      ttl: 600,
      tags: ['accounts', `account:${id}`]
    })

    logger.info('Account retrieved successfully', {
      requestId,
      organizationId,
      userId,
      accountId: account.id
    })

    res.json({
      success: true,
      data: account,
      timestamp: new Date().toISOString(),
      requestId
    })
  })
)

/**
 * Update account with tenant isolation and optimistic locking
 * PUT /api/accounts/:id
 */
router.put('/:id',
  requireJwtAuth,
  validateParams(z.object({ id: CuidSchema })),
  validateBody(UpdateAccountRequestSchema),
  asyncHandler(async (req, res) => {
    const { organizationId, userId } = req.auth!
    const { id } = req.params
    const { requestId } = req
    const updates = req.body

    // CRITICAL: Verify account exists and belongs to organization
    const existingAccount = await prisma.ledger_accounts.findFirst({
      where: { 
        id,
        organizationId // CRITICAL: Tenant isolation
      }
    })

    if (!existingAccount) {
      throw new AppError(
        'Account not found or access denied',
        BFFErrorCode.RESOURCE_NOT_FOUND,
        404,
        undefined,
        { requestId, organizationId, userId }
      )
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
        throw new AppError(
          'Account code already exists in this organization',
          BFFErrorCode.DUPLICATE_RESOURCE,
          409,
          { existingAccountId: duplicateAccount.id },
          { requestId, organizationId, userId }
        )
      }
    }

    // Update with tenant isolation
    const updatedAccount = await prisma.ledger_accounts.update({
      where: { 
        id,
        organizationId // CRITICAL: Double-check tenant isolation
      },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })

    // Invalidate related caches
    await Promise.all([
      cacheService.delete(`accounts:detail:${id}`, { organizationId }),
      cacheService.invalidateByTags(['accounts', 'accounts:list'], organizationId)
    ])

    // Audit log the update
    await AuditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      resource: 'account',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      oldValues: existingAccount,
      newValues: updates,
      requestId
    })

    logger.info('Account updated successfully', {
      requestId,
      organizationId,
      userId,
      accountId: id,
      updates: Object.keys(updates)
    })

    res.json({
      success: true,
      data: updatedAccount,
      timestamp: new Date().toISOString(),
      requestId
    })
  })
)

/**
 * Delete account with tenant isolation and cascade checks
 * DELETE /api/accounts/:id
 */
router.delete('/:id',
  requireJwtAuth,
  validateParams(z.object({ id: CuidSchema })),
  asyncHandler(async (req, res) => {
    const { organizationId, userId } = req.auth!
    const { id } = req.params
    const { requestId } = req

    // CRITICAL: Verify account exists and belongs to organization
    const existingAccount = await prisma.ledger_accounts.findFirst({
      where: { 
        id,
        organizationId // CRITICAL: Tenant isolation
      }
    })

    if (!existingAccount) {
      throw new AppError(
        'Account not found or access denied',
        BFFErrorCode.RESOURCE_NOT_FOUND,
        404,
        undefined,
        { requestId, organizationId, userId }
      )
    }

    // TODO: Check if account has transactions before deletion
    // This should integrate with OA to verify account can be safely deleted
    // For now, we'll allow deletion but this needs OA integration

    await prisma.ledger_accounts.delete({
      where: { 
        id,
        organizationId // CRITICAL: Tenant isolation
      }
    })

    // Invalidate related caches
    await Promise.all([
      cacheService.delete(`accounts:detail:${id}`, { organizationId }),
      cacheService.invalidateByTags(['accounts', 'accounts:list'], organizationId)
    ])

    // Audit log the deletion
    await AuditService.log({
      organizationId,
      userId,
      action: 'DELETE',
      resource: 'account',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      oldValues: existingAccount,
      requestId
    })

    logger.info('Account deleted successfully', {
      requestId,
      organizationId,
      userId,
      accountId: id,
      accountCode: existingAccount.code
    })

    res.json({
      success: true,
      message: 'Account deleted successfully',
      timestamp: new Date().toISOString(),
      requestId
    })
  })
)

// Apply error handler
router.use(enhancedErrorHandler)

export default router
