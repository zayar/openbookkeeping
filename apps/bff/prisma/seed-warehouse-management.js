const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Warehouse Management Data
 * Sets up warehouse-branch relationships and creates sample data
 */
async function seedWarehouseManagement() {
  console.log('🏭 Seeding Warehouse Management data...')

  try {
    // Get all organizations
    const organizations = await prisma.organizations.findMany({
      include: {
        branches: true,
        warehouses: true
      }
    })

    for (const org of organizations) {
      console.log(`📦 Processing organization: ${org.name}`)

      // Ensure each organization has at least one branch
      if (org.branches.length === 0) {
        console.log(`  Creating default branch for ${org.name}`)
        const defaultBranch = await prisma.branches.create({
          data: {
            id: `branch_${Date.now()}_${org.id}`,
            organizationId: org.id,
            name: 'Head Office',
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        org.branches.push(defaultBranch)
      }

      // Link existing warehouses to branches
      for (const warehouse of org.warehouses) {
        if (!warehouse.branchId) {
          // Find the default branch or first branch
          const targetBranch = org.branches.find(b => b.isDefault) || org.branches[0]
          
          console.log(`  Linking warehouse ${warehouse.name} to branch ${targetBranch.name}`)
          
          await prisma.warehouses.update({
            where: { id: warehouse.id },
            data: {
              branchId: targetBranch.id,
              isPrimary: true, // Set as primary for the branch
              warehouseType: 'standard',
              country: 'Myanmar',
              updatedAt: new Date()
            }
          })
        }
      }

      // Create additional sample warehouses if needed
      if (org.warehouses.length === 0) {
        const defaultBranch = org.branches.find(b => b.isDefault) || org.branches[0]
        
        console.log(`  Creating default warehouse for ${org.name}`)
        await prisma.warehouses.create({
          data: {
            id: `warehouse_${Date.now()}_${org.id}`,
            organizationId: org.id,
            branchId: defaultBranch.id,
            name: 'Main Warehouse',
            code: 'MAIN001',
            address: 'Main Storage Facility',
            city: 'Yangon',
            country: 'Myanmar',
            warehouseType: 'standard',
            isDefault: true,
            isActive: true,
            isPrimary: true,
            allowNegativeInventory: false,
            autoReorderEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      // Create sample warehouse types for demonstration
      const branches = await prisma.branches.findMany({
        where: { organizationId: org.id }
      })

      for (const branch of branches) {
        const existingWarehouses = await prisma.warehouses.findMany({
          where: { branchId: branch.id }
        })

        // Create additional warehouse types if this is the main organization
        if (existingWarehouses.length === 1 && org.name.includes('MLB')) {
          console.log(`  Creating additional warehouses for branch ${branch.name}`)
          
          // Cold storage warehouse
          await prisma.warehouses.create({
            data: {
              id: `warehouse_cold_${Date.now()}_${branch.id}`,
              organizationId: org.id,
              branchId: branch.id,
              name: 'Cold Storage Warehouse',
              code: 'COLD001',
              address: 'Refrigerated Storage Facility',
              city: branch.city || 'Yangon',
              country: 'Myanmar',
              warehouseType: 'cold_storage',
              capacity: 5000.00,
              isActive: true,
              isPrimary: false,
              allowNegativeInventory: false,
              autoReorderEnabled: true,
              notes: 'Temperature controlled storage for perishable goods',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          // Distribution center
          await prisma.warehouses.create({
            data: {
              id: `warehouse_dist_${Date.now()}_${branch.id}`,
              organizationId: org.id,
              branchId: branch.id,
              name: 'Distribution Center',
              code: 'DIST001',
              address: 'Distribution Hub',
              city: branch.city || 'Mandalay',
              country: 'Myanmar',
              warehouseType: 'distribution',
              capacity: 10000.00,
              isActive: true,
              isPrimary: false,
              allowNegativeInventory: false,
              autoReorderEnabled: true,
              notes: 'Central distribution point for regional deliveries',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      }
    }

    // Create sample transfer number sequences
    const currentYear = new Date().getFullYear()
    for (const org of organizations) {
      await prisma.transfer_number_sequence.upsert({
        where: {
          organizationId_year: {
            organizationId: org.id,
            year: currentYear
          }
        },
        update: {},
        create: {
          organizationId: org.id,
          year: currentYear,
          lastNumber: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    console.log('✅ Warehouse Management data seeded successfully!')

    // Display summary
    const warehouseCount = await prisma.warehouses.count()
    const branchCount = await prisma.branches.count()
    
    console.log(`📊 Summary:`)
    console.log(`   - ${branchCount} branches`)
    console.log(`   - ${warehouseCount} warehouses`)
    console.log(`   - Warehouse-branch relationships established`)
    console.log(`   - Transfer number sequences initialized`)

  } catch (error) {
    console.error('❌ Error seeding warehouse management data:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedWarehouseManagement()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = seedWarehouseManagement
