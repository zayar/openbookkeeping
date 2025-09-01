const { PrismaClient } = require('@prisma/client')
const InventoryService = require('./inventory-service')

const inventoryService = new InventoryService()

const prisma = new PrismaClient()

/**
 * Inventory Transfer Service
 * Handles inventory transfers between warehouses with FIFO processing
 * Creates proper journal entries and maintains audit trail
 */
class InventoryTransferService {

  /**
   * Get all inventory transfers for an organization
   * @param {string} organizationId 
   * @param {Object} filters 
   * @returns {Promise<Array>}
   */
  async getTransfers(organizationId, filters = {}) {
    const where = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.fromWarehouseId && { fromWarehouseId: filters.fromWarehouseId }),
      ...(filters.toWarehouseId && { toWarehouseId: filters.toWarehouseId }),
      ...(filters.dateFrom && filters.dateTo && {
        transferDate: {
          gte: new Date(filters.dateFrom),
          lte: new Date(filters.dateTo)
        }
      })
    }

    const transfers = await prisma.inventory_transfers.findMany({
      where,
      include: {
        from_warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        to_warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        transfer_items: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true
              }
            }
          }
        },
        journals: {
          select: {
            id: true,
            journalNumber: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return transfers
  }

  /**
   * Get transfer by ID
   * @param {string} transferId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async getTransferById(transferId, organizationId) {
    const transfer = await prisma.inventory_transfers.findFirst({
      where: {
        id: transferId,
        organizationId
      },
      include: {
        from_warehouse: true,
        to_warehouse: true,
        transfer_items: {
          include: {
            products: true
          }
        },
        journals: {
          include: {
            journal_entries: {
              include: {
                ledger_accounts: {
                  select: {
                    id: true,
                    name: true,
                    code: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!transfer) {
      throw new Error('Transfer not found')
    }

    return transfer
  }

  /**
   * Create a new inventory transfer
   * @param {Object} transferData 
   * @param {string} organizationId 
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async createTransfer(transferData, organizationId, userId) {
    const {
      fromWarehouseId,
      toWarehouseId,
      transferDate,
      expectedDate,
      notes,
      items
    } = transferData

    // Validate warehouses
    if (fromWarehouseId === toWarehouseId) {
      throw new Error('Source and destination warehouses cannot be the same')
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.warehouses.findFirst({
        where: { id: fromWarehouseId, organizationId, isActive: true }
      }),
      prisma.warehouses.findFirst({
        where: { id: toWarehouseId, organizationId, isActive: true }
      })
    ])

    if (!fromWarehouse) {
      throw new Error('Source warehouse not found or inactive')
    }

    if (!toWarehouse) {
      throw new Error('Destination warehouse not found or inactive')
    }

    // Validate items and check availability
    if (!items || items.length === 0) {
      throw new Error('Transfer must include at least one item')
    }

    let totalValue = 0
    const validatedItems = []

    for (const item of items) {
      const { itemId, quantity, notes: itemNotes } = item

      if (!itemId || !quantity || quantity <= 0) {
        throw new Error('Each item must have valid itemId and positive quantity')
      }

      // Check if item exists and is tracked
      const product = await prisma.products.findFirst({
        where: {
          id: itemId,
          organizationId,
          trackInventory: true
        }
      })

      if (!product) {
        throw new Error(`Item ${itemId} not found or inventory tracking not enabled`)
      }

      // Check availability in source warehouse using FIFO
      const availableLayers = await prisma.inventory_layers.findMany({
        where: {
          itemId,
          warehouseId: fromWarehouseId,
          quantityRemaining: { gt: 0 }
        },
        orderBy: { createdAt: 'asc' }
      })

      const totalAvailable = availableLayers.reduce((sum, layer) => 
        sum + parseFloat(layer.quantityRemaining), 0)

      if (totalAvailable < quantity) {
        throw new Error(`Insufficient inventory for ${product.name}. Available: ${totalAvailable}, Required: ${quantity}`)
      }

      // Calculate FIFO cost for this quantity
      let remainingToCalculate = quantity
      let itemTotalCost = 0

      for (const layer of availableLayers) {
        if (remainingToCalculate <= 0) break

        const layerQuantity = parseFloat(layer.quantityRemaining)
        const consumeFromLayer = Math.min(layerQuantity, remainingToCalculate)
        const layerCost = consumeFromLayer * parseFloat(layer.unitCost)

        itemTotalCost += layerCost
        remainingToCalculate -= consumeFromLayer
      }

      const unitCost = itemTotalCost / quantity

      validatedItems.push({
        itemId,
        quantity: parseFloat(quantity),
        unitCost,
        totalValue: itemTotalCost,
        notes: itemNotes,
        product
      })

      totalValue += itemTotalCost
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber(organizationId)

    // Create transfer in transaction
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.inventory_transfers.create({
        data: {
          id: `transfer_${Date.now()}`,
          organizationId,
          transferNumber,
          fromWarehouseId,
          toWarehouseId,
          status: 'draft',
          transferDate: new Date(transferDate),
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes,
          totalValue,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Create transfer items
      const transferItems = await Promise.all(
        validatedItems.map(item =>
          tx.inventory_transfer_items.create({
            data: {
              id: `transfer_item_${Date.now()}_${Math.random()}`,
              transferId: transfer.id,
              itemId: item.itemId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalValue: item.totalValue,
              notes: item.notes,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        )
      )

      return {
        ...transfer,
        transfer_items: transferItems.map((item, index) => ({
          ...item,
          products: validatedItems[index].product
        }))
      }
    })
  }

  /**
   * Update transfer (only draft transfers)
   * @param {string} transferId 
   * @param {Object} updateData 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async updateTransfer(transferId, updateData, organizationId) {
    const transfer = await prisma.inventory_transfers.findFirst({
      where: {
        id: transferId,
        organizationId
      }
    })

    if (!transfer) {
      throw new Error('Transfer not found')
    }

    if (transfer.status !== 'draft') {
      throw new Error('Only draft transfers can be updated')
    }

    const updatedTransfer = await prisma.inventory_transfers.update({
      where: { id: transferId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        from_warehouse: true,
        to_warehouse: true,
        transfer_items: {
          include: {
            products: true
          }
        }
      }
    })

    return updatedTransfer
  }

  /**
   * Delete transfer (only draft transfers)
   * @param {string} transferId 
   * @param {string} organizationId 
   * @returns {Promise<boolean>}
   */
  async deleteTransfer(transferId, organizationId) {
    const transfer = await prisma.inventory_transfers.findFirst({
      where: {
        id: transferId,
        organizationId
      }
    })

    if (!transfer) {
      throw new Error('Transfer not found')
    }

    if (transfer.status !== 'draft') {
      throw new Error('Only draft transfers can be deleted')
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventory_transfer_items.deleteMany({
        where: { transferId }
      })

      await tx.inventory_transfers.delete({
        where: { id: transferId }
      })
    })

    return true
  }

  /**
   * Confirm transfer - processes inventory movement and creates journal entries
   * @param {string} transferId 
   * @param {string} organizationId 
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async confirmTransfer(transferId, organizationId, userId) {
    const transfer = await prisma.inventory_transfers.findFirst({
      where: {
        id: transferId,
        organizationId
      },
      include: {
        from_warehouse: true,
        to_warehouse: true,
        transfer_items: {
          include: {
            products: {
              include: {
                inventory_account: true
              }
            }
          }
        }
      }
    })

    if (!transfer) {
      throw new Error('Transfer not found')
    }

    if (transfer.status !== 'draft') {
      throw new Error('Only draft transfers can be confirmed')
    }

    return await prisma.$transaction(async (tx) => {
      // Process each item transfer
      for (const item of transfer.transfer_items) {
        // Process outbound from source warehouse (FIFO)
        const outboundResult = await inventoryService.processOutbound(
          item.itemId,
          transfer.fromWarehouseId,
          parseFloat(item.quantity),
          'transfer_out',
          transfer.id,
          organizationId,
          transfer.transferDate // Use transfer date as posting date
        )

        // Process inbound to destination warehouse
        await inventoryService.processInbound(
          item.itemId,
          transfer.toWarehouseId,
          parseFloat(item.quantity),
          parseFloat(item.unitCost),
          'transfer_in',
          transfer.id,
          organizationId,
          transfer.transferDate // Use transfer date as posting date
        )
      }

      // Create journal entry for the transfer
      const journal = await this.createTransferJournal(transfer, organizationId, tx)

      // Update transfer status
      const updatedTransfer = await tx.inventory_transfers.update({
        where: { id: transferId },
        data: {
          status: 'in_transit',
          journalId: journal.id,
          updatedAt: new Date()
        },
        include: {
          from_warehouse: true,
          to_warehouse: true,
          transfer_items: {
            include: {
              products: true
            }
          },
          journals: true
        }
      })

      return updatedTransfer
    })
  }

  /**
   * Complete transfer
   * @param {string} transferId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async completeTransfer(transferId, organizationId) {
    const transfer = await prisma.inventory_transfers.findFirst({
      where: {
        id: transferId,
        organizationId
      }
    })

    if (!transfer) {
      throw new Error('Transfer not found')
    }

    if (transfer.status !== 'in_transit') {
      throw new Error('Only in-transit transfers can be completed')
    }

    const updatedTransfer = await prisma.inventory_transfers.update({
      where: { id: transferId },
      data: {
        status: 'completed',
        completedDate: new Date(),
        updatedAt: new Date()
      },
      include: {
        from_warehouse: true,
        to_warehouse: true,
        transfer_items: {
          include: {
            products: true
          }
        }
      }
    })

    return updatedTransfer
  }

  /**
   * Cancel transfer
   * @param {string} transferId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async cancelTransfer(transferId, organizationId) {
    const transfer = await prisma.inventory_transfers.findFirst({
      where: {
        id: transferId,
        organizationId
      }
    })

    if (!transfer) {
      throw new Error('Transfer not found')
    }

    if (!['draft', 'in_transit'].includes(transfer.status)) {
      throw new Error('Only draft or in-transit transfers can be cancelled')
    }

    // If transfer was confirmed, we need to reverse the inventory movements
    if (transfer.status === 'in_transit') {
      // TODO: Implement reversal logic
      throw new Error('Reversal of confirmed transfers not yet implemented')
    }

    const updatedTransfer = await prisma.inventory_transfers.update({
      where: { id: transferId },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    })

    return updatedTransfer
  }

  /**
   * Create journal entry for inventory transfer
   * @param {Object} transfer 
   * @param {string} organizationId 
   * @param {Object} tx 
   * @returns {Promise<Object>}
   */
  async createTransferJournal(transfer, organizationId, tx = prisma) {
    // For inventory transfers, we typically don't create journal entries
    // as it's just moving inventory between locations within the same company
    // However, if warehouses have different cost centers, we might need entries

    const journal = await tx.journals.create({
      data: {
        id: `journal_${Date.now()}`,
        organizationId,
        journalNumber: `TRF-${transfer.transferNumber}`,
        journalDate: transfer.transferDate,
        reference: `Inventory Transfer ${transfer.transferNumber}`,
        notes: `Transfer from ${transfer.from_warehouse.name} to ${transfer.to_warehouse.name}`,
        totalDebit: 0, // No monetary impact for simple transfers
        totalCredit: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // If warehouses have different cost centers, create cost center transfer entries
    if (transfer.from_warehouse.costCenter && transfer.to_warehouse.costCenter && 
        transfer.from_warehouse.costCenter !== transfer.to_warehouse.costCenter) {
      
      // Create entries to track cost center movement
      const entries = []

      for (const item of transfer.transfer_items) {
        if (item.products.inventory_account) {
          entries.push({
            id: `entry_${Date.now()}_${Math.random()}`,
            journalId: journal.id,
            accountId: item.products.inventoryAccountId,
            description: `Transfer out - ${item.products.name} (${transfer.from_warehouse.costCenter})`,
            debitAmount: 0,
            creditAmount: parseFloat(item.totalValue),
            createdAt: new Date(),
            updatedAt: new Date()
          })

          entries.push({
            id: `entry_${Date.now()}_${Math.random()}`,
            journalId: journal.id,
            accountId: item.products.inventoryAccountId,
            description: `Transfer in - ${item.products.name} (${transfer.to_warehouse.costCenter})`,
            debitAmount: parseFloat(item.totalValue),
            creditAmount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }

      if (entries.length > 0) {
        await tx.journal_entries.createMany({
          data: entries
        })

        // Update journal totals
        const totalAmount = entries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount), 0)
        await tx.journals.update({
          where: { id: journal.id },
          data: {
            totalDebit: totalAmount,
            totalCredit: totalAmount
          }
        })
      }
    }

    return journal
  }

  /**
   * Generate transfer number
   * @param {string} organizationId 
   * @returns {Promise<string>}
   */
  async generateTransferNumber(organizationId) {
    const currentYear = new Date().getFullYear()

    // Get or create sequence record
    const sequence = await prisma.transfer_number_sequence.upsert({
      where: {
        organizationId_year: {
          organizationId,
          year: currentYear
        }
      },
      update: {
        lastNumber: { increment: 1 },
        updatedAt: new Date()
      },
      create: {
        organizationId,
        year: currentYear,
        lastNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return `TRF-${currentYear}-${sequence.lastNumber.toString().padStart(4, '0')}`
  }

  /**
   * Get transfer statistics for dashboard
   * @param {string} organizationId 
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getTransferStats(organizationId, filters = {}) {
    const dateFilter = filters.dateFrom && filters.dateTo ? {
      transferDate: {
        gte: new Date(filters.dateFrom),
        lte: new Date(filters.dateTo)
      }
    } : {}

    const [
      totalTransfers,
      draftTransfers,
      inTransitTransfers,
      completedTransfers,
      totalValue
    ] = await Promise.all([
      prisma.inventory_transfers.count({
        where: { organizationId, ...dateFilter }
      }),
      prisma.inventory_transfers.count({
        where: { organizationId, status: 'draft', ...dateFilter }
      }),
      prisma.inventory_transfers.count({
        where: { organizationId, status: 'in_transit', ...dateFilter }
      }),
      prisma.inventory_transfers.count({
        where: { organizationId, status: 'completed', ...dateFilter }
      }),
      prisma.inventory_transfers.aggregate({
        where: { organizationId, ...dateFilter },
        _sum: { totalValue: true }
      })
    ])

    return {
      totalTransfers,
      draftTransfers,
      inTransitTransfers,
      completedTransfers,
      totalValue: parseFloat(totalValue._sum.totalValue || 0)
    }
  }
}

module.exports = new InventoryTransferService()
