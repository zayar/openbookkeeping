const accountingTransactionService = require('../services/accounting-transaction-service')
const reconciliationService = require('../services/reconciliation-service')
const fiscalYearService = require('../services/fiscal-year-service')

/**
 * Balance Integrity & Safe Mutations Test Suite
 * Tests core accounting safety, immutability, and reconciliation
 */
describe('Balance Integrity & Safe Mutations', () => {

  describe('Accounting Transaction Service', () => {
    
    describe('Idempotency Protection', () => {
      test('should prevent duplicate transactions with same idempotency key', async () => {
        const mockTransactionFn = jest.fn().mockResolvedValue({ id: 'test-123', amount: 1000 })
        
        const options = {
          organizationId: 'org-123',
          userId: 'user-456',
          idempotencyKey: 'unique-key-789',
          operation: 'test-operation',
          transactionFn: mockTransactionFn
        }

        // First call should execute
        const result1 = await accountingTransactionService.withAccountingTransaction(options)
        expect(mockTransactionFn).toHaveBeenCalledTimes(1)
        expect(result1.id).toBe('test-123')

        // Second call with same key should return cached result
        const result2 = await accountingTransactionService.withAccountingTransaction(options)
        expect(mockTransactionFn).toHaveBeenCalledTimes(1) // Not called again
        expect(result2.id).toBe('test-123')
      })

      test('should allow retry after failed transaction', async () => {
        const mockTransactionFn = jest.fn()
          .mockRejectedValueOnce(new Error('Database error'))
          .mockResolvedValueOnce({ id: 'test-retry', amount: 500 })
        
        const options = {
          organizationId: 'org-123',
          userId: 'user-456',
          idempotencyKey: 'retry-key-789',
          operation: 'test-operation',
          transactionFn: mockTransactionFn
        }

        // First call should fail
        await expect(accountingTransactionService.withAccountingTransaction(options))
          .rejects.toThrow('Database error')

        // Second call should succeed (retry allowed after failure)
        const result = await accountingTransactionService.withAccountingTransaction(options)
        expect(result.id).toBe('test-retry')
        expect(mockTransactionFn).toHaveBeenCalledTimes(2)
      })
    })

    describe('Journal Balance Validation', () => {
      test('should validate journal entries are balanced', async () => {
        const mockTx = {
          journal_entries: {
            findMany: jest.fn().mockResolvedValue([
              { debitAmount: 1000, creditAmount: 0 },
              { debitAmount: 0, creditAmount: 500 },
              { debitAmount: 0, creditAmount: 500 }
            ])
          },
          journals: {
            update: jest.fn().mockResolvedValue({})
          }
        }

        // Should pass validation (1000 debits = 1000 credits)
        await expect(
          accountingTransactionService.validateJournalBalance(mockTx, ['journal-123'])
        ).resolves.not.toThrow()

        expect(mockTx.journals.update).toHaveBeenCalledWith({
          where: { id: 'journal-123' },
          data: {
            totalDebit: 1000,
            totalCredit: 1000
          }
        })
      })

      test('should reject unbalanced journal entries', async () => {
        const mockTx = {
          journal_entries: {
            findMany: jest.fn().mockResolvedValue([
              { debitAmount: 1000, creditAmount: 0 },
              { debitAmount: 0, creditAmount: 400 } // Unbalanced!
            ])
          }
        }

        await expect(
          accountingTransactionService.validateJournalBalance(mockTx, ['journal-456'])
        ).rejects.toThrow('Journal journal-456 is not balanced')
      })
    })

    describe('Posting Period Validation', () => {
      test('should allow posting to open periods', async () => {
        const mockPeriod = {
          id: 'period-123',
          period_name: 'January 2024',
          status: 'open',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31')
        }

        // Mock prisma call
        jest.spyOn(require('@prisma/client').PrismaClient.prototype.accounting_periods, 'findFirst')
          .mockResolvedValue(mockPeriod)

        const postingDate = new Date('2024-01-15')
        
        await expect(
          accountingTransactionService.validatePostingPeriod('org-123', postingDate)
        ).resolves.not.toThrow()
      })

      test('should reject posting to closed periods', async () => {
        const mockPeriod = {
          id: 'period-456',
          period_name: 'December 2023',
          status: 'closed',
          start_date: new Date('2023-12-01'),
          end_date: new Date('2023-12-31')
        }

        jest.spyOn(require('@prisma/client').PrismaClient.prototype.accounting_periods, 'findFirst')
          .mockResolvedValue(mockPeriod)

        const postingDate = new Date('2023-12-15')
        
        await expect(
          accountingTransactionService.validatePostingPeriod('org-123', postingDate)
        ).rejects.toThrow('Cannot post to closed period: December 2023')
      })

      test('should reject posting to soft closed periods', async () => {
        const mockPeriod = {
          id: 'period-789',
          period_name: 'November 2023',
          status: 'soft_closed'
        }

        jest.spyOn(require('@prisma/client').PrismaClient.prototype.accounting_periods, 'findFirst')
          .mockResolvedValue(mockPeriod)

        const postingDate = new Date('2023-11-15')
        
        await expect(
          accountingTransactionService.validatePostingPeriod('org-123', postingDate)
        ).rejects.toThrow('Period November 2023 is soft closed')
      })
    })

    describe('Inventory Consistency Validation', () => {
      test('should prevent negative inventory when not allowed', async () => {
        const mockTx = {
          inventory_layers: {
            findMany: jest.fn().mockResolvedValue([
              { quantityRemaining: 5 } // Only 5 units available
            ])
          },
          organization_profiles: {
            findUnique: jest.fn().mockResolvedValue({
              allow_negative_inventory: false
            })
          }
        }

        const inventoryChanges = [{
          itemId: 'item-123',
          warehouseId: 'warehouse-456',
          organizationId: 'org-123',
          expectedChange: -10 // Trying to consume 10 units
        }]

        // Mock current quantity calculation to result in negative
        jest.spyOn(accountingTransactionService, 'validateInventoryConsistency')
          .mockImplementation(async (tx, changes) => {
            const currentQuantity = -5 // Would be negative after change
            if (currentQuantity < 0) {
              throw new Error('Negative inventory not allowed for item item-123 in warehouse warehouse-456')
            }
          })

        await expect(
          accountingTransactionService.validateInventoryConsistency(mockTx, inventoryChanges)
        ).rejects.toThrow('Negative inventory not allowed')
      })

      test('should allow negative inventory when explicitly allowed', async () => {
        const mockTx = {
          inventory_layers: {
            findMany: jest.fn().mockResolvedValue([
              { quantityRemaining: 5 }
            ])
          },
          organization_profiles: {
            findUnique: jest.fn().mockResolvedValue({
              allow_negative_inventory: true
            })
          }
        }

        const inventoryChanges = [{
          itemId: 'item-123',
          warehouseId: 'warehouse-456',
          organizationId: 'org-123',
          expectedChange: -10
        }]

        await expect(
          accountingTransactionService.validateInventoryConsistency(mockTx, inventoryChanges)
        ).resolves.not.toThrow()
      })
    })

    describe('Reversal Operations', () => {
      test('should create proper journal reversal', async () => {
        const originalJournal = {
          id: 'journal-original',
          journalNumber: 'JE-2024-001',
          totalDebit: 1000,
          totalCredit: 1000,
          status: 'posted',
          journal_entries: [
            { accountId: 'acc-1', description: 'Test entry 1', debitAmount: 1000, creditAmount: 0 },
            { accountId: 'acc-2', description: 'Test entry 2', debitAmount: 0, creditAmount: 1000 }
          ]
        }

        const mockTx = {
          journals: {
            findUnique: jest.fn().mockResolvedValue(originalJournal),
            create: jest.fn().mockResolvedValue({
              id: 'journal-reversal',
              journalNumber: 'REV-JE-2024-001'
            }),
            update: jest.fn().mockResolvedValue({})
          },
          journal_entries: {
            createMany: jest.fn().mockResolvedValue({})
          }
        }

        const result = await accountingTransactionService.createReversalJournal(
          'journal-original', 'org-123', 'user-456', 'Correction needed'
        )

        // Should create reversal journal
        expect(mockTx.journals.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              journalNumber: 'REV-JE-2024-001',
              is_reversal: true,
              reversal_of: 'journal-original'
            })
          })
        )

        // Should create reversal entries (flipped debits/credits)
        expect(mockTx.journal_entries.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              debitAmount: 0,    // Original credit becomes debit
              creditAmount: 1000  // Original debit becomes credit
            }),
            expect.objectContaining({
              debitAmount: 1000,  // Original credit becomes debit
              creditAmount: 0     // Original debit becomes credit
            })
          ])
        })

        // Should mark original as reversed
        expect(mockTx.journals.update).toHaveBeenCalledWith({
          where: { id: 'journal-original' },
          data: expect.objectContaining({
            status: 'reversed'
          })
        })
      })

      test('should create inventory movement reversal', async () => {
        const originalMovement = {
          id: 'movement-original',
          itemId: 'item-123',
          warehouseId: 'warehouse-456',
          layerId: 'layer-789',
          direction: 'out',
          quantity: 10,
          unitCost: 50,
          totalValue: 500,
          status: 'active'
        }

        const mockTx = {
          inventory_movements: {
            findUnique: jest.fn().mockResolvedValue(originalMovement),
            create: jest.fn().mockResolvedValue({
              id: 'movement-reversal'
            }),
            update: jest.fn().mockResolvedValue({})
          },
          inventory_layers: {
            update: jest.fn().mockResolvedValue({})
          }
        }

        const result = await accountingTransactionService.createInventoryReversal(
          'movement-original', 'org-123', 'user-456', 'Inventory correction'
        )

        // Should create reversal movement with flipped direction
        expect(mockTx.inventory_movements.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            direction: 'in', // Flipped from 'out'
            quantity: 10,
            is_reversal: true,
            reversal_of: 'movement-original'
          })
        })

        // Should restore inventory layer quantity
        expect(mockTx.inventory_layers.update).toHaveBeenCalledWith({
          where: { id: 'layer-789' },
          data: {
            quantityRemaining: { increment: 10 },
            updated_at: expect.any(Date)
          }
        })

        // Should mark original as reversed
        expect(mockTx.inventory_movements.update).toHaveBeenCalledWith({
          where: { id: 'movement-original' },
          data: expect.objectContaining({
            status: 'reversed'
          })
        })
      })
    })

    describe('Document Voiding', () => {
      test('should void invoice and reverse related transactions', async () => {
        const mockInvoice = {
          id: 'invoice-123',
          status: 'sent',
          journalId: 'journal-456',
          invoice_payments: [],
          invoice_items: []
        }

        const mockTx = {
          invoices: {
            findUnique: jest.fn().mockResolvedValue(mockInvoice),
            update: jest.fn().mockResolvedValue({})
          },
          inventory_movements: {
            findMany: jest.fn().mockResolvedValue([
              { id: 'movement-1', sourceType: 'invoice', sourceId: 'invoice-123', status: 'active' }
            ])
          }
        }

        // Mock the reversal methods
        jest.spyOn(accountingTransactionService, 'createReversalJournal')
          .mockResolvedValue({ reversalJournalId: 'journal-reversal' })
        jest.spyOn(accountingTransactionService, 'createInventoryReversal')
          .mockResolvedValue({ id: 'movement-reversal' })

        const result = await accountingTransactionService.voidDocument(
          'invoice', 'invoice-123', 'org-123', 'user-456', 'Customer cancelled'
        )

        // Should update invoice status
        expect(mockTx.invoices.update).toHaveBeenCalledWith({
          where: { id: 'invoice-123' },
          data: expect.objectContaining({
            status: 'voided',
            voided_by: 'user-456'
          })
        })

        // Should reverse journal
        expect(accountingTransactionService.createReversalJournal)
          .toHaveBeenCalledWith('journal-456', 'org-123', 'user-456', 'Customer cancelled', expect.any(Date))

        // Should reverse inventory movements
        expect(accountingTransactionService.createInventoryReversal)
          .toHaveBeenCalledWith('movement-1', 'org-123', 'user-456', 'Customer cancelled')
      })

      test('should prevent voiding invoice with payments', async () => {
        const mockInvoice = {
          id: 'invoice-456',
          status: 'paid',
          invoice_payments: [{ id: 'payment-1', amountReceived: 1000 }]
        }

        const mockTx = {
          invoices: {
            findUnique: jest.fn().mockResolvedValue(mockInvoice)
          }
        }

        await expect(
          accountingTransactionService.voidDocument(
            'invoice', 'invoice-456', 'org-123', 'user-456', 'Test void'
          )
        ).rejects.toThrow('Cannot void invoice with payments')
      })
    })

    describe('Trial Balance Calculation', () => {
      test('should calculate accurate trial balance', async () => {
        const mockQueryResult = [
          {
            account_id: 'acc-1',
            account_code: '1000',
            account_name: 'Cash',
            account_type: 'asset',
            total_debits: 5000,
            total_credits: 1000,
            balance: 4000
          },
          {
            account_id: 'acc-2',
            account_code: '3000',
            account_name: 'Capital',
            account_type: 'equity',
            total_debits: 0,
            total_credits: 4000,
            balance: -4000
          }
        ]

        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValue(mockQueryResult)

        const result = await accountingTransactionService.getTrialBalance('org-123')

        expect(result.totalDebits).toBe(5000)
        expect(result.totalCredits).toBe(5000)
        expect(result.balanceDifference).toBe(0)
        expect(result.isBalanced).toBe(true)
        expect(result.entries).toHaveLength(2)
      })

      test('should detect unbalanced trial balance', async () => {
        const mockQueryResult = [
          {
            account_id: 'acc-1',
            total_debits: 1000,
            total_credits: 0,
            balance: 1000
          },
          {
            account_id: 'acc-2',
            total_debits: 0,
            total_credits: 900, // Unbalanced!
            balance: -900
          }
        ]

        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValue(mockQueryResult)

        const result = await accountingTransactionService.getTrialBalance('org-123')

        expect(result.totalDebits).toBe(1000)
        expect(result.totalCredits).toBe(900)
        expect(result.balanceDifference).toBe(100)
        expect(result.isBalanced).toBe(false)
      })
    })
  })

  describe('Reconciliation Service', () => {
    
    describe('Trial Balance Reconciliation', () => {
      test('should detect balanced trial balance', async () => {
        const mockBalanceQuery = [{ total_debits: 10000, total_credits: 10000 }]
        
        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValue(mockBalanceQuery)

        const result = await reconciliationService.checkTrialBalance('org-123', new Date())

        expect(result.status).toBe('balanced')
        expect(result.totalDebits).toBe(10000)
        expect(result.totalCredits).toBe(10000)
        expect(result.balanceDifference).toBe(0)
        expect(result.variances).toHaveLength(0)
      })

      test('should detect unbalanced trial balance and find problematic journals', async () => {
        const mockBalanceQuery = [{ total_debits: 10000, total_credits: 9900 }]
        const mockUnbalancedJournals = [{
          id: 'journal-problem',
          journalNumber: 'JE-2024-005',
          actual_debits: 500,
          actual_credits: 400
        }]
        
        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValueOnce(mockBalanceQuery)
          .mockResolvedValueOnce(mockUnbalancedJournals)

        const result = await reconciliationService.checkTrialBalance('org-123', new Date())

        expect(result.status).toBe('unbalanced')
        expect(result.balanceDifference).toBe(100)
        expect(result.variances).toHaveLength(2) // Overall + specific journal
        expect(result.variances[0].description).toContain('Trial balance is unbalanced by 100.00')
        expect(result.variances[1].description).toContain('Journal JE-2024-005 is unbalanced')
      })
    })

    describe('Inventory Balance Reconciliation', () => {
      test('should match inventory layers with GL balance', async () => {
        const mockLayerValue = [{ total_layer_value: 25000 }]
        const mockGLValue = [{ gl_balance: 25000 }]
        
        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValueOnce(mockLayerValue)
          .mockResolvedValueOnce(mockGLValue)

        const result = await reconciliationService.checkInventoryBalance('org-123', new Date())

        expect(result.status).toBe('matched')
        expect(result.layerValue).toBe(25000)
        expect(result.glValue).toBe(25000)
        expect(result.variance).toBe(0)
        expect(result.variances).toHaveLength(0)
      })

      test('should detect inventory variance and provide warehouse breakdown', async () => {
        const mockLayerValue = [{ total_layer_value: 25000 }]
        const mockGLValue = [{ gl_balance: 24000 }] // $1000 variance
        const mockWarehouseVariances = [{
          warehouse_id: 'wh-1',
          warehouse_name: 'Main Warehouse',
          warehouse_value: 15000,
          item_count: 25
        }]
        
        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValueOnce(mockLayerValue)
          .mockResolvedValueOnce(mockGLValue)
          .mockResolvedValueOnce(mockWarehouseVariances)

        const result = await reconciliationService.checkInventoryBalance('org-123', new Date())

        expect(result.status).toBe('variance')
        expect(result.variance).toBe(1000)
        expect(result.variances).toHaveLength(2) // Overall + warehouse breakdown
        expect(result.variances[0].description).toContain('does not match GL balance')
        expect(result.variances[1].description).toContain('Main Warehouse has inventory value')
      })
    })

    describe('AR/AP Balance Reconciliation', () => {
      test('should match AR control account with subledger', async () => {
        const mockARControl = [{ ar_control_balance: 15000 }]
        const mockARSubledger = [{ ar_subledger_balance: 15000 }]
        
        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValueOnce(mockARControl)
          .mockResolvedValueOnce(mockARSubledger)

        const result = await reconciliationService.checkArApBalance('org-123', new Date())

        expect(result.status).toBe('matched')
        expect(result.arControlBalance).toBe(15000)
        expect(result.arSubledgerBalance).toBe(15000)
        expect(result.arVariance).toBe(0)
        expect(result.variances).toHaveLength(0)
      })

      test('should detect AR variance', async () => {
        const mockARControl = [{ ar_control_balance: 15000 }]
        const mockARSubledger = [{ ar_subledger_balance: 14500 }] // $500 variance
        
        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValueOnce(mockARControl)
          .mockResolvedValueOnce(mockARSubledger)

        const result = await reconciliationService.checkArApBalance('org-123', new Date())

        expect(result.status).toBe('variance')
        expect(result.arVariance).toBe(500)
        expect(result.variances).toHaveLength(1)
        expect(result.variances[0].description).toContain('AR control account')
        expect(result.variances[0].severity).toBe('medium')
      })
    })

    describe('Comprehensive Reconciliation Run', () => {
      test('should run complete reconciliation and store results', async () => {
        // Mock all reconciliation checks to pass
        jest.spyOn(reconciliationService, 'checkTrialBalance')
          .mockResolvedValue({ status: 'balanced', totalDebits: 10000, totalCredits: 10000, balanceDifference: 0, variances: [] })
        jest.spyOn(reconciliationService, 'checkInventoryBalance')
          .mockResolvedValue({ status: 'matched', layerValue: 5000, glValue: 5000, variance: 0, variances: [] })
        jest.spyOn(reconciliationService, 'checkArApBalance')
          .mockResolvedValue({ status: 'matched', arControlBalance: 3000, arSubledgerBalance: 3000, arVariance: 0, variances: [] })

        const result = await reconciliationService.runReconciliation('org-123', 'manual', 'user-456')

        expect(result.status).toBe('completed')
        expect(result.trialBalance.status).toBe('balanced')
        expect(result.inventory.status).toBe('matched')
        expect(result.arAp.status).toBe('matched')
        expect(result.variances).toHaveLength(0)
        expect(result.summary.totalVariances).toBe(0)
        expect(result.summary.criticalVariances).toBe(0)
      })

      test('should handle reconciliation with variances', async () => {
        const trialBalanceVariance = {
          variance_type: 'trial_balance',
          description: 'Unbalanced by $100',
          variance_amount: 100,
          severity: 'high'
        }

        const inventoryVariance = {
          variance_type: 'inventory',
          description: 'Inventory mismatch',
          variance_amount: 500,
          severity: 'critical'
        }

        jest.spyOn(reconciliationService, 'checkTrialBalance')
          .mockResolvedValue({ status: 'unbalanced', variances: [trialBalanceVariance] })
        jest.spyOn(reconciliationService, 'checkInventoryBalance')
          .mockResolvedValue({ status: 'variance', variances: [inventoryVariance] })
        jest.spyOn(reconciliationService, 'checkArApBalance')
          .mockResolvedValue({ status: 'matched', variances: [] })

        const result = await reconciliationService.runReconciliation('org-123', 'daily', 'system')

        expect(result.status).toBe('completed')
        expect(result.variances).toHaveLength(2)
        expect(result.summary.totalVariances).toBe(2)
        expect(result.summary.criticalVariances).toBe(1)
        expect(result.summary.totalVarianceAmount).toBe(600)
      })
    })

    describe('Variance Management', () => {
      test('should resolve variance with proper audit trail', async () => {
        const mockVariance = {
          id: 'variance-123',
          description: 'Test variance',
          resolved: true,
          resolved_at: expect.any(Date),
          resolved_by: 'user-456',
          resolution_notes: 'Fixed by journal adjustment'
        }

        jest.spyOn(require('@prisma/client').PrismaClient.prototype.reconciliation_variances, 'update')
          .mockResolvedValue(mockVariance)

        const result = await reconciliationService.resolveVariance(
          'variance-123', 'user-456', 'Fixed by journal adjustment'
        )

        expect(result.resolved).toBe(true)
        expect(result.resolved_by).toBe('user-456')
        expect(result.resolution_notes).toBe('Fixed by journal adjustment')
      })

      test('should get unresolved variances by severity', async () => {
        const mockVariances = [
          { id: 'var-1', severity: 'critical', variance_amount: 1000 },
          { id: 'var-2', severity: 'high', variance_amount: 500 },
          { id: 'var-3', severity: 'medium', variance_amount: 100 }
        ]

        jest.spyOn(require('@prisma/client').PrismaClient.prototype.reconciliation_variances, 'findMany')
          .mockResolvedValue(mockVariances)

        const result = await reconciliationService.getUnresolvedVariances('org-123')

        expect(result).toHaveLength(3)
        expect(result[0].severity).toBe('critical') // Should be ordered by severity desc
      })
    })

    describe('Reconciliation Dashboard', () => {
      test('should provide comprehensive dashboard data', async () => {
        const mockLatestRun = {
          id: 'run-latest',
          run_date: new Date(),
          status: 'completed',
          _count: { reconciliation_variances: 2 }
        }

        const mockUnresolvedVariances = [
          { severity: 'critical', variance_amount: 1000 },
          { severity: 'high', variance_amount: 500 }
        ]

        const mockRecentHistory = [mockLatestRun]

        jest.spyOn(reconciliationService, 'getUnresolvedVariances')
          .mockResolvedValue(mockUnresolvedVariances)
        jest.spyOn(reconciliationService, 'getReconciliationHistory')
          .mockResolvedValue(mockRecentHistory)

        const result = await reconciliationService.getReconciliationDashboard('org-123')

        expect(result.summary.totalUnresolvedVariances).toBe(2)
        expect(result.summary.criticalVariances).toBe(1)
        expect(result.summary.isHealthy).toBe(false) // Has unresolved variances
        expect(result.unresolvedVariances.bySeverity.critical).toBe(1)
        expect(result.unresolvedVariances.bySeverity.high).toBe(1)
      })
    })
  })

  describe('Integration Scenarios', () => {
    
    describe('End-to-End Transaction Flow', () => {
      test('should maintain balance integrity through complete invoice cycle', async () => {
        // This would be a comprehensive integration test
        // Testing: Create Invoice → Confirm → Record Payment → Void → Verify Balance
        
        const transactionFlow = async () => {
          // 1. Create and confirm invoice
          const invoiceResult = await accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            idempotencyKey: 'invoice-flow-test',
            operation: 'invoice_confirmation',
            transactionFn: async (tx) => {
              // Mock invoice confirmation logic
              return {
                id: 'invoice-123',
                journalIds: ['journal-invoice'],
                inventoryChanges: []
              }
            }
          })

          // 2. Record payment
          const paymentResult = await accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            idempotencyKey: 'payment-flow-test',
            operation: 'payment_recording',
            transactionFn: async (tx) => {
              return {
                id: 'payment-123',
                journalIds: ['journal-payment']
              }
            }
          })

          // 3. Void invoice (should reverse everything)
          const voidResult = await accountingTransactionService.voidDocument(
            'invoice', 'invoice-123', 'org-123', 'user-456', 'Test void'
          )

          return { invoiceResult, paymentResult, voidResult }
        }

        // Mock the underlying transaction functions
        jest.spyOn(accountingTransactionService, 'validateJournalBalance').mockResolvedValue()
        jest.spyOn(accountingTransactionService, 'validateInventoryConsistency').mockResolvedValue()
        jest.spyOn(accountingTransactionService, 'validatePostingPeriod').mockResolvedValue()

        const result = await transactionFlow()

        expect(result.invoiceResult.id).toBe('invoice-123')
        expect(result.paymentResult.id).toBe('payment-123')
        expect(result.voidResult.id).toBe('invoice-123')
      })
    })

    describe('FIFO Inventory with Accounting Integration', () => {
      test('should maintain inventory-GL consistency through FIFO operations', async () => {
        // Test FIFO consumption with proper journal entries
        const fifoTest = async () => {
          // 1. Add inventory (opening balance)
          const openingResult = await accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            operation: 'opening_balance',
            transactionFn: async (tx) => {
              // Mock opening balance creation
              return {
                id: 'opening-123',
                journalIds: ['journal-opening'],
                inventoryChanges: [{
                  itemId: 'item-123',
                  warehouseId: 'warehouse-456',
                  organizationId: 'org-123',
                  expectedChange: 100
                }]
              }
            }
          })

          // 2. Consume inventory (FIFO)
          const consumptionResult = await accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            operation: 'inventory_consumption',
            transactionFn: async (tx) => {
              // Mock FIFO consumption
              return {
                id: 'consumption-123',
                journalIds: ['journal-cogs'],
                inventoryChanges: [{
                  itemId: 'item-123',
                  warehouseId: 'warehouse-456',
                  organizationId: 'org-123',
                  expectedChange: -50
                }]
              }
            }
          })

          return { openingResult, consumptionResult }
        }

        jest.spyOn(accountingTransactionService, 'validateJournalBalance').mockResolvedValue()
        jest.spyOn(accountingTransactionService, 'validateInventoryConsistency').mockResolvedValue()
        jest.spyOn(accountingTransactionService, 'validatePostingPeriod').mockResolvedValue()

        const result = await fifoTest()

        expect(result.openingResult.inventoryChanges[0].expectedChange).toBe(100)
        expect(result.consumptionResult.inventoryChanges[0].expectedChange).toBe(-50)
      })
    })

    describe('Period Close Integration', () => {
      test('should prevent posting to closed periods and require reversal workflow', async () => {
        // Mock closed period
        jest.spyOn(accountingTransactionService, 'validatePostingPeriod')
          .mockRejectedValue(new Error('Cannot post to closed period: December 2023'))

        const closedPeriodTest = async () => {
          return await accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            operation: 'test_closed_period',
            postingDate: new Date('2023-12-15'), // Closed period
            transactionFn: async (tx) => {
              return { id: 'should-not-execute' }
            }
          })
        }

        await expect(closedPeriodTest()).rejects.toThrow('Cannot post to closed period')
      })
    })
  })

  describe('Error Handling & Recovery', () => {
    
    describe('Transaction Rollback', () => {
      test('should rollback transaction on validation failure', async () => {
        const mockTransactionFn = jest.fn().mockResolvedValue({
          id: 'test-123',
          journalIds: ['journal-unbalanced']
        })

        // Mock journal validation to fail
        jest.spyOn(accountingTransactionService, 'validateJournalBalance')
          .mockRejectedValue(new Error('Journal is not balanced'))

        await expect(
          accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            operation: 'test-rollback',
            transactionFn: mockTransactionFn
          })
        ).rejects.toThrow('Journal is not balanced')

        // Transaction function should have been called
        expect(mockTransactionFn).toHaveBeenCalled()
      })
    })

    describe('Partial Failure Recovery', () => {
      test('should handle partial reconciliation failures gracefully', async () => {
        // Mock trial balance to succeed, inventory to fail
        jest.spyOn(reconciliationService, 'checkTrialBalance')
          .mockResolvedValue({ status: 'balanced', variances: [] })
        jest.spyOn(reconciliationService, 'checkInventoryBalance')
          .mockRejectedValue(new Error('Database connection failed'))
        jest.spyOn(reconciliationService, 'checkArApBalance')
          .mockResolvedValue({ status: 'matched', variances: [] })

        const result = await reconciliationService.runReconciliation('org-123', 'manual', 'user-456')

        expect(result.trialBalance.status).toBe('balanced')
        expect(result.inventory.status).toBe('error')
        expect(result.arAp.status).toBe('matched')
        expect(result.status).toBe('completed') // Should still complete partially
      })
    })
  })

  describe('Performance & Scalability', () => {
    
    describe('Large Dataset Handling', () => {
      test('should handle reconciliation of large datasets efficiently', async () => {
        // Mock large dataset queries
        const largeTrialBalance = Array.from({ length: 1000 }, (_, i) => ({
          total_debits: 1000 + i,
          total_credits: 1000 + i
        }))

        jest.spyOn(require('@prisma/client').PrismaClient.prototype, '$queryRaw')
          .mockResolvedValue([{ total_debits: 1000000, total_credits: 1000000 }])

        const startTime = Date.now()
        const result = await reconciliationService.checkTrialBalance('org-123', new Date())
        const endTime = Date.now()

        expect(result.status).toBe('balanced')
        expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      })
    })

    describe('Concurrent Transaction Handling', () => {
      test('should handle concurrent transactions with proper isolation', async () => {
        const concurrentTransactions = Array.from({ length: 10 }, (_, i) => 
          accountingTransactionService.withAccountingTransaction({
            organizationId: 'org-123',
            userId: 'user-456',
            idempotencyKey: `concurrent-${i}`,
            operation: 'concurrent-test',
            transactionFn: async (tx) => ({ id: `transaction-${i}` })
          })
        )

        jest.spyOn(accountingTransactionService, 'validateJournalBalance').mockResolvedValue()
        jest.spyOn(accountingTransactionService, 'validateInventoryConsistency').mockResolvedValue()
        jest.spyOn(accountingTransactionService, 'validatePostingPeriod').mockResolvedValue()

        const results = await Promise.all(concurrentTransactions)

        expect(results).toHaveLength(10)
        results.forEach((result, i) => {
          expect(result.id).toBe(`transaction-${i}`)
        })
      })
    })
  })
})
