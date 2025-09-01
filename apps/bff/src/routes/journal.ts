import { Router, Request, Response } from 'express';
import { loadConfig } from '../../../packages/config/src/loadConfig'
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { validateJournalEntry } from '../utils/journalValidation';

const router = Router();

// Get all journal entries for the organization
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    
    const { OA_BASE_URL } = loadConfig()
    let url = `${OA_BASE_URL}/organizations/${orgId}/transactions?page=${page}&limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw createError('Failed to fetch journal entries', 500);
    }
    
    const entries = await response.json();
    res.json(entries);
  } catch (error) {
    logger.error('Get journal entries error', { error });
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// Get specific journal entry
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { id } = req.params;
    
    const { OA_BASE_URL: BASE } = loadConfig()
    const response = await fetch(`${BASE}/organizations/${orgId}/transactions/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      throw createError('Failed to fetch journal entry', 500);
    }
    
    const entry = await response.json();
    res.json(entry);
  } catch (error) {
    logger.error('Get journal entry error', { error });
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

// Create new journal entry
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { date, description, reference, lines, idempotencyKey } = req.body;
    
    if (!date || !description || !lines || !Array.isArray(lines)) {
      throw createError('Date, description, and lines array are required', 400);
    }
    
    // Validate journal entry balance
    const validation = validateJournalEntry(lines);
    if (!validation.isBalanced) {
      throw createError(`Journal entry is not balanced: ${validation.error}`, 400);
    }
    
    // Check idempotency
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
      lines: lines.map((line: any) => ({
        ...line,
        organizationId: orgId
      })),
      organizationId: orgId
    };
    
    const { OA_BASE_URL: B } = loadConfig()
    const response = await fetch(`${B}/organizations/${orgId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData)
    });
    
    if (!response.ok) {
      throw createError('Failed to create journal entry', 500);
    }
    
    const entry = await response.json();
    logger.info('Journal entry created successfully', { 
      entryId: entry.id, 
      description, 
      totalDebits: validation.totalDebits,
      totalCredits: validation.totalCredits
    });
    
    res.status(201).json(entry);
  } catch (error) {
    logger.error('Create journal entry error', { error });
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  }
});

// Update journal entry
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { id } = req.params;
    const { date, description, reference, lines } = req.body;
    
    if (!date && !description && !reference && !lines) {
      throw createError('At least one field to update is required', 400);
    }
    
    // Validate journal entry balance if lines are being updated
    if (lines && Array.isArray(lines)) {
      const validation = validateJournalEntry(lines);
      if (!validation.isBalanced) {
        throw createError(`Journal entry is not balanced: ${validation.error}`, 400);
      }
    }
    
    const updateData: any = {};
    if (date) updateData.date = date;
    if (description) updateData.description = description;
    if (reference !== undefined) updateData.reference = reference;
    if (lines) {
      updateData.lines = lines.map((line: any) => ({
        ...line,
        organizationId: orgId
      }));
    }
    
    const { OA_BASE_URL: C } = loadConfig()
    const response = await fetch(`${C}/organizations/${orgId}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      throw createError('Failed to update journal entry', 500);
    }
    
    const entry = await response.json();
    logger.info('Journal entry updated successfully', { entryId: id, updates: updateData });
    
    res.json(entry);
  } catch (error) {
    logger.error('Update journal entry error', { error });
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  }
});

// Delete journal entry
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { id } = req.params;
    
    const response = await fetch(`${process.env.OA_BASE_URL}/organizations/${orgId}/transactions/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      throw createError('Failed to delete journal entry', 500);
    }
    
    logger.info('Journal entry deleted successfully', { entryId: id });
    
    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    logger.error('Delete journal entry error', { error });
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete journal entry' });
    }
  }
});

// Helper function to check idempotency
async function checkIdempotency(orgId: string, idempotencyKey: string) {
  try {
    const { OA_BASE_URL: D } = loadConfig()
    const response = await fetch(`${D}/organizations/${orgId}/transactions?reference=${idempotencyKey}`);
    
    if (response.ok) {
      const entries = await response.json();
      return entries.length > 0 ? entries[0] : null;
    }
  } catch (error) {
    logger.warn('Idempotency check failed', { error });
  }
  return null;
}

export { router as journalRoutes };
