"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jwtAuth_1 = require("../middleware/jwtAuth");
const validation_1 = require("../middleware/validation");
const metrics_1 = require("../middleware/metrics");
const errorHandler_v2_1 = require("../middleware/errorHandler.v2");
const accounts_1 = require("../schemas/accounts");
const common_1 = require("../schemas/common");
const database_cloud_sql_only_1 = require("../services/database.cloud-sql-only");
const auditService_1 = require("../services/auditService");
const cache_1 = require("../services/cache");
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const router = express_1.default.Router();
router.use(validation_1.requestContext);
router.use(metrics_1.collectMetrics);
router.get('/', jwtAuth_1.requireJwtAuth, (0, validation_1.validateQuery)(accounts_1.ListAccountsQuerySchema), (0, errorHandler_v2_1.asyncHandler)(async (req, res) => {
    const { organizationId, userId } = req.auth;
    const { page, limit, type, search, isActive, sortBy, sortOrder } = req.query;
    const { requestId } = req;
    const cacheKey = `accounts:list:${JSON.stringify({ page, limit, type, search, isActive, sortBy, sortOrder })}`;
    const cachedResult = await cache_1.cacheService.get(cacheKey, { organizationId });
    if (cachedResult) {
        logger_1.logger.info('Accounts list served from cache', {
            requestId,
            organizationId,
            cacheKey
        });
        return res.json({
            ...cachedResult,
            requestId,
            cached: true
        });
    }
    const where = { organizationId };
    if (type)
        where.type = type;
    if (isActive !== undefined)
        where.isActive = isActive;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
        ];
    }
    const offset = (page - 1) * limit;
    const [accounts, total] = await Promise.all([
        database_cloud_sql_only_1.prisma.ledger_accounts.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            take: limit,
            skip: offset,
            select: {
                id: true,
                organizationId: true,
                code: true,
                name: true,
                type: true,
                description: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        }),
        database_cloud_sql_only_1.prisma.ledger_accounts.count({ where })
    ]);
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    const result = {
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
        timestamp: new Date().toISOString()
    };
    await cache_1.cacheService.set(cacheKey, result, {
        organizationId,
        ttl: 300,
        tags: ['accounts', 'accounts:list']
    });
    logger_1.logger.info('Accounts listed successfully', {
        requestId,
        organizationId,
        count: accounts.length,
        total,
        page,
        limit,
        cached: false
    });
    res.json({
        ...result,
        requestId
    });
}));
router.post('/', jwtAuth_1.requireJwtAuth, (0, validation_1.validateBody)(accounts_1.CreateAccountRequestSchema), (0, errorHandler_v2_1.asyncHandler)(async (req, res) => {
    const { organizationId, userId } = req.auth;
    const { requestId } = req;
    const accountData = req.body;
    const existingAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
        where: {
            organizationId,
            code: accountData.code
        }
    });
    if (existingAccount) {
        throw new errorHandler_v2_1.AppError('Account code already exists in this organization', errorHandler_v2_1.BFFErrorCode.DUPLICATE_RESOURCE, 409, { existingAccountId: existingAccount.id }, { requestId, organizationId, userId });
    }
    const account = await database_cloud_sql_only_1.prisma.ledger_accounts.create({
        data: {
            ...accountData,
            organizationId,
            isActive: accountData.isActive ?? true
        }
    });
    await cache_1.cacheService.invalidateByTags(['accounts', 'accounts:list'], organizationId);
    await auditService_1.AuditService.log({
        organizationId,
        userId,
        action: 'CREATE',
        resource: 'account',
        resourceId: account.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        newValues: accountData,
        requestId
    });
    logger_1.logger.info('Account created successfully', {
        requestId,
        organizationId,
        userId,
        accountId: account.id,
        accountCode: account.code
    });
    res.status(201).json({
        success: true,
        data: account,
        timestamp: new Date().toISOString(),
        requestId
    });
}));
router.get('/:id', jwtAuth_1.requireJwtAuth, (0, validation_1.validateParams)(zod_1.z.object({ id: common_1.CuidSchema })), (0, errorHandler_v2_1.asyncHandler)(async (req, res) => {
    const { organizationId, userId } = req.auth;
    const { id } = req.params;
    const { requestId } = req;
    const cacheKey = `accounts:detail:${id}`;
    const cachedAccount = await cache_1.cacheService.get(cacheKey, { organizationId });
    if (cachedAccount) {
        logger_1.logger.info('Account served from cache', {
            requestId,
            organizationId,
            accountId: id
        });
        return res.json({
            success: true,
            data: cachedAccount,
            timestamp: new Date().toISOString(),
            requestId,
            cached: true
        });
    }
    const account = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
        where: {
            id,
            organizationId
        }
    });
    if (!account) {
        throw new errorHandler_v2_1.AppError('Account not found', errorHandler_v2_1.BFFErrorCode.RESOURCE_NOT_FOUND, 404, undefined, { requestId, organizationId, userId });
    }
    await cache_1.cacheService.set(cacheKey, account, {
        organizationId,
        ttl: 600,
        tags: ['accounts', `account:${id}`]
    });
    logger_1.logger.info('Account retrieved successfully', {
        requestId,
        organizationId,
        userId,
        accountId: account.id
    });
    res.json({
        success: true,
        data: account,
        timestamp: new Date().toISOString(),
        requestId
    });
}));
router.put('/:id', jwtAuth_1.requireJwtAuth, (0, validation_1.validateParams)(zod_1.z.object({ id: common_1.CuidSchema })), (0, validation_1.validateBody)(accounts_1.UpdateAccountRequestSchema), (0, errorHandler_v2_1.asyncHandler)(async (req, res) => {
    const { organizationId, userId } = req.auth;
    const { id } = req.params;
    const { requestId } = req;
    const updates = req.body;
    const existingAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
        where: {
            id,
            organizationId
        }
    });
    if (!existingAccount) {
        throw new errorHandler_v2_1.AppError('Account not found or access denied', errorHandler_v2_1.BFFErrorCode.RESOURCE_NOT_FOUND, 404, undefined, { requestId, organizationId, userId });
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
            throw new errorHandler_v2_1.AppError('Account code already exists in this organization', errorHandler_v2_1.BFFErrorCode.DUPLICATE_RESOURCE, 409, { existingAccountId: duplicateAccount.id }, { requestId, organizationId, userId });
        }
    }
    const updatedAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.update({
        where: {
            id,
            organizationId
        },
        data: {
            ...updates,
            updatedAt: new Date()
        }
    });
    await Promise.all([
        cache_1.cacheService.delete(`accounts:detail:${id}`, { organizationId }),
        cache_1.cacheService.invalidateByTags(['accounts', 'accounts:list'], organizationId)
    ]);
    await auditService_1.AuditService.log({
        organizationId,
        userId,
        action: 'UPDATE',
        resource: 'account',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        oldValues: existingAccount,
        newValues: updates,
        requestId
    });
    logger_1.logger.info('Account updated successfully', {
        requestId,
        organizationId,
        userId,
        accountId: id,
        updates: Object.keys(updates)
    });
    res.json({
        success: true,
        data: updatedAccount,
        timestamp: new Date().toISOString(),
        requestId
    });
}));
router.delete('/:id', jwtAuth_1.requireJwtAuth, (0, validation_1.validateParams)(zod_1.z.object({ id: common_1.CuidSchema })), (0, errorHandler_v2_1.asyncHandler)(async (req, res) => {
    const { organizationId, userId } = req.auth;
    const { id } = req.params;
    const { requestId } = req;
    const existingAccount = await database_cloud_sql_only_1.prisma.ledger_accounts.findFirst({
        where: {
            id,
            organizationId
        }
    });
    if (!existingAccount) {
        throw new errorHandler_v2_1.AppError('Account not found or access denied', errorHandler_v2_1.BFFErrorCode.RESOURCE_NOT_FOUND, 404, undefined, { requestId, organizationId, userId });
    }
    await database_cloud_sql_only_1.prisma.ledger_accounts.delete({
        where: {
            id,
            organizationId
        }
    });
    await Promise.all([
        cache_1.cacheService.delete(`accounts:detail:${id}`, { organizationId }),
        cache_1.cacheService.invalidateByTags(['accounts', 'accounts:list'], organizationId)
    ]);
    await auditService_1.AuditService.log({
        organizationId,
        userId,
        action: 'DELETE',
        resource: 'account',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        oldValues: existingAccount,
        requestId
    });
    logger_1.logger.info('Account deleted successfully', {
        requestId,
        organizationId,
        userId,
        accountId: id,
        accountCode: existingAccount.code
    });
    res.json({
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString(),
        requestId
    });
}));
router.use(errorHandler_v2_1.enhancedErrorHandler);
exports.default = router;
//# sourceMappingURL=accounts.hardened.js.map