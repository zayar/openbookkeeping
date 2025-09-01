const request = require('supertest')
const app = require('../dist/server.js').default

describe('Idempotency', () => {
  let authToken

  beforeAll(async () => {
    // Mock login to get token
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@default.com', password: 'password123' })
    authToken = loginRes.body.data?.token || 'mock-token'
  })

  test('POST /api/invoices with same Idempotency-Key returns same result', async () => {
    const payload = {
      invoiceNumber: 'INV-IDEM-001',
      customerId: 'customer_test',
      issueDate: '2025-01-01',
      items: [{ itemName: 'Test Item', quantity: 1, rate: 100 }]
    }

    const key = 'test-key-' + Date.now()

    // First request
    const res1 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', key)
      .send(payload)

    // Second request with same key
    const res2 = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', key)
      .send(payload)

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(200) // Returns cached result
    expect(res1.body.data?.id).toBe(res2.body.data?.id)
  })
})
