require('dotenv').config()
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const cors = require('cors')
const jwt = require('jsonwebtoken')

const app = express()
const prisma = new PrismaClient()

// Middleware
app.use(cors())
app.use(express.json())

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
console.log('JWT_SECRET:', JWT_SECRET)

// JWT validation middleware
const validateToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: no token' })
    }
    
    console.log('Validating token with JWT_SECRET:', JWT_SECRET)
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log('Token decoded successfully:', decoded)
    req.auth = decoded
    next()
  } catch (error) {
    console.log('Token validation failed:', error.message)
    res.status(401).json({ success: false, error: 'Unauthorized: invalid token' })
  }
}

// Auth endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    // Simple auth for testing
    if (email === 'admin@default.com' && password === 'admin123') {
      console.log('Login endpoint using JWT_SECRET:', JWT_SECRET)
      // Use a simpler token generation method to avoid JWT library issues
      const payload = { 
        userId: 'admin_user', 
        email, 
        organizationId: 'org_1755939534550' 
      }
      const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' })
      console.log('Generated token payload:', JSON.stringify(payload))
      console.log('Generated token length:', token.length)
      
      res.json({
        success: true,
        data: { token, user: { email, organizationId: 'org_1755939534550' } }
      })
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get items endpoint
app.get('/api/items', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const items = await prisma.products.findMany({
      where: { organizationId },
      include: {
        inventory_account: true,
        ledger_accounts_products_salesAccountIdToledger_accounts: true,
        ledger_accounts_products_purchaseAccountIdToledger_accounts: true
      }
    })
    
    // Add stock information for each item
    const itemsWithStock = await Promise.all(items.map(async (item) => {
      if (item.trackInventory) {
        const inventoryLevels = await prisma.inventory_layers.findMany({
          where: { 
            itemId: item.id,
            quantityRemaining: { gt: 0 },
            warehouses: { organizationId }
          }
        })
        
        const stockOnHand = inventoryLevels.reduce((total, level) => 
          total + parseFloat(level.quantityRemaining), 0)
        
        return { ...item, stockOnHand }
      }
      return { ...item, stockOnHand: 0 }
    }))
    
    res.json({ success: true, data: itemsWithStock })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single item endpoint
app.get('/api/items/:id', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const item = await prisma.products.findFirst({
      where: { 
        id: req.params.id,
        organizationId 
      },
      include: {
        inventory_account: true,
        ledger_accounts_products_salesAccountIdToledger_accounts: true,
        ledger_accounts_products_purchaseAccountIdToledger_accounts: true
      }
    })
    
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' })
    }
    
    // Get inventory levels if tracking inventory
    let itemWithStock = { ...item }
    if (item.trackInventory) {
      const inventoryLevels = await prisma.inventory_layers.findMany({
        where: { 
          itemId: item.id,
          quantityRemaining: { gt: 0 },
          warehouses: { organizationId }
        },
        include: {
          warehouses: { select: { id: true, name: true, code: true } }
        }
      })
      
      const stockOnHand = inventoryLevels.reduce((total, level) => 
        total + parseFloat(level.quantityRemaining), 0)
      
      const warehouseLevels = inventoryLevels.reduce((acc, level) => {
        const existing = acc.find(w => w.warehouseId === level.warehouseId)
        if (existing) {
          existing.totalQuantity += parseFloat(level.quantityRemaining)
          existing.totalValue += parseFloat(level.quantityRemaining) * parseFloat(level.unitCost)
        } else {
          acc.push({
            warehouseId: level.warehouseId,
            warehouseName: level.warehouses.name,
            totalQuantity: parseFloat(level.quantityRemaining),
            totalValue: parseFloat(level.quantityRemaining) * parseFloat(level.unitCost),
            averageCost: parseFloat(level.unitCost),
            layers: [level]
          })
        }
        return acc
      }, [])
      
      itemWithStock = { ...item, inventoryLevels: warehouseLevels, stockOnHand }
    }
    
    res.json({ success: true, data: itemWithStock })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// CREATE ITEM - The fixed version
app.post('/api/items', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const { 
      name, 
      sku, 
      description, 
      type, 
      costPrice, 
      sellingPrice, 
      salesAccountId, 
      purchaseAccountId, 
      trackInventory,
      inventoryAccountId,
      openingBalances = []
    } = req.body
    
    console.log('🔍 POST /api/items - Debug Info:')
    console.log(`   - trackInventory: ${trackInventory}`)
    console.log(`   - openingBalances length: ${openingBalances.length}`)
    console.log(`   - openingBalances:`, JSON.stringify(openingBalances, null, 2))
    
    // Validation
    if (!name) throw new Error('Name is required')
    if (!costPrice) throw new Error('Cost price is required')
    if (!sellingPrice) throw new Error('Selling price is required')
    
    if (trackInventory && !inventoryAccountId) {
      throw new Error('Inventory account is required when inventory tracking is enabled')
    }
    
    const result = await prisma.$transaction(async (tx) => {
      // Create the item
      const item = await tx.products.create({
        data: {
          id: `item_${Date.now()}`,
          name,
          sku,
          description,
          type: type || 'goods',
          costPrice: parseFloat(costPrice),
          sellingPrice: parseFloat(sellingPrice),
          trackInventory: trackInventory || false,
          inventoryValuationMethod: 'FIFO',
          organizationId,
          currency: 'MMK',
          isActive: true,
          inventoryAccountId,
          salesAccountId,
          purchaseAccountId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ Item created: ${item.id}`)
      
      // Create opening balances if inventory tracking is enabled
      console.log(`🔧 Checking opening balance creation:`)
      console.log(`   - trackInventory: ${trackInventory}`)
      console.log(`   - openingBalances.length: ${openingBalances.length}`)
      console.log(`   - Condition met: ${trackInventory && openingBalances.length > 0}`)
      
      if (trackInventory && openingBalances.length > 0) {
        console.log(`💰 Creating opening balances for ${openingBalances.length} warehouses`)
        
        // Get Opening Balance Equity account
        const openingBalanceAccount = await tx.ledger_accounts.findFirst({
          where: {
            organizationId,
            OR: [
              { name: { contains: 'Opening Balance' } },
              { code: '3900' },
              { type: 'equity' }
            ]
          }
        })
        
        if (!openingBalanceAccount) {
          console.log('⚠️ No Opening Balance Equity account found, creating opening balances without journal entries')
        }
        
        for (const opening of openingBalances) {
          console.log(`🔍 Processing opening balance:`, opening)
          console.log(`   - quantity: ${opening.quantity}`)
          console.log(`   - unitCost: ${opening.unitCost}`)
          
          if (opening.quantity > 0 && opening.unitCost > 0) {
            const quantity = parseFloat(opening.quantity)
            const unitCost = parseFloat(opening.unitCost)
            const totalValue = quantity * unitCost
            
            console.log(`   ✅ Creating opening balance - Qty: ${quantity}, Cost: ${unitCost}, Total: ${totalValue}`)
            
            try {
              // Create journal entry if equity account exists
              let journalId = null
              if (openingBalanceAccount) {
                const journal = await tx.journals.create({
                  data: {
                    id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    organizationId,
                    journalNumber: `OB-${item.name}-${Date.now()}`,
                    journalDate: new Date(),
                    reference: `Opening Balance - ${item.name}`,
                    notes: `Opening inventory balance for ${item.name} in warehouse ${opening.warehouseId}`,
                    totalDebit: totalValue,
                    totalCredit: totalValue,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }
                })
                
                // Create journal entries
                await tx.journal_entries.createMany({
                  data: [
                    {
                      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_1`,
                      journalId: journal.id,
                      accountId: inventoryAccountId,
                      description: `Opening inventory - ${item.name}`,
                      debitAmount: totalValue,
                      creditAmount: 0,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    },
                    {
                      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_2`,
                      journalId: journal.id,
                      accountId: openingBalanceAccount.id,
                      description: `Opening balance equity - ${item.name}`,
                      debitAmount: 0,
                      creditAmount: totalValue,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  ]
                })
                
                journalId = journal.id
              }
              
              // Create inventory opening balance record
              await tx.inventory_opening_balances.create({
                data: {
                  id: `opening_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  itemId: item.id,
                  warehouseId: opening.warehouseId,
                  quantity,
                  unitCost,
                  totalValue,
                  asOfDate: new Date(),
                  journalId,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })
              
              // Create inventory layer for FIFO tracking
              await tx.inventory_layers.create({
                data: {
                  id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  itemId: item.id,
                  warehouseId: opening.warehouseId,
                  sourceType: 'opening_balance',
                  sourceId: `opening_${item.id}_${opening.warehouseId}`,
                  quantityRemaining: quantity,
                  unitCost,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })
              
              console.log(`   📊 Successfully created all records for warehouse ${opening.warehouseId}`)
              
            } catch (error) {
              console.error(`   ❌ Error creating opening balance for warehouse ${opening.warehouseId}:`, error)
              throw error
            }
          }
        }
      } else {
        console.log('🔧 Skipping opening balance creation (condition not met)')
      }
      
      return item
    }, {
      timeout: 30000
    })
    
    console.log(`🔢 Getting final item with stock information...`)
    
    // Get the created item with stock information
    const itemWithStock = await prisma.products.findFirst({
      where: { id: result.id },
      include: {
        inventory_account: true,
        ledger_accounts_products_salesAccountIdToledger_accounts: true,
        ledger_accounts_products_purchaseAccountIdToledger_accounts: true
      }
    })
    
    // Calculate stock on hand for tracked items
    if (itemWithStock.trackInventory) {
      console.log(`🔢 Calculating stock on hand for item ${itemWithStock.id}`)
      
      const inventoryLevels = await prisma.inventory_layers.findMany({
        where: { 
          itemId: itemWithStock.id,
          quantityRemaining: { gt: 0 },
          warehouses: { organizationId }
        },
        include: {
          warehouses: { select: { id: true, name: true, code: true } }
        }
      })
      
      console.log(`   - Found ${inventoryLevels.length} inventory levels`)
      
      const stockOnHand = inventoryLevels.reduce((total, level) => 
        total + parseFloat(level.quantityRemaining), 0)
      
      console.log(`   - Total stock on hand: ${stockOnHand}`)
      
      const warehouseLevels = inventoryLevels.reduce((acc, level) => {
        const existing = acc.find(w => w.warehouseId === level.warehouseId)
        if (existing) {
          existing.totalQuantity += parseFloat(level.quantityRemaining)
          existing.totalValue += parseFloat(level.quantityRemaining) * parseFloat(level.unitCost)
        } else {
          acc.push({
            warehouseId: level.warehouseId,
            warehouseName: level.warehouses.name,
            totalQuantity: parseFloat(level.quantityRemaining),
            totalValue: parseFloat(level.quantityRemaining) * parseFloat(level.unitCost),
            averageCost: parseFloat(level.unitCost),
            layers: [level]
          })
        }
        return acc
      }, [])
      
      itemWithStock.inventoryLevels = warehouseLevels
      itemWithStock.stockOnHand = stockOnHand
    } else {
      itemWithStock.stockOnHand = itemWithStock.type === 'goods' ? 0 : undefined
    }
    
    res.status(201).json({
      success: true,
      data: itemWithStock
    })
  } catch (error) {
    console.error('❌ Item creation error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get accounts endpoint
app.get('/api/accounts', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const accounts = await prisma.ledger_accounts.findMany({
      where: { organizationId },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' }
      ]
    })
    
    res.json({ success: true, data: accounts })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get warehouses endpoint
app.get('/api/warehouses', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const warehouses = await prisma.warehouses.findMany({
      where: { organizationId },
      include: {
        branches: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    res.json({ success: true, data: warehouses })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Metrics endpoint for dashboard
app.get('/api/metrics', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const [
      itemsCount,
      accountsCount,
      bankAccountsCount,
      customersCount,
      vendorsCount
    ] = await Promise.all([
      prisma.products.count({ where: { organizationId } }),
      prisma.ledger_accounts.count({ where: { organizationId } }),
      prisma.bank_accounts.count({ where: { organizationId } }),
      prisma.customers.count({ where: { organizationId } }),
      prisma.vendors.count({ where: { organizationId } })
    ])

    res.json({
      success: true,
      data: {
        itemsCount,
        accountsCount,
        bankAccountsCount,
        customersCount,
        vendorsCount
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get customers endpoint
app.get('/api/customers', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const customers = await prisma.customers.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })
    
    res.json({ success: true, data: customers })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create customer endpoint
app.post('/api/customers', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const {
      name,
      displayName,
      email,
      phone,
      mobile,
      customerType,
      salutation,
      firstName,
      lastName,
      companyName,
      billingAddress,
      shippingAddress,
      industry,
      source,
      priority,
      taxRate,
      paymentTerms,
      openingBalance,
      notes,
      remarks,
      isActive = true
    } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Customer name is required' })
    }

    const customer = await prisma.customers.create({
      data: {
        id: `customer_${Date.now()}`,
        organizationId,
        name,
        displayName: displayName || null,
        email: email || null,
        phone: phone || null,
        mobile: mobile || null,
        customerType: customerType || 'business',
        salutation: salutation || null,
        firstName: firstName || null,
        lastName: lastName || null,
        companyName: companyName || null,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
        industry: industry || null,
        source: source || null,
        priority: priority || 'normal',
        currency: 'MMK',
        taxRate: taxRate || null,
        paymentTerms: paymentTerms || null,
        openingBalance: openingBalance ? parseFloat(openingBalance) : null,
        notes: notes || null,
        remarks: remarks || null,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    res.status(201).json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single customer endpoint
app.get('/api/customers/:id', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const { id } = req.params

    const customer = await prisma.customers.findFirst({
      where: { 
        id,
        organizationId 
      }
    })

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' })
    }

    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update customer endpoint
app.put('/api/customers/:id', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const { id } = req.params
    const updateData = req.body

    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.organizationId
    delete updateData.createdAt

    const customer = await prisma.customers.update({
      where: { 
        id,
        organizationId 
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete customer endpoint
app.delete('/api/customers/:id', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const { id } = req.params

    const customer = await prisma.customers.findFirst({
      where: { 
        id,
        organizationId 
      }
    })

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' })
    }

    await prisma.customers.delete({
      where: { 
        id,
        organizationId 
      }
    })

    res.json({ success: true, message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get taxes endpoint
app.get('/api/taxes', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const taxes = await prisma.taxes.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })
    
    res.json({ success: true, data: taxes })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get salespersons endpoint
app.get('/api/salespersons', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const salespersons = await prisma.salespersons.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })
    
    res.json({ success: true, data: salespersons })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get branches endpoint
app.get('/api/branches', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const branches = await prisma.branches.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })
    
    res.json({ success: true, data: branches })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get invoices endpoint
app.get('/api/invoices', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const invoices = await prisma.invoices.findMany({
      where: { organizationId },
      include: {
        customers: { select: { name: true } },
        salespersons: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({ success: true, data: invoices })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create invoice endpoint
app.post('/api/invoices', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const {
      customerId,
      salespersonId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      items,
      subtotal,
      taxAmount,
      total,
      notes,
      terms,
      status = 'draft'
    } = req.body

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer is required' })
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one item is required' })
    }

    const invoice = await prisma.invoices.create({
      data: {
        id: `invoice_${Date.now()}`,
        organizationId,
        customerId,
        salespersonId: salespersonId || null,
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        issueDate: new Date(invoiceDate || new Date()),
        dueDate: new Date(dueDate || new Date()),
        subtotal: parseFloat(subtotal || 0),
        taxAmount: parseFloat(taxAmount || 0),
        totalAmount: parseFloat(total || 0),
        customerNotes: notes || null,
        terms: terms || 'Due on Receipt',
        status,
        currency: 'MMK',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        customers: { select: { name: true } },
        salespersons: { select: { name: true } }
      }
    })

    // Create invoice items
    if (items && items.length > 0) {
      await prisma.invoice_items.createMany({
        data: items.map((item, index) => ({
          id: `invoice_item_${Date.now()}_${index}`,
          invoiceId: invoice.id,
          productId: item.itemId || null,
          itemName: item.description || item.itemName || 'Product',
          description: item.description || null,
          quantity: parseFloat(item.quantity),
          unit: item.unit || null,
          rate: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount || 0),
          discountPercent: parseFloat(item.discountPercent || 0),
          taxId: item.taxId || null,
          taxPercent: parseFloat(item.taxPercent || 0),
          taxAmount: parseFloat(item.taxAmount || 0),
          amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
          salesAccountId: item.salesAccountId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      })
    }

    res.status(201).json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Bank accounts endpoints
app.get('/api/bank-accounts', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    
    const bankAccounts = await prisma.bank_accounts.findMany({
      where: { organizationId },
      include: {
        ledger_accounts: true
      }
    })
    
    res.json({ success: true, data: bankAccounts })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create new bank account
app.post('/api/bank-accounts', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const {
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      accountType,
      currency,
      openingBalance,
      branch,
      swiftCode,
      description,
      ledgerAccountId
    } = req.body

    if (!bankName || !accountName || !accountNumber || !accountType || !currency) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bank name, account name, account number, account type, and currency are required' 
      })
    }

    const bankAccount = await prisma.bank_accounts.create({
      data: {
        id: `bank_${Date.now()}`,
        organizationId,
        bankName,
        accountName,
        accountNumber,
        routingNumber: routingNumber || null,
        accountType,
        currency,
        currentBalance: parseFloat(openingBalance || 0),
        branch: branch || null,
        swiftCode: swiftCode || null,
        description: description || null,
        ledgerAccountId: ledgerAccountId || null,
        isActive: true,
        isPrimary: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    res.status(201).json({ success: true, data: bankAccount })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single bank account
app.get('/api/bank-accounts/:id', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const { id } = req.params

    const bankAccount = await prisma.bank_accounts.findFirst({
      where: { 
        id,
        organizationId 
      },
      include: {
        ledger_accounts: true
      }
    })

    if (!bankAccount) {
      return res.status(404).json({ success: false, error: 'Bank account not found' })
    }

    res.json({ success: true, data: bankAccount })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get bank account summary
app.get('/api/bank-accounts/:id/summary', validateToken, async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId
    const { id } = req.params

    const bankAccount = await prisma.bank_accounts.findFirst({
      where: { 
        id,
        organizationId 
      }
    })

    if (!bankAccount) {
      return res.status(404).json({ success: false, error: 'Bank account not found' })
    }

    // Get recent transactions for summary
    const recentTransactions = await prisma.bank_transactions.findMany({
      where: { 
        bankAccountId: id,
        organizationId 
      },
      orderBy: { transactionDate: 'desc' },
      take: 10,
      select: {
        id: true,
        transactionDate: true,
        transactionType: true,
        amount: true,
        description: true,
        runningBalance: true
      }
    })

    const summary = {
      id: bankAccount.id,
      bankName: bankAccount.bankName,
      accountName: bankAccount.accountName,
      accountNumber: bankAccount.accountNumber,
      currentBalance: bankAccount.currentBalance,
      currency: bankAccount.currency,
      accountType: bankAccount.accountType,
      isActive: bankAccount.isActive,
      recentTransactions,
      totalTransactions: await prisma.bank_transactions.count({
        where: { 
          bankAccountId: id,
          organizationId 
        }
      })
    }

    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Fixed server running on port ${PORT}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Items API: http://localhost:${PORT}/api/items`)
})
