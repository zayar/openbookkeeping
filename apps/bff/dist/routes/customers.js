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
        const customers = await database_cloud_sql_only_1.prisma.customers.findMany({
            where: { organizationId: req.auth.organizationId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: customers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, displayName, email, phone, mobile, customerType, salutation, firstName, lastName, companyName, billingAddress, shippingAddress, industry, source, priority, companyId, currency, taxRate, paymentTerms, openingBalance, openingBalanceAccount, enablePortal, portalLanguage, tags, notes, remarks } = req.body;
        const customer = await database_cloud_sql_only_1.prisma.customers.create({
            data: {
                organizationId: req.auth.organizationId,
                name,
                displayName,
                email,
                phone,
                mobile,
                customerType: customerType || 'business',
                salutation,
                firstName,
                lastName,
                companyName,
                billingAddress: billingAddress || null,
                shippingAddress: shippingAddress || null,
                industry,
                source,
                priority: priority || 'normal',
                companyId,
                currency: currency || 'MMK',
                taxRate,
                paymentTerms,
                openingBalance: openingBalance ? parseFloat(openingBalance) : null,
                openingBalanceAccount,
                enablePortal: enablePortal || false,
                portalLanguage: portalLanguage || 'English',
                tags: tags || null,
                notes,
                remarks
            }
        });
        res.json({ success: true, data: customer });
    }
    catch (error) {
        const msg = error?.code === 'P2002' ? 'Customer with this email already exists' : 'Failed to create customer';
        res.status(400).json({ success: false, error: msg });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const customer = await database_cloud_sql_only_1.prisma.customers.findFirst({
            where: { id: req.params.id, organizationId: req.auth.organizationId }
        });
        if (!customer)
            return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: customer });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch customer' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, displayName, email, phone, mobile, customerType, salutation, firstName, lastName, companyName, billingAddress, shippingAddress, industry, source, priority, companyId, currency, taxRate, paymentTerms, openingBalance, openingBalanceAccount, enablePortal, portalLanguage, tags, notes, remarks, isActive } = req.body;
        const updated = await database_cloud_sql_only_1.prisma.customers.update({
            where: { id: req.params.id },
            data: {
                name, displayName, email, phone, mobile, customerType, salutation,
                firstName, lastName, companyName, billingAddress, shippingAddress,
                industry, source, priority, companyId, currency, taxRate,
                paymentTerms, openingBalance: openingBalance ? parseFloat(openingBalance) : null,
                openingBalanceAccount, enablePortal, portalLanguage, tags, notes, remarks, isActive
            }
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update customer' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existing = await database_cloud_sql_only_1.prisma.customers.findFirst({ where: { id: req.params.id, organizationId: req.auth.organizationId } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Not found' });
        await database_cloud_sql_only_1.prisma.customers.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete customer' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map