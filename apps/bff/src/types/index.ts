// Open Accounting Server Types
export interface OAAccount {
  id: string;
  orgId: string;
  inserted: string;
  updated: string;
  name: string;
  parent: string;
  currency: string;
  precision: number;
  debitBalance: boolean;
  balance: number | null;
  nativeBalance: number | null;
  readOnly: boolean;
}

export interface OATransaction {
  id: string;
  orgId: string;
  userId: string;
  date: string;
  inserted: string;
  updated: string;
  description: string;
  data: string;
  deleted: boolean;
  splits: OASplit[];
}

export interface OASplit {
  accountId: string;
  amount: number;
  nativeAmount: number;
}

export interface OAOrganization {
  id: string;
  name: string;
  currency: string;
  precision: number;
  inserted: string;
  updated: string;
}

export interface OAUser {
  id: string;
  email: string;
  name: string;
  inserted: string;
  updated: string;
}

// Business Entity Types (our layer on top of OA)
export interface Customer {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  paymentTerms: string;
  creditLimit: number;
  arAccountId: string; // Links to OA account
  created: Date;
  updated: Date;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  paymentTerms: string;
  apAccountId: string; // Links to OA account
  taxId?: string;
  created: Date;
  updated: Date;
}

export interface Item {
  id: string;
  orgId: string;
  name: string;
  sku: string;
  description?: string;
  unitPrice: number;
  costPrice: number;
  taxable: boolean;
  revenueAccountId: string; // Links to OA income account
  cogsAccountId?: string; // Cost of goods sold account
  category?: string;
  created: Date;
  updated: Date;
}

export interface Invoice {
  id: string;
  orgId: string;
  customerId: string;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  total: number;
  items: InvoiceItem[];
  transactionId?: string; // Links to OA transaction when confirmed
  notes?: string;
  created: Date;
  updated: Date;
}

export interface InvoiceItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Bill {
  id: string;
  orgId: string;
  vendorId: string;
  billNumber: string;
  date: Date;
  dueDate: Date;
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  total: number;
  items: BillItem[];
  transactionId?: string; // Links to OA transaction when approved
  notes?: string;
  created: Date;
  updated: Date;
}

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  expenseAccountId: string;
}

export interface Expense {
  id: string;
  orgId: string;
  date: Date;
  vendorId?: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: 'cash' | 'card' | 'bank' | 'check';
  expenseAccountId: string;
  bankAccountId: string;
  transactionId: string; // Links to OA transaction
  receipt?: string; // File attachment
  created: Date;
  updated: Date;
}

export interface BankAccount {
  id: string;
  orgId: string;
  accountId: string; // Links to OA cash account
  bankName: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit';
  balance: number;
  isActive: boolean;
  created: Date;
  updated: Date;
}

export interface Payment {
  id: string;
  orgId: string;
  type: 'receive' | 'pay';
  customerId?: string;
  vendorId?: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  reference: string;
  bankAccountId: string;
  transactionId: string; // Links to OA transaction
  invoiceAllocations?: PaymentAllocation[];
  billAllocations?: PaymentAllocation[];
  created: Date;
  updated: Date;
}

export interface PaymentAllocation {
  documentId: string; // Invoice or Bill ID
  amount: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgIds: string[]; // Organizations user has access to
}

export interface JWTPayload {
  userId: string;
  email: string;
  orgId: string; // Current organization context
  role: 'admin' | 'accountant' | 'viewer';
  iat: number;
  exp: number;
}

// API Request/Response Types
export interface CreateTransactionRequest {
  date: string;
  description: string;
  splits: {
    accountId: string;
    amount: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Report Types
export interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface TrialBalanceAccount {
  accountId: string;
  accountName: string;
  accountCode: string;
  debitBalance: number;
  creditBalance: number;
}

export interface ProfitLossReport {
  revenue: ProfitLossSection;
  expenses: ProfitLossSection;
  netIncome: number;
  period: {
    from: string;
    to: string;
  };
}

export interface ProfitLossSection {
  accounts: ProfitLossAccount[];
  total: number;
}

export interface ProfitLossAccount {
  accountId: string;
  accountName: string;
  amount: number;
}

export interface CashFlowReport {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netCashFlow: number;
  period: {
    from: string;
    to: string;
  };
}

export interface CashFlowSection {
  activities: CashFlowActivity[];
  total: number;
}

export interface CashFlowActivity {
  description: string;
  amount: number;
}
