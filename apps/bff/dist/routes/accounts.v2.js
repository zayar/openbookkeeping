"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jwtAuth_1 = require("../middleware/jwtAuth");
const validation_1 = require("../middleware/validation");
const accounts_1 = require("../schemas/accounts");
const common_1 = require("../schemas/common");
const database_cloud_sql_only_1 = require("../services/database.cloud-sql-only");
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const router = express_1.default.Router();
router.use(validation_1.requestContext);
router.get('/', jwtAuth_1.requireJwtAuth, (0, validation_1.validateQuery)(accounts_1.ListAccountsQuerySchema), async (req, res) => {
    const { organizationId } = req.auth;
    const { page, limit, type, search, isActive, sortBy, sortOrder } = req.query;
    const { requestId } = req;
    try {
        const where = { organizationId };
        if (type)
            where.type = type;
        if (isActive !== undefined)
            where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
                { description: { contains: search } }
            ];
        }
        const offset = (page - 1) * limit;
        const [accounts, total] = await Promise.all([
            database_cloud_sql_only_1.prisma.ledger_accounts.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip: offset
            }),
            database_cloud_sql_only_1.prisma.ledger_accounts.count({ where })
        ]);
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;
        logger_1.logger.info('Accounts listed successfully', {
            requestId,
            organizationId,
            count: accounts.length,
            total,
            page,
            limit
        });
        res.json({
            success: true,
            data: accounts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext,
                hasPrev
            },
            timestamp: new Date().toISOString(),
            requestId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list accounts', {
            requestId,
            organizationId,
            error: error instanceof Error ? error.message : 'Unknown error',
            query: req.query
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch accounts',
            code: 'BFF_DATABASE_ERROR',
            requestId
        });
    }
});
router.post('/', jwtAuth_1.requireJwtAuth, (0, validation_1.validateBody)(accounts_1.CreateAccountRequestSchema), async (req, res) => {
    const { organizationId } = req.auth;
    const { requestId } = req;
    const accountData = req.body;
    try {
        const existingAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
            where: {
                organizationId,
                code: accountData.code
            }
        });
        if (existingAccount) {
            return res.status(409).json({
                success: false,
                error: 'Account code already exists in this organization',
                code: 'BFF_DUPLICATE_ACCOUNT_CODE',
                requestId
            });
        }
        const account = await database_cloud_sql_only_1.prisma.ledger_accounts.create({
            data: {
                ...accountData,
                organizationId,
                isActive: accountData.isActive ?? true
            }
        });
        logger_1.logger.info('Account created successfully', {
            requestId,
            organizationId,
            accountId: account.id,
            accountCode: account.code
        });
        res.status(201).json({
            success: true,
            data: account,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create account', {
            requestId,
            organizationId,
            error: error instanceof Error ? error.message : 'Unknown error',
            accountData
        });
        if (error instanceof Error && 'code' in error) {
            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Account code already exists',
                    code: 'BFF_DUPLICATE_ACCOUNT_CODE',
                    requestId
                });
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create account',
            code: 'BFF_DATABASE_ERROR',
            requestId
        });
    }
});
router.get('/:id', jwtAuth_1.requireJwtAuth, (0, validation_1.validateParams)(zod_1.z.object({ id: common_1.CuidSchema })), async (req, res) => {
    const { organizationId } = req.auth;
    const { id } = req.params;
    const { requestId } = req;
    try {
        const account = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
            where: {
                id,
                organizationId
            }
        });
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Account not found',
                code: 'BFF_RESOURCE_NOT_FOUND',
                requestId
            });
        }
        logger_1.logger.info('Account retrieved successfully', {
            requestId,
            organizationId,
            accountId: account.id
        });
        res.json({
            success: true,
            data: account,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get account', {
            requestId,
            organizationId,
            accountId: id,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch account',
            code: 'BFF_DATABASE_ERROR',
            requestId
        });
    }
});
router.put('/:id', jwtAuth_1.requireJwtAuth, (0, validation_1.validateParams)(zod_1.z.object({ id: common_1.CuidSchema })), (0, validation_1.validateBody)(accounts_1.UpdateAccountRequestSchema), async (req, res) => {
    const { organizationId } = req.auth;
    const { id } = req.params;
    const { requestId } = req;
    const updates = req.body;
    try {
        const existingAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
            where: {
                id,
                organizationId
            }
        });
        if (!existingAccount) {
            return res.status(404).json({
                success: false,
                error: 'Account not found or access denied',
                code: 'BFF_RESOURCE_NOT_FOUND',
                requestId
            });
        }
        if (updates.code && updates.code !== existingAccount.code) {
            const duplicateAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
                where: {
                    organizationId,
                    code: updates.code,
                    id: { not: id }
                }
            });
            if (duplicateAccount) {
                return res.status(409).json({
                    success: false,
                    error: 'Account code already exists in this organization',
                    code: 'BFF_DUPLICATE_ACCOUNT_CODE',
                    requestId
                });
            }
        }
        const updatedAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.update({
            where: {
                id,
                organizationId
            },
            data: updates
        });
        logger_1.logger.info('Account updated successfully', {
            requestId,
            organizationId,
            accountId: id,
            updates: Object.keys(updates)
        });
        res.json({
            success: true,
            data: updatedAccount,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update account', {
            requestId,
            organizationId,
            accountId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
            updates
        });
        res.status(500).json({
            success: false,
            error: 'Failed to update account',
            code: 'BFF_DATABASE_ERROR',
            requestId
        });
    }
});
router.delete('/:id', jwtAuth_1.requireJwtAuth, (0, validation_1.validateParams)(zod_1.z.object({ id: common_1.CuidSchema })), async (req, res) => {
    const { organizationId } = req.auth;
    const { id } = req.params;
    const { requestId } = req;
    try {
        const existingAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
            where: {
                id,
                organizationId
            }
        });
        if (!existingAccount) {
            return res.status(404).json({
                success: false,
                error: 'Account not found or access denied',
                code: 'BFF_RESOURCE_NOT_FOUND',
                requestId
            });
        }
        await database_cloud_sql_only_1.prisma.ledger_accounts.delete({
            where: {
                id,
                organizationId
            }
        });
        logger_1.logger.info('Account deleted successfully', {
            requestId,
            organizationId,
            accountId: id,
            accountCode: existingAccount.code
        });
        res.json({
            success: true,
            message: 'Account deleted successfully',
            timestamp: new Date().toISOString(),
            requestId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete account', {
            requestId,
            organizationId,
            accountId: id,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: 'Failed to delete account',
            code: 'BFF_DATABASE_ERROR',
            requestId
        });
    }
});
exports.default = router;
//# sourceMappingURL=accounts.v2.js.map