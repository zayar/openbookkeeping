import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// =============================================
// PERFORMANCE METRICS COLLECTION
// =============================================

interface MetricData {
  endpoint: string
  method: string
  statusCode: number
  duration: number
  timestamp: number
  organizationId?: string
  userId?: string
  requestId: string
}

class MetricsCollector {
  private metrics: MetricData[] = []
  private readonly MAX_METRICS = 10000 // Prevent memory leaks
  
  // RED Metrics (Rate, Errors, Duration)
  private requestCounts = new Map<string, number>()
  private errorCounts = new Map<string, number>()
  private durations = new Map<string, number[]>()

  record(metric: MetricData) {
    // Store detailed metrics (with rotation)
    this.metrics.push(metric)
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.splice(0, this.metrics.length - this.MAX_METRICS)
    }

    const key = `${metric.method}:${metric.endpoint}`
    
    // Update counters
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1)
    
    if (metric.statusCode >= 400) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1)
    }
    
    // Track duration percentiles
    if (!this.durations.has(key)) {
      this.durations.set(key, [])
    }
    const durations = this.durations.get(key)!
    durations.push(metric.duration)
    
    // Keep only last 1000 durations per endpoint
    if (durations.length > 1000) {
      durations.splice(0, durations.length - 1000)
    }
  }

  getMetrics(): {
    summary: {
      totalRequests: number
      totalErrors: number
      errorRate: number
      avgDuration: number
    }
    endpoints: Array<{
      endpoint: string
      method: string
      requests: number
      errors: number
      errorRate: number
      avgDuration: number
      p95Duration: number
      p99Duration: number
    }>
    recent: MetricData[]
  } {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0)
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

    // Calculate overall average duration
    const allDurations = Array.from(this.durations.values()).flat()
    const avgDuration = allDurations.length > 0 
      ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length 
      : 0

    // Per-endpoint metrics
    const endpoints = Array.from(this.requestCounts.entries()).map(([key, requests]) => {
      const [method, endpoint] = key.split(':')
      const errors = this.errorCounts.get(key) || 0
      const durations = this.durations.get(key) || []
      const sortedDurations = durations.slice().sort((a, b) => a - b)
      
      return {
        endpoint,
        method,
        requests,
        errors,
        errorRate: requests > 0 ? (errors / requests) * 100 : 0,
        avgDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
        p95Duration: this.percentile(sortedDurations, 95),
        p99Duration: this.percentile(sortedDurations, 99)
      }
    })

    return {
      summary: {
        totalRequests,
        totalErrors,
        errorRate,
        avgDuration
      },
      endpoints: endpoints.sort((a, b) => b.requests - a.requests),
      recent: this.metrics.slice(-100) // Last 100 requests
    }
  }

  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[index] || 0
  }

  reset() {
    this.metrics = []
    this.requestCounts.clear()
    this.errorCounts.clear()
    this.durations.clear()
  }
}

// Singleton metrics collector
const metricsCollector = new MetricsCollector()

/**
 * Middleware to collect performance metrics
 */
export function collectMetrics(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  const requestId = req.requestId || 'unknown'
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const auth = (req as any).auth
    
    metricsCollector.record({
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      timestamp: startTime,
      organizationId: auth?.organizationId,
      userId: auth?.userId,
      requestId
    })

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        organizationId: auth?.organizationId
      })
    }
  })
  
  next()
}

/**
 * Metrics endpoint for monitoring
 */
export function createMetricsEndpoint() {
  return (req: Request, res: Response) => {
    const metrics = metricsCollector.getMetrics()
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  }
}

/**
 * Health metrics for readiness checks
 */
export function getHealthMetrics(): {
  avgResponseTime: number
  errorRate: number
  requestsPerMinute: number
  p95Duration: number
} {
  const metrics = metricsCollector.getMetrics()
  const now = Date.now()
  const oneMinuteAgo = now - 60000
  
  // Calculate requests per minute
  const recentRequests = metricsCollector.metrics.filter(m => m.timestamp > oneMinuteAgo)
  const requestsPerMinute = recentRequests.length
  
  // Calculate recent error rate
  const recentErrors = recentRequests.filter(m => m.statusCode >= 400)
  const errorRate = recentRequests.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0
  
  // Calculate recent average response time
  const avgResponseTime = recentRequests.length > 0 
    ? recentRequests.reduce((sum, m) => sum + m.duration, 0) / recentRequests.length
    : 0
  
  // Calculate P95 duration
  const recentDurations = recentRequests.map(m => m.duration).sort((a, b) => a - b)
  const p95Duration = metricsCollector.percentile(recentDurations, 95)

  return {
    avgResponseTime,
    errorRate,
    requestsPerMinute,
    p95Duration
  }
}

export { metricsCollector }
