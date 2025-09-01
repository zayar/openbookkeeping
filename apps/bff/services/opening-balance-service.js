const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Opening Balance Service - Handles opening balance creation with proper double-entry
 * Ensures all opening balances create proper journal entries
 */
class OpeningBalanceService {
  constructor(prismaInstance = null) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * Ensure Opening Balance Equity account exists for organization
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async ensureOpeningBalanceEquityAccount(organizationId) {
    // Check if Opening Balance Equity account exists
    let openingBalanceAccount = await this.prisma.ledger_accounts.findFirst({
      where: {
        organizationId,
        OR: [
          { name: { contains: 'Opening Balance' } },
          { code: '3900' },
          { type: 'equity' }
        ]
      }
    })

    // Create if it doesn't exist
    if (!openingBalanceAccount) {
      openingBalanceAccount = await this.prisma.ledger_accounts.create({
        data: {
          id: `acc_opening_${Date.now()}`,
          organizationId,
          name: 'Opening Balance Equity',
          code: '3900',
          type: 'equity',
          subType: 'opening_balance_equity',
          isActive: true,
          description: 'Account for balancing opening balance entries',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    return openingBalanceAccount
  }

  /**
   * Create opening balance for any account with proper double-entry
   * @param {string} accountId - The account to set opening balance for
   * @param {number} amount - Opening balance amount (positive for debit balance, negative for credit balance)
   * @param {Date} asOfDate - Opening balance date
   * @param {string} organizationId 
   * @param {string} description - Description for the journal entry
   * @returns {Promise<Object>}
   */
  async createAccountOpeningBalance(accountId, amount, asOfDate, organizationId, description = null) {
    return await this.prisma.$transaction(async (tx) => {
      // Get the account details
      const account = await tx.ledger_accounts.findUnique({
        where: { id: accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      // Ensure Opening Balance Equity account exists
      const openingBalanceAccount = await this.ensureOpeningBalanceEquityAccount(organizationId)

      // Determine debit/credit based on account type and amount
      const isDebitBalance = amount > 0
      const absoluteAmount = Math.abs(amount)

      // Create journal entry for opening balance
      const journal = await tx.journals.create({
        data: {
          id: `journal_ob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          organizationId,
          journalNumber: `OB-${account.code}-${Date.now()}`,
          journalDate: asOfDate,
          reference: `Opening Balance - ${account.name}`,
          notes: description || `Opening balance for ${account.name}`,
          totalDebit: absoluteAmount,
          totalCredit: absoluteAmount,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          journal_entries: {
            create: [
              {
                id: `entry_ob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_1`,
                accountId: accountId,
                description: `Opening balance - ${account.name}`,
                debitAmount: isDebitBalance ? absoluteAmount : 0,
                creditAmount: isDebitBalance ? 0 : absoluteAmount,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              {
                id: `entry_ob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_2`,
                accountId: openingBalanceAccount.id,
                description: `Opening balance equity - ${account.name}`,
                debitAmount: isDebitBalance ? 0 : absoluteAmount,
                creditAmount: isDebitBalance ? absoluteAmount : 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        }
      })

      return {
        journal,
        account,
        openingBalanceAccount,
        amount: absoluteAmount,
        isDebitBalance
      }
    })
  }

  /**
   * Validate that all opening balances maintain double-entry integrity
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async validateOpeningBalanceIntegrity(organizationId) {
    // Get all opening balance journals
    const openingBalanceJournals = await this.prisma.journals.findMany({
      where: {
        organizationId,
        journalNumber: { startsWith: 'OB-' }
      },
      include: {
        journal_entries: {
          include: {
            ledger_accounts: true
          }
        }
      }
    })

    const validationResults = []
    let totalImbalance = 0

    for (const journal of openingBalanceJournals) {
      const totalDebits = journal.journal_entries.reduce((sum, entry) => 
        sum + parseFloat(entry.debitAmount), 0)
      const totalCredits = journal.journal_entries.reduce((sum, entry) => 
        sum + parseFloat(entry.creditAmount), 0)
      
      const imbalance = totalDebits - totalCredits
      totalImbalance += Math.abs(imbalance)

      validationResults.push({
        journalId: journal.id,
        journalNumber: journal.journalNumber,
        totalDebits,
        totalCredits,
        imbalance,
        isBalanced: Math.abs(imbalance) < 0.01 // Allow for small rounding differences
      })
    }

    return {
      journalCount: openingBalanceJournals.length,
      validationResults,
      totalImbalance,
      isSystemBalanced: totalImbalance < 0.01,
      summary: {
        balanced: validationResults.filter(r => r.isBalanced).length,
        imbalanced: validationResults.filter(r => !r.isBalanced).length
      }
    }
  }

  /**
   * Generate trial balance report including opening balances
   * @param {string} organizationId 
   * @param {Date} asOfDate 
   * @returns {Promise<Object>}
   */
  async generateTrialBalance(organizationId, asOfDate = new Date()) {
    // Get all journal entries up to the specified date
    const journalEntries = await this.prisma.journal_entries.findMany({
      where: {
        journals: {
          organizationId,
          journalDate: { lte: asOfDate }
        }
      },
      include: {
        ledger_accounts: true,
        journals: true
      }
    })

    // Group by account and calculate balances
    const accountBalances = {}

    for (const entry of journalEntries) {
      const accountId = entry.accountId
      const account = entry.ledger_accounts

      if (!accountBalances[accountId]) {
        accountBalances[accountId] = {
          account,
          totalDebits: 0,
          totalCredits: 0,
          balance: 0
        }
      }

      accountBalances[accountId].totalDebits += parseFloat(entry.debitAmount)
      accountBalances[accountId].totalCredits += parseFloat(entry.creditAmount)
      accountBalances[accountId].balance = 
        accountBalances[accountId].totalDebits - accountBalances[accountId].totalCredits
    }

    // Calculate totals
    const totalDebits = Object.values(accountBalances).reduce((sum, acc) => sum + acc.totalDebits, 0)
    const totalCredits = Object.values(accountBalances).reduce((sum, acc) => sum + acc.totalCredits, 0)
    const imbalance = totalDebits - totalCredits

    return {
      asOfDate,
      accounts: Object.values(accountBalances),
      totals: {
        totalDebits,
        totalCredits,
        imbalance,
        isBalanced: Math.abs(imbalance) < 0.01
      }
    }
  }
}

module.exports = OpeningBalanceService
