const { PrismaClientKnownRequestError, PrismaClientValidationError } = require('@prisma/client/runtime/library')

/**
 * Centralized Error Handler Middleware
 * Provides consistent error responses and logging across all API endpoints
 */

// Error types and their corresponding HTTP status codes
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  BUSINESS_LOGIC_ERROR: 422,
  RATE_LIMIT_ERROR: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}

// Business logic error codes
const BUSINESS_ERROR_CODES = {
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  INVALID_ACCOUNTING_PERIOD: 'INVALID_ACCOUNTING_PERIOD',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_TRANSACTION: 'INVALID_TRANSACTION',
  MISSING_REQUIRED_ACCOUNT: 'MISSING_REQUIRED_ACCOUNT',
  TRIAL_BALANCE_IMBALANCE: 'TRIAL_BALANCE_IMBALANCE',
  INVENTORY_TRACKING_DISABLED: 'INVENTORY_TRACKING_DISABLED',
  WAREHOUSE_NOT_FOUND: 'WAREHOUSE_NOT_FOUND',
  OPENING_BALANCE_EXISTS: 'OPENING_BALANCE_EXISTS'
}

/**
 * Custom error classes for different types of application errors
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.VALIDATION_ERROR, 'VALIDATION_ERROR', details)
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_TYPES.AUTHENTICATION_ERROR, 'AUTHENTICATION_ERROR')
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, ERROR_TYPES.AUTHORIZATION_ERROR, 'AUTHORIZATION_ERROR')
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, ERROR_TYPES.NOT_FOUND_ERROR, 'NOT_FOUND_ERROR')
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.CONFLICT_ERROR, 'CONFLICT_ERROR', details)
  }
}

class BusinessLogicError extends AppError {
  constructor(message, errorCode, details = null) {
    super(message, ERROR_TYPES.BUSINESS_LOGIC_ERROR, errorCode, details)
  }
}

/**
 * Parse Prisma errors into user-friendly messages
 */
function parsePrismaError(error) {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field'
        return new ConflictError(`${field} already exists`, {
          field,
          constraint: error.meta?.target
        })
      
      case 'P2003':
        // Foreign key constraint violation
        return new ValidationError('Invalid reference - related record not found', {
          field: error.meta?.field_name
        })
      
      case 'P2025':
        // Record not found
        return new NotFoundError('Record')
      
      case 'P2014':
        // Required relation violation
        return new ValidationError('Missing required relationship', {
          relation: error.meta?.relation_name
        })
      
      case 'P2034':
        // Transaction failed
        return new BusinessLogicError('Transaction failed due to business rule violation', 'TRANSACTION_FAILED')
      
      default:
        return new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR')
    }
  }
  
  if (error instanceof PrismaClientValidationError) {
    return new ValidationError('Invalid data provided', {
      details: error.message
    })
  }
  
  return null
}

/**
 * Format error response
 */
function formatErrorResponse(error, req) {
  const response = {
    success: false,
    error: error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  }
  
  // Add error code if available
  if (error.errorCode) {
    response.errorCode = error.errorCode
  }
  
  // Add details for validation errors
  if (error.details && process.env.NODE_ENV !== 'production') {
    response.details = error.details
  }
  
  // Add request ID if available
  if (req.requestId) {
    response.requestId = req.requestId
  }
  
  return response
}

/**
 * Log error with appropriate level
 */
function logError(error, req) {
  const logData = {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.auth?.userId,
    organizationId: req.auth?.organizationId,
    timestamp: new Date().toISOString()
  }
  
  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', logData)
  } else if (error.statusCode >= 400) {
    console.warn('⚠️  Client Error:', logData)
  } else {
    console.info('ℹ️  Info:', logData)
  }
}

/**
 * Main error handling middleware
 */
function errorHandler(error, req, res, next) {
  let appError = error
  
  // Convert Prisma errors
  if (!error.isOperational) {
    const prismaError = parsePrismaError(error)
    if (prismaError) {
      appError = prismaError
    } else {
      // Unknown error - treat as internal server error
      appError = new AppError(
        process.env.NODE_ENV === 'production' 
          ? 'Something went wrong' 
          : error.message,
        500,
        'INTERNAL_SERVER_ERROR'
      )
    }
  }
  
  // Log the error
  logError(appError, req)
  
  // Send error response
  const response = formatErrorResponse(appError, req)
  res.status(appError.statusCode).json(response)
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.originalUrl}`)
  next(error)
}

/**
 * Validation helper functions
 */
const validators = {
  required: (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw new ValidationError(`${fieldName} is required`)
    }
  },
  
  email: (value, fieldName = 'Email') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (value && !emailRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid email address`)
    }
  },
  
  positive: (value, fieldName) => {
    if (value !== undefined && value !== null && parseFloat(value) <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`)
    }
  },
  
  organizationAccess: (req) => {
    if (!req.auth?.organizationId) {
      throw new AuthorizationError('No organization access')
    }
  },
  
  dateRange: (startDate, endDate) => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ValidationError('Start date must be before end date')
    }
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  ERROR_TYPES,
  BUSINESS_ERROR_CODES,
  validators
}
