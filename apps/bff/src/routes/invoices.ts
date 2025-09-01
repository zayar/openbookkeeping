import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { requireIdempotency } from '../middleware/idempotency'
import { prisma } from '../services/database.cloud-sql-only'
import { checkLedgerBalance } from '../utils/ledger'
import { InvoiceCreateRequest, InvoiceResponse, InvoiceConfirmResponse } from '../schemas/invoices'

const router = express.Router()

// Create invoice (idempotent) – ACID-safe
router.post('/', requireJwtAuth, requireIdempotency, async (req, res) => {
  const orgId = req.auth!.organizationId
  const { invoiceNumber, customerId, items = [], issueDate, dueDate, currency = 'MMK', branchId, salespersonId, taxes = [] } = req.body

  try {
    const parsed = InvoiceCreateRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid invoice payload' })
    }
    const { invoiceNumber, customerId, items, issueDate, dueDate, currency = 'MMK', branchId, salespersonId } = parsed.data
    const result = await prisma.$transaction(async (tx) => {
      // Create invoice row
      const invoice = await tx.invoices.create({
        data: {
          id: `inv_${Date.now()}`,
          organizationId: orgId,
          invoiceNumber,
          customerId,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate || issueDate),
          currency,
          branchId: branchId || null,
          salespersonId: salespersonId || null,
          subtotal: 0 as any,
          totalAmount: 0 as any,
          taxAmount: 0 as any,
          balanceDue: 0 as any,
        }
      })

      // Insert items and compute totals
      let subtotal = 0
      for (const it of items) {
        const amount = Number(it.quantity) * Number(it.rate)
        subtotal += amount
        await tx.invoice_items.create({
          data: {
            id: `ii_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
            invoiceId: invoice.id,
            productId: it.productId || null,
            itemName: it.itemName,
            description: it.description || null,
            quantity: it.quantity as any,
            unit: it.unit || null,
            rate: it.rate as any,
            amount: amount as any,
            discount: (it.discount || 0) as any,
            discountPercent: (it.discountPercent || 0) as any,
            taxId: it.taxId || null,
            taxPercent: (it.taxPercent || 0) as any,
            taxAmount: (it.taxAmount || 0) as any,
            salesAccountId: it.salesAccountId || null,
          }
        })
      }

      const taxAmount = 0
      const totalAmount = subtotal + taxAmount
      const updated = await tx.invoices.update({
        where: { id: invoice.id },
        data: {
          subtotal: subtotal as any,
          taxAmount: taxAmount as any,
          totalAmount: totalAmount as any,
          balanceDue: totalAmount as any,
          status: 'draft'
        }
      })

      return updated
    })
    const payload = { success: true as const, data: result }
    const valid = InvoiceResponse.safeParse(payload)
    if (!valid.success) return res.status(500).json({ success: false, error: 'Response schema validation failed' })
    res.status(201).json(valid.data)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create invoice' })
  }
})

// Confirm invoice – create journal entries and enforce invariants
router.post('/:id/confirm', requireJwtAuth, requireIdempotency, async (req, res) => {
  const orgId = req.auth!.organizationId
  const { id } = req.params
  try {
    const output = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoices.findFirst({ where: { id, organizationId: orgId } })
      if (!invoice) throw new Error('Not found')

      // Create journal header
      const journal = await tx.journals.create({
        data: {
          id: `jr_${Date.now()}`,
          organizationId: orgId,
          journalNumber: `J-${Date.now()}`,
          journalDate: new Date(invoice.issueDate),
          totalDebit: 0 as any,
          totalCredit: 0 as any,
        }
      })

      // Fetch invoice items to determine tax and inventory impacts
      const items = await tx.invoice_items.findMany({ where: { invoiceId: invoice.id }, include: { products: true } })
      
      const arAccountId = 'accounts_receivable'
      const revenueAccountId = 'revenue'
      const taxPayableAccountId = 'tax_payable'
      const cogsAccountId = 'cost_of_goods_sold'
      const inventoryAccountId = 'inventory'

      let totalRevenue = Number(invoice.subtotal)
      let totalTax = Number(invoice.taxAmount)
      let totalCOGS = 0

      // A/R (DR) for total amount
      await tx.journal_entries.create({ 
        data: { 
          id: `je_${Date.now()}_ar`, 
          journalId: journal.id, 
          accountId: arAccountId, 
          debitAmount: Number(invoice.totalAmount) as any, 
          creditAmount: 0 as any 
        } 
      })

      // Revenue (CR) for subtotal
      await tx.journal_entries.create({ 
        data: { 
          id: `je_${Date.now()}_rev`, 
          journalId: journal.id, 
          accountId: revenueAccountId, 
          debitAmount: 0 as any, 
          creditAmount: totalRevenue as any 
        } 
      })

      // Tax payable (CR) if any
      if (totalTax > 0) {
        await tx.journal_entries.create({ 
          data: { 
            id: `je_${Date.now()}_tax`, 
            journalId: journal.id, 
            accountId: taxPayableAccountId, 
            debitAmount: 0 as any, 
            creditAmount: totalTax as any 
          } 
        })
      }

      // COGS and Inventory for tracked items
      for (const item of items) {
        if (item.products?.trackInventory) {
          const costPerUnit = Number(item.products.costPrice)
          const quantity = Number(item.quantity)
          const totalCost = costPerUnit * quantity
          totalCOGS += totalCost

          // DR COGS, CR Inventory
          await tx.journal_entries.create({ 
            data: { 
              id: `je_${Date.now()}_cogs_${item.id}`, 
              journalId: journal.id, 
              accountId: cogsAccountId, 
              debitAmount: totalCost as any, 
              creditAmount: 0 as any 
            } 
          })
          await tx.journal_entries.create({ 
            data: { 
              id: `je_${Date.now()}_inv_${item.id}`, 
              journalId: journal.id, 
              accountId: inventoryAccountId, 
              debitAmount: 0 as any, 
              creditAmount: totalCost as any 
            } 
          })
        }
      }

      // Update journal totals (will be computed by checkLedgerBalance)
      const totalDebits = Number(invoice.totalAmount) + totalCOGS
      const totalCredits = totalRevenue + totalTax + totalCOGS
      await tx.journals.update({ where: { id: journal.id }, data: { totalDebit: totalDebits as any, totalCredit: totalCredits as any } })

      const check = await checkLedgerBalance(tx as any, journal.id)
      if (!check.ok) {
        throw new Error('Ledger not balanced')
      }

      // Link journal to invoice and set status
      const updated = await tx.invoices.update({ where: { id }, data: { journalId: journal.id, status: 'confirmed' } })
      return { invoice: updated, journalId: journal.id }
    })
    const payload = { success: true as const, data: output }
    const valid = InvoiceConfirmResponse.safeParse(payload)
    if (!valid.success) return res.status(500).json({ success: false, error: 'Response schema validation failed' })
    res.json(valid.data)
  } catch (error) {
    res.status(409).json({ success: false, error: 'Failed to confirm invoice' })
  }
})

export default router

