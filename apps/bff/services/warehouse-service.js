const { PrismaClient } = require('@prisma/client')
const inventoryService = require('./inventory-service')

const prisma = new PrismaClient()

/**
 * Warehouse Management Service
 * Handles comprehensive warehouse operations, permissions, and inventory transfers
 * Integrates with branches and supports FIFO inventory tracking
 */
class WarehouseService {

  /**
   * Get all warehouses for an organization with branch information
   * @param {string} organizationId 
   * @param {Object} filters 
   * @returns {Promise<Array>}
   */
  async getWarehouses(organizationId, filters = {}) {
    const where = {
      organizationId,
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.warehouseType && { warehouseType: filters.warehouseType }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { code: { contains: filters.search } },
          { city: { contains: filters.search } }
        ]
      })
    }

    const warehouses = await prisma.warehouses.findMany({
      where,
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            isDefault: true
          }
        },
        _count: {
          select: {
            inventory_layers: true,
            inventory_movements: true,
            warehouse_permissions: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    })

    // Calculate inventory metrics for each warehouse
    const warehousesWithMetrics = await Promise.all(
      warehouses.map(async (warehouse) => {
        const inventoryValue = await this.getWarehouseInventoryValue(warehouse.id)
        const utilizationPercent = warehouse.capacity 
          ? Math.min((inventoryValue / parseFloat(warehouse.capacity)) * 100, 100)
          : null

        return {
          ...warehouse,
          inventoryValue,
          utilizationPercent: utilizationPercent ? parseFloat(utilizationPercent.toFixed(2)) : null,
          itemCount: warehouse._count.inventory_layers,
          movementCount: warehouse._count.inventory_movements,
          userCount: warehouse._count.warehouse_permissions
        }
      })
    )

    return warehousesWithMetrics
  }

  /**
   * Get warehouse by ID with detailed information
   * @param {string} warehouseId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async getWarehouseById(warehouseId, organizationId) {
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      },
      include: {
        branches: true,
        warehouse_permissions: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        inventory_layers: {
          where: {
            quantityRemaining: { gt: 0 }
          },
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
        }
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    // Calculate inventory metrics
    const inventoryValue = await this.getWarehouseInventoryValue(warehouseId)
    const utilizationPercent = warehouse.capacity 
      ? Math.min((inventoryValue / parseFloat(warehouse.capacity)) * 100, 100)
      : null

    return {
      ...warehouse,
      inventoryValue,
      utilizationPercent: utilizationPercent ? parseFloat(utilizationPercent.toFixed(2)) : null
    }
  }

  /**
   * Create a new warehouse
   * @param {Object} warehouseData 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async createWarehouse(warehouseData, organizationId) {
    const {
      branchId,
      name,
      code,
      address,
      city,
      state,
      postalCode,
      country = 'Myanmar',
      phone,
      email,
      managerName,
      managerEmail,
      warehouseType = 'standard',
      capacity,
      isPrimary = false,
      isDefault = false,
      allowNegativeInventory = false,
      autoReorderEnabled = false,
      costCenter,
      notes
    } = warehouseData

    // Validate branch belongs to organization
    const branch = await prisma.branches.findFirst({
      where: {
        id: branchId,
        organizationId
      }
    })

    if (!branch) {
      throw new Error('Branch not found or does not belong to organization')
    }

    // Check existing warehouses count for auto-default logic
    const existingWarehouses = await prisma.warehouses.count({
      where: {
        organizationId,
        isActive: true
      }
    })

    // Auto-set as default if this is the first warehouse
    let shouldSetAsDefault = isDefault
    if (existingWarehouses === 0) {
      shouldSetAsDefault = true
    }

    // Check if setting as primary and handle existing primary
    if (isPrimary) {
      await prisma.warehouses.updateMany({
        where: {
          branchId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    // Check if setting as default and handle existing default
    if (shouldSetAsDefault) {
      await prisma.warehouses.updateMany({
        where: {
          organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Generate warehouse code if not provided
    const warehouseCode = code || await this.generateWarehouseCode(organizationId, name)

    const warehouse = await prisma.warehouses.create({
      data: {
        id: `warehouse_${Date.now()}`,
        organizationId,
        branchId,
        name,
        code: warehouseCode,
        address,
        city,
        state,
        postalCode,
        country,
        phone,
        email,
        managerName,
        managerEmail,
        warehouseType,
        capacity: capacity ? parseFloat(capacity) : null,
        isPrimary,
        isDefault: shouldSetAsDefault,
        allowNegativeInventory,
        autoReorderEnabled,
        costCenter,
        notes,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        branches: true
      }
    })

    return warehouse
  }

  /**
   * Update warehouse
   * @param {string} warehouseId 
   * @param {Object} updateData 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async updateWarehouse(warehouseId, updateData, organizationId) {
    const existingWarehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!existingWarehouse) {
      throw new Error('Warehouse not found')
    }

    // Handle primary warehouse change
    if (updateData.isPrimary && !existingWarehouse.isPrimary) {
      await prisma.warehouses.updateMany({
        where: {
          branchId: existingWarehouse.branchId,
          isPrimary: true,
          id: { not: warehouseId }
        },
        data: {
          isPrimary: false
        }
      })
    }

    // Handle default warehouse change
    if (updateData.isDefault && !existingWarehouse.isDefault) {
      await prisma.warehouses.updateMany({
        where: {
          organizationId,
          isDefault: true,
          id: { not: warehouseId }
        },
        data: {
          isDefault: false
        }
      })
    }

    const warehouse = await prisma.warehouses.update({
      where: { id: warehouseId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        branches: true
      }
    })

    return warehouse
  }

  /**
   * Delete warehouse (only if no inventory)
   * @param {string} warehouseId 
   * @param {string} organizationId 
   * @returns {Promise<boolean>}
   */
  async deleteWarehouse(warehouseId, organizationId) {
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      },
      include: {
        _count: {
          select: {
            inventory_layers: true,
            inventory_movements: true
          }
        }
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    if (warehouse._count.inventory_layers > 0 || warehouse._count.inventory_movements > 0) {
      throw new Error('Cannot delete warehouse with existing inventory or movements')
    }

    if (warehouse.isPrimary) {
      throw new Error('Cannot delete primary warehouse. Set another warehouse as primary first.')
    }

    await prisma.warehouses.delete({
      where: { id: warehouseId }
    })

    return true
  }

  /**
   * Set warehouse as primary for its branch
   * @param {string} warehouseId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async setPrimaryWarehouse(warehouseId, organizationId) {
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    if (!warehouse.isActive) {
      throw new Error('Cannot set inactive warehouse as primary')
    }

    return await prisma.$transaction(async (tx) => {
      // Remove primary status from other warehouses in the same branch
      await tx.warehouses.updateMany({
        where: {
          branchId: warehouse.branchId,
          isPrimary: true,
          id: { not: warehouseId }
        },
        data: {
          isPrimary: false
        }
      })

      // Set this warehouse as primary
      const updatedWarehouse = await tx.warehouses.update({
        where: { id: warehouseId },
        data: {
          isPrimary: true,
          updatedAt: new Date()
        },
        include: {
          branches: true
        }
      })

      return updatedWarehouse
    })
  }

  /**
   * Toggle warehouse active status
   * @param {string} warehouseId 
   * @param {boolean} isActive 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async toggleWarehouseStatus(warehouseId, isActive, organizationId) {
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    if (!isActive && warehouse.isPrimary) {
      throw new Error('Cannot deactivate primary warehouse. Set another warehouse as primary first.')
    }

    const updatedWarehouse = await prisma.warehouses.update({
      where: { id: warehouseId },
      data: {
        isActive,
        updatedAt: new Date()
      },
      include: {
        branches: true
      }
    })

    return updatedWarehouse
  }

  /**
   * Get warehouse permissions
   * @param {string} warehouseId 
   * @param {string} organizationId 
   * @returns {Promise<Array>}
   */
  async getWarehousePermissions(warehouseId, organizationId) {
    // Verify warehouse belongs to organization
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    const permissions = await prisma.warehouse_permissions.findMany({
      where: { warehouseId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { users: { name: 'asc' } },
        { permission: 'asc' }
      ]
    })

    return permissions
  }

  /**
   * Grant warehouse permission to user
   * @param {string} warehouseId 
   * @param {string} userId 
   * @param {string} permission 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async grantWarehousePermission(warehouseId, userId, permission, organizationId) {
    // Verify warehouse belongs to organization
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    // Verify user exists
    const user = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Valid permissions
    const validPermissions = ['view', 'manage', 'transfer', 'adjust', 'full_access']
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission. Must be one of: ${validPermissions.join(', ')}`)
    }

    const warehousePermission = await prisma.warehouse_permissions.upsert({
      where: {
        warehouseId_userId_permission: {
          warehouseId,
          userId,
          permission
        }
      },
      update: {
        updatedAt: new Date()
      },
      create: {
        id: `perm_${Date.now()}`,
        warehouseId,
        userId,
        permission,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return warehousePermission
  }

  /**
   * Revoke warehouse permission from user
   * @param {string} warehouseId 
   * @param {string} userId 
   * @param {string} organizationId 
   * @returns {Promise<boolean>}
   */
  async revokeWarehousePermission(warehouseId, userId, organizationId) {
    // Verify warehouse belongs to organization
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    await prisma.warehouse_permissions.deleteMany({
      where: {
        warehouseId,
        userId
      }
    })

    return true
  }

  /**
   * Get warehouses for a specific branch
   * @param {string} branchId 
   * @param {string} organizationId 
   * @returns {Promise<Array>}
   */
  async getWarehousesByBranch(branchId, organizationId) {
    const warehouses = await prisma.warehouses.findMany({
      where: {
        branchId,
        organizationId
      },
      include: {
        _count: {
          select: {
            inventory_layers: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' }
      ]
    })

    return warehouses
  }

  /**
   * Get primary warehouse for a branch
   * @param {string} branchId 
   * @param {string} organizationId 
   * @returns {Promise<Object>}
   */
  async getPrimaryWarehouse(branchId, organizationId) {
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        branchId,
        organizationId,
        isPrimary: true,
        isActive: true
      }
    })

    if (!warehouse) {
      // Fallback to first active warehouse
      const fallbackWarehouse = await prisma.warehouses.findFirst({
        where: {
          branchId,
          organizationId,
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      })

      if (fallbackWarehouse) {
        // Set as primary
        return await this.setPrimaryWarehouse(fallbackWarehouse.id, organizationId)
      }

      throw new Error('No active warehouse found for branch')
    }

    return warehouse
  }

  /**
   * Calculate total inventory value for a warehouse
   * @param {string} warehouseId 
   * @returns {Promise<number>}
   */
  async getWarehouseInventoryValue(warehouseId) {
    const result = await prisma.inventory_layers.aggregate({
      where: {
        warehouseId,
        quantityRemaining: { gt: 0 }
      },
      _sum: {
        quantityRemaining: true
      }
    })

    // Calculate total value by summing quantity * unitCost for each layer
    const layers = await prisma.inventory_layers.findMany({
      where: {
        warehouseId,
        quantityRemaining: { gt: 0 }
      },
      select: {
        quantityRemaining: true,
        unitCost: true
      }
    })

    const totalValue = layers.reduce((sum, layer) => {
      return sum + (parseFloat(layer.quantityRemaining) * parseFloat(layer.unitCost))
    }, 0)

    return totalValue
  }

  /**
   * Generate warehouse code
   * @param {string} organizationId 
   * @param {string} warehouseName 
   * @returns {Promise<string>}
   */
  async generateWarehouseCode(organizationId, warehouseName) {
    const prefix = warehouseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3)

    let counter = 1
    let code = `${prefix}${counter.toString().padStart(3, '0')}`

    while (await prisma.warehouses.findFirst({ where: { code } })) {
      counter++
      code = `${prefix}${counter.toString().padStart(3, '0')}`
    }

    return code
  }

  /**
   * Check if user has permission for warehouse operation
   * @param {string} userId 
   * @param {string} warehouseId 
   * @param {string} requiredPermission 
   * @returns {Promise<boolean>}
   */
  async checkWarehousePermission(userId, warehouseId, requiredPermission) {
    const permission = await prisma.warehouse_permissions.findFirst({
      where: {
        userId,
        warehouseId,
        OR: [
          { permission: requiredPermission },
          { permission: 'full_access' }
        ]
      }
    })

    return !!permission
  }

  /**
   * Get warehouse inventory levels
   * @param {string} warehouseId 
   * @param {string} organizationId 
   * @returns {Promise<Array>}
   */
  async getWarehouseInventory(warehouseId, organizationId) {
    // Verify warehouse belongs to organization
    const warehouse = await prisma.warehouses.findFirst({
      where: {
        id: warehouseId,
        organizationId
      }
    })

    if (!warehouse) {
      throw new Error('Warehouse not found')
    }

    const inventory = await prisma.inventory_layers.findMany({
      where: {
        warehouseId,
        quantityRemaining: { gt: 0 }
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            lowStockAlert: true
          }
        }
      },
      orderBy: [
        { products: { name: 'asc' } },
        { createdAt: 'asc' }
      ]
    })

    // Group by product and calculate totals
    const inventoryMap = {}
    
    inventory.forEach(layer => {
      const productId = layer.itemId
      if (!inventoryMap[productId]) {
        inventoryMap[productId] = {
          product: layer.products,
          totalQuantity: 0,
          totalValue: 0,
          averageCost: 0,
          layers: []
        }
      }
      
      const quantity = parseFloat(layer.quantityRemaining)
      const cost = parseFloat(layer.unitCost)
      const value = quantity * cost
      
      inventoryMap[productId].totalQuantity += quantity
      inventoryMap[productId].totalValue += value
      inventoryMap[productId].layers.push(layer)
    })

    // Calculate average costs
    Object.values(inventoryMap).forEach(item => {
      if (item.totalQuantity > 0) {
        item.averageCost = item.totalValue / item.totalQuantity
      }
    })

    return Object.values(inventoryMap)
  }
}

module.exports = new WarehouseService()
