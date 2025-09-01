# 🏗️ Open Accounting SaaS Development Plan

## 🎯 Project Overview
Build a modern, multi-tenant accounting SaaS using:
- **Backend**: Open Accounting Server (Go) - Double-entry bookkeeping engine
- **BFF**: Node.js/Express - Authentication, multi-tenancy, business logic
- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui - Modern, responsive UI

## 📊 Open Accounting Server API Analysis

### Available Endpoints:
- **Organizations**: `/orgs` - Multi-tenant organization management
- **Accounts**: `/orgs/:orgId/accounts` - Chart of accounts (ledger accounts)
- **Transactions**: `/orgs/:orgId/transactions` - Double-entry journal entries
- **Prices**: `/orgs/:orgId/prices` - Currency/pricing data
- **Users**: `/user`, `/users` - User management
- **Auth**: `/sessions`, `/apikeys` - Authentication

### Core Data Models:
```typescript
interface Account {
  id: string;
  orgId: string;
  name: string;
  parent: string;
  currency: string;
  precision: number;
  debitBalance: boolean;
  balance: number;
  readOnly: boolean;
}

interface Transaction {
  id: string;
  orgId: string;
  date: string;
  description: string;
  splits: Split[];
}

interface Split {
  accountId: string;
  amount: number; // In cents
  nativeAmount: number;
}
```

## 🏗️ Development Phases

### Phase 1: Foundation & Authentication
**Timeline: 2-3 days**

#### 1.1 BFF Setup
- [x] Node.js/Express server with TypeScript
- [x] NextAuth.js with Google OAuth
- [x] JWT token management with orgId claims
- [x] Environment configuration
- [x] CORS and security middleware

#### 1.2 Frontend Scaffold
- [x] Next.js 14 with App Router
- [x] Tailwind CSS configuration
- [x] shadcn/ui component library
- [x] Authentication pages (login/signup)
- [x] Protected route middleware

#### 1.3 API Integration Layer
- [x] TypeScript SDK for Open Accounting API
- [x] Multi-tenant request interceptors
- [x] Error handling and retry logic
- [x] Type-safe API client

### Phase 2: Core Accounting Features
**Timeline: 3-4 days**

#### 2.1 Chart of Accounts Management ✨
**Business Logic**: Foundation of all accounting operations
- **UI Components**:
  - Tree view with drag-and-drop reordering
  - Account creation modal with validation
  - Account type selector (Assets, Liabilities, Equity, Income, Expenses)
  - Balance display with drill-down to transactions
- **Features**:
  - Hierarchical account structure
  - Account code assignment (1000, 1100, etc.)
  - Currency per account
  - Default account templates (US GAAP, IFRS)
  - Bulk import/export

#### 2.2 Organization & User Management
- **Multi-tenant organization setup**
- **User invitation system**
- **Role-based permissions** (Admin, Accountant, Viewer)
- **Organization settings** (fiscal year, currency, etc.)

#### 2.3 Transaction Engine
- **Manual journal entry creation**
- **Transaction validation** (debits = credits)
- **Transaction reversal/correction**
- **Bulk transaction import**

### Phase 3: Business Entities Layer
**Timeline: 4-5 days**

> **Note**: Open Accounting Server only provides accounts and transactions. We need to build business entities (customers, vendors, invoices) as a layer on top.

#### 3.1 Customer Management 👥
**Implementation**: Store in separate database table, link to transactions
- **Data Model**:
  ```typescript
  interface Customer {
    id: string;
    orgId: string;
    name: string;
    email: string;
    phone: string;
    address: Address;
    paymentTerms: string; // "Net 30", etc.
    creditLimit: number;
    accountsReceivableAccountId: string; // Links to OA account
    created: Date;
    updated: Date;
  }
  ```
- **UI Features**:
  - Customer list with search/filter
  - Customer profile with transaction history
  - Customer statements generation
  - Credit limit monitoring

#### 3.2 Vendor Management 🏢
**Implementation**: Similar to customers but for payables
- **Data Model**:
  ```typescript
  interface Vendor {
    id: string;
    orgId: string;
    name: string;
    email: string;
    paymentTerms: string;
    accountsPayableAccountId: string;
    taxId: string;
    // ... similar to Customer
  }
  ```

#### 3.3 Item/Product Catalog 📦
**Implementation**: Product database with pricing
- **Data Model**:
  ```typescript
  interface Item {
    id: string;
    orgId: string;
    name: string;
    sku: string;
    description: string;
    unitPrice: number;
    costPrice: number;
    taxable: boolean;
    revenueAccountId: string; // Links to OA income account
    cogsAccountId: string; // Cost of goods sold account
    category: string;
  }
  ```

### Phase 4: Document Management
**Timeline: 5-6 days**

#### 4.1 Invoice System 📄
**Implementation**: Invoice documents that generate OA transactions
- **Data Model**:
  ```typescript
  interface Invoice {
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
  }
  
  interface InvoiceItem {
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }
  ```

- **Workflow**:
  1. **Draft**: Create invoice, edit items, preview
  2. **Confirm**: Generate OA transaction:
     ```
     DR Accounts Receivable (Customer)  $1,000
     CR Revenue Account                   $1,000
     ```
  3. **Send**: Email PDF to customer
  4. **Payment**: Record payment receipt

- **UI Features**:
  - Invoice builder with item selection
  - PDF generation and preview
  - Email sending with templates
  - Payment status tracking
  - Aging reports

#### 4.2 Bill Management 📑
**Implementation**: Vendor bills that create AP transactions
- **Data Model**: Similar to invoices but for vendor bills
- **Workflow**:
  1. **Draft**: Enter bill details
  2. **Approve**: Generate OA transaction:
     ```
     DR Expense Account                   $500
     CR Accounts Payable (Vendor)        $500
     ```
  3. **Schedule Payment**: Add to payment queue

#### 4.3 Expense Management 💳
**Implementation**: Direct expense entry
- **Data Model**:
  ```typescript
  interface Expense {
    id: string;
    orgId: string;
    date: Date;
    vendor?: string;
    description: string;
    amount: number;
    category: string;
    paymentMethod: 'cash' | 'card' | 'bank' | 'check';
    transactionId: string; // Links to OA transaction
    receipt?: string; // File attachment
  }
  ```

### Phase 5: Banking & Payments
**Timeline: 3-4 days**

#### 5.1 Bank Account Management 🏦
**Implementation**: Bank accounts as special OA accounts
- **Data Model**:
  ```typescript
  interface BankAccount {
    id: string;
    orgId: string;
    accountId: string; // Links to OA cash account
    bankName: string;
    accountNumber: string;
    accountType: 'checking' | 'savings' | 'credit';
    balance: number;
    isActive: boolean;
  }
  ```

#### 5.2 Payment Receive 💰
**Implementation**: Customer payment processing
- **Workflow**:
  ```
  DR Bank Account                      $1,000
  CR Accounts Receivable (Customer)   $1,000
  ```
- **Features**:
  - Payment allocation to multiple invoices
  - Partial payment handling
  - Bank deposit preparation
  - Payment method tracking

#### 5.3 Payment Pay 💸
**Implementation**: Vendor payment processing
- **Workflow**:
  ```
  DR Accounts Payable (Vendor)        $500
  CR Bank Account                      $500
  ```
- **Features**:
  - Batch payment processing
  - Check printing
  - ACH/wire transfer integration
  - Payment approval workflow

### Phase 6: Reporting & Analytics
**Timeline: 4-5 days**

#### 6.1 Financial Reports 📊
**Implementation**: Query OA transactions and aggregate

#### 6.1.1 Cash Flow Statement
- **Data Source**: Bank account transactions
- **UI Features**:
  - Operating, investing, financing activities
  - Period comparison
  - Cash flow forecasting
  - Drill-down to transactions

#### 6.1.2 Profit & Loss Statement
- **Data Source**: Revenue and expense accounts
- **Calculation**:
  ```sql
  Revenue = SUM(credit amounts in revenue accounts)
  Expenses = SUM(debit amounts in expense accounts)
  Net Income = Revenue - Expenses
  ```
- **UI Features**:
  - Month/quarter/year periods
  - Budget vs. actual comparison
  - Percentage analysis
  - Trend charts

#### 6.1.3 Trial Balance
- **Data Source**: All account balances
- **Validation**: Total debits = Total credits
- **UI Features**:
  - Account hierarchy view
  - Balance verification
  - Period-end adjustments
  - Export to Excel

#### 6.2 Business Intelligence
- **Customer aging reports**
- **Vendor aging reports**
- **Inventory valuation**
- **Tax reporting**
- **Key performance indicators (KPIs)**

### Phase 7: UI/UX Polish
**Timeline: 2-3 days**

#### 7.1 Modern Design System
- **Design Tokens**: Colors, typography, spacing
- **Component Library**: Consistent, accessible components
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Theme switching

#### 7.2 User Experience
- **Onboarding Flow**: Guided setup for new organizations
- **Keyboard Shortcuts**: Power user features
- **Bulk Operations**: Multi-select actions
- **Real-time Updates**: WebSocket integration
- **Offline Support**: Service worker caching

#### 7.3 Advanced Features
- **File Attachments**: Receipt/document storage
- **Audit Trail**: Transaction history tracking
- **Data Export**: PDF, Excel, CSV exports
- **API Webhooks**: Third-party integrations

## 🎨 UI/UX Design Principles

### Modern Dashboard Design
```typescript
// Dashboard layout with KPI cards
const DashboardLayout = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
    <KPICard 
      title="Total Revenue" 
      value="$125,430" 
      change="+12.5%" 
      trend="up" 
    />
    <KPICard 
      title="Outstanding AR" 
      value="$23,180" 
      change="-5.2%" 
      trend="down" 
    />
    <KPICard 
      title="Cash Balance" 
      value="$45,220" 
      change="+3.1%" 
      trend="up" 
    />
    <KPICard 
      title="Monthly Expenses" 
      value="$18,950" 
      change="+8.7%" 
      trend="up" 
    />
  </div>
);
```

### Chart of Accounts Tree
- **Hierarchical Structure**: Expandable tree view
- **Drag & Drop**: Reorder accounts
- **Visual Indicators**: Account types with icons
- **Balance Display**: Real-time balance updates
- **Quick Actions**: Add child account, edit, delete

### Invoice Builder
- **Step-by-step Wizard**: Customer → Items → Review → Send
- **Item Search**: Typeahead product selection
- **Real-time Calculations**: Auto-update totals
- **PDF Preview**: Live preview with branding
- **Template System**: Customizable invoice templates

## 🔧 Technical Implementation

### BFF API Routes
```typescript
// Multi-tenant middleware
app.use('/api/orgs/:orgId/*', validateOrgAccess);

// Business entity routes
app.use('/api/orgs/:orgId/customers', customerRoutes);
app.use('/api/orgs/:orgId/vendors', vendorRoutes);
app.use('/api/orgs/:orgId/items', itemRoutes);
app.use('/api/orgs/:orgId/invoices', invoiceRoutes);
app.use('/api/orgs/:orgId/bills', billRoutes);
app.use('/api/orgs/:orgId/expenses', expenseRoutes);
app.use('/api/orgs/:orgId/payments', paymentRoutes);

// Proxy routes to Open Accounting Server
app.use('/api/orgs/:orgId/accounts', oaProxyRoutes);
app.use('/api/orgs/:orgId/transactions', oaProxyRoutes);
```

### Database Schema
```sql
-- Business entities (separate from OA)
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  ar_account_id VARCHAR(255), -- Links to OA account
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  total_amount DECIMAL(10,2),
  oa_transaction_id VARCHAR(255), -- Links to OA transaction
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Type-Safe API Client
```typescript
// Auto-generated from Open Accounting API
export class OpenAccountingClient {
  constructor(private baseUrl: string, private orgId: string) {}
  
  async getAccounts(): Promise<Account[]> {
    return this.request(`/orgs/${this.orgId}/accounts`);
  }
  
  async createTransaction(transaction: CreateTransactionRequest): Promise<Transaction> {
    return this.request(`/orgs/${this.orgId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(transaction)
    });
  }
}
```

## 🚀 Deployment Strategy

### Environment Setup
- **Development**: Local Docker compose
- **Staging**: Cloud Run with test database
- **Production**: Cloud Run with production database
- **Monitoring**: Cloud Logging + Error tracking

### CI/CD Pipeline
1. **Code commit** → GitHub
2. **Tests run** → Jest + Playwright
3. **Build containers** → Cloud Build
4. **Deploy** → Cloud Run
5. **Health checks** → Automated verification

## 📅 Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Phase 1 | 2-3 days | Authentication, BFF, Frontend scaffold |
| Phase 2 | 3-4 days | Chart of accounts, Organizations, Transactions |
| Phase 3 | 4-5 days | Customers, Vendors, Items |
| Phase 4 | 5-6 days | Invoices, Bills, Expenses |
| Phase 5 | 3-4 days | Banking, Payments |
| Phase 6 | 4-5 days | Reports, Analytics |
| Phase 7 | 2-3 days | UI polish, Advanced features |
| **Total** | **23-30 days** | **Complete accounting SaaS** |

## 🎯 Success Metrics
- **Functional**: All accounting workflows work end-to-end
- **Performance**: < 200ms API response times
- **UI/UX**: Modern, intuitive, mobile-responsive
- **Security**: Multi-tenant isolation, audit trails
- **Scalability**: Support 100+ organizations

This development plan creates a comprehensive, modern accounting SaaS that leverages the robust double-entry bookkeeping engine of Open Accounting Server while providing an intuitive business layer for invoices, customers, and reporting.
