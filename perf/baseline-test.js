// Baseline Performance Test for BFF
// Run with: node baseline-test.js

const fetch = require('node-fetch');

const BFF_URL = 'http://localhost:3001';
const WEB_URL = 'http://localhost:3000';

// Test configuration
const CONCURRENT_USERS = 10;
const TEST_DURATION_MS = 30000; // 30 seconds
const WARMUP_DURATION_MS = 5000; // 5 seconds

class PerformanceBaseline {
  constructor() {
    this.results = {
      requests: [],
      errors: [],
      startTime: null,
      endTime: null
    };
    this.authToken = null;
  }

  async authenticate() {
    try {
      console.log('🔑 Authenticating test user...');
      const response = await fetch(`${BFF_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123'
        })
      });

      const data = await response.json();
      if (data.success && data.data.token) {
        this.authToken = data.data.token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.error('❌ Authentication failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      return false;
    }
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    try {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${WEB_URL}${endpoint}`, options);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        requestId,
        endpoint,
        method,
        statusCode: response.status,
        duration,
        timestamp: startTime,
        success: response.ok
      };

      this.results.requests.push(result);

      if (!response.ok) {
        this.results.errors.push({
          ...result,
          error: `HTTP ${response.status}`
        });
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const errorResult = {
        requestId,
        endpoint,
        method,
        statusCode: 0,
        duration,
        timestamp: startTime,
        success: false,
        error: error.message
      };

      this.results.requests.push(errorResult);
      this.results.errors.push(errorResult);
      
      return errorResult;
    }
  }

  async runLoadTest() {
    console.log('🚀 Starting baseline performance test...');
    console.log(`📊 Config: ${CONCURRENT_USERS} concurrent users, ${TEST_DURATION_MS/1000}s duration`);
    
    // Authenticate first
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.error('❌ Cannot proceed without authentication');
      return;
    }

    this.results.startTime = Date.now();
    
    // Warmup phase
    console.log('🔥 Warmup phase...');
    await this.warmup();
    
    // Main test phase
    console.log('📈 Load test phase...');
    await this.loadTest();
    
    this.results.endTime = Date.now();
    
    // Generate report
    this.generateReport();
  }

  async warmup() {
    const warmupPromises = [];
    for (let i = 0; i < 5; i++) {
      warmupPromises.push(this.makeRequest('/api/accounts'));
    }
    await Promise.all(warmupPromises);
    
    // Clear warmup results
    this.results.requests = [];
    this.results.errors = [];
  }

  async loadTest() {
    const testEndTime = Date.now() + TEST_DURATION_MS;
    const workers = [];

    // Start concurrent workers
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      workers.push(this.workerLoop(testEndTime, i));
    }

    await Promise.all(workers);
  }

  async workerLoop(endTime, workerId) {
    const endpoints = [
      '/api/accounts',
      '/api/items', 
      '/api/metrics',
      '/api/customers'
    ];

    while (Date.now() < endTime) {
      // Simulate realistic usage pattern
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      await this.makeRequest(endpoint);
      
      // Small delay between requests (realistic user behavior)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }
  }

  generateReport() {
    const totalRequests = this.results.requests.length;
    const totalErrors = this.results.errors.length;
    const testDuration = (this.results.endTime - this.results.startTime) / 1000;
    
    // Calculate latency percentiles
    const durations = this.results.requests.map(r => r.duration).sort((a, b) => a - b);
    const p50 = this.percentile(durations, 50);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    // Calculate RPS
    const rps = totalRequests / testDuration;
    
    // Error rate
    const errorRate = (totalErrors / totalRequests) * 100;

    console.log('\n' + '='.repeat(60));
    console.log('📊 BASELINE PERFORMANCE RESULTS');
    console.log('='.repeat(60));
    console.log(`🕒 Test Duration: ${testDuration.toFixed(1)}s`);
    console.log(`📈 Total Requests: ${totalRequests}`);
    console.log(`⚡ Requests/sec: ${rps.toFixed(1)}`);
    console.log(`❌ Error Rate: ${errorRate.toFixed(1)}%`);
    console.log(`📊 Latency (ms):`);
    console.log(`   Average: ${avg.toFixed(1)}ms`);
    console.log(`   P50: ${p50}ms`);
    console.log(`   P95: ${p95}ms ⚠️ Target: <300ms`);
    console.log(`   P99: ${p99}ms`);
    
    // Error breakdown
    if (totalErrors > 0) {
      console.log(`\n❌ Error Breakdown:`);
      const errorsByType = {};
      this.results.errors.forEach(error => {
        const key = error.statusCode || 'Network';
        errorsByType[key] = (errorsByType[key] || 0) + 1;
      });
      
      Object.entries(errorsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} (${((count/totalErrors)*100).toFixed(1)}%)`);
      });
    }

    // Endpoint breakdown
    console.log(`\n📋 Endpoint Performance:`);
    const endpointStats = {};
    this.results.requests.forEach(req => {
      if (!endpointStats[req.endpoint]) {
        endpointStats[req.endpoint] = [];
      }
      endpointStats[req.endpoint].push(req.duration);
    });

    Object.entries(endpointStats).forEach(([endpoint, durations]) => {
      const sorted = durations.sort((a, b) => a - b);
      const endpointP95 = this.percentile(sorted, 95);
      const endpointAvg = sorted.reduce((sum, d) => sum + d, 0) / sorted.length;
      console.log(`   ${endpoint}: avg=${endpointAvg.toFixed(1)}ms, p95=${endpointP95}ms`);
    });

    console.log('\n🎯 Performance Goals:');
    console.log(`   Read endpoints P95: <300ms (current: ${p95}ms) ${p95 < 300 ? '✅' : '❌'}`);
    console.log(`   Error rate: <1% (current: ${errorRate.toFixed(1)}%) ${errorRate < 1 ? '✅' : '❌'}`);
    console.log(`   RPS capacity: >100 (current: ${rps.toFixed(1)}) ${rps > 100 ? '✅' : '❌'}`);

    // Save detailed results
    const detailedResults = {
      summary: {
        testDuration,
        totalRequests,
        rps,
        errorRate,
        latency: { avg, p50, p95, p99 }
      },
      requests: this.results.requests,
      errors: this.results.errors,
      timestamp: new Date().toISOString()
    };

    require('fs').writeFileSync(
      `perf/baseline-results-${Date.now()}.json`, 
      JSON.stringify(detailedResults, null, 2)
    );
    
    console.log(`\n💾 Detailed results saved to perf/baseline-results-${Date.now()}.json`);
  }

  percentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }
}

// Run the baseline test
async function main() {
  const baseline = new PerformanceBaseline();
  await baseline.runLoadTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceBaseline;
