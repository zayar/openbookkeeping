const { PrismaClient } = require('@prisma/client')

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/openaccounting_test'
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1'

// Mock authentication for testing - override validateToken function globally
global.mockAuth = {
  id: 'test-user-inventory',
  organizationId: 'test-org-inventory',
  email: 'test-inventory@example.com',
  expiresAt: Date.now() + 3600000 // 1 hour from now
}

// Increase timeout for database operations
jest.setTimeout(30000)

// Global test setup
beforeAll(async () => {
  // Ensure test database is ready
  const prisma = new PrismaClient()
  
  try {
    await prisma.$connect()
    console.log('✅ Test database connected')
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})
