"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
exports.requestContext = requestContext;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
function validateBody(schema) {
    return (req, res, next) => {
        const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
        req.requestId = requestId;
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                logger_1.logger.warn('Request body validation failed', {
                    requestId,
                    path: req.path,
                    method: req.method,
                    errors: result.error.errors,
                    body: req.body
                });
                return res.status(422).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'BFF_VALIDATION_ERROR',
                    details: result.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code
                    })),
                    requestId
                });
            }
            req.body = result.data;
            req.validatedAt = new Date();
            next();
        }
        catch (error) {
            logger_1.logger.error('Validation middleware error', {
                requestId,
                path: req.path,
                method: req.method,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Internal validation error',
                code: 'BFF_INTERNAL_ERROR',
                requestId
            });
        }
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const requestId = req.requestId || (0, uuid_1.v4)();
        req.requestId = requestId;
        try {
            const result = schema.safeParse(req.query);
            if (!result.success) {
                logger_1.logger.warn('Query validation failed', {
                    requestId,
                    path: req.path,
                    method: req.method,
                    errors: result.error.errors,
                    query: req.query
                });
                return res.status(422).json({
                    success: false,
                    error: 'Invalid query parameters',
                    code: 'BFF_VALIDATION_ERROR',
                    details: result.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code
                    })),
                    requestId
                });
            }
            req.query = result.data;
            next();
        }
        catch (error) {
            logger_1.logger.error('Query validation middleware error', {
                requestId,
                path: req.path,
                method: req.method,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Internal validation error',
                code: 'BFF_INTERNAL_ERROR',
                requestId
            });
        }
    };
}
function validateParams(schema) {
    return (req, res, next) => {
        const requestId = req.requestId || (0, uuid_1.v4)();
        req.requestId = requestId;
        try {
            const result = schema.safeParse(req.params);
            if (!result.success) {
                logger_1.logger.warn('Params validation failed', {
                    requestId,
                    path: req.path,
                    method: req.method,
                    errors: result.error.errors,
                    params: req.params
                });
                return res.status(422).json({
                    success: false,
                    error: 'Invalid route parameters',
                    code: 'BFF_VALIDATION_ERROR',
                    details: result.error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code
                    })),
                    requestId
                });
            }
            req.params = result.data;
            next();
        }
        catch (error) {
            logger_1.logger.error('Params validation middleware error', {
                requestId,
                path: req.path,
                method: req.method,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Internal validation error',
                code: 'BFF_INTERNAL_ERROR',
                requestId
            });
        }
    };
}
function requestContext(req, res, next) {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    const startTime = Date.now();
    req.requestId = requestId;
    req.startTime = startTime;
    res.setHeader('X-Request-ID', requestId);
    logger_1.logger.info('Request started', {
        requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        logger_1.logger[logLevel]('Request completed', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });
    next();
}
//# sourceMappingURL=validation.js.map