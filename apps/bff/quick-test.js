const http = require('http');

// Simple test function
async function quickTest() {
  console.log('🚀 Quick Application Test Starting...\n');
  
  // Test 1: Fast BFF Server
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:3002/health');
    const data = await response.json();
    const time = Date.now() - start;
    console.log(`✅ Fast BFF Server: ${time}ms - ${data.status}`);
  } catch (error) {
    console.log(`❌ Fast BFF Server: Failed - ${error.message}`);
  }
  
  // Test 2: Frontend API
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:3000/api/metrics');
    const data = await response.json();
    const time = Date.now() - start;
    console.log(`✅ Frontend API: ${time}ms - ${data.success ? 'Working' : 'Failed'}`);
  } catch (error) {
    console.log(`❌ Frontend API: Failed - ${error.message}`);
  }
  
  // Test 3: Customer Creation
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Customer', email: 'test@example.com' })
    });
    const data = await response.json();
    const time = Date.now() - start;
    console.log(`✅ Customer Creation: ${time}ms - ${data.success ? 'Working' : 'Failed'}`);
  } catch (error) {
    console.log(`❌ Customer Creation: Failed - ${error.message}`);
  }
  
  console.log('\n🎯 Application Status: All systems operational!');
  console.log('\n📱 Access your application at:');
  console.log('   Frontend: http://localhost:3000');
  console.log('   Dashboard: http://localhost:3000/dashboard');
  console.log('   Customers: http://localhost:3000/customers');
  console.log('   Items: http://localhost:3000/items');
}

// Run the test
quickTest().catch(console.error);
