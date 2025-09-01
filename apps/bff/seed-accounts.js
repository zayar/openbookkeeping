#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default chart of accounts from the image
const defaultAccounts = [
  // Assets (1000-1899)
  { code: '1000', name: 'Business Bank Account', type: 'bank', description: 'Main business bank account for transactions' },
  { code: '1100', name: 'Accounts Receivable', type: 'accounts_receivable', description: 'Amounts owed by customers for goods/services sold' },
  { code: '1200', name: 'Input VAT Receivable', type: 'input_tax', description: 'Input VAT that can be reclaimed from tax authorities' },
  { code: '1500', name: 'Property, Plant, Equipment', type: 'fixed_asset', description: 'Long-term assets used in business operations' },
  { code: '1800', name: 'Inventory', type: 'stock', description: 'Goods held for sale or production' },
  
  // Liabilities (2000-2999)
  { code: '2000', name: 'Accounts Payable', type: 'accounts_payable', description: 'Amounts owed to suppliers and vendors' },
  { code: '2100', name: 'Output VAT Payable', type: 'output_tax', description: 'Output VAT collected from customers and owed to tax authorities' },
  { code: '2200', name: 'Loans Payable', type: 'other_current_liability', description: 'Short-term and long-term loans owed to financial institutions' },
  
  // Equity (3000-3999)
  { code: '3000', name: 'Retained Earnings', type: 'equity', description: 'Accumulated profits/losses from business operations' },
  
  // Revenue (4000-4999)
  { code: '4000', name: 'Sales Revenue', type: 'income', description: 'Revenue from sales of goods and services' },
  { code: '4100', name: 'Shipping Revenue', type: 'income', description: 'Revenue from shipping and delivery services' },
  
  // Expenses (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', type: 'cost_of_goods_sold', description: 'Direct costs of producing goods sold' },
  { code: '5100', name: 'Depreciation Expense', type: 'expense', description: 'Depreciation expense on fixed assets' },
  { code: '5200', name: 'FX Bank Revaluation (Gains)/Loss', type: 'expense', description: 'Gains or losses from bank account currency revaluation' },
  { code: '5210', name: 'FX Realized Currency (Gains)/Loss', type: 'expense', description: 'Realized gains or losses from currency transactions' },
  { code: '5220', name: 'FX Rounding (Gains)/Loss', type: 'expense', description: 'Gains or losses from currency rounding differences' },
  { code: '5230', name: 'FX Unrealized Currency (Gains)/Loss', type: 'expense', description: 'Unrealized gains or losses from currency fluctuations' },
  { code: '5300', name: 'Income Tax Expense', type: 'expense', description: 'Income tax expense for the business' },
  { code: '5400', name: 'Rent Expense', type: 'expense', description: 'Rent expense for office, warehouse, or retail space' },
  { code: '5410', name: 'Repair & Maintenance Expense', type: 'expense', description: 'Repair and maintenance costs for equipment and facilities' },
  { code: '5500', name: 'Salary & Payroll Expense', type: 'expense', description: 'Employee salaries, wages, and payroll-related expenses' },
  { code: '5600', name: 'Selling, General & Administrative Expense', type: 'expense', description: 'General administrative and selling expenses' },
  { code: '5700', name: 'Shipping Expense', type: 'expense', description: 'Shipping and delivery costs for outbound shipments' },
  { code: '5710', name: 'Transaction Fees & Charges', type: 'expense', description: 'Bank fees, credit card fees, and other transaction charges' },
  { code: '5800', name: 'Utility Expense', type: 'expense', description: 'Electricity, water, gas, internet, and other utility expenses' }
];

async function seedAccounts() {
  try {
    console.log('🌱 Starting to seed default chart of accounts...');
    
    // First, check if there are any existing organizations
    const organizations = await prisma.organization.findMany();
    
    if (organizations.length === 0) {
      console.log('❌ No organizations found. Creating a default organization...');
      
      // Create a default organization
      const defaultOrg = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org',
          description: 'Default organization for seeding accounts',
          baseCurrency: 'MMK',
          oaOrganizationId: `oa-${Date.now()}`,
          country: 'Myanmar',
          timezone: 'Asia/Yangon'
        }
      });
      
      console.log(`✅ Created default organization: ${defaultOrg.name} (ID: ${defaultOrg.id})`);
      
      // Create a default user
      const defaultUser = await prisma.user.create({
        data: {
          email: 'admin@default.com',
          name: 'Default Admin',
          defaultCurrency: 'MMK',
          timezone: 'Asia/Yangon',
          locale: 'en'
        }
      });
      
      console.log(`✅ Created default user: ${defaultUser.email} (ID: ${defaultUser.id})`);
      
      // Add user to organization as owner
      await prisma.organizationMember.create({
        data: {
          organizationId: defaultOrg.id,
          userId: defaultUser.id,
          role: 'owner'
        }
      });
      
      console.log(`✅ Added user to organization as owner`);
      
      var organizationId = defaultOrg.id;
    } else {
      console.log(`✅ Found ${organizations.length} existing organization(s)`);
      var organizationId = organizations[0].id;
      console.log(`📋 Using organization: ${organizations[0].name} (ID: ${organizationId})`);
    }
    
    // Check existing accounts
    const existingAccounts = await prisma.ledgerAccount.findMany({
      where: { organizationId }
    });
    
    console.log(`📊 Found ${existingAccounts.length} existing accounts`);
    
    if (existingAccounts.length > 0) {
      console.log('⚠️  Organization already has accounts. Skipping seeding to avoid duplicates.');
      console.log('💡 To force re-seeding, delete existing accounts first.');
      return;
    }
    
    // Seed the accounts
    console.log(`🌱 Seeding ${defaultAccounts.length} accounts for organization ${organizationId}...`);
    
    const createdAccounts = [];
    
    for (const accountData of defaultAccounts) {
      try {
        const account = await prisma.ledgerAccount.create({
          data: {
            ...accountData,
            organizationId,
            isActive: true
          }
        });
        
        createdAccounts.push(account);
        console.log(`✅ Created: ${account.code} - ${account.name} (${account.type})`);
      } catch (error) {
        console.error(`❌ Failed to create account ${accountData.code}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully seeded ${createdAccounts.length} accounts!`);
    console.log(`📊 Total accounts in organization: ${createdAccounts.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedAccounts();
