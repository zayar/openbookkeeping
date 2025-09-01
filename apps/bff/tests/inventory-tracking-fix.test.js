const request = require('supertest')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Mock auth for testing
global.mockAuth = {
  organizationId: 'org_test_inventory',
  userId: 'user_test_inventory'
}

const app = require('../server')

describe('Inventory Tracking Bug Fix', () => {
  let testOrg, testWarehouse, testInventoryAccount, testSalesAccount, testPurchaseAccount, testCustomer, testItem

  beforeAll(async () => {
    // Create test organization
    testOrg = await prisma.organizations.create({
      data: {
        id: 'org_test_inventory',
        name: 'Test Inventory Org',
        slug: 'test-inventory-org',
        industry: 'technology',
        timezone: 'UTC',
        oaOrganizationId: 'oa_test_inventory',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create test accounts
    testInventoryAccount = await prisma.ledger_accounts.create({
      data: {
        id: 'acc_test_inventory_stock',
        organizationId: testOrg.id,
        code: '1800',
        name: 'Test Inventory',
        type: 'stock',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testSalesAccount = await prisma.ledger_accounts.create({
      data: {
        id: 'acc_test_sales',
        organizationId: testOrg.id,
        code: '4000',
        name: 'Test Sales Revenue',
        type: 'income',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    testPurchaseAccount = await prisma.ledger_accounts.create({
      data: {
        id: 'acc_test_cogs',
        organizationId: testOrg.id,
        code: '5000',
        name: 'Test Cost of Goods Sold',
        type: 'cost_of_goods_sold',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create test branch
    const testBranch = await prisma.branches.create({
      data: {
        id: 'branch_test_inventory',
        organizationId: testOrg.id,
        name: 'Test Branch',
        code: 'TB01',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create test warehouse
    testWarehouse = await prisma.warehouses.create({
      data: {
        id: 'warehouse_test_inventory',
        organizationId: testOrg.id,
        branchId: testBranch.id,
        name: 'Test Warehouse',
        code: 'TW01',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create test customer
    testCustomer = await prisma.customers.create({
      data: {
        id: 'customer_test_inventory',
        organizationId: testOrg.id,
        name: 'Test Customer',
        email: 'test@customer.com',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    if (testItem?.id) {
      await prisma.inventory_layers.deleteMany({ where: { itemId: testItem.id } })
      await prisma.inventory_opening_balances.deleteMany({ where: { itemId: testItem.id } })
      await prisma.products.deleteMany({ where: { id: testItem.id } })
    }
    
    if (testOrg?.id) {
      await prisma.customers.deleteMany({ where: { organizationId: testOrg.id } })
      await prisma.warehouses.deleteMany({ where: { organizationId: testOrg.id } })
      await prisma.branches.deleteMany({ where: { organizationId: testOrg.id } })
      await prisma.ledger_accounts.deleteMany({ where: { organizationId: testOrg.id } })
      await prisma.organizations.deleteMany({ where: { id: testOrg.id } })
    }
    
    await prisma.$disconnect()
  })

  describe('Opening Balance Creation', () => {
    test('should create inventory item with opening balances and FIFO layers', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          name: 'AlpineWater Test',
          sku: 'ALP-TEST-001',
          type: 'goods',
          unit: 'pcs',
          costPrice: 500,
          sellingPrice: 1000,
          salesAccountId: testSalesAccount.id,
          purchaseAccountId: testPurchaseAccount.id,
          trackInventory: true,
          inventoryAccountId: testInventoryAccount.id,
          openingBalances: [
            {
              warehouseId: testWarehouse.id,
              openingStock: 10,
              openingStockValue: 5000
            }
          ]
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()

      testItem = response.body.data

      // Verify opening balance record was created
      const openingBalance = await prisma.inventory_opening_balances.findFirst({
        where: {
          itemId: testItem.id,
          warehouseId: testWarehouse.id
        }
      })

      expect(openingBalance).toBeDefined()
      expect(parseFloat(openingBalance.quantity)).toBe(10)
      expect(parseFloat(openingBalance.unitCost)).toBe(500)
      expect(parseFloat(openingBalance.totalValue)).toBe(5000)

      // Verify inventory layer was created
      const inventoryLayer = await prisma.inventory_layers.findFirst({
        where: {
          itemId: testItem.id,
          warehouseId: testWarehouse.id,
          sourceType: 'opening_balance'
        }
      })

      expect(inventoryLayer).toBeDefined()
      expect(parseFloat(inventoryLayer.quantityRemaining)).toBe(10)
      expect(parseFloat(inventoryLayer.unitCost)).toBe(500)
    })

    test('should have sufficient inventory available for consumption', async () => {
      // Check inventory availability using the same logic as the app
      const availableLayers = await prisma.inventory_layers.findMany({
        where: {
          itemId: testItem.id,
          warehouseId: testWarehouse.id,
          quantityRemaining: { gt: 0 }
        },
        orderBy: { createdAt: 'asc' }
      })

      expect(availableLayers.length).toBeGreaterThan(0)

      const totalAvailable = availableLayers.reduce((sum, layer) => 
        sum + parseFloat(layer.quantityRemaining), 0)

      expect(totalAvailable).toBe(10)
    })
  })

  describe('Inventory Consumption', () => {
    test('should successfully create and confirm invoice with inventory item', async () => {
      // Create invoice
      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set('X-Idempotency-Key', 'test-invoice-001')
        .send({
          customerId: testCustomer.id,
          invoiceNumber: 'INV-TEST-001',
          issueDate: '2025-08-23',
          dueDate: '2025-09-22',
          items: [
            {
              itemId: testItem.id,
              itemName: 'AlpineWater Test',
              quantity: 2,
              rate: 1000,
              amount: 2000
            }
          ]
        })

      expect(invoiceResponse.status).toBe(201)
      expect(invoiceResponse.body.success).toBe(true)

      const invoice = invoiceResponse.body.data

      // Confirm invoice (this should consume inventory)
      const confirmResponse = await request(app)
        .post(`/api/invoices/${invoice.id}/confirm`)
        .set('X-Idempotency-Key', 'test-confirm-001')
        .send({})

      expect(confirmResponse.status).toBe(200)
      expect(confirmResponse.body.success).toBe(true)

      // Verify inventory was consumed
      const remainingLayers = await prisma.inventory_layers.findMany({
        where: {
          itemId: testItem.id,
          warehouseId: testWarehouse.id
        }
      })

      const totalRemaining = remainingLayers.reduce((sum, layer) => 
        sum + parseFloat(layer.quantityRemaining), 0)

      expect(totalRemaining).toBe(8) // 10 - 2 = 8
    })

    test('should prevent overselling inventory', async () => {
      // Try to sell more than available (8 remaining)
      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set('X-Idempotency-Key', 'test-invoice-oversell')
        .send({
          customerId: testCustomer.id,
          invoiceNumber: 'INV-OVERSELL-001',
          issueDate: '2025-08-23',
          dueDate: '2025-09-22',
          items: [
            {
              itemId: testItem.id,
              itemName: 'AlpineWater Test',
              quantity: 15, // More than the 8 remaining
              rate: 1000,
              amount: 15000
            }
          ]
        })

      expect(invoiceResponse.status).toBe(201)
      
      const invoice = invoiceResponse.body.data

      // Confirm invoice should fail due to insufficient inventory
      const confirmResponse = await request(app)
        .post(`/api/invoices/${invoice.id}/confirm`)
        .set('X-Idempotency-Key', 'test-confirm-oversell')
        .send({})

      expect(confirmResponse.status).toBe(500)
      expect(confirmResponse.body.success).toBe(false)
      expect(confirmResponse.body.error).toContain('Insufficient inventory')
    })
  })
})
