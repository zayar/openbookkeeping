import { logger } from '@/utils/logger';
import { 
  OAAccount, 
  OATransaction, 
  OAOrganization, 
  CreateTransactionRequest,
  ApiResponse 
} from '@/types';

export class OpenAccountingService {
  private baseUrl: string;
  private apiVersion: string;

  constructor() {
    this.baseUrl = process.env.OA_SERVER_URL || 'https://oa-server-291129507535.us-central1.run.app';
    this.apiVersion = '1.4.0';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Accept-Version': this.apiVersion,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      logger.info(`Making request to OA Server: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error(`OA Server error: ${response.status} ${response.statusText}`, data);
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error('Failed to make request to OA Server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Organization methods
  async getOrganizations(): Promise<ApiResponse<OAOrganization[]>> {
    return this.makeRequest<OAOrganization[]>('/orgs');
  }

  async getOrganization(orgId: string): Promise<ApiResponse<OAOrganization>> {
    return this.makeRequest<OAOrganization>(`/orgs/${orgId}`);
  }

  async createOrganization(data: {
    name: string;
    currency: string;
    precision?: number;
  }): Promise<ApiResponse<OAOrganization>> {
    return this.makeRequest<OAOrganization>('/orgs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrganization(
    orgId: string,
    data: Partial<OAOrganization>
  ): Promise<ApiResponse<OAOrganization>> {
    return this.makeRequest<OAOrganization>(`/orgs/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Account methods
  async getAccounts(orgId: string): Promise<ApiResponse<OAAccount[]>> {
    return this.makeRequest<OAAccount[]>(`/orgs/${orgId}/accounts`);
  }

  async getAccount(orgId: string, accountId: string): Promise<ApiResponse<OAAccount>> {
    return this.makeRequest<OAAccount>(`/orgs/${orgId}/accounts/${accountId}`);
  }

  async createAccount(orgId: string, data: {
    name: string;
    parent?: string;
    currency?: string;
    precision?: number;
    debitBalance?: boolean;
  }): Promise<ApiResponse<OAAccount>> {
    return this.makeRequest<OAAccount>(`/orgs/${orgId}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(
    orgId: string,
    accountId: string,
    data: Partial<OAAccount>
  ): Promise<ApiResponse<OAAccount>> {
    return this.makeRequest<OAAccount>(`/orgs/${orgId}/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(orgId: string, accountId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/orgs/${orgId}/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  // Transaction methods
  async getTransactions(orgId: string, options?: {
    limit?: number;
    offset?: number;
    accountId?: string;
  }): Promise<ApiResponse<OATransaction[]>> {
    const searchParams = new URLSearchParams();
    if (options?.limit) searchParams.set('limit', options.limit.toString());
    if (options?.offset) searchParams.set('offset', options.offset.toString());
    if (options?.accountId) searchParams.set('accountId', options.accountId);

    const query = searchParams.toString();
    const endpoint = `/orgs/${orgId}/transactions${query ? `?${query}` : ''}`;
    
    return this.makeRequest<OATransaction[]>(endpoint);
  }

  async createTransaction(
    orgId: string,
    data: CreateTransactionRequest
  ): Promise<ApiResponse<OATransaction>> {
    // Validate that debits = credits
    const totalDebits = data.splits
      .filter(split => split.amount > 0)
      .reduce((sum, split) => sum + split.amount, 0);
    
    const totalCredits = data.splits
      .filter(split => split.amount < 0)
      .reduce((sum, split) => sum + Math.abs(split.amount), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        success: false,
        error: `Transaction not balanced: debits ${totalDebits} != credits ${totalCredits}`,
      };
    }

    return this.makeRequest<OATransaction>(`/orgs/${orgId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(
    orgId: string,
    transactionId: string,
    data: Partial<CreateTransactionRequest>
  ): Promise<ApiResponse<OATransaction>> {
    return this.makeRequest<OATransaction>(`/orgs/${orgId}/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(orgId: string, transactionId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/orgs/${orgId}/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  // Utility methods for creating common transaction types

  async createInvoiceTransaction(
    orgId: string,
    customerArAccountId: string,
    revenueAccountId: string,
    amount: number,
    description: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<ApiResponse<OATransaction>> {
    return this.createTransaction(orgId, {
      date,
      description,
      splits: [
        {
          accountId: customerArAccountId,
          amount: amount, // Debit AR
        },
        {
          accountId: revenueAccountId,
          amount: -amount, // Credit Revenue
        }
      ]
    });
  }

  async createBillTransaction(
    orgId: string,
    vendorApAccountId: string,
    expenseAccountId: string,
    amount: number,
    description: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<ApiResponse<OATransaction>> {
    return this.createTransaction(orgId, {
      date,
      description,
      splits: [
        {
          accountId: expenseAccountId,
          amount: amount, // Debit Expense
        },
        {
          accountId: vendorApAccountId,
          amount: -amount, // Credit AP
        }
      ]
    });
  }

  async createPaymentReceiveTransaction(
    orgId: string,
    bankAccountId: string,
    customerArAccountId: string,
    amount: number,
    description: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<ApiResponse<OATransaction>> {
    return this.createTransaction(orgId, {
      date,
      description,
      splits: [
        {
          accountId: bankAccountId,
          amount: amount, // Debit Bank
        },
        {
          accountId: customerArAccountId,
          amount: -amount, // Credit AR
        }
      ]
    });
  }

  async createPaymentPayTransaction(
    orgId: string,
    vendorApAccountId: string,
    bankAccountId: string,
    amount: number,
    description: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<ApiResponse<OATransaction>> {
    return this.createTransaction(orgId, {
      date,
      description,
      splits: [
        {
          accountId: vendorApAccountId,
          amount: amount, // Debit AP
        },
        {
          accountId: bankAccountId,
          amount: -amount, // Credit Bank
        }
      ]
    });
  }

  async createExpenseTransaction(
    orgId: string,
    expenseAccountId: string,
    bankAccountId: string,
    amount: number,
    description: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<ApiResponse<OATransaction>> {
    return this.createTransaction(orgId, {
      date,
      description,
      splits: [
        {
          accountId: expenseAccountId,
          amount: amount, // Debit Expense
        },
        {
          accountId: bankAccountId,
          amount: -amount, // Credit Bank
        }
      ]
    });
  }
}
