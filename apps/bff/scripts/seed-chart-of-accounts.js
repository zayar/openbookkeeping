#!/usr/bin/env node

/**
 * Manual Chart of Accounts Seeding Script
 * 
 * This script can be used to:
 * 1. Seed the default chart of accounts for existing organizations
 * 2. Test the seeding functionality
 * 3. Re-seed accounts if needed
 * 
 * Usage:
 *   node scripts/seed-chart-of-accounts.js <organizationId> [baseCurrency]
 * 
 * Example:
 *   node scripts/seed-chart-of-accounts.js org123 MMK
 */

const { ChartOfAccountsSeeder } = require('../dist/services/chartOfAccountsSeeder');
const { defaultChartOfAccounts } = require('../dist/data/chartOfAccounts');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Error: Organization ID is required');
    console.log('');
    console.log('Usage: node scripts/seed-chart-of-accounts.js <organizationId> [baseCurrency]');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/seed-chart-of-accounts.js org123 MMK');
    console.log('  node scripts/seed-chart-of-accounts.js org456 USD');
    console.log('');
    process.exit(1);
  }

  const organizationId = args[0];
  const baseCurrency = args[1] || 'MMK';

  console.log('🚀 Starting Chart of Accounts Seeding');
  console.log('=====================================');
  console.log(`Organization ID: ${organizationId}`);
  console.log(`Base Currency: ${baseCurrency}`);
  console.log('');

  try {
    // Validate the default chart structure
    console.log('📋 Validating default chart structure...');
    const validation = ChartOfAccountsSeeder.validateDefaultChart();
    
    if (!validation.isValid) {
      console.log('❌ Validation failed. Missing account types:', validation.missingTypes.join(', '));
      process.exit(1);
    }
    console.log('✅ Chart structure validation passed');

    // Get summary
    const summary = ChartOfAccountsSeeder.getDefaultChartSummary();
    console.log('');
    console.log('📊 Default Chart Summary:');
    console.log(`  Total Accounts: ${summary.totalAccounts}`);
    console.log(`  Asset Accounts: ${summary.assetAccounts}`);
    console.log(`  Liability Accounts: ${summary.liabilityAccounts}`);
    console.log(`  Equity Accounts: ${summary.equityAccounts}`);
    console.log(`  Income Accounts: ${summary.incomeAccounts}`);
    console.log(`  Expense Accounts: ${summary.expenseAccounts}`);
    console.log('');

    // Start seeding
    console.log('🌱 Starting to seed accounts...');
    const startTime = Date.now();
    
    const seededAccounts = await ChartOfAccountsSeeder.seedDefaultAccounts(organizationId, baseCurrency);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('');
    console.log('✅ Seeding completed successfully!');
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📈 Accounts created: ${seededAccounts.length}/${summary.totalAccounts}`);
    console.log('');

    if (seededAccounts.length < summary.totalAccounts) {
      console.log('⚠️  Some accounts failed to create. Check the logs for details.');
    }

    // Show first few created accounts as examples
    if (seededAccounts.length > 0) {
      console.log('📝 Sample created accounts:');
      seededAccounts.slice(0, 5).forEach(account => {
        console.log(`  ${account.code} - ${account.name} (${account.type})`);
      });
      
      if (seededAccounts.length > 5) {
        console.log(`  ... and ${seededAccounts.length - 5} more accounts`);
      }
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
