// K6 Load Test for BFF Performance Validation
// Run with: k6 run load-test.k6.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// =============================================
// TEST CONFIGURATION
// =============================================

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users  
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    // Performance goals
    http_req_duration: ['p(95)<300'], // P95 under 300ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
    
    // Custom metrics
    'bff_response_time': ['p(95)<300'],
    'oa_upstream_time': ['p(95)<500'],
    'database_time': ['p(95)<100'],
  },
};

// Custom metrics
const bffResponseTime = new Trend('bff_response_time');
const oaUpstreamTime = new Trend('oa_upstream_time');
const databaseTime = new Trend('database_time');
const errorRate = new Rate('error_rate');
const authFailures = new Counter('auth_failures');

// =============================================
// TEST DATA AND SETUP
// =============================================

const BASE_URL = 'http://localhost:3000'; // Frontend proxy
const BFF_URL = 'http://localhost:3001';  // Direct BFF

let authToken = null;

export function setup() {
  // Authenticate once for all virtual users
  console.log('🔑 Setting up authentication...');
  
  const loginResponse = http.post(`${BFF_URL}/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (loginResponse.status === 200) {
    const loginData = JSON.parse(loginResponse.body);
    if (loginData.success && loginData.data.token) {
      authToken = loginData.data.token;
      console.log('✅ Authentication successful');
      return { authToken };
    }
  }
  
  console.error('❌ Authentication failed');
  return { authToken: null };
}

// =============================================
// TEST SCENARIOS
// =============================================

export default function(data) {
  if (!data.authToken) {
    authFailures.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json'
  };

  // Simulate realistic user behavior patterns
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Read-heavy operations (dashboard view)
    testReadHeavyScenario(headers);
  } else if (scenario < 0.7) {
    // 30% - Account management
    testAccountManagementScenario(headers);
  } else if (scenario < 0.9) {
    // 20% - Data entry operations
    testDataEntryScenario(headers);
  } else {
    // 10% - Reporting operations
    testReportingScenario(headers);
  }

  // Realistic pause between operations
  sleep(1 + Math.random() * 2);
}

function testReadHeavyScenario(headers) {
  const group = 'Read Heavy Operations';
  
  // Dashboard metrics
  let response = http.get(`${BASE_URL}/api/metrics`, { headers });
  check(response, {
    [`${group} - Metrics loaded`]: (r) => r.status === 200,
    [`${group} - Metrics response time OK`]: (r) => r.timings.duration < 500,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 200) errorRate.add(1);

  sleep(0.5);

  // List accounts
  response = http.get(`${BASE_URL}/api/accounts?page=1&limit=20`, { headers });
  check(response, {
    [`${group} - Accounts loaded`]: (r) => r.status === 200,
    [`${group} - Accounts paginated`]: (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.pagination && data.pagination.limit === 20;
      } catch { return false; }
    },
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 200) errorRate.add(1);

  sleep(0.3);

  // List items
  response = http.get(`${BASE_URL}/api/items?page=1&limit=10`, { headers });
  check(response, {
    [`${group} - Items loaded`]: (r) => r.status === 200,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 200) errorRate.add(1);
}

function testAccountManagementScenario(headers) {
  const group = 'Account Management';
  
  // Create account
  const accountData = {
    code: `TEST${Math.floor(Math.random() * 10000)}`,
    name: `Test Account ${Math.floor(Math.random() * 1000)}`,
    type: 'expense',
    description: 'Load test account'
  };

  let response = http.post(`${BASE_URL}/api/accounts`, JSON.stringify(accountData), { headers });
  let accountId = null;
  
  check(response, {
    [`${group} - Account created`]: (r) => r.status === 201,
    [`${group} - Create response time OK`]: (r) => r.timings.duration < 1000,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 201) errorRate.add(1);

  if (response.status === 201) {
    try {
      const data = JSON.parse(response.body);
      accountId = data.data.id;
    } catch (e) {
      // Handle parse error
    }
  }

  sleep(0.5);

  if (accountId) {
    // Get account details
    response = http.get(`${BASE_URL}/api/accounts/${accountId}`, { headers });
    check(response, {
      [`${group} - Account retrieved`]: (r) => r.status === 200,
    });
    bffResponseTime.add(response.timings.duration);
    if (response.status !== 200) errorRate.add(1);

    sleep(0.3);

    // Update account
    const updateData = {
      description: 'Updated by load test'
    };
    
    response = http.put(`${BASE_URL}/api/accounts/${accountId}`, JSON.stringify(updateData), { headers });
    check(response, {
      [`${group} - Account updated`]: (r) => r.status === 200,
    });
    bffResponseTime.add(response.timings.duration);
    if (response.status !== 200) errorRate.add(1);
  }
}

function testDataEntryScenario(headers) {
  const group = 'Data Entry';
  
  // Create customer
  const customerData = {
    name: `Test Customer ${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    customerType: 'business'
  };

  let response = http.post(`${BASE_URL}/api/customers`, JSON.stringify(customerData), { headers });
  check(response, {
    [`${group} - Customer created`]: (r) => r.status === 201,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 201) errorRate.add(1);

  sleep(0.5);

  // Create item
  const itemData = {
    name: `Test Item ${Math.floor(Math.random() * 1000)}`,
    type: 'goods',
    sellingPrice: 100.00,
    costPrice: 50.00,
    currency: 'MMK'
  };

  response = http.post(`${BASE_URL}/api/items`, JSON.stringify(itemData), { headers });
  check(response, {
    [`${group} - Item created`]: (r) => r.status === 201,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 201) errorRate.add(1);
}

function testReportingScenario(headers) {
  const group = 'Reporting';
  
  // Get trial balance (heavy operation)
  let response = http.get(`${BASE_URL}/api/reports/trial-balance`, { headers });
  check(response, {
    [`${group} - Trial balance loaded`]: (r) => r.status === 200,
    [`${group} - Report response time acceptable`]: (r) => r.timings.duration < 3000,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 200) errorRate.add(1);

  sleep(1);

  // Get journal entries
  const startDate = '2024-01-01';
  const endDate = '2024-12-31';
  response = http.get(`${BASE_URL}/api/journal?startDate=${startDate}&endDate=${endDate}&limit=50`, { headers });
  check(response, {
    [`${group} - Journal entries loaded`]: (r) => r.status === 200,
  });
  bffResponseTime.add(response.timings.duration);
  if (response.status !== 200) errorRate.add(1);
}

// =============================================
// TEST TEARDOWN
// =============================================

export function teardown(data) {
  console.log('🧹 Cleaning up test data...');
  // Cleanup logic would go here
}

// =============================================
// CUSTOM CHECKS
// =============================================

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test_duration: data.state.testRunDurationMs / 1000,
    virtual_users: data.options.stages.reduce((max, stage) => Math.max(max, stage.target), 0),
    
    // Performance metrics
    total_requests: data.metrics.http_reqs.values.count,
    requests_per_second: data.metrics.http_reqs.values.rate,
    error_rate: (data.metrics.http_req_failed.values.rate * 100).toFixed(2) + '%',
    
    // Latency metrics
    avg_duration: data.metrics.http_req_duration.values.avg.toFixed(2) + 'ms',
    p95_duration: data.metrics.http_req_duration.values['p(95)'].toFixed(2) + 'ms',
    p99_duration: data.metrics.http_req_duration.values['p(99)'].toFixed(2) + 'ms',
    
    // Goal validation
    performance_goals: {
      p95_under_300ms: data.metrics.http_req_duration.values['p(95)'] < 300,
      error_rate_under_1pct: data.metrics.http_req_failed.values.rate < 0.01,
      rps_over_50: data.metrics.http_reqs.values.rate > 50
    }
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 LOAD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`🕒 Duration: ${summary.test_duration}s`);
  console.log(`👥 Virtual Users: ${summary.virtual_users}`);
  console.log(`📈 Total Requests: ${summary.total_requests}`);
  console.log(`⚡ RPS: ${summary.requests_per_second.toFixed(1)}`);
  console.log(`❌ Error Rate: ${summary.error_rate}`);
  console.log(`📊 Latency:`);
  console.log(`   Average: ${summary.avg_duration}`);
  console.log(`   P95: ${summary.p95_duration}`);
  console.log(`   P99: ${summary.p99_duration}`);
  
  console.log('\n🎯 Performance Goals:');
  Object.entries(summary.performance_goals).forEach(([goal, met]) => {
    console.log(`   ${goal}: ${met ? '✅' : '❌'}`);
  });

  // Save detailed results
  return {
    'perf/load-test-results.json': JSON.stringify(summary, null, 2),
    stdout: JSON.stringify(summary, null, 2)
  };
}
