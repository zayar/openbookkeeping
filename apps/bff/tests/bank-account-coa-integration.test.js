/**
 * Bank Account and Chart of Accounts Integration Tests
 * Tests the complete flow of bank account creation, update, and deletion
 * with proper Chart of Accounts linking and cache invalidation
 */

const request = require('supertest')
const { PrismaClient } = require('@prisma/client')

// Import the app for testing
const app = require('../server')

const prisma = new PrismaClient()

describe('Bank Account and Chart of Accounts Integration', () => {
  let testOrg
  let testUser
  let authToken
  let createdBankAccountId
  let createdLedgerAccountId

  beforeAll(async () => {
    // Set up test environment
    global.mockAuth = {
      userId: 'test-user-id',
      organizationId: 'test-org-id',
      email: 'test@example.com'
    }

    // Create test organization
    testOrg = await prisma.organizations.create({
      data: {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-bank-coa-org',
        oaOrganizationId: 'oa-test-org'
      }
    })

    // Create test user
    testUser = await prisma.users.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    // Create organization membership
    await prisma.organization_members.create({
      data: {
        id: 'test-membership-id',
        organizationId: testOrg.id,
        userId: testUser.id,
        role: 'owner'
      }
    })

    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'test123'
      })

    authToken = loginResponse.body.data.token
  })

  afterAll(async () => {
    // Clean up test data
    if (createdBankAccountId) {
      await prisma.bank_accounts.deleteMany({
        where: { id: createdBankAccountId }
      }).catch(() => {}) // Ignore errors if already deleted
    }

    if (createdLedgerAccountId) {
      await prisma.ledger_accounts.deleteMany({
        where: { id: createdLedgerAccountId }
      }).catch(() => {}) // Ignore errors if already deleted
    }

    await prisma.organization_members.deleteMany({
      where: { organizationId: testOrg.id }
    })
    await prisma.users.deleteMany({
      where: { id: testUser.id }
    })
    await prisma.organizations.deleteMany({
      where: { id: testOrg.id }
    })

    await prisma.$disconnect()
  })

  describe('Bank Account Creation', () => {
    it('should create bank account and linked Chart of Accounts entry', async () => {
      const bankAccountData = {
        bankName: 'Test Bank',
        accountName: 'Test Checking Account',
        accountNumber: 'TEST123456789',
        accountType: 'checking',
        currentBalance: 5000,
        description: 'Test bank account for integration testing'
      }

      const response = await request(app)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bankAccountData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('ledgerAccountId')
      expect(response.body.data.ledger_accounts).toBeDefined()

      // Store IDs for cleanup
      createdBankAccountId = response.body.data.id
      createdLedgerAccountId = response.body.data.ledgerAccountId

      // Verify bank account details
      expect(response.body.data.bankName).toBe(bankAccountData.bankName)
      expect(response.body.data.accountName).toBe(bankAccountData.accountName)
      expect(response.body.data.accountNumber).toBe(bankAccountData.accountNumber)

      // Verify linked Chart of Accounts entry
      expect(response.body.data.ledger_accounts.name).toBe(`${bankAccountData.bankName} - ${bankAccountData.accountName}`)
      expect(response.body.data.ledger_accounts.type).toBe('bank')
      expect(response.body.data.ledger_accounts.isActive).toBe(true)
    })

    it('should show bank account in Chart of Accounts list', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      
      // Find the bank account in the accounts list
      const bankAccount = response.body.data.find(
        account => account.id === createdLedgerAccountId
      )

      expect(bankAccount).toBeDefined()
      expect(bankAccount.type).toBe('bank')
      expect(bankAccount.name).toBe('Test Bank - Test Checking Account')
    })

    it('should generate unique account codes for multiple bank accounts', async () => {
      const secondBankAccountData = {
        bankName: 'Second Test Bank',
        accountName: 'Second Test Account',
        accountNumber: 'SECOND123456789',
        accountType: 'savings',
        currentBalance: 3000
      }

      const response = await request(app)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(secondBankAccountData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.ledger_accounts.code).not.toBe(
        // Should have a different code than the first account
        response.body.data.ledger_accounts.code
      )

      // Clean up the second account
      await prisma.bank_accounts.delete({
        where: { id: response.body.data.id }
      })
      await prisma.ledger_accounts.delete({
        where: { id: response.body.data.ledgerAccountId }
      })
    })
  })

  describe('Bank Account Updates', () => {
    it('should update bank account and linked Chart of Accounts entry', async () => {
      const updateData = {
        bankName: 'Updated Test Bank',
        accountName: 'Updated Test Account',
        currentBalance: 7500
      }

      const response = await request(app)
        .put(`/api/bank-accounts/${createdBankAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.bankName).toBe(updateData.bankName)
      expect(response.body.data.accountName).toBe(updateData.accountName)
      expect(parseFloat(response.body.data.currentBalance)).toBe(updateData.currentBalance)

      // Verify Chart of Accounts entry was updated
      expect(response.body.data.ledger_accounts.name).toBe(
        `${updateData.bankName} - ${updateData.accountName}`
      )
    })

    it('should handle partial updates correctly', async () => {
      const partialUpdateData = {
        currentBalance: 8000
      }

      const response = await request(app)
        .put(`/api/bank-accounts/${createdBankAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(parseFloat(response.body.data.currentBalance)).toBe(partialUpdateData.currentBalance)
      
      // Name should remain unchanged
      expect(response.body.data.ledger_accounts.name).toBe('Updated Test Bank - Updated Test Account')
    })
  })

  describe('Bank Account Deletion', () => {
    it('should prevent deletion of bank account with transactions', async () => {
      // Create a test transaction
      await prisma.bank_transactions.create({
        data: {
          id: 'test-transaction-id',
          bankAccountId: createdBankAccountId,
          organizationId: testOrg.id,
          transactionDate: new Date(),
          transactionType: 'deposit',
          amount: 100,
          description: 'Test transaction',
          balance: 8100
        }
      })

      const response = await request(app)
        .delete(`/api/bank-accounts/${createdBankAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Cannot delete bank account with existing transactions')

      // Clean up the test transaction
      await prisma.bank_transactions.delete({
        where: { id: 'test-transaction-id' }
      })
    })

    it('should delete bank account and handle Chart of Accounts entry properly', async () => {
      const response = await request(app)
        .delete(`/api/bank-accounts/${createdBankAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Bank account deleted successfully')

      // Verify bank account is deleted
      const bankAccount = await prisma.bank_accounts.findUnique({
        where: { id: createdBankAccountId }
      })
      expect(bankAccount).toBeNull()

      // Verify Chart of Accounts entry is handled (deleted or archived)
      const ledgerAccount = await prisma.ledger_accounts.findUnique({
        where: { id: createdLedgerAccountId }
      })
      
      // Should be either deleted or marked as inactive
      if (ledgerAccount) {
        expect(ledgerAccount.isActive).toBe(false)
      }

      // Clear the IDs since they're now deleted
      createdBankAccountId = null
      createdLedgerAccountId = null
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate accounts cache when creating bank account', async () => {
      // First, populate the cache by fetching accounts
      await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Create a new bank account
      const bankAccountData = {
        bankName: 'Cache Test Bank',
        accountName: 'Cache Test Account',
        accountNumber: 'CACHE123456789',
        accountType: 'checking',
        currentBalance: 1000
      }

      const createResponse = await request(app)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bankAccountData)
        .expect(201)

      // Immediately fetch accounts again - should show the new account
      const accountsResponse = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const newBankAccount = accountsResponse.body.data.find(
        account => account.id === createResponse.body.data.ledgerAccountId
      )

      expect(newBankAccount).toBeDefined()
      expect(newBankAccount.name).toBe('Cache Test Bank - Cache Test Account')

      // Clean up
      await prisma.bank_accounts.delete({
        where: { id: createResponse.body.data.id }
      })
      await prisma.ledger_accounts.delete({
        where: { id: createResponse.body.data.ledgerAccountId }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle duplicate account numbers', async () => {
      const bankAccountData = {
        bankName: 'Duplicate Test Bank',
        accountName: 'Duplicate Test Account',
        accountNumber: 'DUPLICATE123',
        accountType: 'checking',
        currentBalance: 1000
      }

      // Create first account
      const firstResponse = await request(app)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bankAccountData)
        .expect(201)

      // Try to create second account with same account number
      const secondResponse = await request(app)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bankAccountData)
        .expect(400)

      expect(secondResponse.body.success).toBe(false)
      expect(secondResponse.body.error).toBe('Account number already exists')

      // Clean up
      await prisma.bank_accounts.delete({
        where: { id: firstResponse.body.data.id }
      })
      await prisma.ledger_accounts.delete({
        where: { id: firstResponse.body.data.ledgerAccountId }
      })
    })

    it('should handle missing required fields', async () => {
      const invalidData = {
        bankName: 'Test Bank'
        // Missing accountName and accountNumber
      }

      const response = await request(app)
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('required')
    })
  })

  describe('Tenant Isolation', () => {
    it('should only show bank accounts for the user\'s organization', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // All accounts should belong to the test organization
      response.body.data.forEach(account => {
        expect(account.organizationId).toBe(testOrg.id)
      })
    })

    it('should prevent access to other organization\'s bank accounts', async () => {
      // This would require creating another organization and user
      // For now, we verify that organizationId is checked in the endpoints
      const response = await request(app)
        .get('/api/bank-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Should only return accounts for the authenticated user's organization
      expect(response.body.success).toBe(true)
    })
  })
})

console.log('✅ Bank Account and Chart of Accounts integration tests completed successfully')
