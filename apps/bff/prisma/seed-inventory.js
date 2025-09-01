const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedInventoryData() {
  try {
    console.log('🌱 Seeding inventory data...')
    
    const organizationId = 'cmefcazyk0003eo15jf5azevc'
    
    // Check if warehouses already exist
    const existingWarehouses = await prisma.warehouses.count({
      where: { organizationId }
    })
    
    if (existingWarehouses === 0) {
      console.log('📦 Creating default warehouse...')
      await prisma.warehouses.create({
        data: {
          id: `warehouse_${Date.now()}`,
          organizationId,
          name: 'Main Warehouse',
          code: 'MAIN',
          address: 'Head Office',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Created Main Warehouse')
    } else {
      console.log('✅ Warehouses already exist, skipping...')
    }
    
    // Check if Stock account exists
    const stockAccount = await prisma.ledger_accounts.findFirst({
      where: {
        organizationId,
        type: 'stock'
      }
    })
    
    if (!stockAccount) {
      console.log('📊 Creating Inventory Asset account...')
      await prisma.ledger_accounts.create({
        data: {
          id: `acc_${Date.now()}`,
          organizationId,
          code: '1300',
          name: 'Inventory Asset',
          type: 'stock',
          description: 'Stock/Inventory Asset account for tracking inventory value',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Created Inventory Asset account')
    } else {
      console.log('✅ Stock account already exists, skipping...')
    }
    
    // Check if Opening Balance Equity account exists
    const openingBalanceAccount = await prisma.ledger_accounts.findFirst({
      where: {
        organizationId,
        name: { contains: 'Opening Balance' }
      }
    })
    
    if (!openingBalanceAccount) {
      console.log('⚖️ Creating Opening Balance Equity account...')
      await prisma.ledger_accounts.create({
        data: {
          id: `acc_${Date.now() + 1}`,
          organizationId,
          code: '3900',
          name: 'Opening Balance Equity',
          type: 'equity',
          description: 'Opening balance adjustments and initial inventory values',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Created Opening Balance Equity account')
    } else {
      console.log('✅ Opening Balance Equity account already exists, skipping...')
    }
    
    // Check if COGS account exists
    const cogsAccount = await prisma.ledger_accounts.findFirst({
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
      console.log('💰 Creating Cost of Goods Sold account...')
      await prisma.ledger_accounts.create({
        data: {
          id: `acc_${Date.now() + 2}`,
          organizationId,
          code: '5000',
          name: 'Cost of Goods Sold',
          type: 'expense',
          description: 'Cost of goods sold for inventory items',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Created Cost of Goods Sold account')
    } else {
      console.log('✅ COGS account already exists, skipping...')
    }
    
    console.log('🎉 Inventory seeding completed!')
    
  } catch (error) {
    console.error('❌ Error seeding inventory data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedInventoryData()

