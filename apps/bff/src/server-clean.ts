import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'

// Load environment variables
config()

console.log(`[${new Date().toISOString()}] 🚀 Starting clean BFF server...`)

import { logger } from './utils/logger'
import { prisma } from './services/database.cloud-sql-only'

const app = express()
const PORT = process.env.PORT || 3001

// =============================================
// MIDDLEWARE
// =============================================

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
    const result = await prisma.$queryRaw`SELECT 1 as health, NOW() as timestamp`
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      query_result: result
    })
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Database error'
    })
  }
})

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'BFF Server Running (Cloud SQL)',
    timestamp: new Date().toISOString(),
    database: '34.173.128.29:3306',
    version: '1.0.0'
  })
})

// Simple accounts endpoint (test)
app.get('/api/accounts', async (req, res) => {
  try {
    console.log('📊 Querying ledger_accounts...')
    const accounts = await prisma.ledger_accounts.findMany({
      take: 5, // Limit for testing
      select: {
        id: true,
        code: true,
        name: true,
        type: true
      }
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

// List all available tables (diagnostic)
app.get('/api/tables', async (req, res) => {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'cashflowdb'
      ORDER BY table_name
    `
    
    res.json({
      success: true,
      tables: tables,
      count: Array.isArray(tables) ? tables.length : 0
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
    path: req.originalUrl
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
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')
    
    const server = app.listen(PORT, () => {
      console.log(`🎉 BFF Server running on port ${PORT}`)
      console.log(`🔗 Health: http://localhost:${PORT}/health`)
      console.log(`📊 Accounts: http://localhost:${PORT}/api/accounts`)
      console.log(`📋 Tables: http://localhost:${PORT}/api/tables`)
      console.log(`💾 Database: Cloud SQL (34.173.128.29)`)
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down gracefully...')
      server.close(async () => {
        await prisma.$disconnect()
        process.exit(0)
      })
    })

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
