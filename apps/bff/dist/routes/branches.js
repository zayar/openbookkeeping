"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jwtAuth_1 = require("../middleware/jwtAuth");
const database_cloud_sql_only_1 = require("../services/database.cloud-sql-only");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.get('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const branches = await database_cloud_sql_only_1.prisma.branches.findMany({
            where: { organizationId: req.auth.organizationId },
            include: {
                _count: {
                    select: {
                        warehouses: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: branches });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch branches:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch branches' });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const branch = await database_cloud_sql_only_1.prisma.branches.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            },
            include: {
                warehouses: true,
                _count: {
                    select: {
                        warehouses: true
                    }
                }
            }
        });
        if (!branch) {
            return res.status(404).json({ success: false, error: 'Branch not found' });
        }
        res.json({ success: true, data: branch });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch branch:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch branch' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, addressLine1, addressLine2, city, state, postalCode, country, phone, email, isDefault } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Branch name is required'
            });
        }
        const branch = await database_cloud_sql_only_1.prisma.branches.create({
            data: {
                id: `br_${Date.now()}`,
                organizationId: req.auth.organizationId,
                name,
                addressLine1,
                addressLine2,
                city,
                state,
                postalCode,
                country: country || 'Myanmar',
                phone,
                email,
                isDefault: isDefault || false,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        logger_1.logger.info(`Branch created: ${branch.name}`);
        res.status(201).json({ success: true, data: branch });
    }
    catch (error) {
        logger_1.logger.error('Failed to create branch:', error);
        res.status(500).json({ success: false, error: 'Failed to create branch' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, addressLine1, addressLine2, city, state, postalCode, country, phone, email, isDefault, isActive } = req.body;
        const existingBranch = await database_cloud_sql_only_1.prisma.branches.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            }
        });
        if (!existingBranch) {
            return res.status(404).json({ success: false, error: 'Branch not found' });
        }
        const branch = await database_cloud_sql_only_1.prisma.branches.update({
            where: { id: req.params.id },
            data: {
                name,
                addressLine1,
                addressLine2,
                city,
                state,
                postalCode,
                country,
                phone,
                email,
                isDefault,
                isActive,
                updatedAt: new Date()
            }
        });
        logger_1.logger.info(`Branch updated: ${branch.name}`);
        res.json({ success: true, data: branch });
    }
    catch (error) {
        logger_1.logger.error('Failed to update branch:', error);
        res.status(500).json({ success: false, error: 'Failed to update branch' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existingBranch = await database_cloud_sql_only_1.prisma.branches.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            }
        });
        if (!existingBranch) {
            return res.status(404).json({ success: false, error: 'Branch not found' });
        }
        const warehouseCount = await database_cloud_sql_only_1.prisma.warehouses.count({
            where: { branchId: req.params.id }
        });
        if (warehouseCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete branch with existing warehouses'
            });
        }
        await database_cloud_sql_only_1.prisma.branches.delete({
            where: { id: req.params.id }
        });
        logger_1.logger.info(`Branch deleted: ${existingBranch.name}`);
        res.json({ success: true, message: 'Branch deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete branch:', error);
        res.status(500).json({ success: false, error: 'Failed to delete branch' });
    }
});
router.patch('/:id/status', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { isActive } = req.body;
        const existingBranch = await database_cloud_sql_only_1.prisma.branches.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            }
        });
        if (!existingBranch) {
            return res.status(404).json({ success: false, error: 'Branch not found' });
        }
        const branch = await database_cloud_sql_only_1.prisma.branches.update({
            where: { id: req.params.id },
            data: {
                isActive: isActive !== undefined ? isActive : !existingBranch.isActive,
                updatedAt: new Date()
            }
        });
        logger_1.logger.info(`Branch status updated: ${branch.name} - ${branch.isActive ? 'Active' : 'Inactive'}`);
        res.json({ success: true, data: branch });
    }
    catch (error) {
        logger_1.logger.error('Failed to update branch status:', error);
        res.status(500).json({ success: false, error: 'Failed to update branch status' });
    }
});
exports.default = router;
//# sourceMappingURL=branches.js.map