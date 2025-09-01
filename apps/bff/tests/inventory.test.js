const { PrismaClient } = require('@prisma/client')
const inventoryService = require('../services/inventory-service')

const prisma = new PrismaClient()

describe('Inventory Tracking System', () => {
  let testOrg, testWarehouse, testItem, testInventoryAccount, testCogsAccount, testOpeningBalanceAccount

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.inventory_movements.deleteMany({ where: { itemId: { contains: 'test' } } })
    await prisma.inventory_layers.deleteMany({ where: { itemId: { contains: 'test' } } })
    await prisma.inventory_opening_balances.deleteMany({ where: { itemId: { contains: 'test' } } })
    await prisma.journal_entries.deleteMany({ where: { journalId: { contains: 'test' } } })
    await prisma.journals.deleteMany({ where: { id: { contains: 'test' } } })
    await prisma.products.deleteMany({ where: { id: { contains: 'test' } } })
    await prisma.warehouses.deleteMany({ where: { id: { contains: 'test' } } })
    await prisma.ledger_accounts.deleteMany({ where: { id: { contains: 'test' } } })
    await prisma.organizations.deleteMany({ where: { id: { contains: 'test' } } })

    // Create test organization
    testOrg = await prisma.organizations.create({
      data: {
        id: 'test-org-inventory',
        name: 'Test Inventory Org',
        slug: 'test-inventory-org',
        oaOrganizationId: 'oa-test-inventory',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Skip user creation - not needed for service tests

    // Create test accounts
    testInventoryAccount = await prisma.ledger_accounts.create({
      data: {
        id: 'test-inventory-account',
        organizationId: testOrg.id,
        code: '1300',
        name: 'Test Inventory Asset',
        type: 'inventory',
        subType: 'stock',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testCogsAccount = await prisma.ledger_accounts.create({
      data: {
        id: 'test-cogs-account',
        organizationId: testOrg.id,
        code: '5000',
        name: 'Test Cost of Goods Sold',
        type: 'expense',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testOpeningBalanceAccount = await prisma.ledger_accounts.create({
      data: {
        id: 'test-opening-balance-account',
        organizationId: testOrg.id,
        code: '3900',
        name: 'Test Opening Balance Equity',
        type: 'equity',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create test warehouse
    testWarehouse = await prisma.warehouses.create({
      data: {
        id: 'test-warehouse',
        organizationId: testOrg.id,
        name: 'Test Warehouse',
        code: 'TW01',
        address: '123 Test St',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create test inventory item
    testItem = await prisma.products.create({
      data: {
        id: 'test-inventory-item',
        organizationId: testOrg.id,
        name: 'Test Inventory Item',
        sku: 'TEST-INV-001',
        type: 'goods',
        unit: 'pcs',
        trackInventory: true,
        inventoryAccountId: testInventoryAccount.id,
        inventoryValuationMethod: 'FIFO',
        currentStock: 0,
        lowStockAlert: 10,
        sellingPrice: 150,
        costPrice: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  })

  afterAll(async () => {
    try {
      // Clean up test data
      if (testItem?.id) {
        await prisma.inventory_movements.deleteMany({ where: { itemId: testItem.id } })
        await prisma.inventory_layers.deleteMany({ where: { itemId: testItem.id } })
        await prisma.inventory_opening_balances.deleteMany({ where: { itemId: testItem.id } })
        await prisma.products.delete({ where: { id: testItem.id } })
      }
      
      await prisma.journal_entries.deleteMany({ where: { journalId: { contains: 'test' } } })
      await prisma.journals.deleteMany({ where: { id: { contains: 'test' } } })
      
      if (testWarehouse?.id) await prisma.warehouses.delete({ where: { id: testWarehouse.id } })
      if (testInventoryAccount?.id) await prisma.ledger_accounts.delete({ where: { id: testInventoryAccount.id } })
      if (testCogsAccount?.id) await prisma.ledger_accounts.delete({ where: { id: testCogsAccount.id } })
      if (testOpeningBalanceAccount?.id) await prisma.ledger_accounts.delete({ where: { id: testOpeningBalanceAccount.id } })
      // No user to delete
      if (testOrg?.id) await prisma.organizations.delete({ where: { id: testOrg.id } })
    } catch (error) {
      console.log('Cleanup error (expected):', error.message)
    }
    
    await prisma.$disconnect()
  })

  describe('Inventory Service', () => {
    describe('Opening Balance', () => {
      test('should create opening balance with journal entry and inventory layer', async () => {
        const result = await inventoryService.createOpeningBalance(
          testItem.id,
          testWarehouse.id,
          100, // quantity
          80,  // unit cost
          new Date(),
          testOrg.id
        )

        expect(result).toHaveProperty('openingBalance')
        expect(result).toHaveProperty('journal')
        expect(result).toHaveProperty('layer')

        // Check opening balance record
        expect(result.openingBalance.quantity).toBe(100)
        expect(result.openingBalance.unitCost).toBe(80)
        expect(result.openingBalance.totalValue).toBe(8000)

        // Check journal entry
        expect(result.journal.totalDebit).toBe(8000)
        expect(result.journal.totalCredit).toBe(8000)

        // Check inventory layer
        expect(result.layer.quantityRemaining).toBe(100)
        expect(result.layer.unitCost).toBe(80)
        expect(result.layer.sourceType).toBe('opening')
      })

      test('should fail to create opening balance for non-tracked item', async () => {
        const nonTrackedItem = await prisma.products.create({
          data: {
            id: 'test-non-tracked-item',
            organizationId: testOrg.id,
            name: 'Non-Tracked Item',
            type: 'goods',
            trackInventory: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        await expect(
          inventoryService.createOpeningBalance(
            nonTrackedItem.id,
            testWarehouse.id,
            50,
            100,
            new Date(),
            testOrg.id
          )
        ).rejects.toThrow('Item not found or inventory tracking not enabled')

        await prisma.products.delete({ where: { id: nonTrackedItem.id } })
      })
    })

    describe('FIFO Processing', () => {
      beforeEach(async () => {
        // Clean up layers before each test
        await prisma.inventory_movements.deleteMany({ where: { itemId: testItem.id } })
        await prisma.inventory_layers.deleteMany({ where: { itemId: testItem.id } })
      })

      test('should process inbound inventory correctly', async () => {
        const result = await inventoryService.processInbound(
          testItem.id,
          testWarehouse.id,
          50, // quantity
          90, // unit cost
          'purchase',
          'test-purchase-001'
        )

        expect(result).toHaveProperty('layer')
        expect(result.layer.quantityRemaining).toBe(50)
        expect(result.layer.unitCost).toBe(90)
      })

      test('should process outbound inventory using FIFO', async () => {
        // Create multiple inventory layers
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 30, 80, 'purchase', 'p1')
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 40, 90, 'purchase', 'p2')
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 20, 100, 'purchase', 'p3')

        // Process outbound (should consume from oldest layers first - FIFO)
        const result = await inventoryService.processOutbound(
          testItem.id,
          testWarehouse.id,
          60, // consume 60 units
          'sale',
          'test-sale-001',
          testOrg.id
        )

        // Should consume 30 units @ 80 + 30 units @ 90 = 2400 + 2700 = 5100
        expect(result.totalCost).toBe(5100)
        expect(result.averageCost).toBe(85) // 5100 / 60
        expect(result.consumedLayers).toHaveLength(2)
        
        // First layer should be fully consumed (30 units @ 80)
        expect(result.consumedLayers[0].quantity).toBe(30)
        expect(result.consumedLayers[0].unitCost).toBe(80)
        
        // Second layer should be partially consumed (30 units @ 90)
        expect(result.consumedLayers[1].quantity).toBe(30)
        expect(result.consumedLayers[1].unitCost).toBe(90)
      })

      test('should fail outbound when insufficient inventory', async () => {
        // Create only 20 units
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 20, 100, 'purchase', 'p1')

        // Try to consume 50 units
        await expect(
          inventoryService.processOutbound(testItem.id, testWarehouse.id, 50, 'sale', 'test-sale', testOrg.id)
        ).rejects.toThrow('Insufficient inventory')
      })
    })

    describe('COGS Journal Creation', () => {
      test('should create correct COGS journal entry', async () => {
        const journal = await inventoryService.createCOGSJournal(
          testItem.id,
          5000, // total cost
          'test-invoice-001',
          testOrg.id
        )

        expect(journal.totalDebit).toBe(5000)
        expect(journal.totalCredit).toBe(5000)
        expect(journal.reference).toContain(testItem.name)
      })
    })

    describe('Inventory Levels', () => {
      beforeEach(async () => {
        await prisma.inventory_movements.deleteMany({ where: { itemId: testItem.id } })
        await prisma.inventory_layers.deleteMany({ where: { itemId: testItem.id } })
      })

      test('should return correct inventory levels', async () => {
        // Add inventory
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 100, 80, 'purchase', 'p1')
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 50, 90, 'purchase', 'p2')
        
        // Consume some
        await inventoryService.processOutbound(testItem.id, testWarehouse.id, 30, 'sale', 's1', testOrg.id)

        const levels = await inventoryService.getInventoryLevels(testItem.id)
        
        expect(levels).toHaveLength(1) // One warehouse
        expect(levels[0].totalQuantity).toBe(120) // 100 + 50 - 30
        expect(levels[0].warehouseId).toBe(testWarehouse.id)
        expect(levels[0].layers).toHaveLength(2) // Two remaining layers
      })
    })

    describe('Movement History', () => {
      test('should track all inventory movements', async () => {
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 100, 80, 'purchase', 'p1')
        await inventoryService.processOutbound(testItem.id, testWarehouse.id, 20, 'sale', 's1', testOrg.id)

        const movements = await inventoryService.getMovementHistory(testItem.id)
        
        expect(movements.length).toBeGreaterThanOrEqual(2)
        expect(movements[0].direction).toBe('out') // Most recent first
        expect(movements[1].direction).toBe('in')
      })
    })

    describe('Tracking Validation', () => {
      test('should validate if tracking can be disabled', async () => {
        // Item with only opening balance should allow disabling
        const canDisable = await inventoryService.canDisableInventoryTracking(testItem.id)
        expect(canDisable).toBe(true)

        // Add a non-opening movement
        await inventoryService.processInbound(testItem.id, testWarehouse.id, 10, 100, 'purchase', 'p1')
        
        const canDisableAfter = await inventoryService.canDisableInventoryTracking(testItem.id)
        expect(canDisableAfter).toBe(false)
      })
    })
  })

  // API Endpoint tests can be added later when needed

  describe('Integration Tests', () => {
    test('should handle complete sales flow with inventory and COGS', async () => {
      // 1. Create item with opening balance
      await inventoryService.createOpeningBalance(
        testItem.id,
        testWarehouse.id,
        100,
        80,
        new Date(),
        testOrg.id
      )

      // 2. Add more inventory via purchase
      await inventoryService.processInbound(testItem.id, testWarehouse.id, 50, 90, 'purchase', 'p1')

      // 3. Create customer for invoice
      const customer = await prisma.customers.create({
        data: {
          id: 'test-customer-inventory',
          organizationId: testOrg.id,
          name: 'Test Customer',
          email: 'customer@test.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // 4. Create sales account
      const salesAccount = await prisma.ledger_accounts.create({
        data: {
          id: 'test-sales-account',
          organizationId: testOrg.id,
          code: '4000',
          name: 'Test Sales Revenue',
          type: 'revenue',
          balance: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // 5. Create invoice
      const invoice = await prisma.invoices.create({
        data: {
          id: 'test-invoice-inventory',
          organizationId: testOrg.id,
          customerId: customer.id,
          invoiceNumber: 'INV-TEST-001',
          issueDate: new Date(),
          dueDate: new Date(),
          status: 'draft',
          subtotal: 3000, // 20 units * 150 selling price
          totalAmount: 3000,
          balanceDue: 3000,
          paidAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          invoice_items: {
            create: [
              {
                id: 'test-invoice-item-1',
                productId: testItem.id,
                itemName: testItem.name,
                quantity: 20,
                unitPrice: 150,
                amount: 3000,
                salesAccountId: salesAccount.id,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        },
        include: {
          invoice_items: true
        }
      })

      // 6. Process inventory consumption manually (simulating invoice confirmation)
      const consumptionResult = await inventoryService.processOutbound(
        testItem.id,
        testWarehouse.id,
        20,
        'invoice',
        invoice.id,
        testOrg.id
      )

      expect(consumptionResult.totalCost).toBe(1600) // 20 units * 80 cost (FIFO)

      // 7. Verify inventory levels
      const levels = await inventoryService.getInventoryLevels(testItem.id)
      expect(levels[0].totalQuantity).toBe(130) // 100 + 50 - 20

      // 8. Create and verify COGS journal
      const cogsJournal = await inventoryService.createCOGSJournal(
        testItem.id,
        consumptionResult.totalCost,
        invoice.id,
        testOrg.id
      )
      expect(cogsJournal.totalDebit).toBe(1600)

      // Clean up
      await prisma.invoice_payments.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoice_items.deleteMany({ where: { invoiceId: invoice.id } })
      await prisma.invoices.delete({ where: { id: invoice.id } })
      await prisma.customers.delete({ where: { id: customer.id } })
      await prisma.ledger_accounts.delete({ where: { id: salesAccount.id } })
    })

    test('should prevent negative inventory', async () => {
      // Clear existing inventory
      await prisma.inventory_movements.deleteMany({ where: { itemId: testItem.id } })
      await prisma.inventory_layers.deleteMany({ where: { itemId: testItem.id } })

      // Add only 10 units
      await inventoryService.processInbound(testItem.id, testWarehouse.id, 10, 100, 'purchase', 'p1')

      // Try to consume 20 units
      await expect(
        inventoryService.processOutbound(testItem.id, testWarehouse.id, 20, 'sale', 's1', testOrg.id)
      ).rejects.toThrow('Insufficient inventory')
    })
  })
})
