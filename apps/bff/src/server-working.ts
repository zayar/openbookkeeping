import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from 'dotenv'

// Load environment variables
config()

import { logger } from './utils/logger'
import { initializeDatabase, HealthService } from './services/database.cloud-sql-only'

// Import only essential routes
import authRoutes from './routes/auth'
import accountsRoutes from './routes/accounts'
import metricsRoutes from './routes/metrics'

// =============================================
// EXPRESS APP SETUP
// =============================================

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy only in production (Cloud Run)
app.set('trust proxy', process.env.NODE_ENV === 'production')

// =============================================
// SECURITY MIDDLEWARE
// =============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID']
}))

// =============================================
// BODY PARSING
// =============================================

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// =============================================
// REQUEST LOGGING
// =============================================

app.use((req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info'
    
    logger[logLevel](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
  })
  
  next()
})

// =============================================
// HEALTH CHECKS
// =============================================

app.get('/health', async (req, res) => {
  try {
    const health = await HealthService.getSystemHealth()
    const statusCode = health.status === 'healthy' ? 200 : 503
    
    res.status(statusCode).json(health)
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    })
  }
})

app.get('/health/ready', async (req, res) => {
  try {
    const health = await HealthService.getSystemHealth()
    if (health.status === 'healthy') {
      res.status(200).json({ status: 'ready' })
    } else {
      res.status(503).json({ status: 'not ready', details: health })
    }
  } catch (error) {
    logger.error('Readiness check failed:', error)
    res.status(503).json({ status: 'not ready', error: 'Readiness check failed' })
  }
})

app.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// =============================================
// API ROUTES
// =============================================

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Open Accounting BFF API (Cloud SQL Only)',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'Cloud SQL at 34.173.128.29',
    timestamp: new Date().toISOString()
  })
})

// Authentication routes
app.use('/auth', authRoutes)

// Core API routes
app.use('/api/accounts', accountsRoutes)
app.use('/api/metrics', metricsRoutes)

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Open Accounting BFF API (Cloud SQL Only)',
    version: '1.0.0',
    database: 'Cloud SQL Connected',
    endpoints: {
      auth: '/auth',
      health: '/health',
      accounts: '/api/accounts',
      metrics: '/api/metrics'
    }
  })
})

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  })
})

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  })

  const isDevelopment = process.env.NODE_ENV === 'development'
  
  res.status(error.status || 500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  })
})

// =============================================
// SERVER STARTUP
// =============================================

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase()
    logger.info('✅ Cloud SQL database initialized successfully')

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 BFF Server running on port ${PORT}`)
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`🔐 CORS origins: ${allowedOrigins.join(', ')}`)
      logger.info(`💾 Database: Cloud SQL Connected (34.173.128.29)`)
      logger.info(`🔍 Health check: http://localhost:${PORT}/health`)
      logger.info(`🎯 API: http://localhost:${PORT}/api`)
      logger.info(`🔑 Auth: http://localhost:${PORT}/auth`)
      logger.info(`📊 Accounts: http://localhost:${PORT}/api/accounts`)
    })

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`)
      
      server.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })

      // Force close server after 30s
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down')
        process.exit(1)
      }, 30000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error)
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
      process.exit(1)
    })

  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

export default app
