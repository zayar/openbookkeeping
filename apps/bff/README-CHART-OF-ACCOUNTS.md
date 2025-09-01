# 📊 Default Chart of Accounts

This document describes the comprehensive default chart of accounts that is automatically seeded when new organizations are created in the OpenAccounting SaaS application.

## 🎯 Overview

The default chart of accounts provides a complete, business-ready accounting structure that covers all common business needs. It includes:

- **100+ predefined accounts** organized in a logical hierarchy
- **Standard account numbering** (1000-5999) following accounting best practices
- **Comprehensive coverage** of assets, liabilities, equity, income, and expenses
- **Industry-standard account types** suitable for most businesses

## 🏗️ Account Structure

### Asset Accounts (1000-1999)

#### Current Assets (1000-1499)
- **1000** - Current Assets (parent account)
  - **1100** - Cash and Bank Accounts
    - **1110** - Petty Cash
    - **1120** - Cash in Hand
    - **1130** - Main Bank Account
    - **1140** - Savings Account
    - **1150** - Undeposited Funds
  - **1200** - Accounts Receivable
    - **1210** - Trade Receivables
    - **1220** - Employee Advances
    - **1230** - Other Receivables
  - **1300** - Inventory
    - **1310** - Raw Materials
    - **1320** - Work in Progress
    - **1330** - Finished Goods
    - **1340** - Trading Stock
  - **1400** - Prepaid Expenses
    - **1410** - Prepaid Insurance
    - **1420** - Prepaid Rent
    - **1430** - Prepaid Subscriptions
  - **1440** - Advance Tax
  - **1450** - Payment Clearing Account

#### Fixed Assets (1500-1799)
- **1500** - Fixed Assets (parent account)
  - **1510** - Equipment
    - **1511** - Computer Equipment
    - **1512** - Office Equipment
    - **1513** - Production Equipment
  - **1550** - Furniture and Fixtures
    - **1551** - Office Furniture
    - **1552** - Storage Units
  - **1570** - Buildings
    - **1571** - Office Building
    - **1572** - Warehouse
  - **1580** - Land
  - **1590** - Accumulated Depreciation
    - **1591** - Accumulated Depreciation - Equipment
    - **1592** - Accumulated Depreciation - Furniture
    - **1593** - Accumulated Depreciation - Buildings

#### Intangible Assets (1800-1899)
- **1800** - Intangible Assets (parent account)
  - **1810** - Goodwill
  - **1820** - Patents and Trademarks
  - **1830** - Software Licenses

#### Other Assets (1900-1999)
- **1900** - Other Assets (parent account)
  - **1910** - Security Deposits
  - **1920** - Deferred Tax Asset

### Liability Accounts (2000-2999)

#### Current Liabilities (2000-2499)
- **2000** - Current Liabilities (parent account)
  - **2100** - Accounts Payable
    - **2110** - Trade Payables
  - **2120** - Accrued Expenses
    - **2121** - Accrued Wages
    - **2122** - Accrued Interest
    - **2123** - Accrued Taxes
  - **2200** - Tax Liabilities
    - **2210** - Sales Tax Payable
    - **2220** - Income Tax Payable
    - **2230** - Payroll Tax Payable
    - **2240** - Overseas Tax Payable
  - **2300** - Short-term Loans
    - **2310** - Bank Overdraft
    - **2330** - Line of Credit
  - **2320** - Credit Card
  - **2400** - Other Current Liabilities
    - **2410** - Customer Deposits
    - **2420** - Unearned Revenue

#### Long-term Liabilities (2500-2999)
- **2500** - Long-term Liabilities (parent account)
  - **2510** - Long-term Loans
    - **2511** - Business Loan
    - **2512** - Equipment Loan
  - **2520** - Mortgages
    - **2521** - Building Mortgage
  - **2530** - Deferred Tax Liability

### Equity Accounts (3000-3999)
- **3000** - Owner's Equity (parent account)
  - **3100** - Owner's Capital
    - **3110** - Initial Capital
    - **3120** - Additional Capital
  - **3200** - Owner's Draw
  - **3300** - Retained Earnings
    - **3310** - Current Year Earnings

### Income Accounts (4000-4999)
- **4000** - Revenue (parent account)
  - **4100** - Sales Revenue
    - **4110** - Product Sales
    - **4130** - Consulting Fees
  - **4120** - Service Revenue
  - **4200** - Other Income
    - **4210** - Interest Income
    - **4220** - Dividend Income
    - **4230** - Rental Income
    - **4240** - Commission Income
    - **4250** - Discount Received

### Expense Accounts (5000-5999)
- **5000** - Operating Expenses (parent account)
  - **5100** - Cost of Goods Sold
    - **5110** - Direct Materials
    - **5120** - Direct Labor
    - **5130** - Direct Overhead
  - **5200** - Personnel Expenses
    - **5210** - Wages and Salaries
    - **5220** - Payroll Taxes
    - **5230** - Employee Benefits
    - **5240** - Training and Development
  - **5300** - Office and Administrative
    - **5310** - Office Rent
    - **5320** - Office Supplies
    - **5330** - Utilities
    - **5340** - Internet and Phone
    - **5350** - Insurance
    - **5360** - Professional Services
  - **5400** - Marketing and Sales
    - **5410** - Advertising
    - **5420** - Marketing Materials
    - **5430** - Sales Commissions
    - **5440** - Travel and Entertainment
  - **5500** - Vehicle and Transportation
    - **5510** - Fuel and Oil
    - **5520** - Vehicle Maintenance
    - **5530** - Vehicle Insurance
    - **5540** - Vehicle Registration
  - **5600** - Technology and Software
    - **5610** - Software Licenses
    - **5620** - IT Support
    - **5630** - Cloud Services
  - **5700** - Financial Expenses
    - **5710** - Bank Charges
    - **5720** - Interest Expense
    - **5730** - Credit Card Fees
  - **5800** - Other Operating Expenses
    - **5810** - Depreciation
    - **5820** - Amortization
    - **5830** - Bad Debts
    - **5890** - Miscellaneous Expenses

## 🚀 Automatic Seeding

### For New Organizations
When a new organization is created through the API, the default chart of accounts is automatically seeded with:

1. **Organization creation** in the Open Accounting server
2. **Automatic account seeding** using the `ChartOfAccountsSeeder` service
3. **Proper hierarchy setup** ensuring parent accounts are created before children
4. **Currency configuration** based on the organization's base currency
5. **Account type mapping** to the appropriate debit/credit balance settings

### Manual Seeding
For existing organizations or testing purposes, you can manually seed the chart of accounts:

```bash
# Navigate to the BFF directory
cd apps/bff

# Build the project first
npm run build

# Run the seeding script
node scripts/seed-chart-of-accounts.js <organizationId> [baseCurrency]

# Examples:
node scripts/seed-chart-of-accounts.js org123 MMK
node scripts/seed-chart-of-accounts.js org456 USD
```

## 🔧 Customization

### Adding New Account Types
To add new account types, update the following files:

1. **`apps/bff/src/data/chartOfAccounts.ts`** - Add new account definitions
2. **`apps/web/app/accounts/new/page.tsx`** - Update the account type dropdown
3. **`apps/web/app/accounts/[id]/edit/page.tsx`** - Update the edit form
4. **`apps/web/components/modern-chart-of-accounts.tsx`** - Update the display component

### Modifying Account Structure
The account structure can be modified by:

1. **Changing account codes** - Update the `code` field in the data file
2. **Modifying hierarchies** - Update the `parentCode` field to change relationships
3. **Adding descriptions** - Enhance the `description` field for better clarity
4. **Reorganizing categories** - Move accounts between different sections

## 📋 Account Type Mapping

The default chart uses the following account type values that map to the UI:

| UI Display | Internal Value | Balance Type |
|------------|----------------|--------------|
| Asset - Other Asset | `other_asset` | Debit |
| Asset - Other Current Asset | `other_current_asset` | Debit |
| Asset - Cash | `cash` | Debit |
| Asset - Bank | `bank` | Debit |
| Asset - Fixed Asset | `fixed_asset` | Debit |
| Asset - Accounts Receivable | `accounts_receivable` | Debit |
| Asset - Stock | `stock` | Debit |
| Liability - Other Current Liability | `other_current_liability` | Credit |
| Liability - Credit Card | `credit_card` | Credit |
| Liability - Accounts Payable | `accounts_payable` | Credit |
| Equity - Equity | `equity` | Credit |
| Income - Income | `income` | Credit |
| Expense - Expense | `expense` | Debit |

## 🧪 Testing

### Validation
The seeder service includes validation to ensure:

- All required account types are present
- Account hierarchy is properly structured
- No duplicate account codes exist
- All accounts have valid types

### Testing Commands
```bash
# Test the seeder service
npm run test

# Validate chart structure
node -e "const { ChartOfAccountsSeeder } = require('./dist/services/chartOfAccountsSeeder'); console.log(ChartOfAccountsSeeder.validateDefaultChart());"

# Get chart summary
node -e "const { ChartOfAccountsSeeder } = require('./dist/services/chartOfAccountsSeeder'); console.log(ChartOfAccountsSeeder.getDefaultChartSummary());"
```

## 📚 Best Practices

### Account Naming
- Use clear, descriptive names
- Follow consistent naming conventions
- Include account purpose in the description
- Use industry-standard terminology

### Account Numbering
- Use logical number ranges for account categories
- Leave gaps for future expansion
- Maintain consistent hierarchy in numbering
- Use 4-digit codes for easy identification

### Organization
- Group related accounts together
- Use parent accounts for logical grouping
- Maintain clear separation between account types
- Follow standard accounting principles

## 🔍 Troubleshooting

### Common Issues

1. **Seeding Fails**
   - Check Open Accounting server connectivity
   - Verify organization ID exists
   - Check environment variables (OA_BASE_URL)
   - Review server logs for detailed errors

2. **Missing Accounts**
   - Verify account creation order (parents before children)
   - Check for duplicate account codes
   - Ensure all required fields are provided

3. **Account Type Mismatches**
   - Verify account type values match UI expectations
   - Check balance type settings (debit vs credit)
   - Ensure type validation passes

### Debug Commands
```bash
# Check server logs
tail -f apps/bff/bff.log

# Test Open Accounting connectivity
curl -v http://localhost:8080/health

# Validate environment
echo $OA_BASE_URL
```

## 📖 Additional Resources

- [Open Accounting Server Documentation](https://github.com/openaccounting/server)
- [Accounting Principles and Standards](https://www.ifrs.org/)
- [Chart of Accounts Best Practices](https://www.accountingcoach.com/chart-of-accounts/)
- [Multi-tenant Accounting Systems](https://www.accountingweb.com/technology/accounting-software)

---

**Note**: This default chart of accounts is designed to be comprehensive yet flexible. Organizations can modify, add, or remove accounts based on their specific business needs while maintaining the fundamental accounting structure.
