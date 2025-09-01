import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'

const router = express.Router()

// List accounts
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const accounts = await prisma.ledger_accounts.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: [{ type: 'asc' }, { code: 'asc' }]
    })
    res.json({ success: true, data: accounts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' })
  }
})

// Create account
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { code, name, type, description, isActive } = req.body
    const account = await prisma.ledger_accounts.create({
      data: {
        organizationId: req.auth!.organizationId,
        code,
        name,
        type,
        description,
        isActive: isActive ?? true
      }
    })
    res.json({ success: true, data: account })
  } catch (error: any) {
    const msg = error?.code === 'P2002' ? 'Account code already exists' : 'Failed to create account'
    res.status(400).json({ success: false, error: msg })
  }
})

// Get account
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const account = await prisma.ledger_accounts.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    })
    if (!account) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: account })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch account' })
  }
})

// Update account
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { code, name, type, description, isActive } = req.body
    const updated = await prisma.ledger_accounts.update({
      where: { id: req.params.id },
      data: { code, name, type, description, isActive }
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update account' })
  }
})

// Delete account
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    const existing = await prisma.ledger_accounts.findFirst({ where: { id: req.params.id, organizationId: req.auth!.organizationId } })
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' })
    await prisma.ledger_accounts.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete account' })
  }
})

export default router

