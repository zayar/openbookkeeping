export interface OAConfig {
  baseUrl: string
  apiKey?: string
}

export interface Account {
  id: string
  name: string
  code: string
  type: 'other_asset' | 'other_current_asset' | 'cash' | 'bank' | 'fixed_asset' | 'accounts_receivable' | 'stock' | 'payment_clearing_account' | 'input_tax' | 'intangible_asset' | 'non_current_asset' | 'deferred_tax_asset' | 'other_current_liability' | 'credit_card' | 'non_current_liability' | 'other_liability' | 'accounts_payable' | 'overseas_tax_payable' | 'output_tax' | 'deferred_tax_liability' | 'equity' | 'income' | 'other_income' | 'expense' | 'cost_of_goods_sold' | 'other_expense'
  parentCode?: string
  description?: string
  organizationId: string
}

export interface JournalEntry {
  id: string
  date: string
  description: string
  reference?: string
  lines: JournalLine[]
  organizationId: string
}

export interface JournalLine {
  id: string
  accountId: string
  debit?: number
  credit?: number
  description?: string
}

export interface Organization {
  id: string
  name: string
  baseCurrency: string
}

export class OAClient {
  private config: OAConfig

  constructor(config: OAConfig) {
    this.config = config
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`OA API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Organizations
  async createOrganization(org: Omit<Organization, 'id'>): Promise<Organization> {
    return this.request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(org),
    })
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.request<Organization>(`/organizations/${id}`)
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    return this.request<Organization>(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Accounts
  async createAccount(orgId: string, account: Omit<Account, 'id' | 'organizationId'>): Promise<Account> {
    return this.request<Account>(`/organizations/${orgId}/accounts`, {
      method: 'POST',
      body: JSON.stringify({ ...account, organizationId: orgId }),
    })
  }

  async getAccounts(orgId: string): Promise<Account[]> {
    return this.request<Account[]>(`/organizations/${orgId}/accounts`)
  }

  async getAccount(orgId: string, accountId: string): Promise<Account> {
    return this.request<Account>(`/organizations/${orgId}/accounts/${accountId}`)
  }

  async updateAccount(orgId: string, accountId: string, updates: Partial<Account>): Promise<Account> {
    return this.request<Account>(`/organizations/${orgId}/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteAccount(orgId: string, accountId: string): Promise<void> {
    await this.request(`/organizations/${orgId}/accounts/${accountId}`, {
      method: 'DELETE',
    })
  }

  // Journal Entries
  async createJournalEntry(orgId: string, entry: Omit<JournalEntry, 'id' | 'organizationId'>): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/organizations/${orgId}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ ...entry, organizationId: orgId }),
    })
  }

  async getJournalEntries(orgId: string, params?: {
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<JournalEntry[]> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    const endpoint = `/organizations/${orgId}/transactions${query ? `?${query}` : ''}`
    
    return this.request<JournalEntry[]>(endpoint)
  }

  async getJournalEntry(orgId: string, entryId: string): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/organizations/${orgId}/transactions/${entryId}`)
  }

  async updateJournalEntry(orgId: string, entryId: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/organizations/${orgId}/transactions/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteJournalEntry(orgId: string, entryId: string): Promise<void> {
    await this.request(`/organizations/${orgId}/transactions/${entryId}`, {
      method: 'DELETE',
    })
  }

  // Reports
  async getTrialBalance(orgId: string, params?: {
    asOfDate?: string
    includeZeroBalances?: boolean
  }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.asOfDate) searchParams.append('asOfDate', params.asOfDate)
    if (params?.includeZeroBalances) searchParams.append('includeZeroBalances', 'true')

    const query = searchParams.toString()
    const endpoint = `/organizations/${orgId}/reports/trial-balance${query ? `?${query}` : ''}`
    
    return this.request(endpoint)
  }

  async getLedger(orgId: string, params?: {
    accountId?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.accountId) searchParams.append('accountId', params.accountId)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    const endpoint = `/organizations/${orgId}/reports/ledger${query ? `?${query}` : ''}`
    
    return this.request(endpoint)
  }
}

// Factory function
export function createOAClient(config: OAConfig): OAClient {
  return new OAClient(config)
}

// Default export
export default OAClient
