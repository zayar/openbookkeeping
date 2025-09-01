const { PrismaClient } = require('@prisma/client')
const FiscalYearService = require('./fiscal-year-service')

const prisma = new PrismaClient()

/**
 * Inventory Service - Handles FIFO inventory tracking, movements, and journal entries
 * Follows double-entry accounting principles and integrates with OpenAccounting patterns
 */

class InventoryService {
  constructor(prismaInstance = null, fiscalYearServiceInstance = null) {
    this.prisma = prismaInstance || prisma
    this.fiscalYearService = fiscalYearServiceInstance || new FiscalYearService(this.prisma)
  }
  
  /**
   * Create opening balance for an item in a warehouse
   * @param {string} itemId 
   * @param {string} warehouseId 
   * @param {number} quantity 
   * @param {number} unitCost 
   * @param {Date} asOfDate 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async createOpeningBalance(itemId, warehouseId, quantity, unitCost, asOfDate, organizationId) {
    const totalValue = quantity * unitCost
    
    // Validate posting date against accounting periods
    await this.fiscalYearService.validatePostingDate(organizationId, asOfDate)
    
    return await this.prisma.$transaction(async (tx) => {
      // Get item details
      const item = await tx.products.findUnique({
        where: { id: itemId },
        include: { inventory_account: true }
      })
      
      if (!item || !item.trackInventory) {
        throw new Error('Item not found or inventory tracking not enabled')
      }
      
      if (!item.inventoryAccountId) {
        throw new Error('Inventory account not set for this item')
      }
      
      // Get Opening Balance Equity account
      const openingBalanceAccount = await tx.ledger_accounts.findFirst({
        where: {
          organizationId,
          OR: [
            { name: { contains: 'Opening Balance' } },
            { code: '3900' }
          ]
        }
      })
      
      if (!openingBalanceAccount) {
        throw new Error('Opening Balance Equity account not found')
      }
      
      // Create journal entry for opening balance
      const journal = await tx.journals.create({
        data: {
          id: `journal_${Date.now()}`,
          organizationId,
          journalNumber: `OB-${Date.now()}`,
          journalDate: asOfDate,
          reference: `Opening Balance - ${item.name}`,
          notes: `Opening inventory balance for ${item.name} in warehouse`,
          totalDebit: totalValue,
          totalCredit: totalValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          journal_entries: {
            create: [
              {
                id: `entry_${Date.now()}_1`,
                accountId: item.inventoryAccountId,
                description: `Opening inventory - ${item.name}`,
                debitAmount: totalValue,
                creditAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              {
                id: `entry_${Date.now()}_2`,
                accountId: openingBalanceAccount.id,
                description: `Opening balance equity - ${item.name}`,
                debitAmount: 0,
                creditAmount: totalValue,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        }
      })
      
      // Create opening balance record
      const openingBalance = await tx.inventory_opening_balances.create({
        data: {
          id: `opening_${Date.now()}`,
          itemId,
          warehouseId,
          quantity,
          unitCost,
          totalValue,
          asOfDate,
          journalId: journal.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Create initial inventory layer
      const layer = await tx.inventory_layers.create({
        data: {
          id: `layer_${Date.now()}`,
          itemId,
          warehouseId,
          quantityRemaining: quantity,
          unitCost,
          sourceType: 'opening',
          sourceId: openingBalance.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Create inventory movement record
      await tx.inventory_movements.create({
        data: {
          id: `movement_${Date.now()}`,
          itemId,
          warehouseId,
          layerId: layer.id,
          direction: 'in',
          quantity,
          unitCost,
          totalValue,
          movementType: 'opening',
          sourceType: 'opening_balance',
          sourceId: openingBalance.id,
          journalId: journal.id,
          reference: `Opening Balance`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      return { openingBalance, journal, layer }
    })
  }
  
  /**
   * Get current inventory levels for an item across all warehouses
   * @param {string} itemId 
   * @param {string} organizationId - Optional organization filter for security
   * @returns {Promise<Array>}
   */
  async getInventoryLevels(itemId, organizationId = null) {
    const whereClause = {
      itemId,
      quantityRemaining: { gt: 0 }
    }
    
    // Add organization filter through warehouse relationship if provided
    if (organizationId) {
      whereClause.warehouses = {
        organizationId
      }
    }
    
    const layers = await this.prisma.inventory_layers.findMany({
      where: whereClause,
      include: {
        warehouses: true,
        products: true
      },
      orderBy: [
        { warehouseId: 'asc' },
        { createdAt: 'asc' } // FIFO order
      ]
    })
    
    // Group by warehouse and calculate totals
    const warehouseInventory = {}
    
    layers.forEach(layer => {
      const warehouseId = layer.warehouseId
      if (!warehouseInventory[warehouseId]) {
        warehouseInventory[warehouseId] = {
          warehouseId,
          warehouseName: layer.warehouses.name,
          totalQuantity: 0,
          totalValue: 0,
          averageCost: 0,
          layers: []
        }
      }
      
      warehouseInventory[warehouseId].totalQuantity += parseFloat(layer.quantityRemaining)
      warehouseInventory[warehouseId].totalValue += parseFloat(layer.quantityRemaining) * parseFloat(layer.unitCost)
      warehouseInventory[warehouseId].layers.push(layer)
    })
    
    // Calculate average cost
    Object.values(warehouseInventory).forEach(warehouse => {
      if (warehouse.totalQuantity > 0) {
        warehouse.averageCost = warehouse.totalValue / warehouse.totalQuantity
      }
    })
    
    return Object.values(warehouseInventory)
  }
  
  /**
   * Process inventory outbound (sale/consumption) using FIFO
   * @param {string} itemId 
   * @param {string} warehouseId 
   * @param {number} quantity 
   * @param {string} sourceType 
   * @param {string} sourceId 
   * @param {string} organizationId 
   * @param {Date} postingDate - Transaction posting date
   * @returns {Promise<Object>}
   */
  async processOutbound(itemId, warehouseId, quantity, sourceType, sourceId, organizationId, postingDate = new Date(), tx = null) {
    // Validate posting date against accounting periods
    await this.fiscalYearService.validatePostingDate(organizationId, postingDate)
    
    const executeTransaction = async (transaction) => {
      // Get available layers in FIFO order (must respect posting date for FIFO)
      // Only consider layers created before or on the posting date
      const availableLayers = await transaction.inventory_layers.findMany({
        where: {
          itemId,
          warehouseId,
          quantityRemaining: { gt: 0 },
          createdAt: { lte: postingDate }
        },
        orderBy: { createdAt: 'asc' }, // FIFO
        include: { products: { include: { inventory_account: true } } }
      })
      
      if (availableLayers.length === 0) {
        throw new Error('No inventory available for this item in the specified warehouse')
      }
      
      // Check if we have enough inventory
      const totalAvailable = availableLayers.reduce((sum, layer) => 
        sum + parseFloat(layer.quantityRemaining), 0)
      
      if (totalAvailable < quantity) {
        throw new Error(`Insufficient inventory. Available: ${totalAvailable}, Required: ${quantity}`)
      }
      
      const item = availableLayers[0].products
      let remainingToConsume = quantity
      let totalCost = 0
      const consumedLayers = []
      
      // Consume layers in FIFO order
      for (const layer of availableLayers) {
        if (remainingToConsume <= 0) break
        
        const layerQuantity = parseFloat(layer.quantityRemaining)
        const consumeFromLayer = Math.min(layerQuantity, remainingToConsume)
        const layerCost = consumeFromLayer * parseFloat(layer.unitCost)
        
        // Update layer quantity
        await transaction.inventory_layers.update({
          where: { id: layer.id },
          data: {
            quantityRemaining: layerQuantity - consumeFromLayer,
            updatedAt: new Date()
          }
        })
        
        // Record movement
        await transaction.inventory_movements.create({
          data: {
            id: `movement_${Date.now()}_${Math.random()}`,
            itemId,
            warehouseId,
            layerId: layer.id,
            direction: 'out',
            quantity: consumeFromLayer,
            unitCost: parseFloat(layer.unitCost),
            totalValue: layerCost,
            movementType: sourceType === 'invoice' ? 'sale' : 'adjustment',
            sourceType,
            sourceId,
            reference: `${sourceType} consumption`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        consumedLayers.push({
          layerId: layer.id,
          quantity: consumeFromLayer,
          unitCost: parseFloat(layer.unitCost),
          totalCost: layerCost
        })
        
        totalCost += layerCost
        remainingToConsume -= consumeFromLayer
      }
      
      return {
        totalCost,
        averageCost: totalCost / quantity,
        consumedLayers,
        item
      }
    }
    
    // If transaction is provided, use it; otherwise create a new one
    if (tx) {
      return await executeTransaction(tx)
    } else {
      return await this.prisma.$transaction(executeTransaction, {
        timeout: 10000 // 10 seconds timeout
      })
    }
  }
  
  /**
   * Process inventory inbound (purchase/receipt)
   * @param {string} itemId 
   * @param {string} warehouseId 
   * @param {number} quantity 
   * @param {number} unitCost 
   * @param {string} sourceType 
   * @param {string} sourceId 
   * @param {string} organizationId 
   * @param {Date} postingDate - Transaction posting date
   * @returns {Promise<Object>}
   */
  async processInbound(itemId, warehouseId, quantity, unitCost, sourceType, sourceId, organizationId, postingDate = new Date()) {
    // Validate posting date against accounting periods
    await this.fiscalYearService.validatePostingDate(organizationId, postingDate)
    
    return await this.prisma.$transaction(async (tx) => {
      // Create new inventory layer
      const layer = await tx.inventory_layers.create({
        data: {
          id: `layer_${Date.now()}`,
          itemId,
          warehouseId,
          quantityRemaining: quantity,
          unitCost,
          sourceType,
          sourceId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Create inventory movement record
      await tx.inventory_movements.create({
        data: {
          id: `movement_${Date.now()}`,
          itemId,
          warehouseId,
          layerId: layer.id,
          direction: 'in',
          quantity,
          unitCost,
          totalValue: quantity * unitCost,
          movementType: sourceType === 'bill' ? 'purchase' : 'adjustment',
          sourceType,
          sourceId,
          reference: `${sourceType} receipt`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      return { layer }
    })
  }
  
  /**
   * Create COGS journal entry for inventory consumption
   * @param {string} itemId 
   * @param {number} totalCost 
   * @param {string} sourceId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async createCOGSJournal(itemId, totalCost, sourceId, organizationId) {
    return await this.prisma.$transaction(async (tx) => {
      const item = await tx.products.findUnique({
        where: { id: itemId },
        include: { inventory_account: true }
      })
      
      if (!item || !item.inventoryAccountId) {
        throw new Error('Item or inventory account not found')
      }
      
      // Get COGS account
      const cogsAccount = await tx.ledger_accounts.findFirst({
        where: {
          organizationId,
          OR: [
            { name: { contains: 'Cost of Goods Sold' } },
            { name: { contains: 'COGS' } },
            { code: '5000' }
          ]
        }
      })
      
      if (!cogsAccount) {
        throw new Error('Cost of Goods Sold account not found')
      }
      
      // Create COGS journal entry
      const journal = await tx.journals.create({
        data: {
          id: `journal_${Date.now()}`,
          organizationId,
          journalNumber: `COGS-${Date.now()}`,
          journalDate: new Date(),
          reference: `COGS - ${item.name}`,
          notes: `Cost of goods sold for ${item.name}`,
          totalDebit: totalCost,
          totalCredit: totalCost,
          createdAt: new Date(),
          updatedAt: new Date(),
          journal_entries: {
            create: [
              {
                id: `entry_${Date.now()}_1`,
                accountId: cogsAccount.id,
                description: `COGS - ${item.name}`,
                debitAmount: totalCost,
                creditAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              {
                id: `entry_${Date.now()}_2`,
                accountId: item.inventoryAccountId,
                description: `Inventory reduction - ${item.name}`,
                debitAmount: 0,
                creditAmount: totalCost,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        }
      })
      
      return journal
    })
  }
  
  /**
   * Get inventory movements history for an item
   * @param {string} itemId 
   * @param {string} warehouseId 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getMovementHistory(itemId, warehouseId = null, limit = 50) {
    const where = { itemId }
    if (warehouseId) where.warehouseId = warehouseId
    
    return await prisma.inventory_movements.findMany({
      where,
      include: {
        products: true,
        warehouses: true,
        inventory_layers: true,
        journals: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }
  
  /**
   * Validate if item can have inventory tracking disabled
   * @param {string} itemId 
   * @returns {Promise<boolean>}
   */
  async canDisableInventoryTracking(itemId) {
    const movementCount = await prisma.inventory_movements.count({
      where: { 
        itemId,
        movementType: { not: 'opening' }
      }
    })
    
    return movementCount === 0
  }
}

module.exports = InventoryService

