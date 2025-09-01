"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const tenants_1 = require("./routes/tenants");
const accounts_1 = require("./routes/accounts");
const journal_1 = require("./routes/journal");
const reports_1 = require("./routes/reports");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/tenants', auth_2.authMiddleware, tenants_1.tenantRoutes);
app.use('/api/accounts', auth_2.authMiddleware, accounts_1.accountRoutes);
app.use('/api/journal', auth_2.authMiddleware, journal_1.journalRoutes);
app.use('/api/reports', auth_2.authMiddleware, reports_1.reportRoutes);
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`BFF server running on port ${PORT}`);
    logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map