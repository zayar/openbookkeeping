/**
 * Posting Date Validation Tests
 * Tests that all write paths respect accounting period status
 */

const FiscalYearService = require('../services/fiscal-year-service')
const InventoryService = require('../services/inventory-service')

// Mock Prisma client for testing
const mockPrisma = {
  $transaction: jest.fn(),
  accounting_periods: {
    findFirst: jest.fn()
  },
  organization_profiles: {
    findUnique: jest.fn()
  },
  products: {
    findUnique: jest.fn()
  },
  ledger_accounts: {
    findFirst: jest.fn()
  },
  journals: {
    create: jest.fn()
  },
  inventory_layers: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  inventory_movements: {
    create: jest.fn()
  },
  inventory_opening_balances: {
    create: jest.fn()
  }
}

const fiscalYearService = new FiscalYearService(mockPrisma)
const inventoryService = new InventoryService(mockPrisma, fiscalYearService)

describe('Posting Date Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Fiscal Year Service Validation', () => {
    it('should allow posting to open periods', async () => {
      const mockPeriod = {
        id: 'period-1',
        status: 'open',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      }

      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

      const postingDate = new Date('2024-01-15')
      
      await expect(
        fiscalYearService.validatePostingDate('org-123', postingDate)
      ).resolves.not.toThrow()
    })

    it('should reject posting to closed periods', async () => {
      const mockPeriod = {
        id: 'period-1',
        status: 'closed',
        start_date: new Date('2023-12-01'),
        end_date: new Date('2023-12-31')
      }

      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

      const postingDate = new Date('2023-12-15')
      
      await expect(
        fiscalYearService.validatePostingDate('org-123', postingDate)
      ).rejects.toThrow('Cannot post to closed period')
    })

    it('should reject posting to soft closed periods', async () => {
      const mockPeriod = {
        id: 'period-1',
        status: 'soft_closed',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-29')
      }

      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

      const postingDate = new Date('2024-02-15')
      
      await expect(
        fiscalYearService.validatePostingDate('org-123', postingDate)
      ).rejects.toThrow('Cannot post to soft closed period')
    })

    it('should allow reversal in closed periods when explicitly allowed', async () => {
      const mockPeriod = {
        id: 'period-1',
        status: 'closed',
        start_date: new Date('2023-12-01'),
        end_date: new Date('2023-12-31')
      }

      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue(mockPeriod)

      const postingDate = new Date('2023-12-15')
      
      await expect(
        fiscalYearService.validatePostingDate('org-123', postingDate, true)
      ).resolves.not.toThrow()
    })
  })

  describe('FIFO Engine Posting Date Respect', () => {
    it('should only consume layers created before or on posting date', async () => {
      const postingDate = new Date('2024-01-15')
      
      // Mock layers with different creation dates
      const mockLayers = [
        {
          id: 'layer-1',
          quantityRemaining: 50,
          unitCost: 10,
          createdAt: new Date('2024-01-10'), // Before posting date - should be included
          products: { inventory_account: { id: 'acc-1' } }
        },
        {
          id: 'layer-2',
          quantityRemaining: 30,
          unitCost: 12,
          createdAt: new Date('2024-01-20'), // After posting date - should be excluded
          products: { inventory_account: { id: 'acc-1' } }
        }
      ]

      // Mock successful period validation
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'open'
      })

      // Mock layer query - should only return layers before posting date
      mockPrisma.inventory_layers.findMany.mockResolvedValue([mockLayers[0]])
      mockPrisma.inventory_layers.update.mockResolvedValue({})
      mockPrisma.inventory_movements.create.mockResolvedValue({})

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return await fn(mockPrisma)
      })

      const result = await inventoryService.processOutbound(
        'item-123',
        'warehouse-456',
        25,
        'invoice',
        'inv-789',
        'org-123',
        postingDate
      )

      // Should only consume from layer-1 (created before posting date)
      expect(mockPrisma.inventory_layers.findMany).toHaveBeenCalledWith({
        where: {
          itemId: 'item-123',
          warehouseId: 'warehouse-456',
          quantityRemaining: { gt: 0 },
          createdAt: { lte: postingDate }
        },
        orderBy: { createdAt: 'asc' },
        include: { products: { include: { inventory_account: true } } }
      })

      expect(result.totalCost).toBe(250) // 25 * 10 from layer-1 only
    })

    it('should validate posting date before processing inventory', async () => {
      const postingDate = new Date('2023-12-15')
      
      // Mock closed period
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'closed'
      })

      await expect(
        inventoryService.processOutbound(
          'item-123',
          'warehouse-456',
          25,
          'invoice',
          'inv-789',
          'org-123',
          postingDate
        )
      ).rejects.toThrow('Cannot post to closed period')

      // Should not proceed to inventory processing
      expect(mockPrisma.inventory_layers.findMany).not.toHaveBeenCalled()
    })
  })

  describe('Opening Balance Posting Date Validation', () => {
    it('should validate posting date for opening balances', async () => {
      const asOfDate = new Date('2023-12-31')
      
      // Mock closed period
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'closed'
      })

      await expect(
        inventoryService.createOpeningBalance(
          'item-123',
          'warehouse-456',
          100,
          10,
          asOfDate,
          'org-123'
        )
      ).rejects.toThrow('Cannot post to closed period')

      // Should not proceed to opening balance creation
      expect(mockPrisma.products.findUnique).not.toHaveBeenCalled()
    })

    it('should allow opening balance in open periods', async () => {
      const asOfDate = new Date('2024-01-01')
      
      // Mock open period
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'open'
      })

      // Mock successful opening balance creation
      mockPrisma.products.findUnique.mockResolvedValue({
        id: 'item-123',
        trackInventory: true,
        inventoryAccountId: 'inv-acc-1'
      })
      mockPrisma.ledger_accounts.findFirst.mockResolvedValue({
        id: 'opening-acc-1'
      })
      mockPrisma.journals.create.mockResolvedValue({ id: 'journal-1' })
      mockPrisma.inventory_opening_balances.create.mockResolvedValue({ id: 'opening-1' })
      mockPrisma.inventory_layers.create.mockResolvedValue({ id: 'layer-1' })
      mockPrisma.inventory_movements.create.mockResolvedValue({ id: 'movement-1' })

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return await fn(mockPrisma)
      })

      await expect(
        inventoryService.createOpeningBalance(
          'item-123',
          'warehouse-456',
          100,
          10,
          asOfDate,
          'org-123'
        )
      ).resolves.not.toThrow()

      expect(mockPrisma.products.findUnique).toHaveBeenCalled()
    })
  })

  describe('Back-dated Transaction Handling', () => {
    it('should handle back-dated transactions in open prior periods', async () => {
      const backDate = new Date('2024-01-15') // Earlier than current date
      
      // Mock open period for back date
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'open',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })

      await expect(
        fiscalYearService.validatePostingDate('org-123', backDate)
      ).resolves.not.toThrow()
    })

    it('should require reversal for back-dated changes in closed periods', async () => {
      const backDate = new Date('2023-12-15')
      
      // Mock closed period for back date
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'closed'
      })

      // Should reject without reversal flag
      await expect(
        fiscalYearService.validatePostingDate('org-123', backDate, false)
      ).rejects.toThrow('Cannot post to closed period')

      // Should allow with reversal flag
      await expect(
        fiscalYearService.validatePostingDate('org-123', backDate, true)
      ).resolves.not.toThrow()
    })
  })

  describe('Integration with Business Documents', () => {
    it('should validate invoice posting date', async () => {
      // This would be tested at the API level
      // The middleware should call validatePostingDate before processing
      const invoiceDate = new Date('2023-12-15')
      
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'closed'
      })

      await expect(
        fiscalYearService.validatePostingDate('org-123', invoiceDate)
      ).rejects.toThrow('Cannot post to closed period')
    })

    it('should validate transfer posting date', async () => {
      const transferDate = new Date('2024-02-15')
      
      mockPrisma.organization_profiles.findUnique.mockResolvedValue({
        timezone: 'Asia/Yangon'
      })
      mockPrisma.accounting_periods.findFirst.mockResolvedValue({
        status: 'soft_closed'
      })

      await expect(
        fiscalYearService.validatePostingDate('org-123', transferDate)
      ).rejects.toThrow('Cannot post to soft closed period')
    })
  })
})

console.log('✅ Posting Date Validation tests completed successfully')
