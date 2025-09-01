import { Router, Request, Response } from 'express';
import { loadConfig } from '../../../packages/config/src/loadConfig'
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { ChartOfAccountsSeeder } from '../services/chartOfAccountsSeeder';

const router = Router();

// Get tenant info
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req.user!;
    
    // Fetch organization details from OA
    const { OA_BASE_URL } = loadConfig()
    const response = await fetch(`${OA_BASE_URL}/organizations/${orgId}`);
    
    if (!response.ok) {
      throw createError('Failed to fetch organization', 500);
    }
    
    const org = await response.json();
    res.json(org);
  } catch (error) {
    logger.error('Get tenant error', { error });
    res.status(500).json({ error: 'Failed to fetch tenant information' });
  }
});

// Create new tenant (organization)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, baseCurrency = 'USD' } = req.body;
    const { userId } = req.user!;
    
    if (!name) {
      throw createError('Organization name is required', 400);
    }
    
    const orgId = uuidv4();
    
    // Create organization in OA
    const { OA_BASE_URL: BASE } = loadConfig()
    const orgResponse = await fetch(`${BASE}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orgId,
        name,
        baseCurrency
      })
    });
    
    if (!orgResponse.ok) {
      throw createError('Failed to create organization', 500);
    }
    
    // Seed default Chart of Accounts using the seeder service
    try {
      const seededAccounts = await ChartOfAccountsSeeder.seedDefaultAccounts(orgId, baseCurrency);
      logger.info('Successfully seeded default chart of accounts', { 
        orgId, 
        seededAccountCount: seededAccounts.length 
      });
    } catch (seedingError) {
      logger.error('Failed to seed default chart of accounts', { 
        orgId, 
        error: seedingError instanceof Error ? seedingError.message : 'Unknown error' 
      });
      // Don't fail the organization creation if seeding fails
      // The accounts can be seeded later manually
    }
    
    logger.info('Tenant created successfully', { orgId, name, userId });
    
    res.status(201).json({
      message: 'Tenant created successfully',
      orgId,
      name,
      baseCurrency
    });
  } catch (error) {
    logger.error('Create tenant error', { error });
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }
});

// Update tenant
router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, baseCurrency } = req.body;
    const { orgId } = req.user!;
    
    if (!name && !baseCurrency) {
      throw createError('At least one field to update is required', 400);
    }
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (baseCurrency) updateData.baseCurrency = baseCurrency;
    
    const { OA_BASE_URL: B } = loadConfig()
    const response = await fetch(`${B}/organizations/${orgId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw createError('Failed to update organization', 500);
    }
    
    logger.info('Tenant updated successfully', { orgId, updates: updateData });
    
    res.json({
      message: 'Tenant updated successfully',
      orgId,
      ...updateData
    });
  } catch (error) {
    logger.error('Update tenant error', { error });
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  }
});

export { router as tenantRoutes };
