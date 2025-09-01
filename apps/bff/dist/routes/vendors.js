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
        const vendors = await database_cloud_sql_only_1.prisma.vendor.findMany({
            where: { organizationId: req.auth.organizationId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: vendors });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch vendors' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, email, phone, vendorType, industry, paymentTerms, taxId, address, notes } = req.body;
        const vendor = await database_cloud_sql_only_1.prisma.vendor.create({
            data: {
                organizationId: req.auth.organizationId,
                name,
                email,
                phone,
                vendorType: vendorType || 'supplier',
                industry,
                paymentTerms: paymentTerms || 'net30',
                taxId,
                address,
                notes
            }
        });
        res.json({ success: true, data: vendor });
    }
    catch (error) {
        const msg = error?.code === 'P2002' ? 'Vendor with this email already exists' : 'Failed to create vendor';
        res.status(400).json({ success: false, error: msg });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const vendor = await database_cloud_sql_only_1.prisma.vendor.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId }
        });
        if (!vendor)
            return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: vendor });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch vendor' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, email, phone, vendorType, industry, paymentTerms, taxId, address, notes, isActive } = req.body;
        const updated = await database_cloud_sql_only_1.prisma.vendor.update({
            where: { id: req.params.id },
            data: { name, email, phone, vendorType, industry, paymentTerms, taxId, address, notes, isActive }
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update vendor' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existing = await database_cloud_sql_only_1.prisma.vendor.findFirst({ where: { id: req.params.id, organizationId: req.auth.organizationId } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Not found' });
        await database_cloud_sql_only_1.prisma.vendor.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete vendor' });
    }
});
exports.default = router;
//# sourceMappingURL=vendors.js.map