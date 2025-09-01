"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = void 0;
exports.collectMetrics = collectMetrics;
exports.createMetricsEndpoint = createMetricsEndpoint;
exports.getHealthMetrics = getHealthMetrics;
const logger_1 = require("../utils/logger");
class MetricsCollector {
    constructor() {
        this.metrics = [];
        this.MAX_METRICS = 10000;
        this.requestCounts = new Map();
        this.errorCounts = new Map();
        this.durations = new Map();
    }
    record(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics.splice(0, this.metrics.length - this.MAX_METRICS);
        }
        const key = `${metric.method}:${metric.endpoint}`;
        this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
        if (metric.statusCode >= 400) {
            this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        }
        if (!this.durations.has(key)) {
            this.durations.set(key, []);
        }
        const durations = this.durations.get(key);
        durations.push(metric.duration);
        if (durations.length > 1000) {
            durations.splice(0, durations.length - 1000);
        }
    }
    getMetrics() {
        const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
        const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
        const allDurations = Array.from(this.durations.values()).flat();
        const avgDuration = allDurations.length > 0
            ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
            : 0;
        const endpoints = Array.from(this.requestCounts.entries()).map(([key, requests]) => {
            const [method, endpoint] = key.split(':');
            const errors = this.errorCounts.get(key) || 0;
            const durations = this.durations.get(key) || [];
            const sortedDurations = durations.slice().sort((a, b) => a - b);
            return {
                endpoint,
                method,
                requests,
                errors,
                errorRate: requests > 0 ? (errors / requests) * 100 : 0,
                avgDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
                p95Duration: this.percentile(sortedDurations, 95),
                p99Duration: this.percentile(sortedDurations, 99)
            };
        });
        return {
            summary: {
                totalRequests,
                totalErrors,
                errorRate,
                avgDuration
            },
            endpoints: endpoints.sort((a, b) => b.requests - a.requests),
            recent: this.metrics.slice(-100)
        };
    }
    percentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[index] || 0;
    }
    reset() {
        this.metrics = [];
        this.requestCounts.clear();
        this.errorCounts.clear();
        this.durations.clear();
    }
}
const metricsCollector = new MetricsCollector();
exports.metricsCollector = metricsCollector;
function collectMetrics(req, res, next) {
    const startTime = Date.now();
    const requestId = req.requestId || 'unknown';
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const auth = req.auth;
        metricsCollector.record({
            endpoint: req.route?.path || req.path,
            method: req.method,
            statusCode: res.statusCode,
            duration,
            timestamp: startTime,
            organizationId: auth?.organizationId,
            userId: auth?.userId,
            requestId
        });
        if (duration > 1000) {
            logger_1.logger.warn('Slow request detected', {
                requestId,
                method: req.method,
                path: req.path,
                duration: `${duration}ms`,
                statusCode: res.statusCode,
                organizationId: auth?.organizationId
            });
        }
    });
    next();
}
function createMetricsEndpoint() {
    return (req, res) => {
        const metrics = metricsCollector.getMetrics();
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    };
}
function getHealthMetrics() {
    const metrics = metricsCollector.getMetrics();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = metricsCollector.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const requestsPerMinute = recentRequests.length;
    const recentErrors = recentRequests.filter(m => m.statusCode >= 400);
    const errorRate = recentRequests.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0;
    const avgResponseTime = recentRequests.length > 0
        ? recentRequests.reduce((sum, m) => sum + m.duration, 0) / recentRequests.length
        : 0;
    const recentDurations = recentRequests.map(m => m.duration).sort((a, b) => a - b);
    const p95Duration = metricsCollector.percentile(recentDurations, 95);
    return {
        avgResponseTime,
        errorRate,
        requestsPerMinute,
        p95Duration
    };
}
//# sourceMappingURL=metrics.js.map