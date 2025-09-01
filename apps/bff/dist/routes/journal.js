"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalRoutes = void 0;
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const journalValidation_1 = require("../utils/journalValidation");
const router = (0, express_1.Router)();
exports.journalRoutes = router;
router.get('/', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { page = 1, limit = 50, startDate, endDate } = req.query;
        let url = `${process.env.OA_BASE_URL}/organizations/${orgId}/transactions?page=${page}&limit=${limit}`;
        if (startDate)
            url += `&startDate=${startDate}`;
        if (endDate)
            url += `&endDate=${endDate}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw (0, errorHandler_1.createError)('Failed to fetch journal entries', 500);
        }
        const entries = await response.json();
        res.json(entries);
    }
    catch (error) {
        logger_1.logger.error('Get journal entries error', { error });
        res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { id } = req.params;
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}/transactions/${id}`);
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: 'Journal entry not found' });
            }
            throw (0, errorHandler_1.createError)('Failed to fetch journal entry', 500);
        }
        const entry = await response.json();
        res.json(entry);
    }
    catch (error) {
        logger_1.logger.error('Get journal entry error', { error });
        res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { date, description, reference, lines, idempotencyKey } = req.body;
        if (!date || !description || !lines || !Array.isArray(lines)) {
            throw (0, errorHandler_1.createError)('Date, description, and lines array are required', 400);
        }
        const validation = (0, journalValidation_1.validateJournalEntry)(lines);
        if (!validation.isBalanced) {
            throw (0, errorHandler_1.createError)(`Journal entry is not balanced: ${validation.error}`, 400);
        }
        if (idempotencyKey) {
            const existingEntry = await checkIdempotency(orgId, idempotencyKey);
            if (existingEntry) {
                return res.json(existingEntry);
            }
        }
        const entryData = {
            date,
            description,
            reference,
            lines: lines.map((line) => ({
                ...line,
                organizationId: orgId
            })),
            organizationId: orgId
        };
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
        });
        if (!response.ok) {
            throw (0, errorHandler_1.createError)('Failed to create journal entry', 500);
        }
        const entry = await response.json();
        logger_1.logger.info('Journal entry created successfully', {
            entryId: entry.id,
            description,
            totalDebits: validation.totalDebits,
            totalCredits: validation.totalCredits
        });
        res.status(201).json(entry);
    }
    catch (error) {
        logger_1.logger.error('Create journal entry error', { error });
        if (error instanceof Error && 'statusCode' in error) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to create journal entry' });
        }
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { id } = req.params;
        const { date, description, reference, lines } = req.body;
        if (!date && !description && !reference && !lines) {
            throw (0, errorHandler_1.createError)('At least one field to update is required', 400);
        }
        if (lines && Array.isArray(lines)) {
            const validation = (0, journalValidation_1.validateJournalEntry)(lines);
            if (!validation.isBalanced) {
                throw (0, errorHandler_1.createError)(`Journal entry is not balanced: ${validation.error}`, 400);
            }
        }
        const updateData = {};
        if (date)
            updateData.date = date;
        if (description)
            updateData.description = description;
        if (reference !== undefined)
            updateData.reference = reference;
        if (lines) {
            updateData.lines = lines.map((line) => ({
                ...line,
                organizationId: orgId
            }));
        }
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: 'Journal entry not found' });
            }
            throw (0, errorHandler_1.createError)('Failed to update journal entry', 500);
        }
        const entry = await response.json();
        logger_1.logger.info('Journal entry updated successfully', { entryId: id, updates: updateData });
        res.json(entry);
    }
    catch (error) {
        logger_1.logger.error('Update journal entry error', { error });
        if (error instanceof Error && 'statusCode' in error) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to update journal entry' });
        }
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { orgId } = req.user;
        const { id } = req.params;
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}/transactions/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: 'Journal entry not found' });
            }
            throw (0, errorHandler_1.createError)('Failed to delete journal entry', 500);
        }
        logger_1.logger.info('Journal entry deleted successfully', { entryId: id });
        res.json({ message: 'Journal entry deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete journal entry error', { error });
        if (error instanceof Error && 'statusCode' in error) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to delete journal entry' });
        }
    }
});
async function checkIdempotency(orgId, idempotencyKey) {
    try {
        const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}/transactions?reference=${idempotencyKey}`);
        if (response.ok) {
            const entries = await response.json();
            return entries.length > 0 ? entries[0] : null;
        }
    }
    catch (error) {
        logger_1.logger.warn('Idempotency check failed', { error });
    }
    return null;
}
//# sourceMappingURL=journal.js.map