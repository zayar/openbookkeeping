// Integration Tests for Hardened Accounts API
// Run with: npm test

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.BFF_DATABASE_URL
    }
  }
});

// Mock OA Client for testing
jest.mock('../src/services/oaClient.v2', () => ({
  oaClient: {
    listAccounts: jest.fn(),
    createAccount: jest.fn(),
    getAccount: jest.fn(),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ success: true, duration: 100 }),
    getCircuitBreakerStatus: jest.fn().mockReturnValue({})
  }
}));

describe('Hardened Accounts API', () => {
  let app;
  let authToken;
  let testOrgId;
  let testUserId;

  beforeAll(async () => {
    // Setup test app
    app = require('../src/server');
    
    // Create test organization and user
    const testOrg = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org',
        oaOrganizationId: 'test-oa-org-id',
        baseCurrency: 'USD'
      }
    });
    testOrgId = testOrg.id;

    const testUser = await prisma.user.create({
      data: {
        email: 'test@integration.com',
        name: 'Test User',
        organizationMembers: {
          create: {
            organizationId: testOrgId,
            role: 'owner',
            status: 'active'
          }
        }
      }
    });
    testUserId = testUser.id;

    // Create test auth token
    const { JWTService } = require('../src/middleware/auth');
    authToken = JWTService.generateToken({
      userId: testUserId,
      email: testUser.email,
      name: testUser.name,
      organizationId: testOrgId
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.ledgerAccount.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up accounts before each test
    await prisma.ledgerAccount.deleteMany({ where: { organizationId: testOrgId } });
  });

  describe('GET /api/accounts', () => {
    it('should return paginated accounts with tenant isolation', async () => {
      // Create test accounts
      await prisma.ledgerAccount.createMany({
        data: [
          { organizationId: testOrgId, code: '1000', name: 'Cash', type: 'asset' },
          { organizationId: testOrgId, code: '2000', name: 'Accounts Payable', type: 'liability' },
          { organizationId: testOrgId, code: '3000', name: 'Capital', type: 'equity' }
        ]
      });

      const response = await request(app)
        .get('/api/accounts?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            organizationId: testOrgId,
            code: expect.any(String),
            name: expect.any(String),
            type: expect.any(String)
          })
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNext: true,
          hasPrev: false
        }
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should filter accounts by type', async () => {
      await prisma.ledgerAccount.createMany({
        data: [
          { organizationId: testOrgId, code: '1000', name: 'Cash', type: 'asset' },
          { organizationId: testOrgId, code: '5000', name: 'Expenses', type: 'expense' }
        ]
      });

      const response = await request(app)
        .get('/api/accounts?type=asset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('asset');
    });

    it('should search accounts by name and code', async () => {
      await prisma.ledgerAccount.createMany({
        data: [
          { organizationId: testOrgId, code: '1000', name: 'Cash Account', type: 'asset' },
          { organizationId: testOrgId, code: '2000', name: 'Payable Account', type: 'liability' }
        ]
      });

      const response = await request(app)
        .get('/api/accounts?search=cash')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('Cash');
    });

    it('should enforce tenant isolation', async () => {
      // Create account in different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: 'Other Org',
          slug: 'other-org',
          oaOrganizationId: 'other-oa-org-id'
        }
      });

      await prisma.ledgerAccount.create({
        data: {
          organizationId: otherOrg.id,
          code: '9999',
          name: 'Other Org Account',
          type: 'asset'
        }
      });

      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should not see accounts from other organization
      expect(response.body.data).toHaveLength(0);

      // Cleanup
      await prisma.ledgerAccount.deleteMany({ where: { organizationId: otherOrg.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });
  });

  describe('POST /api/accounts', () => {
    it('should create account with validation', async () => {
      const accountData = {
        code: '1000',
        name: 'Test Cash Account',
        type: 'asset',
        description: 'Test account for integration test'
      };

      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          organizationId: testOrgId,
          code: '1000',
          name: 'Test Cash Account',
          type: 'asset',
          isActive: true
        })
      });
    });

    it('should prevent duplicate account codes', async () => {
      // Create first account
      await prisma.ledgerAccount.create({
        data: {
          organizationId: testOrgId,
          code: '1000',
          name: 'Existing Account',
          type: 'asset'
        }
      });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: '1000',
          name: 'Duplicate Account',
          type: 'asset'
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Account code already exists in this organization',
        code: 'BFF_DUPLICATE_RESOURCE'
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          description: 'Invalid account'
        })
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        code: 'BFF_VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      });
    });
  });

  describe('PUT /api/accounts/:id', () => {
    let testAccountId;

    beforeEach(async () => {
      const account = await prisma.ledgerAccount.create({
        data: {
          organizationId: testOrgId,
          code: '1000',
          name: 'Test Account',
          type: 'asset'
        }
      });
      testAccountId = account.id;
    });

    it('should update account with tenant isolation', async () => {
      const updates = {
        name: 'Updated Account Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/accounts/${testAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testAccountId,
          name: 'Updated Account Name',
          description: 'Updated description'
        })
      });
    });

    it('should prevent cross-tenant access', async () => {
      // Create account in different organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: 'Other Org',
          slug: 'other-org-2',
          oaOrganizationId: 'other-oa-org-id-2'
        }
      });

      const otherAccount = await prisma.ledgerAccount.create({
        data: {
          organizationId: otherOrg.id,
          code: '9999',
          name: 'Other Account',
          type: 'asset'
        }
      });

      // Try to update account from different organization
      const response = await request(app)
        .put(`/api/accounts/${otherAccount.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked Account' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Account not found or access denied',
        code: 'BFF_RESOURCE_NOT_FOUND'
      });

      // Cleanup
      await prisma.ledgerAccount.delete({ where: { id: otherAccount.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Unauthorized')
      });
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should serve cached responses for repeated requests', async () => {
      // Create test account
      await prisma.ledgerAccount.create({
        data: {
          organizationId: testOrgId,
          code: '1000',
          name: 'Cached Account',
          type: 'asset'
        }
      });

      // First request (cache miss)
      const response1 = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.cached).toBeFalsy();

      // Second request (cache hit)
      const response2 = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body.cached).toBe(true);
      expect(response2.body.data).toEqual(response1.body.data);
    });

    it('should invalidate cache on updates', async () => {
      // Create and cache account
      const account = await prisma.ledgerAccount.create({
        data: {
          organizationId: testOrgId,
          code: '1000',
          name: 'Original Name',
          type: 'asset'
        }
      });

      // Cache the list
      await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Update account (should invalidate cache)
      await request(app)
        .put(`/api/accounts/${account.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Next request should not be cached
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.cached).toBeFalsy();
      expect(response.body.data[0].name).toBe('Updated Name');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid organization ID
      const invalidToken = require('../src/middleware/auth').JWTService.generateToken({
        userId: testUserId,
        email: 'test@integration.com',
        name: 'Test User',
        organizationId: 'invalid-org-id'
      });

      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(200); // Should return empty list, not error

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        pagination: expect.objectContaining({
          total: 0
        })
      });
    });

    it('should provide detailed validation errors', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Invalid data
          code: '', // Empty code
          name: 'x'.repeat(300), // Too long name
          type: 'invalid_type' // Invalid type
        })
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        code: 'BFF_VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
            code: expect.any(String)
          })
        ])
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log account creation', async () => {
      const accountData = {
        code: '1000',
        name: 'Audited Account',
        type: 'asset'
      };

      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      // Check audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: testOrgId,
          userId: testUserId,
          action: 'CREATE',
          resource: 'account'
        }
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.newValues).toMatchObject(accountData);
    });

    it('should log account updates', async () => {
      const account = await prisma.ledgerAccount.create({
        data: {
          organizationId: testOrgId,
          code: '1000',
          name: 'Original Account',
          type: 'asset'
        }
      });

      const updates = { name: 'Updated Account' };

      await request(app)
        .put(`/api/accounts/${account.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      // Check audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: testOrgId,
          userId: testUserId,
          action: 'UPDATE',
          resource: 'account',
          resourceId: account.id
        }
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.newValues).toMatchObject(updates);
      expect(auditLog.oldValues).toMatchObject({
        code: '1000',
        name: 'Original Account',
        type: 'asset'
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle burst requests without errors', async () => {
      // Create test account
      await prisma.ledgerAccount.create({
        data: {
          organizationId: testOrgId,
          code: '1000',
          name: 'Burst Test Account',
          type: 'asset'
        }
      });

      // Make 20 concurrent requests
      const promises = Array(20).fill().map(() =>
        request(app)
          .get('/api/accounts')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed (no rate limiting on reads)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
