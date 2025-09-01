"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jwtAuth_1 = require("../middleware/jwtAuth");
const database_cloud_sql_only_1 = require("../services/database.cloud-sql-only");
const router = express_1.default.Router();
router.get('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const organizationId = req.auth.organizationId;
        const [accountsCount] = await Promise.all([
            database_cloud_sql_only_1.prisma.ledger_accounts.count({ where: { organizationId } })
        ]);
        res.json({
            success: true,
            data: {
                itemsCount: 0,
                accountsCount,
                bankAccountsCount: 0,
                customersCount: 0,
                vendorsCount: 0
            }
        });
    }
    catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ success: false, error: 'Failed to load metrics' });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map