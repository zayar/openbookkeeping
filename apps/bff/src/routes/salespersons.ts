import express from 'express'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

// GET /api/salespersons - list salespersons for org
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { prisma } = await import('../services/database')
    const organizationId = req.user!.organizationId

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization not selected' })
    }

    const people = await prisma.salespersons.findMany({
      where: { organizationId, status: 'active' },
      orderBy: { name: 'asc' }
    })

    res.json({ success: true, data: people })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to load salespersons' })
  }
})

export default router


