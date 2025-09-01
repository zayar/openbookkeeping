import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'
import { logger } from '../utils/logger'

const router = express.Router()

// List branches
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const branches = await prisma.branches.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: {
        _count: {
          select: {
            warehouses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: branches })
  } catch (error: any) {
    logger.error('Failed to fetch branches:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch branches' })
  }
})

// Get specific branch
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const branch = await prisma.branches.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      },
      include: {
        warehouses: true,
        _count: {
          select: {
            warehouses: true
          }
        }
      }
    })
    
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' })
    }
    
    res.json({ success: true, data: branch })
  } catch (error: any) {
    logger.error('Failed to fetch branch:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch branch' })
  }
})

// Create branch
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { 
      name, 
      addressLine1, 
      addressLine2, 
      city, 
      state, 
      postalCode, 
      country, 
      phone, 
      email, 
      isDefault 
    } = req.body
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Branch name is required' 
      })
    }

    const branch = await prisma.branches.create({
      data: {
        id: `br_${Date.now()}`,
        organizationId: req.auth!.organizationId,
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country: country || 'Myanmar',
        phone,
        email,
        isDefault: isDefault || false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    logger.info(`Branch created: ${branch.name}`)
    res.status(201).json({ success: true, data: branch })
  } catch (error: any) {
    logger.error('Failed to create branch:', error)
    res.status(500).json({ success: false, error: 'Failed to create branch' })
  }
})

// Update branch
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { 
      name, 
      addressLine1, 
      addressLine2, 
      city, 
      state, 
      postalCode, 
      country, 
      phone, 
      email, 
      isDefault,
      isActive 
    } = req.body
    
    const existingBranch = await prisma.branches.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      }
    })
    
    if (!existingBranch) {
      return res.status(404).json({ success: false, error: 'Branch not found' })
    }

    const branch = await prisma.branches.update({
      where: { id: req.params.id },
      data: {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        phone,
        email,
        isDefault,
        isActive,
        updatedAt: new Date()
      }
    })
    
    logger.info(`Branch updated: ${branch.name}`)
    res.json({ success: true, data: branch })
  } catch (error: any) {
    logger.error('Failed to update branch:', error)
    res.status(500).json({ success: false, error: 'Failed to update branch' })
  }
})

// Delete branch
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    const existingBranch = await prisma.branches.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      }
    })
    
    if (!existingBranch) {
      return res.status(404).json({ success: false, error: 'Branch not found' })
    }

    // Check if branch has warehouses
    const warehouseCount = await prisma.warehouses.count({
      where: { branchId: req.params.id }
    })
    
    if (warehouseCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete branch with existing warehouses' 
      })
    }

    await prisma.branches.delete({
      where: { id: req.params.id }
    })
    
    logger.info(`Branch deleted: ${existingBranch.name}`)
    res.json({ success: true, message: 'Branch deleted successfully' })
  } catch (error: any) {
    logger.error('Failed to delete branch:', error)
    res.status(500).json({ success: false, error: 'Failed to delete branch' })
  }
})

// Update branch status (enable/disable)
router.patch('/:id/status', requireJwtAuth, async (req, res) => {
  try {
    const { isActive } = req.body
    
    const existingBranch = await prisma.branches.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      }
    })
    
    if (!existingBranch) {
      return res.status(404).json({ success: false, error: 'Branch not found' })
    }

    const branch = await prisma.branches.update({
      where: { id: req.params.id },
      data: { 
        isActive: isActive !== undefined ? isActive : !existingBranch.isActive,
        updatedAt: new Date()
      }
    })
    
    logger.info(`Branch status updated: ${branch.name} - ${branch.isActive ? 'Active' : 'Inactive'}`)
    res.json({ success: true, data: branch })
  } catch (error: any) {
    logger.error('Failed to update branch status:', error)
    res.status(500).json({ success: false, error: 'Failed to update branch status' })
  }
})

export default router
