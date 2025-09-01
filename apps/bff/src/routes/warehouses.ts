import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'
import { logger } from '../utils/logger'

const router = express.Router()

// List warehouses
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const warehouses = await prisma.warehouses.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: {
        branches: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: warehouses })
  } catch (error: any) {
    logger.error('Failed to fetch warehouses:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch warehouses' })
  }
})

// Get specific warehouse
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const warehouse = await prisma.warehouses.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      },
      include: {
        branches: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' })
    }
    
    res.json({ success: true, data: warehouse })
  } catch (error: any) {
    logger.error('Failed to fetch warehouse:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch warehouse' })
  }
})

// Create warehouse
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { name, code, branchId, address, city, state, postalCode, country, phone, email, isDefault } = req.body
    
    if (!name || !branchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and branch ID are required' 
      })
    }

    const warehouse = await prisma.warehouses.create({
      data: {
        id: `wh_${Date.now()}`,
        organizationId: req.auth!.organizationId,
        branchId,
        name,
        code,
        address,
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
      },
      include: {
        branches: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    logger.info(`Warehouse created: ${warehouse.name}`)
    res.status(201).json({ success: true, data: warehouse })
  } catch (error: any) {
    logger.error('Failed to create warehouse:', error)
    res.status(500).json({ success: false, error: 'Failed to create warehouse' })
  }
})

// Update warehouse
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { name, code, branchId, address, city, state, postalCode, country, phone, email, isDefault, isActive } = req.body
    
    const existingWarehouse = await prisma.warehouses.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      }
    })
    
    if (!existingWarehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' })
    }

    const warehouse = await prisma.warehouses.update({
      where: { id: req.params.id },
      data: {
        name,
        code,
        branchId,
        address,
        city,
        state,
        postalCode,
        country,
        phone,
        email,
        isDefault,
        isActive,
        updatedAt: new Date()
      },
      include: {
        branches: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    logger.info(`Warehouse updated: ${warehouse.name}`)
    res.json({ success: true, data: warehouse })
  } catch (error: any) {
    logger.error('Failed to update warehouse:', error)
    res.status(500).json({ success: false, error: 'Failed to update warehouse' })
  }
})

// Delete warehouse
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    const existingWarehouse = await prisma.warehouses.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.auth!.organizationId 
      }
    })
    
    if (!existingWarehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' })
    }

    await prisma.warehouses.delete({
      where: { id: req.params.id }
    })
    
    logger.info(`Warehouse deleted: ${existingWarehouse.name}`)
    res.json({ success: true, message: 'Warehouse deleted successfully' })
  } catch (error: any) {
    logger.error('Failed to delete warehouse:', error)
    res.status(500).json({ success: false, error: 'Failed to delete warehouse' })
  }
})

// Set warehouse as default
router.post('/:id/set-default', requireJwtAuth, async (req, res) => {
  try {
    const organizationId = req.auth!.organizationId
    
    // First, unset all other warehouses as default
    await prisma.warehouses.updateMany({
      where: { organizationId },
      data: { isDefault: false }
    })
    
    // Set this warehouse as default
    const warehouse = await prisma.warehouses.update({
      where: { id: req.params.id },
      data: { isDefault: true, updatedAt: new Date() }
    })
    
    logger.info(`Warehouse set as default: ${warehouse.name}`)
    res.json({ success: true, data: warehouse })
  } catch (error: any) {
    logger.error('Failed to set warehouse as default:', error)
    res.status(500).json({ success: false, error: 'Failed to set warehouse as default' })
  }
})

export default router
