import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'

const router = express.Router()

// List vendors
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: vendors })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch vendors' })
  }
})

// Create vendor
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { name, email, phone, vendorType, industry, paymentTerms, taxId, address, notes } = req.body
    const vendor = await prisma.vendor.create({
      data: {
        organizationId: req.auth!.organizationId,
        name,
        email,
        phone,
        vendorType: vendorType || 'supplier',
        industry,
        paymentTerms: paymentTerms || 'net30',
        taxId,
        address,
        notes
      }
    })
    res.json({ success: true, data: vendor })
  } catch (error: any) {
    const msg = error?.code === 'P2002' ? 'Vendor with this email already exists' : 'Failed to create vendor'
    res.status(400).json({ success: false, error: msg })
  }
})

// Get vendor
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    })
    if (!vendor) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: vendor })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch vendor' })
  }
})

// Update vendor
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { name, email, phone, vendorType, industry, paymentTerms, taxId, address, notes, isActive } = req.body
    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { name, email, phone, vendorType, industry, paymentTerms, taxId, address, notes, isActive }
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update vendor' })
  }
})

// Delete vendor
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    const existing = await prisma.vendor.findFirst({ where: { id: req.params.id, organizationId: req.auth!.organizationId } })
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' })
    await prisma.vendor.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete vendor' })
  }
})

export default router
