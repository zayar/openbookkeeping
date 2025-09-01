import express from 'express'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'

const router = express.Router()

// GET /api/taxes - list taxes for org
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { prisma } = await import('../services/database')
    const organizationId = req.user!.organizationId

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization not selected' })
    }

    const taxes = await prisma.taxes.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })

    res.json({ success: true, data: taxes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to load taxes' })
  }
})

export default router


