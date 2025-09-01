import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { loadConfig, parseAllowedOrigins } from '@openaccounting/config'

// Load environment variables (validated)
const appConfig = loadConfig()

import { logger } from './utils/logger'
import { initializeDatabase, HealthService } from './services/database.cloud-sql-only'
import { passport } from './middleware/auth'
import authRoutes from './routes/auth'
import itemsRoutes from './routes/items'
import accountsRoutes from './routes/accounts'
import bankAccountsRoutes from './routes/bankAccounts'
import customersRoutes from './routes/customers'
import warehousesRoutes from './routes/warehouses'
import branchesRoutes from './routes/branches'
import taxesRoutes from './routes/taxes'
import salespersonsRoutes from './routes/salespersons'
// import vendorsRoutes from './routes/vendors' // DISABLED: vendors table doesn't exist
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
const allowedOrigins = parseAllowedOrigins(appConfig.ALLOWED_ORIGINS) || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
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
// RATE LIMITING
// =============================================

const createRateLimiter = (windowMs: number, max: number, message: string) => 
  rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health'
    }
  })

// General rate limiter
app.use(createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  'Too many requests from this IP, please try again later'
))

// Stricter rate limiting for auth endpoints
app.use('/auth', createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests per 15 minutes for auth
  'Too many authentication attempts, please try again later'
))

// =============================================
// BODY PARSING & COOKIES
// =============================================

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    (req as any).rawBody = buf
  }
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret'))

// =============================================
// SESSION CONFIGURATION (DISABLED FOR DEBUGGING)
// =============================================

// app.use(session({
//   secret: process.env.SESSION_SECRET || 'session-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   },
//   name: 'bff.session'
// }))

// =============================================
// PASSPORT AUTHENTICATION (DISABLED FOR DEBUGGING)
// =============================================

// app.use(passport.initialize())
// app.use(passport.session())

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
      userAgent: req.get('User-Agent'),
      organizationId: req.headers['x-organization-id']
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
    message: 'Open Accounting BFF API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  })
})

// Authentication routes
app.use('/auth', authRoutes)
// Items CRUD
app.use('/api/items', itemsRoutes)
// Accounts (Chart of Accounts)
app.use('/api/accounts', accountsRoutes)
// Bank Accounts
app.use('/api/bank-accounts', bankAccountsRoutes)
// Customers
app.use('/api/customers', customersRoutes)
// Warehouses
app.use('/api/warehouses', warehousesRoutes)
// Branches
app.use('/api/branches', branchesRoutes)
// Taxes
app.use('/api/taxes', taxesRoutes)
// Salespersons
app.use('/api/salespersons', salespersonsRoutes)
// Vendors - DISABLED: vendors table doesn't exist
// app.use('/api/vendors', vendorsRoutes)
// Metrics
app.use('/api/metrics', metricsRoutes)

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Open Accounting BFF API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/auth',
      health: '/health',
      organizations: '/api/organizations',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      customers: '/api/customers',
      invoices: '/api/invoices',
      reports: '/api/reports'
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
    method: req.method,
    body: req.body
  })

  // Don't expose error details in production
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
    logger.info('Database initialized successfully')

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 BFF Server running on port ${PORT}`)
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`🔐 CORS origins: ${allowedOrigins.join(', ')}`)
      logger.info(`💾 Database: Connected`)
      logger.info(`🔍 Health check: http://localhost:${PORT}/health`)
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
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

export default app