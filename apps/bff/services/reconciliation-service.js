const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

/**
 * Reconciliation Service
 * Performs automated balance integrity checks and variance detection
 * Ensures trial balance = 0 and inventory values match GL
 */
class ReconciliationService {

  /**
   * Run comprehensive reconciliation for an organization
   * @param {string} organizationId 
   * @param {string} runType - daily, monthly, manual, year_end
   * @param {string} userId - User triggering the reconciliation
   * @returns {Promise<Object>}
   */
  async runReconciliation(organizationId, runType = 'manual', userId = null) {
    const runId = `recon_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    const runDate = new Date()

    try {
      // Create reconciliation run record
      const reconciliationRun = await prisma.reconciliation_runs.create({
        data: {
          id: runId,
          organization_id: organizationId,
          run_date: runDate,
          run_type: runType,
          status: 'running',
          started_at: runDate,
          created_by: userId
        }
      })

      console.log(`🔍 Starting reconciliation run ${runId} for organization ${organizationId}`)

      // Run all reconciliation checks
      const trialBalanceResult = await this.checkTrialBalance(organizationId, runDate)
      const inventoryResult = await this.checkInventoryBalance(organizationId, runDate)
      const arApResult = await this.checkArApBalance(organizationId, runDate)

      // Determine overall status
      const overallStatus = this.determineOverallStatus([
        trialBalanceResult.status,
        inventoryResult.status,
        arApResult.status
      ])

      // Update reconciliation run with results
      const updatedRun = await prisma.reconciliation_runs.update({
        where: { id: runId },
        data: {
          status: 'completed',
          trial_balance_status: trialBalanceResult.status,
          inventory_status: inventoryResult.status,
          ar_ap_status: arApResult.status,
          total_debits: trialBalanceResult.totalDebits,
          total_credits: trialBalanceResult.totalCredits,
          balance_difference: trialBalanceResult.balanceDifference,
          inventory_gl_value: inventoryResult.glValue,
          inventory_layer_value: inventoryResult.layerValue,
          inventory_variance: inventoryResult.variance,
          completed_at: new Date()
        }
      })

      // Store variances if any
      const allVariances = [
        ...trialBalanceResult.variances,
        ...inventoryResult.variances,
        ...arApResult.variances
      ]

      if (allVariances.length > 0) {
        await this.storeVariances(runId, allVariances)
      }

      console.log(`✅ Reconciliation run ${runId} completed with status: ${overallStatus}`)

      return {
        runId,
        status: overallStatus,
        trialBalance: trialBalanceResult,
        inventory: inventoryResult,
        arAp: arApResult,
        variances: allVariances,
        summary: {
          totalVariances: allVariances.length,
          criticalVariances: allVariances.filter(v => v.severity === 'critical').length,
          totalVarianceAmount: allVariances.reduce((sum, v) => sum + Math.abs(v.variance_amount), 0)
        }
      }

    } catch (error) {
      console.error(`❌ Reconciliation run ${runId} failed:`, error)

      // Update run as failed
      await prisma.reconciliation_runs.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date()
        }
      }).catch(console.error)

      throw error
    }
  }

  /**
   * Check trial balance (total debits = total credits)
   * @param {string} organizationId 
   * @param {Date} asOfDate 
   * @returns {Promise<Object>}
   */
  async checkTrialBalance(organizationId, asOfDate) {
    console.log(`🧮 Checking trial balance for ${organizationId}`)

    try {
      // Get all journal entries for posted journals
      const balanceQuery = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(je.debitAmount), 0) as total_debits,
          COALESCE(SUM(je.creditAmount), 0) as total_credits
        FROM journal_entries je
        JOIN journals j ON je.journalId = j.id
        WHERE j.organizationId = ${organizationId}
          AND j.status = 'posted'
          AND j.journalDate <= ${asOfDate}
      `

      const totalDebits = parseFloat(balanceQuery[0]?.total_debits || 0)
      const totalCredits = parseFloat(balanceQuery[0]?.total_credits || 0)
      const balanceDifference = totalDebits - totalCredits

      const variances = []
      let status = 'balanced'

      // Check if balanced (within 1 cent tolerance)
      if (Math.abs(balanceDifference) > 0.01) {
        status = 'unbalanced'
        variances.push({
          variance_type: 'trial_balance',
          description: `Trial balance is unbalanced by ${balanceDifference.toFixed(2)}`,
          expected_value: totalDebits,
          actual_value: totalCredits,
          variance_amount: balanceDifference,
          severity: Math.abs(balanceDifference) > 100 ? 'critical' : 'high'
        })

        // Find unbalanced journals
        const unbalancedJournals = await prisma.$queryRaw`
          SELECT 
            j.id,
            j.journalNumber,
            j.journalDate,
            j.totalDebit,
            j.totalCredit,
            COALESCE(SUM(je.debitAmount), 0) as actual_debits,
            COALESCE(SUM(je.creditAmount), 0) as actual_credits
          FROM journals j
          LEFT JOIN journal_entries je ON j.id = je.journalId
          WHERE j.organizationId = ${organizationId}
            AND j.status = 'posted'
            AND j.journalDate <= ${asOfDate}
          GROUP BY j.id, j.journalNumber, j.journalDate, j.totalDebit, j.totalCredit
          HAVING ABS(COALESCE(SUM(je.debitAmount), 0) - COALESCE(SUM(je.creditAmount), 0)) > 0.01
        `

        unbalancedJournals.forEach(journal => {
          const journalDiff = parseFloat(journal.actual_debits) - parseFloat(journal.actual_credits)
          variances.push({
            variance_type: 'trial_balance',
            description: `Journal ${journal.journalNumber} is unbalanced by ${journalDiff.toFixed(2)}`,
            expected_value: parseFloat(journal.actual_debits),
            actual_value: parseFloat(journal.actual_credits),
            variance_amount: journalDiff,
            severity: 'high',
            reference_id: journal.id
          })
        })
      }

      return {
        status,
        totalDebits,
        totalCredits,
        balanceDifference,
        variances
      }

    } catch (error) {
      console.error('Trial balance check failed:', error)
      return {
        status: 'error',
        totalDebits: 0,
        totalCredits: 0,
        balanceDifference: 0,
        variances: [{
          variance_type: 'trial_balance',
          description: `Trial balance check failed: ${error.message}`,
          variance_amount: 0,
          severity: 'critical'
        }]
      }
    }
  }

  /**
   * Check inventory balance (layer values = GL inventory asset balance)
   * @param {string} organizationId 
   * @param {Date} asOfDate 
   * @returns {Promise<Object>}
   */
  async checkInventoryBalance(organizationId, asOfDate) {
    console.log(`📦 Checking inventory balance for ${organizationId}`)

    try {
      // Get total inventory value from layers
      const layerValueQuery = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(il.quantityRemaining * il.unitCost), 0) as total_layer_value
        FROM inventory_layers il
        JOIN products p ON il.itemId = p.id
        WHERE p.organizationId = ${organizationId}
          AND il.quantityRemaining > 0
          AND il.status = 'active'
          AND il.createdAt <= ${asOfDate}
      `

      const layerValue = parseFloat(layerValueQuery[0]?.total_layer_value || 0)

      // Get GL inventory asset balance
      const glValueQuery = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(je.debitAmount), 0) - COALESCE(SUM(je.creditAmount), 0) as gl_balance
        FROM journal_entries je
        JOIN journals j ON je.journalId = j.id
        JOIN ledger_accounts la ON je.accountId = la.id
        WHERE la.organizationId = ${organizationId}
          AND la.type = 'inventory'
          AND j.status = 'posted'
          AND j.journalDate <= ${asOfDate}
      `

      const glValue = parseFloat(glValueQuery[0]?.gl_balance || 0)
      const variance = layerValue - glValue

      const variances = []
      let status = 'matched'

      // Check if values match (within $1 tolerance)
      if (Math.abs(variance) > 1.00) {
        status = 'variance'
        variances.push({
          variance_type: 'inventory',
          description: `Inventory layer value (${layerValue.toFixed(2)}) does not match GL balance (${glValue.toFixed(2)})`,
          expected_value: glValue,
          actual_value: layerValue,
          variance_amount: variance,
          severity: Math.abs(variance) > 1000 ? 'critical' : 'high'
        })

        // Find specific inventory variances by warehouse
        const warehouseVariances = await prisma.$queryRaw`
          SELECT 
            w.id as warehouse_id,
            w.name as warehouse_name,
            COALESCE(SUM(il.quantityRemaining * il.unitCost), 0) as warehouse_value,
            COUNT(DISTINCT il.itemId) as item_count
          FROM warehouses w
          LEFT JOIN inventory_layers il ON w.id = il.warehouseId AND il.quantityRemaining > 0 AND il.status = 'active'
          LEFT JOIN products p ON il.itemId = p.id
          WHERE w.organizationId = ${organizationId}
          GROUP BY w.id, w.name
          HAVING warehouse_value > 0
        `

        warehouseVariances.forEach(warehouse => {
          if (parseFloat(warehouse.warehouse_value) > 0) {
            variances.push({
              variance_type: 'inventory',
              warehouse_id: warehouse.warehouse_id,
              description: `Warehouse ${warehouse.warehouse_name} has inventory value ${parseFloat(warehouse.warehouse_value).toFixed(2)} (${warehouse.item_count} items)`,
              actual_value: parseFloat(warehouse.warehouse_value),
              variance_amount: parseFloat(warehouse.warehouse_value),
              severity: 'medium'
            })
          }
        })
      }

      return {
        status,
        layerValue,
        glValue,
        variance,
        variances
      }

    } catch (error) {
      console.error('Inventory balance check failed:', error)
      return {
        status: 'error',
        layerValue: 0,
        glValue: 0,
        variance: 0,
        variances: [{
          variance_type: 'inventory',
          description: `Inventory balance check failed: ${error.message}`,
          variance_amount: 0,
          severity: 'critical'
        }]
      }
    }
  }

  /**
   * Check AR/AP subledger balance
   * @param {string} organizationId 
   * @param {Date} asOfDate 
   * @returns {Promise<Object>}
   */
  async checkArApBalance(organizationId, asOfDate) {
    console.log(`💰 Checking AR/AP balance for ${organizationId}`)

    try {
      // Get AR control account balance
      const arControlQuery = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(je.debitAmount), 0) - COALESCE(SUM(je.creditAmount), 0) as ar_control_balance
        FROM journal_entries je
        JOIN journals j ON je.journalId = j.id
        JOIN ledger_accounts la ON je.accountId = la.id
        WHERE la.organizationId = ${organizationId}
          AND la.type = 'accounts_receivable'
          AND j.status = 'posted'
          AND j.journalDate <= ${asOfDate}
      `

      const arControlBalance = parseFloat(arControlQuery[0]?.ar_control_balance || 0)

      // Get AR subledger balance (outstanding invoices)
      const arSubledgerQuery = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(i.totalAmount), 0) - COALESCE(SUM(ip.amountReceived), 0) as ar_subledger_balance
        FROM invoices i
        LEFT JOIN invoice_payments ip ON i.id = ip.invoiceId
        WHERE i.organizationId = ${organizationId}
          AND i.status IN ('sent', 'overdue')
          AND i.invoiceDate <= ${asOfDate}
      `

      const arSubledgerBalance = parseFloat(arSubledgerQuery[0]?.ar_subledger_balance || 0)
      const arVariance = arControlBalance - arSubledgerBalance

      const variances = []
      let status = 'matched'

      // Check AR variance
      if (Math.abs(arVariance) > 1.00) {
        status = 'variance'
        variances.push({
          variance_type: 'ar_ap',
          description: `AR control account (${arControlBalance.toFixed(2)}) does not match subledger (${arSubledgerBalance.toFixed(2)})`,
          expected_value: arSubledgerBalance,
          actual_value: arControlBalance,
          variance_amount: arVariance,
          severity: Math.abs(arVariance) > 1000 ? 'critical' : 'medium'
        })
      }

      // TODO: Add AP reconciliation when we have AP functionality

      return {
        status,
        arControlBalance,
        arSubledgerBalance,
        arVariance,
        variances
      }

    } catch (error) {
      console.error('AR/AP balance check failed:', error)
      return {
        status: 'error',
        arControlBalance: 0,
        arSubledgerBalance: 0,
        arVariance: 0,
        variances: [{
          variance_type: 'ar_ap',
          description: `AR/AP balance check failed: ${error.message}`,
          variance_amount: 0,
          severity: 'critical'
        }]
      }
    }
  }

  /**
   * Store variance records
   * @param {string} reconciliationRunId 
   * @param {Array} variances 
   * @returns {Promise<void>}
   */
  async storeVariances(reconciliationRunId, variances) {
    const varianceRecords = variances.map(variance => ({
      id: `variance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reconciliation_run_id: reconciliationRunId,
      variance_type: variance.variance_type,
      account_id: variance.account_id || null,
      item_id: variance.item_id || null,
      warehouse_id: variance.warehouse_id || null,
      description: variance.description,
      expected_value: variance.expected_value || null,
      actual_value: variance.actual_value || null,
      variance_amount: variance.variance_amount,
      severity: variance.severity,
      resolved: false,
      created_at: new Date()
    }))

    await prisma.reconciliation_variances.createMany({
      data: varianceRecords
    })

    console.log(`📝 Stored ${varianceRecords.length} variance records`)
  }

  /**
   * Determine overall reconciliation status
   * @param {Array<string>} statuses 
   * @returns {string}
   */
  determineOverallStatus(statuses) {
    if (statuses.includes('error')) return 'failed'
    if (statuses.includes('unbalanced') || statuses.includes('variance')) return 'completed'
    return 'completed'
  }

  /**
   * Get reconciliation history for organization
   * @param {string} organizationId 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getReconciliationHistory(organizationId, limit = 10) {
    return await prisma.reconciliation_runs.findMany({
      where: { organization_id: organizationId },
      include: {
        _count: {
          select: {
            reconciliation_variances: true
          }
        }
      },
      orderBy: { run_date: 'desc' },
      take: limit
    })
  }

  /**
   * Get unresolved variances for organization
   * @param {string} organizationId 
   * @returns {Promise<Array>}
   */
  async getUnresolvedVariances(organizationId) {
    return await prisma.reconciliation_variances.findMany({
      where: {
        reconciliation_runs: {
          organization_id: organizationId
        },
        resolved: false
      },
      include: {
        reconciliation_runs: {
          select: {
            run_date: true,
            run_type: true
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { created_at: 'desc' }
      ]
    })
  }

  /**
   * Resolve a variance
   * @param {string} varianceId 
   * @param {string} userId 
   * @param {string} resolutionNotes 
   * @returns {Promise<Object>}
   */
  async resolveVariance(varianceId, userId, resolutionNotes) {
    return await prisma.reconciliation_variances.update({
      where: { id: varianceId },
      data: {
        resolved: true,
        resolved_at: new Date(),
        resolved_by: userId,
        resolution_notes: resolutionNotes
      }
    })
  }

  /**
   * Schedule daily reconciliation (called by cron job)
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async scheduledDailyReconciliation(organizationId) {
    console.log(`🕐 Running scheduled daily reconciliation for ${organizationId}`)
    
    try {
      const result = await this.runReconciliation(organizationId, 'daily', 'system')
      
      // Send alerts if critical variances found
      if (result.summary.criticalVariances > 0) {
        await this.sendReconciliationAlert(organizationId, result)
      }
      
      return result
    } catch (error) {
      console.error(`Failed daily reconciliation for ${organizationId}:`, error)
      throw error
    }
  }

  /**
   * Send reconciliation alert (placeholder for notification system)
   * @param {string} organizationId 
   * @param {Object} reconciliationResult 
   * @returns {Promise<void>}
   */
  async sendReconciliationAlert(organizationId, reconciliationResult) {
    console.log(`🚨 ALERT: Critical variances found in reconciliation for ${organizationId}`)
    console.log(`   - Total variances: ${reconciliationResult.summary.totalVariances}`)
    console.log(`   - Critical variances: ${reconciliationResult.summary.criticalVariances}`)
    console.log(`   - Total variance amount: $${reconciliationResult.summary.totalVarianceAmount.toFixed(2)}`)
    
    // TODO: Integrate with notification system (email, Slack, etc.)
    // This could send emails to accounting team, create tickets, etc.
  }

  /**
   * Get reconciliation dashboard data
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async getReconciliationDashboard(organizationId) {
    const [latestRun, unresolvedVariances, recentHistory] = await Promise.all([
      prisma.reconciliation_runs.findFirst({
        where: { organization_id: organizationId },
        orderBy: { run_date: 'desc' },
        include: {
          _count: {
            select: { reconciliation_variances: true }
          }
        }
      }),
      this.getUnresolvedVariances(organizationId),
      this.getReconciliationHistory(organizationId, 5)
    ])

    const variancesBySeverity = unresolvedVariances.reduce((acc, variance) => {
      acc[variance.severity] = (acc[variance.severity] || 0) + 1
      return acc
    }, {})

    return {
      latestRun,
      unresolvedVariances: {
        total: unresolvedVariances.length,
        bySeverity: variancesBySeverity,
        items: unresolvedVariances.slice(0, 10) // Top 10 for dashboard
      },
      recentHistory,
      summary: {
        lastRunDate: latestRun?.run_date,
        lastRunStatus: latestRun?.status,
        totalUnresolvedVariances: unresolvedVariances.length,
        criticalVariances: variancesBySeverity.critical || 0,
        isHealthy: !latestRun || (latestRun.status === 'completed' && unresolvedVariances.length === 0)
      }
    }
  }
}

module.exports = ReconciliationService
