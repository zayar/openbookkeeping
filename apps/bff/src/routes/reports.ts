import { Router, Request, Response } from 'express';
import { loadConfig } from '@openaccounting/config'
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Get trial balance
router.get('/trial-balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { asOfDate, includeZeroBalances = false } = req.query;
    
    const { OA_BASE_URL } = loadConfig()
    let url = `${OA_BASE_URL}/organizations/${orgId}/reports/trial-balance`;
    const params = new URLSearchParams();
    if (asOfDate) params.append('asOfDate', asOfDate as string);
    if (includeZeroBalances) params.append('includeZeroBalances', 'true');
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw createError('Failed to fetch trial balance', 500);
    }
    
    const trialBalance = await response.json();
    res.json(trialBalance);
  } catch (error) {
    logger.error('Get trial balance error', { error });
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// Get general ledger
router.get('/ledger', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    const { accountId, startDate, endDate, page = 1, limit = 100 } = req.query;
    
    const { OA_BASE_URL: BASE } = loadConfig()
    let url = `${BASE}/organizations/${orgId}/reports/ledger`;
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId as string);
    if (startDate) params.append('startDate', startDate as string);
    if (endDate) params.append('endDate', endDate as string);
    params.append('page', page as string);
    params.append('limit', limit as string);
    
    url += `?${params.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw createError('Failed to fetch ledger', 500);
    }
    
    const ledger = await response.json();
    res.json(ledger);
  } catch (error) {
    logger.error('Get ledger error', { error });
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

export { router as reportRoutes };
