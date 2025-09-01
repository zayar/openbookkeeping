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
        const items = await database_cloud_sql_only_1.prisma.products.findMany({
            where: { organizationId: req.auth.organizationId },
            include: {
                ledger_accounts_products_salesAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                },
                ledger_accounts_products_purchaseAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch items' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, sku, type, description, sellingPrice, costPrice, unit, currency, salesAccountId, purchaseAccountId, category, brand, isActive } = req.body;
        const item = await database_cloud_sql_only_1.prisma.products.create({
            data: {
                id: `item_${Date.now()}`,
                organizationId: req.auth.organizationId,
                name,
                sku,
                type: type || 'goods',
                description,
                sellingPrice: parseFloat(sellingPrice) || 0,
                costPrice: parseFloat(costPrice) || 0,
                unit: type === 'goods' ? unit : null,
                currency: currency || 'MMK',
                salesAccountId,
                purchaseAccountId,
                category,
                brand,
                isActive: isActive !== undefined ? isActive : true,
                currentStock: type === 'goods' ? 0 : null,
                trackInventory: type === 'goods',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                ledger_accounts_products_salesAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                },
                ledger_accounts_products_purchaseAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                }
            }
        });
        res.json({ success: true, data: item });
    }
    catch (error) {
        console.error('Failed to create item:', error);
        res.status(500).json({ success: false, error: 'Failed to create item' });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const item = await database_cloud_sql_only_1.prisma.products.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId },
            include: {
                ledger_accounts_products_salesAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                },
                ledger_accounts_products_purchaseAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                }
            }
        });
        if (!item)
            return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch item' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, sku, type, description, sellingPrice, costPrice, unit, currency, salesAccountId, purchaseAccountId, category, brand, isActive } = req.body;
        const existing = await database_cloud_sql_only_1.prisma.products.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId }
        });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Not found' });
        const item = await database_cloud_sql_only_1.prisma.products.update({
            where: { id: req.params.id },
            data: {
                name,
                sku,
                type: type || existing.type,
                description,
                sellingPrice: parseFloat(sellingPrice) || 0,
                costPrice: parseFloat(costPrice) || 0,
                unit: type === 'goods' ? unit : null,
                currency: currency || existing.currency,
                salesAccountId,
                purchaseAccountId,
                category,
                brand,
                isActive,
                currentStock: type === 'goods' ? (existing.currentStock || 0) : null,
                trackInventory: type === 'goods'
            },
            include: {
                ledger_accounts_products_salesAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                },
                ledger_accounts_products_purchaseAccountIdToledger_accounts: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true
                    }
                }
            }
        });
        res.json({ success: true, data: item });
    }
    catch (error) {
        console.error('Failed to update item:', error);
        res.status(500).json({ success: false, error: 'Failed to update item' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existing = await database_cloud_sql_only_1.prisma.products.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId }
        });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Not found' });
        await database_cloud_sql_only_1.prisma.products.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete item' });
    }
});
exports.default = router;
//# sourceMappingURL=items.js.map