#!/usr/bin/env npx tsx
// Diagnostic server with verbose logging to detect freeze point

console.log(`[${new Date().toISOString()}] 🔍 DIAGNOSTIC: Starting diagnostic server...`)

import { config } from 'dotenv'
config()

console.log(`[${new Date().toISOString()}] ✅ DIAGNOSTIC: Environment loaded`)
console.log(`[${new Date().toISOString()}] 🔧 DIAGNOSTIC: DATABASE_URL = ${process.env.BFF_DATABASE_URL?.substring(0, 50)}...`)

import express from 'express'
console.log(`[${new Date().toISOString()}] ✅ DIAGNOSTIC: Express imported`)

const app = express()
const PORT = 3001

console.log(`[${new Date().toISOString()}] 🔍 DIAGNOSTIC: About to import Prisma...`)

try {
  const { PrismaClient } = require('@prisma/client')
  console.log(`[${new Date().toISOString()}] ✅ DIAGNOSTIC: PrismaClient imported`)
  
  console.log(`[${new Date().toISOString()}] 🔍 DIAGNOSTIC: Creating Prisma instance...`)
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  })
  console.log(`[${new Date().toISOString()}] ✅ DIAGNOSTIC: Prisma instance created`)
  
  // Test connection with timeout
  console.log(`[${new Date().toISOString()}] 🔍 DIAGNOSTIC: Testing database connection...`)
  
  const connectWithTimeout = () => {
    return Promise.race([
      prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp, DATABASE() as db_name`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout after 10s')), 10000)
      )
    ])
  }
  
  connectWithTimeout()
    .then((result) => {
      console.log(`[${new Date().toISOString()}] ✅ DIAGNOSTIC: Database connected successfully!`)
      console.log(`[${new Date().toISOString()}] 📊 DIAGNOSTIC: Query result:`, result)
      
      // Start server
      console.log(`[${new Date().toISOString()}] 🔍 DIAGNOSTIC: Starting Express server...`)
      
      app.get('/', (req, res) => {
        res.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          database: 'connected'
        })
      })
      
      app.get('/health', async (req, res) => {
        try {
          const result = await prisma.$queryRaw`SELECT 1 as health`
          res.json({ status: 'healthy', database: result })
        } catch (error) {
          res.status(500).json({ status: 'unhealthy', error: error.message })
        }
      })
      
      const server = app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] 🎉 DIAGNOSTIC: Server started on port ${PORT}`)
        console.log(`[${new Date().toISOString()}] 🔗 DIAGNOSTIC: Test with: curl http://localhost:${PORT}/health`)
        
        // Auto-shutdown after 30 seconds for testing
        setTimeout(() => {
          console.log(`[${new Date().toISOString()}] ⏰ DIAGNOSTIC: Auto-shutting down...`)
          server.close()
          prisma.$disconnect()
          process.exit(0)
        }, 30000)
      })
      
    })
    .catch((error) => {
      console.log(`[${new Date().toISOString()}] ❌ DIAGNOSTIC: Database connection failed!`)
      console.log(`[${new Date().toISOString()}] 🔥 DIAGNOSTIC: Error:`, error.message)
      process.exit(1)
    })
    
} catch (error) {
  console.log(`[${new Date().toISOString()}] ❌ DIAGNOSTIC: Import/setup error:`, error.message)
  process.exit(1)
}

// Prevent hanging
setTimeout(() => {
  console.log(`[${new Date().toISOString()}] ⏰ DIAGNOSTIC: Force exit after 60s - something is hanging!`)
  process.exit(1)
}, 60000)
