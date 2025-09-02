import { defaultChartOfAccounts } from '../data/chartOfAccounts';
import { logger } from '../utils/logger';
import { loadConfig } from '@openaccounting/config'

export interface SeededAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parentCode?: string;
  description?: string;
  organizationId: string;
}

export class ChartOfAccountsSeeder {
  /**
   * Seeds the default chart of accounts for a new organization
   * @param organizationId - The ID of the organization to seed accounts for
   * @param baseCurrency - The base currency for the organization (default: MMK)
   * @returns Array of created account IDs
   */
  static async seedDefaultAccounts(
    organizationId: string, 
    baseCurrency: string = 'MMK'
  ): Promise<SeededAccount[]> {
    const createdAccounts: SeededAccount[] = [];
    
    try {
      logger.info('Starting to seed default chart of accounts', { 
        organizationId, 
        baseCurrency,
        accountCount: defaultChartOfAccounts.length 
      });

      // Create accounts in order (parents first, then children)
      const sortedAccounts = this.sortAccountsByHierarchy(defaultChartOfAccounts);
      
      for (const account of sortedAccounts) {
        try {
          const createdAccount = await this.createAccount(organizationId, account, baseCurrency);
          if (createdAccount) {
            createdAccounts.push(createdAccount);
            logger.debug('Created account successfully', { 
              accountCode: account.code, 
              accountName: account.name 
            });
          }
        } catch (error) {
          logger.warn('Failed to create account', { 
            accountCode: account.code, 
            accountName: account.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      logger.info('Completed seeding default chart of accounts', { 
        organizationId, 
        totalAccounts: defaultChartOfAccounts.length,
        createdAccounts: createdAccounts.length 
      });

      return createdAccounts;
    } catch (error) {
      logger.error('Failed to seed default chart of accounts', { 
        organizationId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Creates a single account in the Open Accounting server
   */
  private static async createAccount(
    organizationId: string, 
    account: any, 
    baseCurrency: string
  ): Promise<SeededAccount | null> {
    try {
      const { OA_BASE_URL: baseUrl } = loadConfig();
      if (!baseUrl) {
        throw new Error('OA_BASE_URL environment variable not set');
      }

      const response = await fetch(`${baseUrl}/organizations/${organizationId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          parent: account.parentCode || '0', // '0' for root accounts
          currency: baseCurrency,
          precision: 2, // Default precision for most currencies
          debitBalance: this.isDebitBalanceAccount(account.type)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create account: ${response.status} ${errorText}`);
      }

      const createdAccount = await response.json();
      
      return {
        id: createdAccount.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentCode: account.parentCode,
        description: account.description,
        organizationId
      };
    } catch (error) {
      logger.error('Error creating account', { 
        accountCode: account.code, 
        accountName: account.name, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Sorts accounts by hierarchy to ensure parents are created before children
   */
  private static sortAccountsByHierarchy(accounts: any[]): any[] {
    const accountMap = new Map<string, any>();
    const rootAccounts: any[] = [];
    const childAccounts: any[] = [];

    // First pass: categorize accounts
    for (const account of accounts) {
      accountMap.set(account.code, account);
      if (account.parentCode) {
        childAccounts.push(account);
      } else {
        rootAccounts.push(account);
      }
    }

    // Second pass: sort children by their parent's position
    const sortedAccounts = [...rootAccounts];
    
    for (const child of childAccounts) {
      const parentIndex = sortedAccounts.findIndex(acc => acc.code === child.parentCode);
      if (parentIndex !== -1) {
        sortedAccounts.splice(parentIndex + 1, 0, child);
      } else {
        // If parent not found, add to end
        sortedAccounts.push(child);
      }
    }

    return sortedAccounts;
  }

  /**
   * Determines if an account type has a debit balance
   */
  private static isDebitBalanceAccount(accountType: string): boolean {
    // Assets and Expenses have debit balances
    const debitBalanceTypes = [
      'other_asset', 'other_current_asset', 'cash', 'bank', 'fixed_asset',
      'accounts_receivable', 'stock', 'payment_clearing_account', 'input_tax',
      'intangible_asset', 'non_current_asset', 'deferred_tax_asset',
      'expense', 'cost_of_goods_sold', 'other_expense'
    ];
    
    return debitBalanceTypes.includes(accountType);
  }

  /**
   * Gets a summary of the default chart of accounts structure
   */
  static getDefaultChartSummary(): {
    totalAccounts: number;
    assetAccounts: number;
    liabilityAccounts: number;
    equityAccounts: number;
    incomeAccounts: number;
    expenseAccounts: number;
  } {
    const summary = {
      totalAccounts: defaultChartOfAccounts.length,
      assetAccounts: 0,
      liabilityAccounts: 0,
      equityAccounts: 0,
      incomeAccounts: 0,
      expenseAccounts: 0
    };

    for (const account of defaultChartOfAccounts) {
      if (account.type.includes('asset')) {
        summary.assetAccounts++;
      } else if (account.type.includes('liability')) {
        summary.liabilityAccounts++;
      } else if (account.type.includes('equity')) {
        summary.equityAccounts++;
      } else if (account.type.includes('income')) {
        summary.incomeAccounts++;
      } else if (account.type.includes('expense')) {
        summary.expenseAccounts++;
      }
    }

    return summary;
  }

  /**
   * Validates that all required account types are present
   */
  static validateDefaultChart(): { isValid: boolean; missingTypes: string[] } {
    const requiredTypes = [
      'cash', 'bank', 'accounts_receivable', 'accounts_payable',
      'equity', 'income', 'expense'
    ];

    const presentTypes = new Set(defaultChartOfAccounts.map(acc => acc.type));
    const missingTypes = requiredTypes.filter(type => !presentTypes.has(type));

    return {
      isValid: missingTypes.length === 0,
      missingTypes
    };
  }
}
