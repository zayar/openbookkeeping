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
        const warehouses = await database_cloud_sql_only_1.prisma.warehouses.findMany({
            where: { organizationId: req.auth.organizationId },
            include: {
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: warehouses });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch warehouses:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch warehouses' });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const warehouse = await database_cloud_sql_only_1.prisma.warehouses.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            },
            include: {
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        if (!warehouse) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }
        res.json({ success: true, data: warehouse });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch warehouse:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch warehouse' });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, code, branchId, address, city, state, postalCode, country, phone, email, isDefault } = req.body;
        if (!name || !branchId) {
            return res.status(400).json({
                success: false,
                error: 'Name and branch ID are required'
            });
        }
        const warehouse = await database_cloud_sql_only_1.prisma.warehouses.create({
            data: {
                id: `wh_${Date.now()}`,
                organizationId: req.auth.organizationId,
                branchId,
                name,
                code,
                address,
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
            },
            include: {
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        logger_1.logger.info(`Warehouse created: ${warehouse.name}`);
        res.status(201).json({ success: true, data: warehouse });
    }
    catch (error) {
        logger_1.logger.error('Failed to create warehouse:', error);
        res.status(500).json({ success: false, error: 'Failed to create warehouse' });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const { name, code, branchId, address, city, state, postalCode, country, phone, email, isDefault, isActive } = req.body;
        const existingWarehouse = await database_cloud_sql_only_1.prisma.warehouses.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            }
        });
        if (!existingWarehouse) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }
        const warehouse = await database_cloud_sql_only_1.prisma.warehouses.update({
            where: { id: req.params.id },
            data: {
                name,
                code,
                branchId,
                address,
                city,
                state,
                postalCode,
                country,
                phone,
                email,
                isDefault,
                isActive,
                updatedAt: new Date()
            },
            include: {
                branches: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        logger_1.logger.info(`Warehouse updated: ${warehouse.name}`);
        res.json({ success: true, data: warehouse });
    }
    catch (error) {
        logger_1.logger.error('Failed to update warehouse:', error);
        res.status(500).json({ success: false, error: 'Failed to update warehouse' });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const existingWarehouse = await database_cloud_sql_only_1.prisma.warehouses.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.auth.organizationId
            }
        });
        if (!existingWarehouse) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }
        await database_cloud_sql_only_1.prisma.warehouses.delete({
            where: { id: req.params.id }
        });
        logger_1.logger.info(`Warehouse deleted: ${existingWarehouse.name}`);
        res.json({ success: true, message: 'Warehouse deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete warehouse:', error);
        res.status(500).json({ success: false, error: 'Failed to delete warehouse' });
    }
});
router.post('/:id/set-default', jwtAuth_1.requireJwtAuth, async (req, res) => {
    try {
        const organizationId = req.auth.organizationId;
        await database_cloud_sql_only_1.prisma.warehouses.updateMany({
            where: { organizationId },
            data: { isDefault: false }
        });
        const warehouse = await database_cloud_sql_only_1.prisma.warehouses.update({
            where: { id: req.params.id },
            data: { isDefault: true, updatedAt: new Date() }
        });
        logger_1.logger.info(`Warehouse set as default: ${warehouse.name}`);
        res.json({ success: true, data: warehouse });
    }
    catch (error) {
        logger_1.logger.error('Failed to set warehouse as default:', error);
        res.status(500).json({ success: false, error: 'Failed to set warehouse as default' });
    }
});
exports.default = router;
//# sourceMappingURL=warehouses.js.map