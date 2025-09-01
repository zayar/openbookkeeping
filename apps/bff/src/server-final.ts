import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config()

console.log(`[${new Date().toISOString()}] 🚀 Starting BFF Server...`)

// =============================================
// DATABASE SETUP
// =============================================

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error']
})

// =============================================
// EXPRESS SETUP
// =============================================

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// =============================================
// ROUTES
// =============================================

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as health, NOW() as timestamp, DATABASE() as db_name`
    res.json({ 
      status: 'healthy', 
      database: 'Cloud SQL Connected',
      timestamp: new Date().toISOString(),
      query_result: result
    })
  } catch (error) {
    console.error('Health check error:', error)
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Database error'
    })
  }
})

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Open Accounting BFF API (Cloud SQL)',
    timestamp: new Date().toISOString(),
    database: 'Cloud SQL at 34.173.128.29',
    version: '1.0.0'
  })
})

// Simple accounts endpoint
app.get('/api/accounts', async (req, res) => {
  try {
    console.log('📊 Querying ledger_accounts...')
    const accounts = await prisma.ledger_accounts.findMany({
      take: 10,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        organizationId: true
      },
      orderBy: { code: 'asc' }
    })
    
    res.json({
      success: true,
      data: accounts,
      count: accounts.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Accounts query error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    })
  }
})

// List organizations
app.get('/api/organizations', async (req, res) => {
  try {
    const orgs = await prisma.organizations.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        baseCurrency: true
      }
    })
    
    res.json({
      success: true,
      data: orgs,
      count: orgs.length
    })
  } catch (error) {
    console.error('❌ Organizations query error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    })
  }
})

// List users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    res.json({
      success: true,
      data: users,
      count: users.length
    })
  } catch (error) {
    console.error('❌ Users query error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    })
  }
})

// Database info
app.get('/api/info', async (req, res) => {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_rows
      FROM information_schema.tables 
      WHERE table_schema = 'cashflowdb'
      ORDER BY table_name
    `
    
    res.json({
      success: true,
      database: 'cashflowdb',
      host: '34.173.128.29',
      tables: tables,
      connection: 'Cloud SQL Direct'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    })
  }
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /health', 
      'GET /api/accounts',
      'GET /api/organizations',
      'GET /api/users',
      'GET /api/info'
    ]
  })
})

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  })
})

// =============================================
// SERVER STARTUP
// =============================================

async function startServer() {
  try {
    console.log('🔍 Testing database connection...')
    const result = await prisma.$queryRaw`SELECT 1 as test, DATABASE() as db, NOW() as time`
    console.log('✅ Database connection successful:', result)
    
    const server = app.listen(PORT, () => {
      console.log('')
      console.log('🎉 =============================================')
      console.log('🚀 BFF Server Successfully Started!')
      console.log('🎉 =============================================')
      console.log(`📡 Port: ${PORT}`)
      console.log(`💾 Database: Cloud SQL (34.173.128.29)`)
      console.log(`🕒 Started: ${new Date().toISOString()}`)
      console.log('')
      console.log('🔗 Available Endpoints:')
      console.log(`   • Health:        http://localhost:${PORT}/health`)
      console.log(`   • Root:          http://localhost:${PORT}/`)
      console.log(`   • Accounts:      http://localhost:${PORT}/api/accounts`)
      console.log(`   • Organizations: http://localhost:${PORT}/api/organizations`)
      console.log(`   • Users:         http://localhost:${PORT}/api/users`)
      console.log(`   • DB Info:       http://localhost:${PORT}/api/info`)
      console.log('')
      console.log('✅ Server ready for requests!')
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down gracefully...')
      server.close(async () => {
        await prisma.$disconnect()
        console.log('✅ Server shut down complete')
        process.exit(0)
      })
    })

    process.on('SIGINT', () => {
      console.log('🛑 Shutting down gracefully...')
      server.close(async () => {
        await prisma.$disconnect()
        console.log('✅ Server shut down complete')
        process.exit(0)
      })
    })

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    process.exit(1)
  }
}

startServer()
