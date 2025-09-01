"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorResponse = exports.BFFErrorCode = exports.AppError = void 0;
const express_1 = __importDefault(require("express"));
const database_v2_1 = require("../services/database.v2");
const oaClient_v2_1 = require("../services/oaClient.v2");
const metrics_1 = require("../middleware/metrics");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.get('/health', async (req, res) => {
    try {
        const health = await database_v2_1.EnhancedHealthService.getSystemHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/ready', async (req, res) => {
    try {
        const [systemHealth, performanceMetrics] = await Promise.all([
            database_v2_1.EnhancedHealthService.getSystemHealth(),
            Promise.resolve((0, metrics_1.getHealthMetrics)())
        ]);
        const isReady = systemHealth.status === 'healthy' &&
            performanceMetrics.errorRate < 10 &&
            performanceMetrics.p95Duration < 2000;
        if (isReady) {
            res.status(200).json({
                status: 'ready',
                checks: systemHealth.checks,
                performance: performanceMetrics,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(503).json({
                status: 'not ready',
                reason: systemHealth.status !== 'healthy' ? 'system unhealthy' : 'performance degraded',
                checks: systemHealth.checks,
                performance: performanceMetrics,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            error: 'Readiness check failed',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});
router.get('/deep', async (req, res) => {
    const startTime = Date.now();
    const requestId = req.requestId || 'health-check';
    try {
        logger_1.logger.info('Deep health check initiated', { requestId });
        const [dbHealth, oaHealth, circuitBreakerStatus] = await Promise.all([
            database_v2_1.EnhancedHealthService.getSystemHealth(),
            oaClient_v2_1.oaClient.healthCheck(requestId),
            Promise.resolve(oaClient_v2_1.oaClient.getCircuitBreakerStatus())
        ]);
        const duration = Date.now() - startTime;
        const allHealthy = dbHealth.status === 'healthy' && oaHealth.success;
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
        };
        const statusCode = allHealthy ? 200 : 503;
        res.status(statusCode).json(result);
        logger_1.logger.info('Deep health check completed', {
            requestId,
            status: result.status,
            duration: `${duration}ms`
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.logger.error('Deep health check failed', {
            requestId,
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(503).json({
            status: 'unhealthy',
            error: 'Deep health check failed',
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
});
router.get('/metrics', (0, metrics_1.createMetricsEndpoint)());
router.get('/circuit-breakers', (req, res) => {
    try {
        const status = oaClient_v2_1.oaClient.getCircuitBreakerStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get circuit breaker status',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.v2.js.map