"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultChartOfAccounts = void 0;
exports.defaultChartOfAccounts = [
    {
        name: 'Business Bank Account',
        code: '1000',
        type: 'bank',
        description: 'Main business bank account for transactions'
    },
    {
        name: 'Accounts Receivable',
        code: '1100',
        type: 'accounts_receivable',
        description: 'Amounts owed by customers for goods/services sold'
    },
    {
        name: 'Input VAT Receivable',
        code: '1200',
        type: 'input_tax',
        description: 'Input VAT that can be reclaimed from tax authorities'
    },
    {
        name: 'Property, Plant, Equipment',
        code: '1500',
        type: 'fixed_asset',
        description: 'Long-term assets used in business operations'
    },
    {
        name: 'Inventory',
        code: '1800',
        type: 'stock',
        description: 'Goods held for sale or production'
    },
    {
        name: 'Accounts Payable',
        code: '2000',
        type: 'accounts_payable',
        description: 'Amounts owed to suppliers and vendors'
    },
    {
        name: 'Output VAT Payable',
        code: '2100',
        type: 'output_tax',
        description: 'Output VAT collected from customers and owed to tax authorities'
    },
    {
        name: 'Loans Payable',
        code: '2200',
        type: 'other_current_liability',
        description: 'Short-term and long-term loans owed to financial institutions'
    },
    {
        name: 'Retained Earnings',
        code: '3000',
        type: 'equity',
        description: 'Accumulated profits/losses from business operations'
    },
    {
        name: 'Sales Revenue',
        code: '4000',
        type: 'income',
        description: 'Revenue from sales of goods and services'
    },
    {
        name: 'Shipping Revenue',
        code: '4100',
        type: 'income',
        description: 'Revenue from shipping and delivery services'
    },
    {
        name: 'Cost of Goods Sold',
        code: '5000',
        type: 'cost_of_goods_sold',
        description: 'Direct costs of producing goods sold'
    },
    {
        name: 'Depreciation Expense',
        code: '5100',
        type: 'expense',
        description: 'Depreciation expense on fixed assets'
    },
    {
        name: 'FX Bank Revaluation (Gains)/Loss',
        code: '5200',
        type: 'expense',
        description: 'Gains or losses from bank account currency revaluation'
    },
    {
        name: 'FX Realized Currency (Gains)/Loss',
        code: '5210',
        type: 'expense',
        description: 'Realized gains or losses from currency transactions'
    },
    {
        name: 'FX Rounding (Gains)/Loss',
        code: '5220',
        type: 'expense',
        description: 'Gains or losses from currency rounding differences'
    },
    {
        name: 'FX Unrealized Currency (Gains)/Loss',
        code: '5230',
        type: 'expense',
        description: 'Unrealized gains or losses from currency fluctuations'
    },
    {
        name: 'Income Tax Expense',
        code: '5300',
        type: 'expense',
        description: 'Income tax expense for the business'
    },
    {
        name: 'Rent Expense',
        code: '5400',
        type: 'expense',
        description: 'Rent expense for office, warehouse, or retail space'
    },
    {
        name: 'Repair & Maintenance Expense',
        code: '5410',
        type: 'expense',
        description: 'Repair and maintenance costs for equipment and facilities'
    },
    {
        name: 'Salary & Payroll Expense',
        code: '5500',
        type: 'expense',
        description: 'Employee salaries, wages, and payroll-related expenses'
    },
    {
        name: 'Selling, General & Administrative Expense',
        code: '5600',
        type: 'expense',
        description: 'General administrative and selling expenses'
    },
    {
        name: 'Shipping Expense',
        code: '5700',
        type: 'expense',
        description: 'Shipping and delivery costs for outbound shipments'
    },
    {
        name: 'Transaction Fees & Charges',
        code: '5710',
        type: 'expense',
        description: 'Bank fees, credit card fees, and other transaction charges'
    },
    {
        name: 'Utility Expense',
        code: '5800',
        type: 'expense',
        description: 'Electricity, water, gas, internet, and other utility expenses'
    }
];
//# sourceMappingURL=chartOfAccounts.js.map