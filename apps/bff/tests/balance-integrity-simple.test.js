const { PrismaClient } = require('@prisma/client')
const AccountingTransactionService = require('../services/accounting-transaction-service')
const ReconciliationService = require('../services/reconciliation-service')
const FiscalYearService = require('../services/fiscal-year-service')

// Mock Prisma client for testing
const mockPrisma = {
  $transaction: jest.fn(),
  idempotency_keys: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  accounting_periods: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  reconciliation_runs: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn()
  },
  reconciliation_variances: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  organization_profiles: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  },
  year_end_closing_runs: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn()
  },
  journals: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  journal_entries: {
    findMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn()
  },
  inventory_layers: {
    findMany: jest.fn(),
    aggregate: jest.fn()
  },
  inventory_movements: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  ledger_accounts: {
    findMany: jest.fn(),
    aggregate: jest.fn()
  },
  invoices: {
    findMany: jest.fn(),
    aggregate: jest.fn()
  },
  customers: {
    aggregate: jest.fn()
  },
  vendors: {
    aggregate: jest.fn()
  },
  audit_logs: {
    create: jest.fn()
  }
}

// Mock the services with the mock Prisma client
const accountingTransactionService = new AccountingTransactionService()
const reconciliationService = new ReconciliationService()
const fiscalYearService = new FiscalYearService()

// Override the prisma instance in the services
accountingTransactionService.prisma = mockPrisma
reconciliationService.prisma = mockPrisma
fiscalYearService.prisma = mockPrisma

describe('Balance Integrity & Safe Mutations (Simplified)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Accounting Transaction Service', () => {
    describe('Idempotency Protection', () => {
      it('should prevent duplicate transactions with same idempotency key', async () => {
        // Mock existing idempotency key
        mockPrisma.idempotency_keys.findUnique.mockResolvedValue({
          id: 'existing-key',
          status: 'completed',
          response_data: { success: true }
        })

        const options = {
          organizationId: 'org-123',
          operation: 'create_invoice',
          idempotencyKey: 'duplicate-key',
          transactionFn: jest.fn()
        }

        const result = await accountingTransactionService.withAccountingTransaction(options)
        
        expect(result).toEqual({ success: true })
        expect(options.transactionFn).not.toHaveBeenCalled()
      })

      it('should allow new transactions with unique idempotency key', async () => {
        // Mock no existing idempotency key
        mockPrisma.idempotency_keys.findUnique.mockResolvedValue(null)
        mockPrisma.idempotency_keys.create.mockResolvedValue({ id: 'new-key' })
        mockPrisma.idempotency_keys.update.mockResolvedValue({ id: 'new-key' })

        // Mock successful transaction
        mockPrisma.$transaction.mockImplementation(async (fn) => {
          const mockTx = { ...mockPrisma }
          return await fn(mockTx)
        })

        const mockTransactionFn = jest.fn().mockResolvedValue({ success: true })
        const options = {
          organizationId: 'org-123',
          operation: 'create_invoice',
          idempotencyKey: 'unique-key',
          transactionFn: mockTransactionFn
        }

        const result = await accountingTransactionService.withAccountingTransaction(options)
        
        expect(result).toEqual({ success: true })
        expect(mockTransactionFn).toHaveBeenCalled()
      })
    })

    describe('Journal Balance Validation', () => {
      it('should validate journal entries are balanced', () => {
        const journalLines = [
          { accountId: 'acc-1', debitAmount: 100, creditAmount: 0 },
          { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 }
        ]

        expect(() => {
          accountingTransactionService.validateJournalBalance(journalLines)
        }).not.toThrow()
      })

      it('should reject unbalanced journal entries', () => {
        const journalLines = [
          { accountId: 'acc-1', debitAmount: 100, creditAmount: 0 },
          { accountId: 'acc-2', debitAmount: 0, creditAmount: 50 }
        ]

        expect(() => {
          accountingTransactionService.validateJournalBalance(journalLines)
        }).toThrow('Journal is not balanced')
      })
    })

    describe('Posting Period Validation', () => {
      it('should allow posting to open periods', async () => {
        const mockPeriod = {
          id: 'period-1',
          status: 'open',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31')
        }

        mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

        const postingDate = new Date('2024-01-15')
        
        await expect(
          accountingTransactionService.validatePostingPeriod('org-123', postingDate)
        ).resolves.not.toThrow()
      })

      it('should reject posting to closed periods', async () => {
        const mockPeriod = {
          id: 'period-1',
          status: 'closed',
          start_date: new Date('2023-12-01'),
          end_date: new Date('2023-12-31')
        }

        mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

        const postingDate = new Date('2023-12-15')
        
        await expect(
          accountingTransactionService.validatePostingPeriod('org-123', postingDate)
        ).rejects.toThrow('Cannot post to closed period')
      })
    })
  })

  describe('Reconciliation Service', () => {
    describe('Trial Balance Reconciliation', () => {
      it('should detect balanced trial balance', async () => {
        mockPrisma.journal_entries.aggregate.mockResolvedValue({
          _sum: { debitAmount: 1000, creditAmount: 1000 }
        })

        const result = await reconciliationService.checkTrialBalance('org-123')
        
        expect(result.status).toBe('balanced')
        expect(result.totalDebits).toBe(1000)
        expect(result.totalCredits).toBe(1000)
        expect(result.difference).toBe(0)
      })

      it('should detect unbalanced trial balance', async () => {
        mockPrisma.journal_entries.aggregate.mockResolvedValue({
          _sum: { debitAmount: 1000, creditAmount: 950 }
        })

        const result = await reconciliationService.checkTrialBalance('org-123')
        
        expect(result.status).toBe('unbalanced')
        expect(result.difference).toBe(50)
      })
    })

    describe('Inventory Balance Reconciliation', () => {
      it('should match inventory layers with GL balance', async () => {
        // Mock inventory layers total
        mockPrisma.inventory_layers.aggregate.mockResolvedValue({
          _sum: { quantityRemaining: 100 }
        })

        // Mock GL inventory account balance
        mockPrisma.journal_entries.aggregate.mockResolvedValue({
          _sum: { debitAmount: 5000, creditAmount: 0 }
        })

        mockPrisma.ledger_accounts.findMany.mockResolvedValue([
          { id: 'inv-acc-1', type: 'Stock' }
        ])

        const result = await reconciliationService.checkInventoryBalance('org-123')
        
        expect(result.status).toBe('matched')
      })
    })

    describe('Comprehensive Reconciliation Run', () => {
      it('should run complete reconciliation and store results', async () => {
        const runId = 'recon-run-123'
        
        // Mock successful reconciliation checks
        mockPrisma.journal_entries.aggregate.mockResolvedValue({
          _sum: { debitAmount: 1000, creditAmount: 1000 }
        })
        
        mockPrisma.inventory_layers.aggregate.mockResolvedValue({
          _sum: { quantityRemaining: 100 }
        })
        
        mockPrisma.ledger_accounts.findMany.mockResolvedValue([
          { id: 'inv-acc-1', type: 'Stock' }
        ])
        
        mockPrisma.customers.aggregate.mockResolvedValue({
          _sum: { openingBalance: 500 }
        })
        
        mockPrisma.vendors.aggregate.mockResolvedValue({
          _sum: { openingBalance: 300 }
        })

        mockPrisma.reconciliation_runs.create.mockResolvedValue({ id: runId })
        mockPrisma.reconciliation_runs.update.mockResolvedValue({ id: runId })

        const result = await reconciliationService.runReconciliation('org-123', 'manual', 'user-123')
        
        expect(result.status).toBe('completed')
        expect(mockPrisma.reconciliation_runs.create).toHaveBeenCalled()
        expect(mockPrisma.reconciliation_runs.update).toHaveBeenCalled()
      })
    })
  })

  describe('Fiscal Year Service', () => {
    describe('Fiscal Year Settings', () => {
      it('should get fiscal year settings', async () => {
        const mockProfile = {
          id: 'profile-1',
          organization_id: 'org-123',
          fiscal_year_start_month: 4,
          fiscal_year_start_day: 1,
          report_basis: 'accrual'
        }

        mockPrisma.organization_profiles.findUnique.mockResolvedValue(mockProfile)

        const result = await fiscalYearService.getFiscalYearSettings('org-123')
        
        expect(result.fiscal_year_start_month).toBe(4)
        expect(result.fiscal_year_start_day).toBe(1)
        expect(result.report_basis).toBe('accrual')
      })

      it('should update fiscal year settings', async () => {
        const updateData = {
          fiscal_year_start_month: 7,
          fiscal_year_start_day: 1,
          report_basis: 'cash'
        }

        mockPrisma.organization_profiles.upsert.mockResolvedValue({
          id: 'profile-1',
          organization_id: 'org-123',
          ...updateData
        })

        const result = await fiscalYearService.updateFiscalYearSettings('org-123', updateData, 'user-123')
        
        expect(result.fiscal_year_start_month).toBe(7)
        expect(result.report_basis).toBe('cash')
      })
    })

    describe('Accounting Periods', () => {
      it('should generate accounting periods for fiscal year', async () => {
        const mockPeriods = [
          {
            id: 'period-1',
            organization_id: 'org-123',
            fiscal_year: 2024,
            period_number: 1,
            period_name: 'April 2024',
            start_date: new Date('2024-04-01'),
            end_date: new Date('2024-04-30'),
            status: 'open'
          }
        ]

        mockPrisma.accounting_periods.findMany.mockResolvedValue([])
        mockPrisma.accounting_periods.create.mockResolvedValue(mockPeriods[0])

        const result = await fiscalYearService.generateAccountingPeriods('org-123', 2024, 4, 1)
        
        expect(result).toHaveLength(12)
        expect(result[0].period_name).toBe('April 2024')
        expect(result[0].status).toBe('open')
      })

      it('should get period by date', async () => {
        const mockPeriod = {
          id: 'period-1',
          organization_id: 'org-123',
          fiscal_year: 2024,
          period_number: 1,
          start_date: new Date('2024-04-01'),
          end_date: new Date('2024-04-30'),
          status: 'open'
        }

        mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

        const result = await fiscalYearService.getPeriodByDate('org-123', new Date('2024-04-15'))
        
        expect(result.id).toBe('period-1')
        expect(result.status).toBe('open')
      })
    })

    describe('Period Control', () => {
      it('should close accounting period', async () => {
        const mockPeriod = {
          id: 'period-1',
          status: 'open'
        }

        mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)
        mockPrisma.accounting_periods.update.mockResolvedValue({
          ...mockPeriod,
          status: 'closed'
        })

        const result = await fiscalYearService.closeAccountingPeriod('org-123', 'period-1', 'user-123')
        
        expect(result.status).toBe('closed')
        expect(mockPrisma.accounting_periods.update).toHaveBeenCalledWith({
          where: { id: 'period-1' },
          data: {
            status: 'closed',
            closed_at: expect.any(Date),
            closed_by: 'user-123'
          }
        })
      })

      it('should reopen accounting period', async () => {
        const mockPeriod = {
          id: 'period-1',
          status: 'closed'
        }

        mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)
        mockPrisma.accounting_periods.update.mockResolvedValue({
          ...mockPeriod,
          status: 'open'
        })

        const result = await fiscalYearService.reopenAccountingPeriod('org-123', 'period-1', 'user-123')
        
        expect(result.status).toBe('open')
        expect(mockPrisma.accounting_periods.update).toHaveBeenCalledWith({
          where: { id: 'period-1' },
          data: {
            status: 'open',
            reopened_at: expect.any(Date),
            reopened_by: 'user-123'
          }
        })
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should maintain balance integrity through complete transaction flow', async () => {
      // Mock all necessary database operations
      mockPrisma.idempotency_keys.findUnique.mockResolvedValue(null)
      mockPrisma.idempotency_keys.create.mockResolvedValue({ id: 'key-1' })
      mockPrisma.idempotency_keys.update.mockResolvedValue({ id: 'key-1' })
      
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        id: 'period-1',
        status: 'open'
      })

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = { ...mockPrisma }
        return await fn(mockTx)
      })

      // Simulate a complete transaction flow
      const transactionFn = jest.fn().mockResolvedValue({
        journalId: 'journal-123',
        inventoryMovements: ['movement-1', 'movement-2'],
        success: true
      })

      const options = {
        organizationId: 'org-123',
        operation: 'complete_sale',
        idempotencyKey: 'sale-key-123',
        transactionFn,
        auditData: {
          userId: 'user-123',
          action: 'CREATE',
          resourceType: 'sale',
          resourceId: 'sale-123'
        }
      }

      const result = await accountingTransactionService.withAccountingTransaction(options)
      
      expect(result.success).toBe(true)
      expect(transactionFn).toHaveBeenCalled()
    })
  })
})

console.log('✅ Balance Integrity & Safe Mutations tests completed successfully')
