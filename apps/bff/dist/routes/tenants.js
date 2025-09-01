"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRoutes = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const chartOfAccountsSeeder_1 = require("../services/chartOfAccountsSeeder");
const router = (0, express_1.Router)();
exports.tenantRoutes = router;
router.get('/', async (req, res) => {
    try {
        const { orgId } = req.user;
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}`);
        if (!response.ok) {
            throw (0, errorHandler_1.createError)('Failed to fetch organization', 500);
        }
        const org = await response.json();
        res.json(org);
    }
    catch (error) {
        logger_1.logger.error('Get tenant error', { error });
        res.status(500).json({ error: 'Failed to fetch tenant information' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, baseCurrency = 'USD' } = req.body;
        const { userId } = req.user;
        if (!name) {
            throw (0, errorHandler_1.createError)('Organization name is required', 400);
        }
        const orgId = (0, uuid_1.v4)();
        const orgResponse = await fetch(`${process.env.OA_BASE_URL}/organizations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: orgId,
                name,
                baseCurrency
            })
        });
        if (!orgResponse.ok) {
            throw (0, errorHandler_1.createError)('Failed to create organization', 500);
        }
        try {
            const seededAccounts = await chartOfAccountsSeeder_1.ChartOfAccountsSeeder.seedDefaultAccounts(orgId, baseCurrency);
            logger_1.logger.info('Successfully seeded default chart of accounts', {
                orgId,
                seededAccountCount: seededAccounts.length
            });
        }
        catch (seedingError) {
            logger_1.logger.error('Failed to seed default chart of accounts', {
                orgId,
                error: seedingError instanceof Error ? seedingError.message : 'Unknown error'
            });
        }
        logger_1.logger.info('Tenant created successfully', { orgId, name, userId });
        res.status(201).json({
            message: 'Tenant created successfully',
            orgId,
            name,
            baseCurrency
        });
    }
    catch (error) {
        logger_1.logger.error('Create tenant error', { error });
        if (error instanceof Error && 'statusCode' in error) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to create tenant' });
        }
    }
});
router.put('/', async (req, res) => {
    try {
        const { name, baseCurrency } = req.body;
        const { orgId } = req.user;
        if (!name && !baseCurrency) {
            throw (0, errorHandler_1.createError)('At least one field to update is required', 400);
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (baseCurrency)
            updateData.baseCurrency = baseCurrency;
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) {
            throw (0, errorHandler_1.createError)('Failed to update organization', 500);
        }
        logger_1.logger.info('Tenant updated successfully', { orgId, updates: updateData });
        res.json({
            message: 'Tenant updated successfully',
            orgId,
            ...updateData
        });
    }
    catch (error) {
        logger_1.logger.error('Update tenant error', { error });
        if (error instanceof Error && 'statusCode' in error) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to update tenant' });
        }
    }
});
//# sourceMappingURL=tenants.js.map