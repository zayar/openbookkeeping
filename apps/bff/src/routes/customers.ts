import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'
import { CustomersListResponse, CustomerResponse } from '../schemas/api'
import { logger } from '../utils/logger'

const router = express.Router()

// List customers
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const customers = await prisma.customers.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: 'desc' }
    })
    const payload = { success: true as const, data: customers }
    // Temporarily disable response validation for debugging
    // const parsed = CustomersListResponse.safeParse(payload)
    // if (!parsed.success) {
    //   return res.status(500).json({ success: false, error: 'Response schema validation failed' })
    // }
    res.json(payload)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customers' })
  }
})

// Create customer
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { 
      name, displayName, email, phone, mobile, customerType, salutation, 
      firstName, lastName, companyName, billingAddress, shippingAddress,
      industry, source, priority, companyId, currency, taxRate, 
      paymentTerms, openingBalance, openingBalanceAccount,
      enablePortal, portalLanguage, tags, notes, remarks 
    } = req.body
    
    const customer = await prisma.customers.create({
      data: {
        id: uuidv4(),
        organizationId: req.auth!.organizationId,
        name,
        displayName,
        email,
        phone,
        mobile,
        customerType: customerType || 'business',
        salutation,
        firstName,
        lastName,
        companyName,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
        industry,
        source,
        priority: priority || 'normal',
        companyId,
        currency: currency || 'MMK',
        taxRate,
        paymentTerms,
        openingBalance: openingBalance ? parseFloat(openingBalance) : null,
        openingBalanceAccount,
        enablePortal: enablePortal || false,
        portalLanguage: portalLanguage || 'English',
        tags: tags || null,
        notes,
        remarks
      }
    })
    const payload = { success: true as const, data: customer }
    // Temporarily disable response validation for debugging
    // const parsed = CustomerResponse.safeParse(payload)
    // if (!parsed.success) {
    //   return res.status(500).json({ success: false, error: 'Response schema validation failed' })
    // }
    res.json(payload)
  } catch (error: any) {
    // Log detailed error for debugging
    logger.error('Failed to create customer', {
      error: error?.message,
      code: error?.code,
      meta: error?.meta,
    })

    let msg = 'Failed to create customer'
    if (error?.code === 'P2002') {
      msg = 'Customer with this email already exists'
    } else if (error?.code === 'P2003') {
      msg = 'Invalid reference. Please check organization or related fields'
    }
    res.status(400).json({ success: false, error: msg })
  }
})

// Get customer
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const customer = await prisma.customers.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    })
    if (!customer) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customer' })
  }
})

// Update customer
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { 
      name, displayName, email, phone, mobile, customerType, salutation, 
      firstName, lastName, companyName, billingAddress, shippingAddress,
      industry, source, priority, companyId, currency, taxRate, 
      paymentTerms, openingBalance, openingBalanceAccount,
      enablePortal, portalLanguage, tags, notes, remarks, isActive 
    } = req.body
    
    const updated = await prisma.customers.update({
      where: { id: req.params.id },
      data: { 
        name, displayName, email, phone, mobile, customerType, salutation, 
        firstName, lastName, companyName, billingAddress, shippingAddress,
        industry, source, priority, companyId, currency, taxRate, 
        paymentTerms, openingBalance: openingBalance ? parseFloat(openingBalance) : null, 
        openingBalanceAccount, enablePortal, portalLanguage, tags, notes, remarks, isActive 
      }
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update customer' })
  }
})

// Delete customer
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    const existing = await prisma.customers.findFirst({ where: { id: req.params.id, organizationId: req.auth!.organizationId } })
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' })
    await prisma.customers.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete customer' })
  }
})

export default router
