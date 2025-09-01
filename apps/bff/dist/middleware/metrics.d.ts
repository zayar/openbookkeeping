import { Request, Response, NextFunction } from 'express';
interface MetricData {
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    timestamp: number;
    organizationId?: string;
    userId?: string;
    requestId: string;
}
declare class MetricsCollector {
    private metrics;
    private readonly MAX_METRICS;
    private requestCounts;
    private errorCounts;
    private durations;
    record(metric: MetricData): void;
    getMetrics(): {
        summary: {
            totalRequests: number;
            totalErrors: number;
            errorRate: number;
            avgDuration: number;
        };
        endpoints: Array<{
            endpoint: string;
            method: string;
            requests: number;
            errors: number;
            errorRate: number;
            avgDuration: number;
            p95Duration: number;
            p99Duration: number;
        }>;
        recent: MetricData[];
    };
    private percentile;
    reset(): void;
}
declare const metricsCollector: MetricsCollector;
export declare function collectMetrics(req: Request, res: Response, next: NextFunction): void;
export declare function createMetricsEndpoint(): (req: Request, res: Response) => void;
export declare function getHealthMetrics(): {
    avgResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    p95Duration: number;
};
export { metricsCollector };
//# sourceMappingURL=metrics.d.ts.map