"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.AppError = exports.BFFErrorCode = void 0;
exports.createErrorResponse = createErrorResponse;
exports.enhancedErrorHandler = enhancedErrorHandler;
exports.asyncHandler = asyncHandler;
exports.requireTenantAccess = requireTenantAccess;
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
var BFFErrorCode;
(function (BFFErrorCode) {
    BFFErrorCode["VALIDATION_ERROR"] = "BFF_VALIDATION_ERROR";
    BFFErrorCode["AUTHENTICATION_REQUIRED"] = "BFF_AUTHENTICATION_REQUIRED";
    BFFErrorCode["ACCESS_DENIED"] = "BFF_ACCESS_DENIED";
    BFFErrorCode["RESOURCE_NOT_FOUND"] = "BFF_RESOURCE_NOT_FOUND";
    BFFErrorCode["DUPLICATE_RESOURCE"] = "BFF_DUPLICATE_RESOURCE";
    BFFErrorCode["INVALID_TENANT"] = "BFF_INVALID_TENANT";
    BFFErrorCode["RATE_LIMITED"] = "BFF_RATE_LIMITED";
    BFFErrorCode["INTERNAL_ERROR"] = "BFF_INTERNAL_ERROR";
    BFFErrorCode["DATABASE_ERROR"] = "BFF_DATABASE_ERROR";
    BFFErrorCode["UPSTREAM_TIMEOUT"] = "BFF_UPSTREAM_TIMEOUT";
    BFFErrorCode["UPSTREAM_ERROR"] = "BFF_UPSTREAM_ERROR";
    BFFErrorCode["SERVICE_UNAVAILABLE"] = "BFF_SERVICE_UNAVAILABLE";
    BFFErrorCode["CIRCUIT_BREAKER_OPEN"] = "BFF_CIRCUIT_BREAKER_OPEN";
})(BFFErrorCode || (exports.BFFErrorCode = BFFErrorCode = {}));
class AppError extends Error {
    constructor(message, code, statusCode, details, context) {
        super(message);
        this.isOperational = true;
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.requestId = context?.requestId;
        this.organizationId = context?.organizationId;
        this.userId = context?.userId;
        Error.captureStackTrace(this, AppError);
    }
}
exports.AppError = AppError;
function createErrorResponse(error, requestId) {
    const isBFFError = error instanceof AppError;
    return {
        success: false,
        error: error.message,
        code: isBFFError ? error.code : BFFErrorCode.INTERNAL_ERROR,
        details: isBFFError ? error.details : undefined,
        timestamp: new Date().toISOString(),
        requestId: isBFFError ? error.requestId || requestId : requestId
    };
}
function enhancedErrorHandler(error, req, res, next) {
    const requestId = req.requestId || 'unknown';
    const auth = req.auth;
    const isOperational = error instanceof AppError || error.isOperational;
    const logLevel = isOperational ? 'warn' : 'error';
    logger_1.logger[logLevel]('Request error', {
        requestId,
        organizationId: auth?.organizationId,
        userId: auth?.userId,
        method: req.method,
        path: req.path,
        statusCode: error.statusCode || 500,
        error: error.message,
        code: error.code || BFFErrorCode.INTERNAL_ERROR,
        stack: isOperational ? undefined : error.stack,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    if (error instanceof AppError) {
        return res.status(error.statusCode).json(createErrorResponse(error, requestId));
    }
    if (error.code?.startsWith('P')) {
        const prismaError = mapPrismaError(error, requestId, auth?.organizationId, auth?.userId);
        return res.status(prismaError.statusCode).json(createErrorResponse(prismaError, requestId));
    }
    if (error instanceof zod_1.z.ZodError) {
        const validationError = new AppError('Validation failed', BFFErrorCode.VALIDATION_ERROR, 422, error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
        })), { requestId, organizationId: auth?.organizationId, userId: auth?.userId });
        return res.status(422).json(createErrorResponse(validationError, requestId));
    }
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        const timeoutError = new AppError('Request timeout', BFFErrorCode.UPSTREAM_TIMEOUT, 504, undefined, { requestId, organizationId: auth?.organizationId, userId: auth?.userId });
        return res.status(504).json(createErrorResponse(timeoutError, requestId));
    }
    const internalError = new AppError(process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message, BFFErrorCode.INTERNAL_ERROR, 500, process.env.NODE_ENV === 'production' ? undefined : { stack: error.stack }, { requestId, organizationId: auth?.organizationId, userId: auth?.userId });
    res.status(500).json(createErrorResponse(internalError, requestId));
}
function mapPrismaError(prismaError, requestId, organizationId, userId) {
    const context = { requestId, organizationId, userId };
    switch (prismaError.code) {
        case 'P2002':
            return new AppError('Resource already exists', BFFErrorCode.DUPLICATE_RESOURCE, 409, { constraint: prismaError.meta?.target }, context);
        case 'P2025':
            return new AppError('Resource not found', BFFErrorCode.RESOURCE_NOT_FOUND, 404, undefined, context);
        case 'P2003':
            return new AppError('Invalid reference to related resource', BFFErrorCode.VALIDATION_ERROR, 422, { constraint: prismaError.meta?.field_name }, context);
        case 'P1008':
            return new AppError('Database operation timed out', BFFErrorCode.DATABASE_ERROR, 504, undefined, context);
        case 'P1001':
        case 'P1002':
            return new AppError('Database connection error', BFFErrorCode.SERVICE_UNAVAILABLE, 503, undefined, context);
        default:
            return new AppError('Database operation failed', BFFErrorCode.DATABASE_ERROR, 500, { prismaCode: prismaError.code }, context);
    }
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function requireTenantAccess(resourceOrgIdField = 'organizationId') {
    return async (req, res, next) => {
        const auth = req.auth;
        const resourceOrgId = req.body?.[resourceOrgIdField] || req.params?.[resourceOrgIdField];
        if (!auth?.organizationId) {
            const error = new AppError('Organization context required', BFFErrorCode.INVALID_TENANT, 400, undefined, { requestId: req.requestId });
            return next(error);
        }
        if (resourceOrgId && resourceOrgId !== auth.organizationId) {
            const error = new AppError('Access denied: resource belongs to different organization', BFFErrorCode.ACCESS_DENIED, 403, {
                userOrgId: auth.organizationId,
                resourceOrgId
            }, {
                requestId: req.requestId,
                organizationId: auth.organizationId,
                userId: auth.userId
            });
            return next(error);
        }
        next();
    };
}
//# sourceMappingURL=errorHandler.v2.js.map