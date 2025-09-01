const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

/**
 * Accounting Transaction Service
 * Provides safe, atomic, and idempotent accounting operations
 * Ensures balance integrity and OA alignment
 */
class AccountingTransactionService {
  constructor(prismaInstance = null) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * Execute accounting transaction with full safety guarantees
   * @param {Object} options - Transaction options
   * @param {string} options.organizationId - Organization ID
   * @param {string} options.userId - User ID performing the transaction
   * @param {string} options.idempotencyKey - Unique key for idempotency
   * @param {string} options.operation - Operation type (invoice, payment, transfer, etc.)
   * @param {Function} options.transactionFn - Function to execute within transaction
   * @returns {Promise<Object>}
   */
  async withAccountingTransaction(options) {
    const {
      organizationId,
      userId,
      idempotencyKey,
      operation,
      transactionFn,
      postingDate = new Date()
    } = options

    // Check idempotency first
    if (idempotencyKey) {
      const existingResult = await this.checkIdempotency(organizationId, operation, idempotencyKey)
      if (existingResult) {
        return existingResult
      }
    }

    // Validate posting period
    await this.validatePostingPeriod(organizationId, postingDate)

    return await this.prisma.$transaction(async (tx) => {
      try {
        // Store idempotency key as processing
        if (idempotencyKey) {
          await this.storeIdempotencyKey(tx, organizationId, operation, idempotencyKey, 'processing')
        }

        // Execute the transaction function
        const result = await transactionFn(tx)

        // Validate all journals are balanced
        if (result.journalIds && result.journalIds.length > 0) {
          await this.validateJournalBalance(tx, result.journalIds)
        }

        // Validate inventory consistency
        if (result.inventoryChanges) {
          await this.validateInventoryConsistency(tx, result.inventoryChanges)
        }

        // Update idempotency key as completed
        if (idempotencyKey) {
          await this.updateIdempotencyKey(tx, organizationId, operation, idempotencyKey, 'completed', result)
        }

        // Log audit trail
        await this.logAuditTrail(tx, {
          organizationId,
          userId,
          action: 'CREATE',
          resourceType: operation,
          resourceId: result.id || result.primaryId,
          newValues: result,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          requestId: options.requestId
        })

        return result

      } catch (error) {
        // Update idempotency key as failed
        if (idempotencyKey) {
          await this.updateIdempotencyKey(tx, organizationId, operation, idempotencyKey, 'failed', { error: error.message })
        }
        throw error
      }
    }, {
      timeout: 30000, // 30 second timeout
      isolationLevel: 'ReadCommitted'
    })
  }

  /**
   * Check if operation was already processed (idempotency)
   * @param {string} organizationId 
   * @param {string} operation 
   * @param {string} idempotencyKey 
   * @returns {Promise<Object|null>}
   */
  async checkIdempotency(organizationId, operation, idempotencyKey) {
    const existing = await prisma.idempotency_keys.findUnique({
      where: {
        idempotency_keys_org_endpoint_key_unique: {
          organization_id: organizationId,
          endpoint: operation,
          idempotency_key: idempotencyKey
        }
      }
    })

    if (existing) {
      if (existing.status === 'completed') {
        return existing.response_data
      } else if (existing.status === 'processing') {
        throw new Error('Request is already being processed. Please wait.')
      } else if (existing.status === 'failed') {
        // Allow retry after failure
        return null
      }
    }

    return null
  }

  /**
   * Store idempotency key
   * @param {Object} tx - Prisma transaction
   * @param {string} organizationId 
   * @param {string} operation 
   * @param {string} idempotencyKey 
   * @param {string} status 
   * @returns {Promise<void>}
   */
  async storeIdempotencyKey(tx, organizationId, operation, idempotencyKey, status) {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

    await tx.idempotency_keys.upsert({
      where: {
        organization_id_endpoint_idempotency_key: {
          organization_id: organizationId,
          endpoint: operation,
          idempotency_key: idempotencyKey
        }
      },
      update: {
        status,
        expires_at: expiresAt
      },
      create: {
        id: `idem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        organization_id: organizationId,
        endpoint: operation,
        idempotency_key: idempotencyKey,
        request_hash: crypto.createHash('sha256').update(idempotencyKey).digest('hex'),
        status,
        expires_at: expiresAt
      }
    })
  }

  /**
   * Update idempotency key with result
   * @param {Object} tx - Prisma transaction
   * @param {string} organizationId 
   * @param {string} operation 
   * @param {string} idempotencyKey 
   * @param {string} status 
   * @param {Object} responseData 
   * @returns {Promise<void>}
   */
  async updateIdempotencyKey(tx, organizationId, operation, idempotencyKey, status, responseData) {
    await tx.idempotency_keys.update({
      where: {
        organization_id_endpoint_idempotency_key: {
          organization_id: organizationId,
          endpoint: operation,
          idempotency_key: idempotencyKey
        }
      },
      data: {
        status,
        response_data: responseData
      }
    })
  }

  /**
   * Validate posting period is open
   * @param {string} organizationId 
   * @param {Date} postingDate 
   * @returns {Promise<void>}
   */
  async validatePostingPeriod(organizationId, postingDate) {
    const period = await prisma.accounting_periods.findFirst({
      where: {
        organization_id: organizationId,
        start_date: { lte: postingDate },
        end_date: { gte: postingDate }
      }
    })

    if (!period) {
      throw new Error(`No accounting period found for posting date ${postingDate.toISOString().split('T')[0]}`)
    }

    if (period.status === 'closed') {
      throw new Error(`Cannot post to closed period: ${period.period_name}`)
    }

    if (period.status === 'soft_closed') {
      throw new Error(`Period ${period.period_name} is soft closed. Use reversal workflow for changes.`)
    }
  }

  /**
   * Validate journal entries are balanced
   * @param {Object} tx - Prisma transaction
   * @param {Array<string>} journalIds 
   * @returns {Promise<void>}
   */
  async validateJournalBalance(tx, journalIds) {
    for (const journalId of journalIds) {
      const entries = await tx.journal_entries.findMany({
        where: { journalId }
      })

      const totalDebits = entries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount), 0)
      const totalCredits = entries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount), 0)

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Journal ${journalId} is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`)
      }

      // Update journal totals
      await tx.journals.update({
        where: { id: journalId },
        data: {
          totalDebit: totalDebits,
          totalCredit: totalCredits
        }
      })
    }
  }

  /**
   * Validate inventory consistency
   * @param {Object} tx - Prisma transaction
   * @param {Array} inventoryChanges 
   * @returns {Promise<void>}
   */
  async validateInventoryConsistency(tx, inventoryChanges) {
    for (const change of inventoryChanges) {
      const { itemId, warehouseId, expectedChange } = change

      // Get current inventory levels
      const layers = await tx.inventory_layers.findMany({
        where: {
          itemId,
          warehouseId,
          quantityRemaining: { gt: 0 },
          status: 'active'
        }
      })

      const currentQuantity = layers.reduce((sum, layer) => sum + parseFloat(layer.quantityRemaining), 0)

      // Check for negative inventory (if not allowed)
      const orgProfile = await tx.organization_profiles.findUnique({
        where: { organization_id: change.organizationId }
      })

      if (!orgProfile?.allow_negative_inventory && currentQuantity < 0) {
        throw new Error(`Negative inventory not allowed for item ${itemId} in warehouse ${warehouseId}`)
      }
    }
  }

  /**
   * Log audit trail
   * @param {Object} tx - Prisma transaction
   * @param {Object} auditData 
   * @returns {Promise<void>}
   */
  async logAuditTrail(tx, auditData) {
    await tx.audit_logs.create({
      data: {
        id: `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        organization_id: auditData.organizationId,
        user_id: auditData.userId,
        action: auditData.action,
        resource_type: auditData.resourceType,
        resource_id: auditData.resourceId,
        old_values: auditData.oldValues,
        new_values: auditData.newValues,
        ip_address: auditData.ipAddress,
        user_agent: auditData.userAgent,
        request_id: auditData.requestId,
        created_at: new Date()
      }
    })
  }

  /**
   * Create reversal journal for a posted journal
   * @param {string} originalJournalId 
   * @param {string} organizationId 
   * @param {string} userId 
   * @param {string} reason 
   * @param {Date} reversalDate 
   * @returns {Promise<Object>}
   */
  async createReversalJournal(originalJournalId, organizationId, userId, reason, reversalDate = new Date()) {
    return await this.withAccountingTransaction({
      organizationId,
      userId,
      operation: 'journal_reversal',
      postingDate: reversalDate,
      transactionFn: async (tx) => {
        // Get original journal and entries
        const originalJournal = await tx.journals.findUnique({
          where: { id: originalJournalId },
          include: { journal_entries: true }
        })

        if (!originalJournal) {
          throw new Error('Original journal not found')
        }

        if (originalJournal.status !== 'posted') {
          throw new Error('Can only reverse posted journals')
        }

        // Create reversal journal
        const reversalJournal = await tx.journals.create({
          data: {
            id: `journal_rev_${Date.now()}`,
            organizationId,
            journalNumber: `REV-${originalJournal.journalNumber}`,
            journalDate: reversalDate,
            posting_date: reversalDate,
            reference: `Reversal of ${originalJournal.journalNumber}`,
            notes: `Reversal: ${reason}`,
            totalDebit: originalJournal.totalDebit,
            totalCredit: originalJournal.totalCredit,
            status: 'posted',
            is_reversal: true,
            reversal_of: originalJournalId,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          }
        })

        // Create reversal entries (flip debits and credits)
        const reversalEntries = originalJournal.journal_entries.map(entry => ({
          id: `entry_rev_${Date.now()}_${Math.random()}`,
          journalId: reversalJournal.id,
          accountId: entry.accountId,
          description: `Reversal: ${entry.description}`,
          debitAmount: entry.creditAmount, // Flip
          creditAmount: entry.debitAmount, // Flip
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        }))

        await tx.journal_entries.createMany({
          data: reversalEntries
        })

        // Mark original journal as reversed
        await tx.journals.update({
          where: { id: originalJournalId },
          data: {
            status: 'reversed',
            updated_by: userId,
            updated_at: new Date()
          }
        })

        return {
          id: reversalJournal.id,
          journalIds: [reversalJournal.id],
          originalJournalId,
          reversalJournalId: reversalJournal.id
        }
      }
    })
  }

  /**
   * Create reversal for inventory movements
   * @param {string} originalMovementId 
   * @param {string} organizationId 
   * @param {string} userId 
   * @param {string} reason 
   * @returns {Promise<Object>}
   */
  async createInventoryReversal(originalMovementId, organizationId, userId, reason) {
    return await this.withAccountingTransaction({
      organizationId,
      userId,
      operation: 'inventory_reversal',
      transactionFn: async (tx) => {
        // Get original movement
        const originalMovement = await tx.inventory_movements.findUnique({
          where: { id: originalMovementId }
        })

        if (!originalMovement) {
          throw new Error('Original movement not found')
        }

        if (originalMovement.status !== 'active') {
          throw new Error('Can only reverse active movements')
        }

        // Create reversal movement
        const reversalMovement = await tx.inventory_movements.create({
          data: {
            id: `movement_rev_${Date.now()}`,
            itemId: originalMovement.itemId,
            warehouseId: originalMovement.warehouseId,
            layerId: originalMovement.layerId,
            direction: originalMovement.direction === 'in' ? 'out' : 'in', // Flip direction
            quantity: originalMovement.quantity,
            unitCost: originalMovement.unitCost,
            totalValue: originalMovement.totalValue,
            movementType: 'reversal',
            sourceType: 'reversal',
            sourceId: originalMovementId,
            reference: `Reversal of ${originalMovement.reference}`,
            notes: `Reversal: ${reason}`,
            status: 'active',
            is_reversal: true,
            reversal_of: originalMovementId,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          }
        })

        // Mark original movement as reversed
        await tx.inventory_movements.update({
          where: { id: originalMovementId },
          data: {
            status: 'reversed',
            updated_by: userId,
            updated_at: new Date()
          }
        })

        // Restore inventory layers if needed
        if (originalMovement.direction === 'out' && originalMovement.layerId) {
          await tx.inventory_layers.update({
            where: { id: originalMovement.layerId },
            data: {
              quantityRemaining: {
                increment: parseFloat(originalMovement.quantity)
              },
              updated_at: new Date()
            }
          })
        }

        return {
          id: reversalMovement.id,
          originalMovementId,
          reversalMovementId: reversalMovement.id,
          inventoryChanges: [{
            itemId: originalMovement.itemId,
            warehouseId: originalMovement.warehouseId,
            organizationId,
            expectedChange: originalMovement.direction === 'out' ? 
              parseFloat(originalMovement.quantity) : 
              -parseFloat(originalMovement.quantity)
          }]
        }
      }
    })
  }

  /**
   * Void a document (invoice, payment, etc.)
   * @param {string} documentType 
   * @param {string} documentId 
   * @param {string} organizationId 
   * @param {string} userId 
   * @param {string} reason 
   * @returns {Promise<Object>}
   */
  async voidDocument(documentType, documentId, organizationId, userId, reason) {
    return await this.withAccountingTransaction({
      organizationId,
      userId,
      operation: `void_${documentType}`,
      transactionFn: async (tx) => {
        const voidedAt = new Date()
        let result = { id: documentId, voidedAt, reason }

        switch (documentType) {
          case 'invoice':
            // Get invoice with related data
            const invoice = await tx.invoices.findUnique({
              where: { id: documentId },
              include: { 
                invoice_items: true,
                invoice_payments: true
              }
            })

            if (!invoice) {
              throw new Error('Invoice not found')
            }

            if (invoice.status === 'voided') {
              throw new Error('Invoice is already voided')
            }

            if (invoice.invoice_payments.length > 0) {
              throw new Error('Cannot void invoice with payments. Void payments first.')
            }

            // Void the invoice
            await tx.invoices.update({
              where: { id: documentId },
              data: {
                status: 'voided',
                voided_at: voidedAt,
                voided_by: userId,
                updated_at: voidedAt
              }
            })

            // Reverse journal entries if posted
            if (invoice.journalId) {
              const reversalResult = await this.createReversalJournal(
                invoice.journalId, organizationId, userId, reason, voidedAt
              )
              result.reversalJournalId = reversalResult.reversalJournalId
            }

            // Reverse inventory movements
            const inventoryMovements = await tx.inventory_movements.findMany({
              where: {
                sourceType: 'invoice',
                sourceId: documentId,
                status: 'active'
              }
            })

            for (const movement of inventoryMovements) {
              await this.createInventoryReversal(movement.id, organizationId, userId, reason)
            }

            break

          case 'payment':
            // Similar logic for payments
            const payment = await tx.invoice_payments.findUnique({
              where: { id: documentId }
            })

            if (!payment) {
              throw new Error('Payment not found')
            }

            // Void payment and reverse journal
            if (payment.journalId) {
              await this.createReversalJournal(
                payment.journalId, organizationId, userId, reason, voidedAt
              )
            }

            // Update payment status (assuming we add voided status)
            await tx.invoice_payments.update({
              where: { id: documentId },
              data: {
                // Add voided fields to schema
                updated_at: voidedAt
              }
            })

            break

          default:
            throw new Error(`Unsupported document type: ${documentType}`)
        }

        return result
      }
    })
  }

  /**
   * Get trial balance for organization
   * @param {string} organizationId 
   * @param {Date} asOfDate 
   * @returns {Promise<Object>}
   */
  async getTrialBalance(organizationId, asOfDate = new Date()) {
    const entries = await prisma.$queryRaw`
      SELECT 
        la.id as account_id,
        la.code as account_code,
        la.name as account_name,
        la.type as account_type,
        COALESCE(SUM(je.debitAmount), 0) as total_debits,
        COALESCE(SUM(je.creditAmount), 0) as total_credits,
        COALESCE(SUM(je.debitAmount), 0) - COALESCE(SUM(je.creditAmount), 0) as balance
      FROM ledger_accounts la
      LEFT JOIN journal_entries je ON la.id = je.accountId
      LEFT JOIN journals j ON je.journalId = j.id
      WHERE la.organizationId = ${organizationId}
        AND (j.id IS NULL OR (j.status = 'posted' AND j.journalDate <= ${asOfDate}))
      GROUP BY la.id, la.code, la.name, la.type
      ORDER BY la.code
    `

    const totalDebits = entries.reduce((sum, entry) => sum + parseFloat(entry.total_debits), 0)
    const totalCredits = entries.reduce((sum, entry) => sum + parseFloat(entry.total_credits), 0)
    const balanceDifference = totalDebits - totalCredits

    return {
      asOfDate,
      entries,
      totalDebits,
      totalCredits,
      balanceDifference,
      isBalanced: Math.abs(balanceDifference) < 0.01
    }
  }
}

module.exports = AccountingTransactionService
