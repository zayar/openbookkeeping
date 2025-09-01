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
        const accounts = await database_cloud_sql_only_1.prisma.ledger_accounts.findMany({
            where: { organizationId: req.auth.organizationId },
            orderBy: [{ type: 'asc' }, { code: 'asc' }]
        });
        res.json({ success: true, data: accounts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { code, name, type, description, isActive } = req.body;
        const account = await database_cloud_sql_only_1.prisma.ledger_accounts.create({
            data: {
                organizationId: req.auth.organizationId,
                code,
                name,
                type,
                description,
                isActive: isActive ?? true
            }
        });
        res.json({ success: true, data: account });
    }
    catch (error) {
        const msg = error?.code === 'P2002' ? 'Account code already exists' : 'Failed to create account';
        res.status(400).json({ success: false, error: msg });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const account = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId }
        });
        if (!account)
            return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: account });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch account' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { code, name, type, description, isActive } = req.body;
        const updated = await database_cloud_sql_only_1.prisma.ledger_accounts.update({
            where: { id: req.params.id },
            data: { code, name, type, description, isActive }
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update account' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existing = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({ where: { id: req.params.id, organizationId: req.auth.organizationId } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Not found' });
        await database_cloud_sql_only_1.prisma.ledger_accounts.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
});
exports.default = router;
//# sourceMappingURL=accounts.js.map