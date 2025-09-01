import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'

const router = express.Router()

// List items with chart of accounts integration
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const items = await prisma.products.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: {
        ledger_accounts_products_salesAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        },
        ledger_accounts_products_purchaseAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch items' })
  }
})

// Create item with chart of accounts integration
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { 
      name, 
      sku, 
      type, 
      description, 
      sellingPrice, 
      costPrice, 
      unit, 
      currency,
      salesAccountId,
      purchaseAccountId,
      category, 
      brand,
      isActive 
    } = req.body

    const item = await prisma.products.create({
      data: {
        id: `item_${Date.now()}`,
        organizationId: req.auth!.organizationId,
        name,
        sku,
        type: type || 'goods',
        description,
        sellingPrice: parseFloat(sellingPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        unit: type === 'goods' ? unit : null,
        currency: currency || 'MMK',
        salesAccountId,
        purchaseAccountId,
        category,
        brand,
        isActive: isActive !== undefined ? isActive : true,
        currentStock: type === 'goods' ? 0 : null,
        trackInventory: type === 'goods',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        ledger_accounts_products_salesAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        },
        ledger_accounts_products_purchaseAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      }
    })
    res.json({ success: true, data: item })
  } catch (error: any) {
    console.error('Failed to create item:', error)
    res.status(500).json({ success: false, error: 'Failed to create item' })
  }
})

// Get item with chart of accounts integration
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const item = await prisma.products.findFirst({ 
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: {
        ledger_accounts_products_salesAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        },
        ledger_accounts_products_purchaseAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      }
    })
    if (!item) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch item' })
  }
})

// Update item with chart of accounts integration
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { 
      name, 
      sku, 
      type, 
      description, 
      sellingPrice, 
      costPrice, 
      unit, 
      currency,
      salesAccountId,
      purchaseAccountId,
      category, 
      brand, 
      isActive 
    } = req.body

    // Ensure item belongs to org before update
    const existing = await prisma.products.findFirst({ 
      where: { id: req.params.id, organizationId: req.auth!.organizationId } 
    })
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' })

    const item = await prisma.products.update({
      where: { id: req.params.id },
      data: {
        name,
        sku,
        type: type || existing.type,
        description,
        sellingPrice: parseFloat(sellingPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        unit: type === 'goods' ? unit : null,
        currency: currency || existing.currency,
        salesAccountId,
        purchaseAccountId,
        category,
        brand,
        isActive,
        currentStock: type === 'goods' ? (existing.currentStock || 0) : null,
        trackInventory: type === 'goods'
      },
      include: {
        ledger_accounts_products_salesAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        },
        ledger_accounts_products_purchaseAccountIdToledger_accounts: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        }
      }
    })
    res.json({ success: true, data: item })
  } catch (error) {
    console.error('Failed to update item:', error)
    res.status(500).json({ success: false, error: 'Failed to update item' })
  }
})

// Delete item
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    // Ensure item belongs to org before delete
    const existing = await prisma.products.findFirst({ 
      where: { id: req.params.id, organizationId: req.auth!.organizationId } 
    })
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' })
    await prisma.products.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete item' })
  }
})

export default router


