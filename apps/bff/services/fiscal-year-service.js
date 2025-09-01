const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

/**
 * Fiscal Year & Period Control Service
 * Manages fiscal years, accounting periods, and posting date validation
 * Implements period controls and year-end closing procedures
 */
class FiscalYearService {
  constructor(prismaInstance = null) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * Get or create organization profile with fiscal year settings
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async getOrganizationProfile(organizationId) {
    let profile = await this.prisma.organization_profiles.findUnique({
      where: { organization_id: organizationId },
      include: {
        retained_earnings_account: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    if (!profile) {
      // Create default profile
      profile = await this.createDefaultProfile(organizationId)
    }

    return profile
  }

  /**
   * Create default organization profile
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async createDefaultProfile(organizationId) {
    // Find or create retained earnings account
    let retainedEarningsAccount = await this.prisma.ledger_accounts.findFirst({
      where: {
        organizationId,
        OR: [
          { name: { contains: 'Retained Earnings' } },
          { code: '3200' },
          { type: 'equity' }
        ]
      }
    })

    if (!retainedEarningsAccount) {
      retainedEarningsAccount = await this.prisma.ledger_accounts.create({
        data: {
          id: `account_re_${Date.now()}`,
          organizationId,
          name: 'Retained Earnings',
          code: '3200',
          type: 'equity',
          subType: 'retained_earnings',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    const profile = await this.prisma.organization_profiles.create({
      data: {
        id: `profile_${Date.now()}`,
        organization_id: organizationId,
        fiscal_year_start_month: 1, // January
        fiscal_year_start_day: 1,
        report_basis: 'accrual',
        base_currency: 'MMK',
        timezone: 'Asia/Yangon',
        date_format: 'DD/MM/YYYY',
        allow_negative_inventory: false,
        auto_close_periods: false,
        retained_earnings_account_id: retainedEarningsAccount.id,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        retained_earnings_account: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    // Generate initial periods for current and next fiscal year
    await this.generatePeriodsForProfile(profile)

    return profile
  }

  /**
   * Update organization profile
   * @param {string} organizationId 
   * @param {Object} updates 
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async updateOrganizationProfile(organizationId, updates, userId) {
    const existingProfile = await this.getOrganizationProfile(organizationId)

    // Check if fiscal year settings are changing
    const fiscalYearChanging = (
      updates.fiscal_year_start_month !== undefined && 
      updates.fiscal_year_start_month !== existingProfile.fiscal_year_start_month
    ) || (
      updates.fiscal_year_start_day !== undefined && 
      updates.fiscal_year_start_day !== existingProfile.fiscal_year_start_day
    )

    const updatedProfile = await this.prisma.organization_profiles.update({
      where: { organization_id: organizationId },
      data: {
        ...updates,
        updated_by: userId,
        updated_at: new Date()
      },
      include: {
        retained_earnings_account: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    // If fiscal year settings changed, regenerate future periods
    if (fiscalYearChanging) {
      await this.regenerateFuturePeriods(organizationId, updatedProfile)
    }

    return updatedProfile
  }

  /**
   * Generate accounting periods for a profile
   * @param {Object} profile 
   * @returns {Promise<void>}
   */
  async generatePeriodsForProfile(profile) {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    // Generate periods for current year and next 2 years
    for (let yearOffset = 0; yearOffset < 3; yearOffset++) {
      const fiscalYear = currentYear + yearOffset
      await this.generatePeriodsForFiscalYear(profile.organization_id, profile, fiscalYear)
    }
  }

  /**
   * Generate periods for a specific fiscal year
   * @param {string} organizationId 
   * @param {Object} profile 
   * @param {number} fiscalYear 
   * @returns {Promise<Array>}
   */
  async generatePeriodsForFiscalYear(organizationId, profile, fiscalYear) {
    const startMonth = profile.fiscal_year_start_month
    const startDay = profile.fiscal_year_start_day

    const periods = []
    
    for (let month = 0; month < 12; month++) {
      const periodNumber = month + 1
      
      // Calculate period start date
      let periodStartMonth = startMonth + month - 1
      let periodStartYear = fiscalYear
      
      if (periodStartMonth > 12) {
        periodStartMonth -= 12
        periodStartYear += 1
      }
      
      const periodStart = new Date(periodStartYear, periodStartMonth - 1, startDay)
      
      // Calculate period end date (last day of the month)
      let periodEndMonth = periodStartMonth + 1
      let periodEndYear = periodStartYear
      
      if (periodEndMonth > 12) {
        periodEndMonth = 1
        periodEndYear += 1
      }
      
      const periodEnd = new Date(periodEndYear, periodEndMonth - 1, 0) // Last day of previous month
      
      // Adjust if start day doesn't exist in the month (e.g., Feb 31 -> Feb 28/29)
      if (periodStart.getDate() !== startDay) {
        periodStart.setDate(0) // Last day of previous month
        periodStart.setDate(periodStart.getDate() + 1) // First day of current month
      }

      const periodName = this.getPeriodName(periodStart, periodEnd)
      
      // Check if period already exists
      const existingPeriod = await this.prisma.accounting_periods.findFirst({
        where: {
          organization_id: organizationId,
          fiscal_year: fiscalYear,
          period_number: periodNumber
        }
      })

      if (!existingPeriod) {
        const period = await this.prisma.accounting_periods.create({
          data: {
            id: `period_${fiscalYear}_${periodNumber}_${Date.now()}`,
            organization_id: organizationId,
            fiscal_year: fiscalYear,
            period_number: periodNumber,
            period_name: periodName,
            start_date: periodStart,
            end_date: periodEnd,
            status: 'open',
            created_at: new Date(),
            updated_at: new Date()
          }
        })
        
        periods.push(period)
      }
    }

    return periods
  }

  /**
   * Get period name from dates
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {string}
   */
  getPeriodName(startDate, endDate) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const startMonth = monthNames[startDate.getMonth()]
    const startYear = startDate.getFullYear()
    
    return `${startMonth} ${startYear}`
  }

  /**
   * Regenerate future periods after fiscal year settings change
   * @param {string} organizationId 
   * @param {Object} profile 
   * @returns {Promise<void>}
   */
  async regenerateFuturePeriods(organizationId, profile) {
    const currentDate = new Date()
    
    // Delete future periods that haven't been used
    await this.prisma.accounting_periods.deleteMany({
      where: {
        organization_id: organizationId,
        start_date: { gt: currentDate },
        status: 'open'
      }
    })

    // Regenerate periods
    await this.generatePeriodsForProfile(profile)
  }

  /**
   * Get accounting periods for organization
   * @param {string} organizationId 
   * @param {Object} filters 
   * @returns {Promise<Array>}
   */
  async getAccountingPeriods(organizationId, filters = {}) {
    const where = {
      organization_id: organizationId,
      ...(filters.fiscalYear && { fiscal_year: filters.fiscalYear }),
      ...(filters.status && { status: filters.status })
    }

    return await this.prisma.accounting_periods.findMany({
      where,
      orderBy: [
        { fiscal_year: 'desc' },
        { period_number: 'asc' }
      ]
    })
  }

  /**
   * Find accounting period for a specific date
   * @param {string} organizationId 
   * @param {Date} date 
   * @returns {Promise<Object|null>}
   */
  async findPeriodForDate(organizationId, date) {
    return await this.prisma.accounting_periods.findFirst({
      where: {
        organization_id: organizationId,
        start_date: { lte: date },
        end_date: { gte: date }
      }
    })
  }

  /**
   * Validate posting date against period status
   * @param {string} organizationId 
   * @param {Date} postingDate 
   * @param {boolean} allowReversalInClosedPeriod 
   * @returns {Promise<Object>}
   */
  async validatePostingDate(organizationId, postingDate, allowReversalInClosedPeriod = false) {
    const period = await this.findPeriodForDate(organizationId, postingDate)

    if (!period) {
      throw new Error(`No accounting period found for date ${postingDate.toISOString().split('T')[0]}. Please generate periods first.`)
    }

    const validation = {
      period,
      isValid: true,
      requiresReversal: false,
      message: null
    }

    switch (period.status) {
      case 'open':
        // Check if this is a back-dated transaction
        const currentDate = new Date()
        if (postingDate < currentDate && period.end_date < currentDate) {
          validation.requiresReversal = true
          validation.message = `Posting to prior period ${period.period_name} requires reversal workflow`
        }
        break

      case 'soft_closed':
        if (allowReversalInClosedPeriod) {
          validation.requiresReversal = true
          validation.message = `Period ${period.period_name} is soft closed. Changes require reversal workflow.`
        } else {
          validation.isValid = false
          validation.message = `Cannot post to soft closed period ${period.period_name}`
        }
        break

      case 'closed':
        if (allowReversalInClosedPeriod) {
          validation.requiresReversal = true
          validation.message = `Period ${period.period_name} is closed. Changes require admin approval and reversal workflow.`
        } else {
          validation.isValid = false
          validation.message = `Cannot post to closed period ${period.period_name}`
        }
        break

      default:
        validation.isValid = false
        validation.message = `Invalid period status: ${period.status}`
    }

    return validation
  }

  /**
   * Close accounting period
   * @param {string} periodId 
   * @param {string} userId 
   * @param {boolean} softClose 
   * @returns {Promise<Object>}
   */
  async closePeriod(periodId, userId, softClose = false) {
    const period = await this.prisma.accounting_periods.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      throw new Error('Period not found')
    }

    if (period.status === 'closed') {
      throw new Error('Period is already closed')
    }

    // Validate that all prior periods are closed
    const openPriorPeriods = await this.prisma.accounting_periods.findMany({
      where: {
        organization_id: period.organization_id,
        fiscal_year: { lte: period.fiscal_year },
        period_number: { lt: period.period_number },
        status: 'open'
      }
    })

    if (openPriorPeriods.length > 0 && !softClose) {
      throw new Error('Cannot close period while prior periods are still open')
    }

    const newStatus = softClose ? 'soft_closed' : 'closed'

    return await this.prisma.accounting_periods.update({
      where: { id: periodId },
      data: {
        status: newStatus,
        closed_at: new Date(),
        closed_by: userId,
        updated_at: new Date()
      }
    })
  }

  /**
   * Reopen accounting period
   * @param {string} periodId 
   * @param {string} userId 
   * @param {string} reason 
   * @returns {Promise<Object>}
   */
  async reopenPeriod(periodId, userId, reason) {
    const period = await this.prisma.accounting_periods.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      throw new Error('Period not found')
    }

    if (period.status === 'open') {
      throw new Error('Period is already open')
    }

    // Check if subsequent periods are closed
    const closedSubsequentPeriods = await this.prisma.accounting_periods.findMany({
      where: {
        organization_id: period.organization_id,
        OR: [
          {
            fiscal_year: period.fiscal_year,
            period_number: { gt: period.period_number }
          },
          {
            fiscal_year: { gt: period.fiscal_year }
          }
        ],
        status: 'closed'
      }
    })

    if (closedSubsequentPeriods.length > 0) {
      console.warn(`Reopening period ${period.period_name} while subsequent periods are closed`)
    }

    return await this.prisma.accounting_periods.update({
      where: { id: periodId },
      data: {
        status: 'open',
        reopened_at: new Date(),
        reopened_by: userId,
        updated_at: new Date()
      }
    })
  }

  /**
   * Perform year-end closing
   * @param {string} organizationId 
   * @param {number} fiscalYear 
   * @param {Date} closingDate 
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async performYearEndClose(organizationId, fiscalYear, closingDate, userId) {
    // Check if closing already exists
    const existingClosing = await this.prisma.year_end_closing_runs.findFirst({
      where: {
        organization_id: organizationId,
        fiscal_year: fiscalYear
      }
    })

    if (existingClosing && existingClosing.status === 'completed') {
      throw new Error(`Fiscal year ${fiscalYear} is already closed`)
    }

    const closingId = `closing_${fiscalYear}_${Date.now()}`

    try {
      // Create closing run record
      const closingRun = await this.prisma.year_end_closing_runs.create({
        data: {
          id: closingId,
          organization_id: organizationId,
          fiscal_year: fiscalYear,
          closing_date: closingDate,
          status: 'processing',
          started_at: new Date(),
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
          retained_earnings_account_id: '' // Will be updated below
        }
      })

      // Get organization profile for retained earnings account
      const profile = await this.getOrganizationProfile(organizationId)
      
      await this.prisma.year_end_closing_runs.update({
        where: { id: closingId },
        data: { retained_earnings_account_id: profile.retained_earnings_account_id }
      })

      // Calculate P&L for the fiscal year
      const plResult = await this.calculateProfitAndLoss(organizationId, fiscalYear)

      // Create closing journal entry via OA
      const closingJournal = await this.createClosingJournal(
        organizationId, 
        fiscalYear, 
        closingDate, 
        plResult, 
        profile.retained_earnings_account_id,
        userId
      )

      // Close all periods in the fiscal year
      await this.prisma.accounting_periods.updateMany({
        where: {
          organization_id: organizationId,
          fiscal_year: fiscalYear
        },
        data: {
          status: 'closed',
          closed_at: new Date(),
          closed_by: userId,
          updated_at: new Date()
        }
      })

      // Update closing run as completed
      const completedClosing = await this.prisma.year_end_closing_runs.update({
        where: { id: closingId },
        data: {
          status: 'completed',
          closing_journal_id: closingJournal.id,
          total_income: plResult.totalIncome,
          total_expenses: plResult.totalExpenses,
          net_income: plResult.netIncome,
          completed_at: new Date(),
          updated_at: new Date()
        }
      })

      return {
        closingRun: completedClosing,
        closingJournal,
        profitAndLoss: plResult
      }

    } catch (error) {
      // Update closing run as failed
      await this.prisma.year_end_closing_runs.update({
        where: { id: closingId },
        data: {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date(),
          updated_at: new Date()
        }
      }).catch(console.error)

      throw error
    }
  }

  /**
   * Calculate profit and loss for fiscal year
   * @param {string} organizationId 
   * @param {number} fiscalYear 
   * @returns {Promise<Object>}
   */
  async calculateProfitAndLoss(organizationId, fiscalYear) {
    // Get fiscal year date range
    const periods = await this.prisma.accounting_periods.findMany({
      where: {
        organization_id: organizationId,
        fiscal_year: fiscalYear
      },
      orderBy: { period_number: 'asc' }
    })

    if (periods.length === 0) {
      throw new Error(`No periods found for fiscal year ${fiscalYear}`)
    }

    const startDate = periods[0].start_date
    const endDate = periods[periods.length - 1].end_date

    // Calculate income and expenses
    const plQuery = await this.prisma.$queryRaw`
      SELECT 
        la.type as account_type,
        COALESCE(SUM(je.creditAmount), 0) - COALESCE(SUM(je.debitAmount), 0) as balance
      FROM ledger_accounts la
      LEFT JOIN journal_entries je ON la.id = je.accountId
      LEFT JOIN journals j ON je.journalId = j.id
      WHERE la.organizationId = ${organizationId}
        AND la.type IN ('income', 'expense')
        AND j.status = 'posted'
        AND j.journalDate >= ${startDate}
        AND j.journalDate <= ${endDate}
      GROUP BY la.type
    `

    let totalIncome = 0
    let totalExpenses = 0

    plQuery.forEach(row => {
      const balance = parseFloat(row.balance)
      if (row.account_type === 'income') {
        totalIncome = balance
      } else if (row.account_type === 'expense') {
        totalExpenses = -balance // Expenses are normally debits, so negative balance
      }
    })

    const netIncome = totalIncome - totalExpenses

    return {
      fiscalYear,
      startDate,
      endDate,
      totalIncome,
      totalExpenses,
      netIncome
    }
  }

  /**
   * Create closing journal entry
   * @param {string} organizationId 
   * @param {number} fiscalYear 
   * @param {Date} closingDate 
   * @param {Object} plResult 
   * @param {string} retainedEarningsAccountId 
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async createClosingJournal(organizationId, fiscalYear, closingDate, plResult, retainedEarningsAccountId, userId) {
    // Get all income and expense accounts with balances
    const accountBalances = await this.prisma.$queryRaw`
      SELECT 
        la.id as account_id,
        la.name as account_name,
        la.type as account_type,
        COALESCE(SUM(je.creditAmount), 0) - COALESCE(SUM(je.debitAmount), 0) as balance
      FROM ledger_accounts la
      LEFT JOIN journal_entries je ON la.id = je.accountId
      LEFT JOIN journals j ON je.journalId = j.id
      WHERE la.organizationId = ${organizationId}
        AND la.type IN ('income', 'expense')
        AND j.status = 'posted'
        AND j.journalDate >= ${plResult.startDate}
        AND j.journalDate <= ${plResult.endDate}
      GROUP BY la.id, la.name, la.type
      HAVING ABS(balance) > 0.01
    `

    // Create closing journal
    const journal = await this.prisma.journals.create({
      data: {
        id: `journal_close_${fiscalYear}_${Date.now()}`,
        organizationId,
        journalNumber: `CLOSE-${fiscalYear}`,
        journalDate: closingDate,
        posting_date: closingDate,
        reference: `Year-end closing for FY ${fiscalYear}`,
        notes: `Closing income and expense accounts to retained earnings`,
        totalDebit: Math.abs(plResult.netIncome) + plResult.totalIncome + plResult.totalExpenses,
        totalCredit: Math.abs(plResult.netIncome) + plResult.totalIncome + plResult.totalExpenses,
        status: 'posted',
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // Create journal entries
    const journalEntries = []

    // Close income accounts (debit income, credit retained earnings)
    accountBalances.forEach(account => {
      const balance = parseFloat(account.balance)
      
      if (account.account_type === 'income' && balance > 0.01) {
        journalEntries.push({
          id: `entry_close_${Date.now()}_${Math.random()}`,
          journalId: journal.id,
          accountId: account.account_id,
          description: `Close ${account.account_name} to Retained Earnings`,
          debitAmount: balance,
          creditAmount: 0,
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        })
      }
      
      if (account.account_type === 'expense' && balance < -0.01) {
        journalEntries.push({
          id: `entry_close_${Date.now()}_${Math.random()}`,
          journalId: journal.id,
          accountId: account.account_id,
          description: `Close ${account.account_name} to Retained Earnings`,
          debitAmount: 0,
          creditAmount: Math.abs(balance),
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        })
      }
    })

    // Net income to retained earnings
    if (Math.abs(plResult.netIncome) > 0.01) {
      journalEntries.push({
        id: `entry_close_${Date.now()}_${Math.random()}`,
        journalId: journal.id,
        accountId: retainedEarningsAccountId,
        description: `Net Income for FY ${fiscalYear}`,
        debitAmount: plResult.netIncome < 0 ? Math.abs(plResult.netIncome) : 0,
        creditAmount: plResult.netIncome > 0 ? plResult.netIncome : 0,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      })
    }

    // Create all journal entries
    await this.prisma.journal_entries.createMany({
      data: journalEntries
    })

    return journal
  }

  /**
   * Get fiscal year summary
   * @param {string} organizationId 
   * @param {number} fiscalYear 
   * @returns {Promise<Object>}
   */
  async getFiscalYearSummary(organizationId, fiscalYear) {
    const [periods, closingRun, plResult] = await Promise.all([
      this.getAccountingPeriods(organizationId, { fiscalYear }),
      prisma.year_end_closing_runs.findFirst({
        where: {
          organization_id: organizationId,
          fiscal_year: fiscalYear
        }
      }),
      this.calculateProfitAndLoss(organizationId, fiscalYear).catch(() => null)
    ])

    const periodSummary = periods.reduce((acc, period) => {
      acc[period.status] = (acc[period.status] || 0) + 1
      return acc
    }, {})

    return {
      fiscalYear,
      periods: {
        total: periods.length,
        byStatus: periodSummary
      },
      closingRun,
      profitAndLoss: plResult,
      isClosed: closingRun?.status === 'completed',
      canClose: periodSummary.open === 0 && periodSummary.soft_closed === 0 && !closingRun
    }
  }
}

module.exports = FiscalYearService
