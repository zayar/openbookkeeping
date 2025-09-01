"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const logger_1 = require("./utils/logger");
const database_cloud_sql_only_1 = require("./services/database.cloud-sql-only");
const auth_1 = __importDefault(require("./routes/auth"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', process.env.NODE_ENV === 'production');
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.FRONTEND_URL
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        logger_1.logger[logLevel](`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    next();
});
app.get('/health', async (req, res) => {
    try {
        const health = await database_cloud_sql_only_1.HealthService.getSystemHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: 'Health check failed'
        });
    }
});
app.get('/health/ready', async (req, res) => {
    try {
        const health = await database_cloud_sql_only_1.HealthService.getSystemHealth();
        if (health.status === 'healthy') {
            res.status(200).json({ status: 'ready' });
        }
        else {
            res.status(503).json({ status: 'not ready', details: health });
        }
    }
    catch (error) {
        logger_1.logger.error('Readiness check failed:', error);
        res.status(503).json({ status: 'not ready', error: 'Readiness check failed' });
    }
});
app.get('/health/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.get('/', (req, res) => {
    res.json({
        message: 'Open Accounting BFF API (Cloud SQL Only)',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: 'Cloud SQL at 34.173.128.29',
        timestamp: new Date().toISOString()
    });
});
app.use('/auth', auth_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/metrics', metrics_1.default);
app.get('/api', (req, res) => {
    res.json({
        name: 'Open Accounting BFF API (Cloud SQL Only)',
        version: '1.0.0',
        database: 'Cloud SQL Connected',
        endpoints: {
            auth: '/auth',
            health: '/health',
            accounts: '/api/accounts',
            metrics: '/api/metrics'
        }
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(error.status || 500).json({
        success: false,
        error: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
    });
});
async function startServer() {
    try {
        await (0, database_cloud_sql_only_1.initializeDatabase)();
        logger_1.logger.info('✅ Cloud SQL database initialized successfully');
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`🚀 BFF Server running on port ${PORT}`);
            logger_1.logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`🔐 CORS origins: ${allowedOrigins.join(', ')}`);
            logger_1.logger.info(`💾 Database: Cloud SQL Connected (34.173.128.29)`);
            logger_1.logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
            logger_1.logger.info(`🎯 API: http://localhost:${PORT}/api`);
            logger_1.logger.info(`🔑 Auth: http://localhost:${PORT}/auth`);
            logger_1.logger.info(`📊 Accounts: http://localhost:${PORT}/api/accounts`);
        });
        const gracefulShutdown = (signal) => {
            logger_1.logger.info(`Received ${signal}, shutting down gracefully`);
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
            setTimeout(() => {
                logger_1.logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=server-working.js.map