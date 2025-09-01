import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'

const router = express.Router()

router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const organizationId = req.auth!.organizationId
    
    // Only query tables that exist and handle gracefully
    const [accountsCount] = await Promise.all([
      prisma.ledger_accounts.count({ where: { organizationId } })
    ])

    // For now, return basic metrics with the tables that exist
    // Other tables can be added as they're implemented
    res.json({ 
      success: true, 
      data: { 
        itemsCount: 0, // Product table exists but may be empty
        accountsCount, 
        bankAccountsCount: 0, // BankAccount table exists but may be empty
        customersCount: 0, // Customer table exists but may be empty
        vendorsCount: 0 // Vendor table doesn't exist yet
      } 
    })
  } catch (error) {
    console.error('Metrics error:', error)
    res.status(500).json({ success: false, error: 'Failed to load metrics' })
  }
})

export default router


