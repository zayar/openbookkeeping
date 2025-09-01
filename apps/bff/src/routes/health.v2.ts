import express from 'express'
import { EnhancedHealthService } from '../services/database.v2'
import { oaClient } from '../services/oaClient.v2'
import { getHealthMetrics, createMetricsEndpoint } from '../middleware/metrics'
import { logger } from '../utils/logger'

const router = express.Router()

// =============================================
// ENHANCED HEALTH CHECK ENDPOINTS
// =============================================

/**
 * Comprehensive health check
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await EnhancedHealthService.getSystemHealth()
    const statusCode = health.status === 'healthy' ? 200 : 503
    
    res.status(statusCode).json(health)
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Kubernetes-style readiness probe
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    const [systemHealth, performanceMetrics] = await Promise.all([
      EnhancedHealthService.getSystemHealth(),
      Promise.resolve(getHealthMetrics())
    ])

    const isReady = systemHealth.status === 'healthy' && 
                   performanceMetrics.errorRate < 10 && // Less than 10% errors
                   performanceMetrics.p95Duration < 2000 // P95 under 2s

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        checks: systemHealth.checks,
        performance: performanceMetrics,
        timestamp: new Date().toISOString()
      })
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: systemHealth.status !== 'healthy' ? 'system unhealthy' : 'performance degraded',
        checks: systemHealth.checks,
        performance: performanceMetrics,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    logger.error('Readiness check failed:', error)
    res.status(503).json({
      status: 'not ready',
      error: 'Readiness check failed',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Kubernetes-style liveness probe
 * GET /health/live
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

/**
 * Deep health check with external dependencies
 * GET /health/deep
 */
router.get('/deep', async (req, res) => {
  const startTime = Date.now()
  const requestId = req.requestId || 'health-check'

  try {
    logger.info('Deep health check initiated', { requestId })

    // Check all dependencies in parallel
    const [dbHealth, oaHealth, circuitBreakerStatus] = await Promise.all([
      EnhancedHealthService.getSystemHealth(),
      oaClient.healthCheck(requestId),
      Promise.resolve(oaClient.getCircuitBreakerStatus())
    ])

    const duration = Date.now() - startTime
    const allHealthy = dbHealth.status === 'healthy' && oaHealth.success

    const result = {
      status: allHealthy ? 'healthy' : 'degraded',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      requestId,
      checks: {
        bffDatabase: {
          healthy: dbHealth.checks.bffDatabase,
          latency: dbHealth.checks.bffDatabase ? `${duration}ms` : undefined
        },
        oaServer: {
          healthy: oaHealth.success,
          latency: `${oaHealth.duration}ms`,
          status: oaHealth.status
        },
        circuitBreakers: circuitBreakerStatus
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      }
    }

    const statusCode = allHealthy ? 200 : 503
    res.status(statusCode).json(result)

    logger.info('Deep health check completed', {
      requestId,
      status: result.status,
      duration: `${duration}ms`
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('Deep health check failed', {
      requestId,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    res.status(503).json({
      status: 'unhealthy',
      error: 'Deep health check failed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      requestId
    })
  }
})

/**
 * Performance metrics endpoint
 * GET /metrics
 */
router.get('/metrics', createMetricsEndpoint())

/**
 * Circuit breaker status endpoint
 * GET /health/circuit-breakers
 */
router.get('/circuit-breakers', (req, res) => {
  try {
    const status = oaClient.getCircuitBreakerStatus()
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker status',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  }
})

export default router

// Export error utilities
export { AppError, BFFErrorCode, createErrorResponse }
