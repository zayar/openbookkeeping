"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    logger_1.logger.error('Error occurred', {
        error: message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    const responseMessage = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : message;
    res.status(statusCode).json({
        error: responseMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};
exports.errorHandler = errorHandler;
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
//# sourceMappingURL=errorHandler.js.map