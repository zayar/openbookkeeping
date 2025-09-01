import express from 'express'
import { requireJwtAuth } from '../middleware/jwtAuth'
import { prisma } from '../services/database.cloud-sql-only'

const router = express.Router()

// List bank accounts
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const bankAccounts = await prisma.bank_accounts.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { ledgerAccount: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: bankAccounts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch bank accounts' })
  }
})

// Create bank account
router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const { 
      bankName, 
      accountName, 
      accountNumber, 
      routingNumber, 
      accountType, 
      currentBalance,
      currency,
      description,
      isPrimary,
      branch,
      swiftCode,
      iban
    } = req.body

    // Start a transaction to create both bank account and chart of accounts entry
    const result = await prisma.$transaction(async (tx) => {
      // Generate a unique account code for the chart of accounts
      const existingAccounts = await tx.ledger_accounts.findMany({
        where: { organizationId: req.auth!.organizationId }
      })
      
      // Find the next available bank account code (starting from 1000)
      let nextCode = 1000
      const bankAccountCodes = existingAccounts
        .filter(acc => acc.type === 'bank' && /^\d{4}$/.test(acc.code))
        .map(acc => parseInt(acc.code))
        .sort((a, b) => a - b)
      
      if (bankAccountCodes.length > 0) {
        nextCode = Math.max(...bankAccountCodes) + 1
      }

      // Create the chart of accounts entry first
      const ledgerAccount = await tx.ledger_accounts.create({
        data: {
          organizationId: req.auth!.organizationId,
          code: nextCode.toString().padStart(4, '0'),
          name: `${bankName} - ${accountName}`,
          type: 'bank',
          description: description || `Bank account: ${accountName} at ${bankName}`,
          isActive: true
        }
      })

      // Create the bank account
      const bankAccount = await tx.bankAccount.create({
        data: {
          organizationId: req.auth!.organizationId,
          bankName,
          accountName,
          accountNumber,
          routingNumber,
          accountType,
          currency: currency || 'MMK',
          description,
          isPrimary: isPrimary || false,
          branch,
          swiftCode,
          iban,
          currentBalance: currentBalance || 0,
          ledgerAccountId: ledgerAccount.id // Link to the created chart of accounts entry
        }
      })

      // If this is marked as primary, unmark other accounts
      if (isPrimary) {
        await tx.bankAccount.updateMany({
          where: { 
            organizationId: req.auth!.organizationId,
            id: { not: bankAccount.id }
          },
          data: { isPrimary: false }
        })
      }

      return { bankAccount, ledgerAccount }
    })

    // Return the created bank account with the linked ledger account
    const bankAccountWithLedger = await prisma.bank_accounts.findFirst({
      where: { id: result.bankAccount.id },
      include: { ledgerAccount: true }
    })

    res.json({ 
      success: true, 
      data: bankAccountWithLedger,
      message: 'Bank account created successfully and added to Chart of Accounts'
    })
  } catch (error: any) {
    console.error('Error creating bank account:', error)
    const msg = error?.code === 'P2002' ? 'Account number already exists' : 'Failed to create bank account'
    res.status(400).json({ success: false, error: msg })
  }
})

// Get bank account
router.get('/:id', requireJwtAuth, async (req, res) => {
  try {
    const bankAccount = await prisma.bank_accounts.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { ledgerAccount: true }
    })
    if (!bankAccount) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: bankAccount })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch bank account' })
  }
})

// Update bank account
router.put('/:id', requireJwtAuth, async (req, res) => {
  try {
    const { 
      bankName, 
      accountName, 
      accountNumber, 
      routingNumber, 
      accountType, 
      currentBalance, 
      isActive,
      currency,
      description,
      isPrimary,
      branch,
      swiftCode,
      iban
    } = req.body

    // Start a transaction to update both bank account and chart of accounts entry
    const result = await prisma.$transaction(async (tx) => {
      // Get the existing bank account to find the linked ledger account
      const existingBankAccount = await tx.bankAccount.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
        include: { ledgerAccount: true }
      })

      if (!existingBankAccount) {
        throw new Error('Bank account not found')
      }

      // Update the bank account
      const updatedBankAccount = await tx.bankAccount.update({
        where: { id: req.params.id },
        data: { 
          bankName, 
          accountName, 
          accountNumber, 
          routingNumber, 
          accountType, 
          currentBalance, 
          isActive,
          currency,
          description,
          isPrimary,
          branch,
          swiftCode,
          iban
        }
      })

      // Update the linked chart of accounts entry if it exists
      if (existingBankAccount.ledgerAccountId) {
        await tx.ledger_accounts.update({
          where: { id: existingBankAccount.ledgerAccountId },
          data: {
            name: `${bankName} - ${accountName}`,
            description: description || `Bank account: ${accountName} at ${bankName}`
          }
        })
      }

      // If this is marked as primary, unmark other accounts
      if (isPrimary) {
        await tx.bankAccount.updateMany({
          where: { 
            organizationId: req.auth!.organizationId,
            id: { not: req.params.id }
          },
          data: { isPrimary: false }
        })
      }

      return updatedBankAccount
    })

    // Return the updated bank account with the linked ledger account
    const updatedWithLedger = await prisma.bank_accounts.findFirst({
      where: { id: req.params.id },
      include: { ledgerAccount: true }
    })

    res.json({ 
      success: true, 
      data: updatedWithLedger,
      message: 'Bank account updated successfully'
    })
  } catch (error) {
    console.error('Error updating bank account:', error)
    res.status(500).json({ success: false, error: 'Failed to update bank account' })
  }
})

// Delete bank account
router.delete('/:id', requireJwtAuth, async (req, res) => {
  try {
    const existing = await prisma.bank_accounts.findFirst({ where: { id: req.params.id, organizationId: req.auth!.organizationId } })
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' })
    await prisma.bank_accounts.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete bank account' })
  }
})

export default router
