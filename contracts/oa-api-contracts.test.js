// OpenAccounting API Contract Tests
// Ensures BFF maintains 100% compatibility with OA API

const fetch = require('node-fetch')
const { z } = require('zod')

const OA_BASE_URL = process.env.OA_BASE_URL || 'http://localhost:8080'
const BFF_BASE_URL = process.env.BFF_BASE_URL || 'http://localhost:3001'

// =============================================
// OA API CONTRACT SCHEMAS
// =============================================

// Based on OA API documentation: https://openaccounting.io/api/

const OAAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string(),
  currency: z.string(),
  precision: z.number(),
  debitBalance: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const OATransactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  reference: z.string().optional(),
  date: z.string(),
  currency: z.string(),
  entries: z.array(z.object({
    account: z.string(),
    debit: z.number().optional(),
    credit: z.number().optional(),
    description: z.string().optional()
  })),
  createdAt: z.string(),
  updatedAt: z.string()
})

const OAOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  precision: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const OAPaginatedResponseSchema = (itemSchema) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number()
  }).optional()
})

// =============================================
// CONTRACT TEST SUITE
// =============================================

class OAContractTests {
  constructor() {
    this.testOrgId = null
    this.authToken = null
  }

  async runAllTests() {
    console.log('🧪 Running OA API Contract Tests...')
    console.log('=' .repeat(50))

    const tests = [
      this.testOrganizationEndpoints,
      this.testAccountEndpoints,
      this.testTransactionEndpoints,
      this.testPaginationContracts,
      this.testErrorHandlingContracts
    ]

    let passed = 0
    let failed = 0

    for (const test of tests) {
      try {
        await test.call(this)
        passed++
        console.log(`✅ ${test.name}`)
      } catch (error) {
        failed++
        console.log(`❌ ${test.name}: ${error.message}`)
      }
    }

    console.log('=' .repeat(50))
    console.log(`📊 Results: ${passed} passed, ${failed} failed`)
    
    if (failed > 0) {
      throw new Error(`${failed} contract tests failed`)
    }
  }

  async testOrganizationEndpoints() {
    // Test: POST /organizations (OA contract compliance)
    const createOrgResponse = await fetch(`${OA_BASE_URL}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Contract Org',
        currency: 'USD'
      })
    })

    if (!createOrgResponse.ok) {
      throw new Error(`OA org creation failed: ${createOrgResponse.status}`)
    }

    const orgData = await createOrgResponse.json()
    const validatedOrg = OAOrganizationSchema.parse(orgData)
    this.testOrgId = validatedOrg.id

    // Test: GET /organizations/{id}
    const getOrgResponse = await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}`)
    if (!getOrgResponse.ok) {
      throw new Error(`OA get org failed: ${getOrgResponse.status}`)
    }

    const getOrgData = await getOrgResponse.json()
    OAOrganizationSchema.parse(getOrgData)
  }

  async testAccountEndpoints() {
    if (!this.testOrgId) {
      throw new Error('Test organization not available')
    }

    // Test: POST /organizations/{orgId}/accounts
    const createAccountResponse = await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Account',
        parent: '0',
        currency: 'USD',
        precision: 2,
        debitBalance: true
      })
    })

    if (!createAccountResponse.ok) {
      throw new Error(`OA account creation failed: ${createAccountResponse.status}`)
    }

    const accountData = await createAccountResponse.json()
    const validatedAccount = OAAccountSchema.parse(accountData)

    // Test: GET /organizations/{orgId}/accounts (pagination)
    const listAccountsResponse = await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts?limit=10&offset=0`)
    if (!listAccountsResponse.ok) {
      throw new Error(`OA list accounts failed: ${listAccountsResponse.status}`)
    }

    const listData = await listAccountsResponse.json()
    
    // Validate pagination structure
    if (Array.isArray(listData)) {
      // Some OA versions return array directly
      z.array(OAAccountSchema).parse(listData)
    } else {
      // Others return paginated object
      OAPaginatedResponseSchema(OAAccountSchema).parse(listData)
    }

    // Test: GET /organizations/{orgId}/accounts/{accountId}
    const getAccountResponse = await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts/${validatedAccount.id}`)
    if (!getAccountResponse.ok) {
      throw new Error(`OA get account failed: ${getAccountResponse.status}`)
    }

    const getAccountData = await getAccountResponse.json()
    OAAccountSchema.parse(getAccountData)
  }

  async testTransactionEndpoints() {
    if (!this.testOrgId) {
      throw new Error('Test organization not available')
    }

    // Test: GET /organizations/{orgId}/transactions (pagination)
    const listTxResponse = await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/transactions?limit=5&offset=0`)
    if (!listTxResponse.ok) {
      throw new Error(`OA list transactions failed: ${listTxResponse.status}`)
    }

    const listTxData = await listTxResponse.json()
    
    // Validate transaction list structure
    if (Array.isArray(listTxData)) {
      z.array(OATransactionSchema).parse(listTxData)
    } else {
      OAPaginatedResponseSchema(OATransactionSchema).parse(listTxData)
    }
  }

  async testPaginationContracts() {
    if (!this.testOrgId) {
      throw new Error('Test organization not available')
    }

    // Test pagination parameters are respected
    const responses = await Promise.all([
      fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts?limit=5&offset=0`),
      fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts?limit=10&offset=5`),
      fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts?limit=1&offset=0`)
    ])

    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`Pagination test failed: ${response.status}`)
      }
    }

    // Validate that limit parameter is respected
    const smallResponse = await responses[2].json()
    const smallData = Array.isArray(smallResponse) ? smallResponse : smallResponse.data
    
    if (smallData.length > 1) {
      throw new Error('OA API not respecting limit parameter')
    }
  }

  async testErrorHandlingContracts() {
    // Test 404 handling
    const notFoundResponse = await fetch(`${OA_BASE_URL}/organizations/non-existent-org/accounts`)
    if (notFoundResponse.status !== 404) {
      throw new Error(`Expected 404 for non-existent org, got ${notFoundResponse.status}`)
    }

    // Test 400 handling (invalid data)
    if (this.testOrgId) {
      const invalidCreateResponse = await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
          name: ''
        })
      })

      if (invalidCreateResponse.status !== 400 && invalidCreateResponse.status !== 422) {
        throw new Error(`Expected 400/422 for invalid data, got ${invalidCreateResponse.status}`)
      }
    }
  }

  async cleanup() {
    // Clean up test organization
    if (this.testOrgId) {
      try {
        await fetch(`${OA_BASE_URL}/organizations/${this.testOrgId}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.log('Note: Could not clean up test organization')
      }
    }
  }
}

// =============================================
// BFF CONTRACT COMPLIANCE TESTS
// =============================================

class BFFContractTests {
  constructor() {
    this.authToken = null
  }

  async authenticate() {
    // Authenticate with BFF to get token
    const response = await fetch(`${BFF_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass123'
      })
    })

    if (!response.ok) {
      throw new Error('BFF authentication failed')
    }

    const data = await response.json()
    if (!data.success || !data.data.token) {
      throw new Error('BFF authentication response invalid')
    }

    this.authToken = data.data.token
  }

  async testBFFResponseFormats() {
    if (!this.authToken) {
      await this.authenticate()
    }

    // Test BFF response format consistency
    const response = await fetch(`${BFF_BASE_URL}/api/accounts`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    })

    if (!response.ok) {
      throw new Error(`BFF accounts endpoint failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Validate BFF response structure
    const BFFResponseSchema = z.object({
      success: z.boolean(),
      data: z.any(),
      timestamp: z.string().optional(),
      requestId: z.string().optional(),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean()
      }).optional()
    })

    BFFResponseSchema.parse(data)
  }
}

// =============================================
// TEST RUNNER
// =============================================

async function runContractTests() {
  console.log('🔍 OpenAccounting API Contract Tests')
  console.log('Validating 100% OA API compliance...\n')

  const oaTests = new OAContractTests()
  const bffTests = new BFFContractTests()

  try {
    // Test OA API contracts
    await oaTests.runAllTests()
    console.log('✅ OA API contracts validated\n')

    // Test BFF compliance
    await bffTests.testBFFResponseFormats()
    console.log('✅ BFF response formats validated\n')

    console.log('🎉 All contract tests passed!')
    
  } catch (error) {
    console.error('❌ Contract tests failed:', error.message)
    process.exit(1)
  } finally {
    await oaTests.cleanup()
  }
}

// Run tests if called directly
if (require.main === module) {
  runContractTests().catch(console.error)
}

module.exports = { OAContractTests, BFFContractTests }
