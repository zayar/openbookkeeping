import { Request, Response, NextFunction } from 'express';
export declare enum BFFErrorCode {
    VALIDATION_ERROR = "BFF_VALIDATION_ERROR",
    AUTHENTICATION_REQUIRED = "BFF_AUTHENTICATION_REQUIRED",
    ACCESS_DENIED = "BFF_ACCESS_DENIED",
    RESOURCE_NOT_FOUND = "BFF_RESOURCE_NOT_FOUND",
    DUPLICATE_RESOURCE = "BFF_DUPLICATE_RESOURCE",
    INVALID_TENANT = "BFF_INVALID_TENANT",
    RATE_LIMITED = "BFF_RATE_LIMITED",
    INTERNAL_ERROR = "BFF_INTERNAL_ERROR",
    DATABASE_ERROR = "BFF_DATABASE_ERROR",
    UPSTREAM_TIMEOUT = "BFF_UPSTREAM_TIMEOUT",
    UPSTREAM_ERROR = "BFF_UPSTREAM_ERROR",
    SERVICE_UNAVAILABLE = "BFF_SERVICE_UNAVAILABLE",
    CIRCUIT_BREAKER_OPEN = "BFF_CIRCUIT_BREAKER_OPEN"
}
export interface BFFError extends Error {
    code: BFFErrorCode;
    statusCode: number;
    details?: any;
    requestId?: string;
    organizationId?: string;
    userId?: string;
    isOperational: boolean;
}
export declare class AppError extends Error implements BFFError {
    readonly code: BFFErrorCode;
    readonly statusCode: number;
    readonly details?: any;
    readonly requestId?: string;
    readonly organizationId?: string;
    readonly userId?: string;
    readonly isOperational = true;
    constructor(message: string, code: BFFErrorCode, statusCode: number, details?: any, context?: {
        requestId?: string;
        organizationId?: string;
        userId?: string;
    });
}
export declare function createErrorResponse(error: BFFError | Error, requestId?: string): {
    success: false;
    error: string;
    code: string;
    details?: any;
    timestamp: string;
    requestId?: string;
};
export declare function enhancedErrorHandler(error: any, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireTenantAccess(resourceOrgIdField?: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export { metricsCollector };
//# sourceMappingURL=errorHandler.v2.d.ts.map