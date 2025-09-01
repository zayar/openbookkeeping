import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { requireIdempotency } from '../middleware/idempotency'
import { prisma } from '../services/database.cloud-sql-only'
import { checkLedgerBalance } from '../utils/ledger'
import { PaymentCreateRequest, PaymentResponse } from '../schemas/invoices'

const router = express.Router()

// Record payment (idempotent) – DR Bank, CR A/R
router.post('/', requireJwtAuth, requireIdempotency, async (req, res) => {
  const orgId = req.auth!.organizationId
  const { invoiceId, amount, depositTo } = req.body
  try {
    const parsed = PaymentCreateRequest.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payment payload' })
    const { invoiceId, amount, depositTo } = parsed.data
    const output = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoices.findFirst({ where: { id: invoiceId, organizationId: orgId } })
      if (!invoice) throw new Error('Invoice not found')

      // Create payment record
      const payment = await tx.invoice_payments.create({
        data: {
          id: `pay_${Date.now()}`,
          invoiceId,
          paymentNumber: `P-${Date.now()}`,
          paymentDate: new Date(),
          amountReceived: amount as any,
          depositTo,
        }
      })

      // Create journal entries
      const journal = await tx.journals.create({
        data: {
          id: `jr_${Date.now()}_p`,
          organizationId: orgId,
          journalNumber: `J-${Date.now()}-P`,
          journalDate: new Date(),
          totalDebit: 0 as any,
          totalCredit: 0 as any,
        }
      })

      await tx.journal_entries.create({ data: { id: `je_${Date.now()}_b`, journalId: journal.id, accountId: depositTo, debitAmount: amount as any, creditAmount: 0 as any } })
      await tx.journal_entries.create({ data: { id: `je_${Date.now()}_ar`, journalId: journal.id, accountId: 'accounts_receivable', debitAmount: 0 as any, creditAmount: amount as any } })
      await tx.journals.update({ where: { id: journal.id }, data: { totalDebit: amount as any, totalCredit: amount as any } })

      const check = await checkLedgerBalance(tx as any, journal.id)
      if (!check.ok) throw new Error('Ledger not balanced')

      // Update invoice balances
      const newPaid = (Number(invoice.paidAmount) + Number(amount))
      const newBalance = Math.max(0, Number(invoice.totalAmount) - newPaid)
      const updated = await tx.invoices.update({ where: { id: invoice.id }, data: { paidAmount: newPaid as any, balanceDue: newBalance as any, status: newBalance === 0 ? 'paid' : invoice.status } })

      await tx.invoice_payments.update({ where: { id: payment.id }, data: { journalId: journal.id } })

      return { payment, invoice: updated, journalId: journal.id }
    })
    const payload = { success: true as const, data: output }
    const valid = PaymentResponse.safeParse(payload)
    if (!valid.success) return res.status(500).json({ success: false, error: 'Response schema validation failed' })
    res.status(201).json(valid.data)
  } catch (error) {
    res.status(409).json({ success: false, error: 'Failed to record payment' })
  }
})

export default router

