import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { z } from 'zod'

// =============================================
// ENHANCED ERROR HANDLING V2
// =============================================

// BFF Error Codes (for consistent error taxonomy)
export enum BFFErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'BFF_VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'BFF_AUTHENTICATION_REQUIRED', 
  ACCESS_DENIED = 'BFF_ACCESS_DENIED',
  RESOURCE_NOT_FOUND = 'BFF_RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'BFF_DUPLICATE_RESOURCE',
  INVALID_TENANT = 'BFF_INVALID_TENANT',
  RATE_LIMITED = 'BFF_RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'BFF_INTERNAL_ERROR',
  DATABASE_ERROR = 'BFF_DATABASE_ERROR',
  UPSTREAM_TIMEOUT = 'BFF_UPSTREAM_TIMEOUT',
  UPSTREAM_ERROR = 'BFF_UPSTREAM_ERROR',
  SERVICE_UNAVAILABLE = 'BFF_SERVICE_UNAVAILABLE',
  CIRCUIT_BREAKER_OPEN = 'BFF_CIRCUIT_BREAKER_OPEN'
}

export interface BFFError extends Error {
  code: BFFErrorCode
  statusCode: number
  details?: any
  requestId?: string
  organizationId?: string
  userId?: string
  isOperational: boolean
}

export class AppError extends Error implements BFFError {
  public readonly code: BFFErrorCode
  public readonly statusCode: number
  public readonly details?: any
  public readonly requestId?: string
  public readonly organizationId?: string
  public readonly userId?: string
  public readonly isOperational = true

  constructor(
    message: string,
    code: BFFErrorCode,
    statusCode: number,
    details?: any,
    context?: {
      requestId?: string
      organizationId?: string
      userId?: string
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.requestId = context?.requestId
    this.organizationId = context?.organizationId
    this.userId = context?.userId

    // Maintain proper stack trace
    Error.captureStackTrace(this, AppError)
  }
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  error: BFFError | Error,
  requestId?: string
): {
  success: false
  error: string
  code: string
  details?: any
  timestamp: string
  requestId?: string
} {
  const isBFFError = error instanceof AppError
  
  return {
    success: false,
    error: error.message,
    code: isBFFError ? error.code : BFFErrorCode.INTERNAL_ERROR,
    details: isBFFError ? error.details : undefined,
    timestamp: new Date().toISOString(),
    requestId: isBFFError ? error.requestId || requestId : requestId
  }
}

/**
 * Enhanced error handling middleware
 */
export function enhancedErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.requestId || 'unknown'
  const auth = (req as any).auth
  
  // Determine if error is operational or programming error
  const isOperational = error instanceof AppError || error.isOperational
  
  // Log error with full context
  const logLevel = isOperational ? 'warn' : 'error'
  logger[logLevel]('Request error', {
    requestId,
    organizationId: auth?.organizationId,
    userId: auth?.userId,
    method: req.method,
    path: req.path,
    statusCode: error.statusCode || 500,
    error: error.message,
    code: error.code || BFFErrorCode.INTERNAL_ERROR,
    stack: isOperational ? undefined : error.stack,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })

  // Map different error types
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(createErrorResponse(error, requestId))
  }

  // Handle Prisma errors
  if (error.code?.startsWith('P')) {
    const prismaError = mapPrismaError(error, requestId, auth?.organizationId, auth?.userId)
    return res.status(prismaError.statusCode).json(createErrorResponse(prismaError, requestId))
  }

  // Handle validation errors (Zod)
  if (error instanceof z.ZodError) {
    const validationError = new AppError(
      'Validation failed',
      BFFErrorCode.VALIDATION_ERROR,
      422,
      error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      { requestId, organizationId: auth?.organizationId, userId: auth?.userId }
    )
    return res.status(422).json(createErrorResponse(validationError, requestId))
  }

  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    const timeoutError = new AppError(
      'Request timeout',
      BFFErrorCode.UPSTREAM_TIMEOUT,
      504,
      undefined,
      { requestId, organizationId: auth?.organizationId, userId: auth?.userId }
    )
    return res.status(504).json(createErrorResponse(timeoutError, requestId))
  }

  // Default to internal server error
  const internalError = new AppError(
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    BFFErrorCode.INTERNAL_ERROR,
    500,
    process.env.NODE_ENV === 'production' ? undefined : { stack: error.stack },
    { requestId, organizationId: auth?.organizationId, userId: auth?.userId }
  )

  res.status(500).json(createErrorResponse(internalError, requestId))
}

/**
 * Map Prisma errors to user-friendly BFF errors
 */
function mapPrismaError(
  prismaError: any,
  requestId: string,
  organizationId?: string,
  userId?: string
): AppError {
  const context = { requestId, organizationId, userId }

  switch (prismaError.code) {
    case 'P2002': // Unique constraint violation
      return new AppError(
        'Resource already exists',
        BFFErrorCode.DUPLICATE_RESOURCE,
        409,
        { constraint: prismaError.meta?.target },
        context
      )
    
    case 'P2025': // Record not found
      return new AppError(
        'Resource not found',
        BFFErrorCode.RESOURCE_NOT_FOUND,
        404,
        undefined,
        context
      )
    
    case 'P2003': // Foreign key constraint violation
      return new AppError(
        'Invalid reference to related resource',
        BFFErrorCode.VALIDATION_ERROR,
        422,
        { constraint: prismaError.meta?.field_name },
        context
      )
    
    case 'P1008': // Operation timed out
      return new AppError(
        'Database operation timed out',
        BFFErrorCode.DATABASE_ERROR,
        504,
        undefined,
        context
      )
    
    case 'P1001': // Connection error
    case 'P1002': // Connection timeout
      return new AppError(
        'Database connection error',
        BFFErrorCode.SERVICE_UNAVAILABLE,
        503,
        undefined,
        context
      )
    
    default:
      return new AppError(
        'Database operation failed',
        BFFErrorCode.DATABASE_ERROR,
        500,
        { prismaCode: prismaError.code },
        context
      )
  }
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Tenant isolation validator
 */
export function requireTenantAccess(
  resourceOrgIdField: string = 'organizationId'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth
    const resourceOrgId = req.body?.[resourceOrgIdField] || req.params?.[resourceOrgIdField]
    
    if (!auth?.organizationId) {
      const error = new AppError(
        'Organization context required',
        BFFErrorCode.INVALID_TENANT,
        400,
        undefined,
        { requestId: req.requestId }
      )
      return next(error)
    }

    if (resourceOrgId && resourceOrgId !== auth.organizationId) {
      const error = new AppError(
        'Access denied: resource belongs to different organization',
        BFFErrorCode.ACCESS_DENIED,
        403,
        { 
          userOrgId: auth.organizationId,
          resourceOrgId 
        },
        { 
          requestId: req.requestId,
          organizationId: auth.organizationId,
          userId: auth.userId
        }
      )
      return next(error)
    }

    next()
  }
}

// Export error classes and utilities
export { metricsCollector }
