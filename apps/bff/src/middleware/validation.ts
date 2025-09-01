import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

// =============================================
// REQUEST VALIDATION MIDDLEWARE
// =============================================

export interface ValidatedRequest<
  TBody = any,
  TQuery = any,
  TParams = any
> extends Request {
  body: TBody
  query: TQuery
  params: TParams
  requestId: string
  validatedAt: Date
}

/**
 * Validates request body against schema
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || uuidv4()
    req.requestId = requestId
    
    try {
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        logger.warn('Request body validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          errors: result.error.errors,
          body: req.body
        })
        
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'BFF_VALIDATION_ERROR',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          requestId
        })
      }
      
      req.body = result.data
      req.validatedAt = new Date()
      next()
    } catch (error) {
      logger.error('Validation middleware error', {
        requestId,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
        code: 'BFF_INTERNAL_ERROR',
        requestId
      })
    }
  }
}

/**
 * Validates query parameters against schema
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.requestId || uuidv4()
    req.requestId = requestId
    
    try {
      const result = schema.safeParse(req.query)
      
      if (!result.success) {
        logger.warn('Query validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          errors: result.error.errors,
          query: req.query
        })
        
        return res.status(422).json({
          success: false,
          error: 'Invalid query parameters',
          code: 'BFF_VALIDATION_ERROR',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          requestId
        })
      }
      
      req.query = result.data
      next()
    } catch (error) {
      logger.error('Query validation middleware error', {
        requestId,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
        code: 'BFF_INTERNAL_ERROR',
        requestId
      })
    }
  }
}

/**
 * Validates route parameters against schema
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.requestId || uuidv4()
    req.requestId = requestId
    
    try {
      const result = schema.safeParse(req.params)
      
      if (!result.success) {
        logger.warn('Params validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          errors: result.error.errors,
          params: req.params
        })
        
        return res.status(422).json({
          success: false,
          error: 'Invalid route parameters',
          code: 'BFF_VALIDATION_ERROR',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          requestId
        })
      }
      
      req.params = result.data
      next()
    } catch (error) {
      logger.error('Params validation middleware error', {
        requestId,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
        code: 'BFF_INTERNAL_ERROR',
        requestId
      })
    }
  }
}

/**
 * Adds request ID and timing to all requests
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || uuidv4()
  const startTime = Date.now()
  
  req.requestId = requestId
  req.startTime = startTime
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId)
  
  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info'
    
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    })
  })
  
  next()
}

declare global {
  namespace Express {
    interface Request {
      requestId: string
      startTime: number
      validatedAt?: Date
    }
  }
}
