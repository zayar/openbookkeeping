const AccountingTransactionService = require('../services/accounting-transaction-service')

const accountingTransactionService = new AccountingTransactionService()

/**
 * Middleware for ensuring balance integrity and safe mutations
 */

/**
 * Idempotency middleware
 * Ensures that POST/PATCH operations are idempotent using X-Idempotency-Key header
 */
const idempotencyMiddleware = (operation) => {
  return async (req, res, next) => {
    try {
      const idempotencyKey = req.headers['x-idempotency-key']
      const organizationId = req.headers['x-org-id'] || req.auth?.organizationId
      
      if (!idempotencyKey) {
        return res.status(400).json({
          error: 'Missing X-Idempotency-Key header',
          message: 'All POST/PATCH operations require an idempotency key for safety'
        })
      }

      if (!organizationId) {
        return res.status(400).json({
          error: 'Missing organization context',
          message: 'X-Org-Id header or authenticated user organization required'
        })
      }

      // Check if this operation was already performed
      const existingResult = await accountingTransactionService.checkIdempotency(
        organizationId, 
        operation, 
        idempotencyKey
      )

      if (existingResult) {
        return res.status(200).json(existingResult)
      }

      // Store operation details for the request
      req.idempotencyKey = idempotencyKey
      req.organizationId = organizationId
      req.operation = operation

      next()
    } catch (error) {
      console.error('Idempotency middleware error:', error)
      res.status(500).json({
        error: 'Idempotency check failed',
        message: error.message
      })
    }
  }
}

/**
 * Posting period validation middleware
 * Ensures transactions are only posted to open periods
 */
const postingPeriodMiddleware = async (req, res, next) => {
  try {
    const organizationId = req.organizationId || req.headers['x-org-id']
    const postingDate = req.body.postingDate || req.body.invoiceDate || req.body.paymentDate || new Date()

    if (!organizationId) {
      return res.status(400).json({
        error: 'Missing organization context',
        message: 'Organization ID required for posting period validation'
      })
    }

    // Validate posting period
    await accountingTransactionService.validatePostingPeriod(organizationId, new Date(postingDate))

    next()
  } catch (error) {
    console.error('Posting period validation error:', error)
    res.status(400).json({
      error: 'Invalid posting period',
      message: error.message
    })
  }
}

/**
 * Prohibit dangerous deletes middleware
 * Prevents hard deletes on critical accounting tables
 */
const prohibitDeleteMiddleware = (resourceType) => {
  const protectedResources = [
    'journals',
    'journal_entries', 
    'inventory_movements',
    'inventory_layers',
    'invoices',
    'invoice_payments',
    'reconciliation_runs'
  ]

  return (req, res, next) => {
    if (req.method === 'DELETE' && protectedResources.includes(resourceType)) {
      return res.status(403).json({
        error: 'Delete operation prohibited',
        message: `Cannot delete ${resourceType}. Use void/reverse operations instead.`,
        allowedOperations: [`POST /${resourceType}/:id/void`, `POST /${resourceType}/:id/reverse`]
      })
    }
    next()
  }
}

/**
 * Audit logging middleware
 * Logs all critical operations for audit trail
 */
const auditMiddleware = (resourceType) => {
  return async (req, res, next) => {
    const originalSend = res.send

    res.send = function(data) {
      // Log the operation after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            const auditData = {
              organizationId: req.organizationId || req.headers['x-org-id'],
              userId: req.headers['x-user-id'] || req.user?.id,
              action: getActionFromMethod(req.method),
              resourceType,
              resourceId: req.params.id || extractResourceId(data),
              oldValues: req.method === 'PUT' || req.method === 'PATCH' ? req.originalData : null,
              newValues: req.body,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              requestId: req.headers['x-request-id']
            }

            await accountingTransactionService.logAuditTrail(null, auditData)
          } catch (error) {
            console.error('Audit logging error:', error)
          }
        })
      }

      originalSend.call(this, data)
    }

    next()
  }
}

/**
 * Safe mutation wrapper
 * Wraps operations in accounting transaction for atomicity
 */
const safeMutationWrapper = (operation) => {
  return async (req, res, next) => {
    try {
      const options = {
        organizationId: req.organizationId,
        userId: req.headers['x-user-id'] || req.user?.id,
        idempotencyKey: req.idempotencyKey,
        operation: req.operation || operation,
        transactionFn: async (tx) => {
          // Store transaction context for use in route handlers
          req.tx = tx
          req.accountingTransaction = true
          
          // Continue to route handler
          return new Promise((resolve, reject) => {
            const originalSend = res.send
            const originalJson = res.json

            res.send = function(data) {
              resolve(typeof data === 'string' ? JSON.parse(data) : data)
              return this
            }

            res.json = function(data) {
              resolve(data)
              return this
            }

            // Handle errors
            const originalNext = next
            next = (error) => {
              if (error) {
                reject(error)
              } else {
                originalNext()
              }
            }

            next()
          })
        }
      }

      const result = await accountingTransactionService.withAccountingTransaction(options)
      res.json(result)

    } catch (error) {
      console.error('Safe mutation wrapper error:', error)
      res.status(500).json({
        error: 'Transaction failed',
        message: error.message
      })
    }
  }
}

// Helper functions
function getActionFromMethod(method) {
  switch (method) {
    case 'POST': return 'CREATE'
    case 'PUT':
    case 'PATCH': return 'UPDATE'
    case 'DELETE': return 'DELETE'
    default: return 'READ'
  }
}

function extractResourceId(responseData) {
  if (typeof responseData === 'string') {
    try {
      responseData = JSON.parse(responseData)
    } catch {
      return null
    }
  }
  return responseData?.id || null
}

module.exports = {
  idempotencyMiddleware,
  postingPeriodMiddleware,
  prohibitDeleteMiddleware,
  auditMiddleware,
  safeMutationWrapper
}
