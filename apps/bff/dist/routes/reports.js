"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.reportRoutes = router;
router.get('/trial-balance', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { asOfDate, includeZeroBalances = false } = req.query;
        let url = `${process.env.OA_BASE_URL}/organizations/${orgId}/reports/trial-balance`;
        const params = new URLSearchParams();
        if (asOfDate)
            params.append('asOfDate', asOfDate);
        if (includeZeroBalances)
            params.append('includeZeroBalances', 'true');
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw (0, errorHandler_1.createError)('Failed to fetch trial balance', 500);
        }
        const trialBalance = await response.json();
        res.json(trialBalance);
    }
    catch (error) {
        logger_1.logger.error('Get trial balance error', { error });
        res.status(500).json({ error: 'Failed to fetch trial balance' });
    }
});
router.get('/ledger', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { accountId, startDate, endDate, page = 1, limit = 100 } = req.query;
        let url = `${process.env.OA_BASE_URL}/organizations/${orgId}/reports/ledger`;
        const params = new URLSearchParams();
        if (accountId)
            params.append('accountId', accountId);
        if (startDate)
            params.append('startDate', startDate);
        if (endDate)
            params.append('endDate', endDate);
        params.append('page', page);
        params.append('limit', limit);
        url += `?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw (0, errorHandler_1.createError)('Failed to fetch ledger', 500);
        }
        const ledger = await response.json();
        res.json(ledger);
    }
    catch (error) {
        logger_1.logger.error('Get ledger error', { error });
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});
//# sourceMappingURL=reports.js.map