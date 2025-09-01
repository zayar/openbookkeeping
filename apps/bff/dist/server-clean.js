"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
console.log(`[${new Date().toISOString()}] 🚀 Starting clean BFF server...`);
const database_cloud_sql_only_1 = require("./services/database.cloud-sql-only");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
app.get('/health', async (req, res) => {
    try {
        const result = await database_cloud_sql_only_1.prisma.$queryRaw `SELECT 1 as health, NOW() as timestamp`;
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            query_result: result
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Database error'
        });
    }
});
app.get('/', (req, res) => {
    res.json({
        message: 'BFF Server Running (Cloud SQL)',
        timestamp: new Date().toISOString(),
        database: '34.173.128.29:3306',
        version: '1.0.0'
    });
});
app.get('/api/accounts', async (req, res) => {
    try {
        console.log('📊 Querying ledger_accounts...');
        const accounts = await database_cloud_sql_only_1.prisma.ledger_accounts.findMany({
            take: 5,
            select: {
                id: true,
                code: true,
                name: true,
                type: true
            }
        });
        res.json({
            success: true,
            data: accounts,
            count: accounts.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Accounts query error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Database error'
        });
    }
});
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await database_cloud_sql_only_1.prisma.$queryRaw `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'cashflowdb'
      ORDER BY table_name
    `;
        res.json({
            success: true,
            tables: tables,
            count: Array.isArray(tables) ? tables.length : 0
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Database error'
        });
    }
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});
async function startServer() {
    try {
        console.log('🔍 Testing database connection...');
        await database_cloud_sql_only_1.prisma.$queryRaw `SELECT 1`;
        console.log('✅ Database connection successful');
        const server = app.listen(PORT, () => {
            console.log(`🎉 BFF Server running on port ${PORT}`);
            console.log(`🔗 Health: http://localhost:${PORT}/health`);
            console.log(`📊 Accounts: http://localhost:${PORT}/api/accounts`);
            console.log(`📋 Tables: http://localhost:${PORT}/api/tables`);
            console.log(`💾 Database: Cloud SQL (34.173.128.29)`);
        });
        process.on('SIGTERM', () => {
            console.log('🛑 Shutting down gracefully...');
            server.close(async () => {
                await database_cloud_sql_only_1.prisma.$disconnect();
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server-clean.js.map