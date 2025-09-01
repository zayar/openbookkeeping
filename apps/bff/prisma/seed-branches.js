const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedBranches() {
  try {
    console.log('🌱 Seeding branches...')
    
    // Check if branches already exist
    const existingBranches = await prisma.branches.count()
    if (existingBranches > 0) {
      console.log('✅ Branches already exist, skipping...')
      return
    }
    
    // Create default branches
    const branches = [
      {
        id: 'branch_1755798042149',
        organizationId: 'cmefcazyk0003eo15jf5azevc',
        name: 'Head Office',
        addressLine1: '123 Main Street',
        city: 'Yangon',
        state: 'Yangon',
        postalCode: '11001',
        country: 'Myanmar',
        phone: '+95 1 234 5678',
        website: 'https://company.com',
        defaultTransactionSeries: 'Default Transaction Series',
        isDefault: true
      },
      {
        id: 'branch_1755798042150',
        organizationId: 'cmefcazyk0003eo15jf5azevc',
        name: 'Branch Office',
        addressLine1: '456 Business Avenue',
        city: 'Mandalay',
        state: 'Mandalay',
        postalCode: '05001',
        country: 'Myanmar',
        phone: '+95 2 345 6789',
        website: 'https://company.com/branch',
        defaultTransactionSeries: 'Branch Series',
        isDefault: false
      }
    ]
    
    for (const branch of branches) {
      await prisma.branches.create({
        data: {
          ...branch,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`✅ Created branch: ${branch.name}`)
    }
    
    console.log('🎉 Branch seeding completed!')
    
  } catch (error) {
    console.error('❌ Error seeding branches:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedBranches()
