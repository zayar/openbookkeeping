# 🚀 Redis MemoryStore Setup Guide

## 📋 Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Cloud SQL instance** already running (✅ You have this)
3. **VPC Network** (default or custom)
4. **gcloud CLI** installed and authenticated

## 🔧 Step 1: Create MemoryStore Instance

### Option A: Using gcloud CLI (Recommended)

```bash
# Set your project
gcloud config set project aiaccount-1c845

# Create MemoryStore Redis instance
gcloud redis instances create openaccounting-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_6_x \
    --tier=basic \
    --network=default \
    --display-name="OpenAccounting Redis Cache"

# Wait for creation (takes 5-10 minutes)
gcloud redis instances describe openaccounting-redis --region=us-central1
```

### Option B: Using Google Cloud Console

1. Go to **MemoryStore > Redis** in Google Cloud Console
2. Click **Create Instance**
3. Configure:
   - **Instance ID**: `openaccounting-redis`
   - **Display Name**: `OpenAccounting Redis Cache`
   - **Tier**: `Basic`
   - **Memory**: `1 GB`
   - **Region**: `us-central1`
   - **Zone**: `us-central1-a`
   - **Network**: `default` (or your VPC)
   - **Redis Version**: `6.x`

## 🔑 Step 2: Get Connection Details

```bash
# Get Redis instance details
gcloud redis instances describe openaccounting-redis --region=us-central1

# Note the output:
# - host: 10.x.x.x (private IP)
# - port: 6379
# - authorizedNetwork: projects/aiaccount-1c845/global/networks/default
```

## 🛠️ Step 3: Install Redis Dependencies

```bash
# Navigate to BFF directory
cd apps/bff

# Install Redis client
npm install ioredis
npm install @types/ioredis --save-dev

# Install for development/testing
npm install redis-mock --save-dev
```

## ⚙️ Step 4: Environment Configuration

Add to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=10.x.x.x          # Replace with your MemoryStore IP
REDIS_PORT=6379
REDIS_PASSWORD=              # Leave empty for Basic tier
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600

# Cache TTL Settings (optional)
CACHE_TTL_ACCOUNTS=3600      # 1 hour
CACHE_TTL_ITEMS=1800         # 30 minutes
CACHE_TTL_CUSTOMERS=900      # 15 minutes
CACHE_TTL_METRICS=300        # 5 minutes
CACHE_TTL_SESSIONS=86400     # 24 hours
```

## 📝 Step 5: Update Your Server

### 5.1 Import Cache Service

Add to your `server.js`:

```javascript
// Add at the top with other imports
import { cacheService } from './src/services/redis-cache.js'
import { 
  accountsCacheMiddleware,
  metricsCacheMiddleware,
  itemsCacheMiddleware,
  customersCacheMiddleware,
  bankAccountsCacheMiddleware,
  invalidateAccountsCache,
  invalidateItemsCache,
  invalidateCustomersCache,
  apiRateLimit
} from './src/middleware/cache-middleware.js'

// Add global rate limiting
app.use('/api', apiRateLimit)
```

### 5.2 Add Cached Endpoints

Replace your existing endpoints with cached versions:

```javascript
// Chart of Accounts - cached for 1 hour
app.get('/api/accounts', 
  validateToken, 
  accountsCacheMiddleware,
  async (req, res) => {
    // Your existing logic
  }
)

// Items - cached for 30 minutes
app.get('/api/items',
  validateToken,
  itemsCacheMiddleware, 
  async (req, res) => {
    // Your existing logic
  }
)

// Customers - cached for 15 minutes
app.get('/api/customers',
  validateToken,
  customersCacheMiddleware,
  async (req, res) => {
    // Your existing logic
  }
)

// Bank Accounts - cached for 1 hour
app.get('/api/bank-accounts',
  validateToken,
  bankAccountsCacheMiddleware,
  async (req, res) => {
    // Your existing logic
  }
)

// Metrics - cached for 5 minutes (most important!)
app.get('/api/metrics',
  validateToken,
  metricsCacheMiddleware,
  async (req, res) => {
    // Your existing expensive aggregation logic
  }
)
```

### 5.3 Add Cache Invalidation

Add invalidation to mutation endpoints:

```javascript
// Invalidate cache when accounts are modified
app.post('/api/accounts', 
  validateToken, 
  invalidateAccountsCache,
  async (req, res) => {
    // Your existing logic
  }
)

app.put('/api/accounts/:id',
  validateToken,
  invalidateAccountsCache, 
  async (req, res) => {
    // Your existing logic
  }
)

// Similar for other entities...
app.post('/api/items', validateToken, invalidateItemsCache, /* handler */)
app.post('/api/customers', validateToken, invalidateCustomersCache, /* handler */)
```

### 5.4 Add Health Check

```javascript
// Add Redis health check to existing health endpoint
app.get('/health', async (req, res) => {
  try {
    // Existing database check
    const dbResult = await prisma.$queryRaw`SELECT 1`
    
    // Add Redis health check
    const redisHealth = await cacheService.healthCheck()
    
    res.json({
      status: 'healthy',
      database: 'connected',
      redis: redisHealth.healthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      ...(redisHealth.latency && { redisLatency: `${redisHealth.latency}ms` })
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})
```

## 🧪 Step 6: Test the Implementation

### 6.1 Basic Connection Test

Create a test file `test-redis.js`:

```javascript
import { cacheService } from './src/services/redis-cache.js'

async function testRedis() {
  console.log('🧪 Testing Redis connection...')
  
  // Health check
  const health = await cacheService.healthCheck()
  console.log('Health:', health)
  
  // Test set/get
  await cacheService.setOrgData('test-org', 'test-key', { message: 'Hello Redis!' }, 60)
  const data = await cacheService.getOrgData('test-org', 'test-key')
  console.log('Retrieved:', data)
  
  // Cleanup
  await cacheService.deleteOrgData('test-org', 'test-key')
  console.log('✅ Redis test completed')
  
  process.exit(0)
}

testRedis().catch(console.error)
```

Run the test:
```bash
node test-redis.js
```

### 6.2 Performance Test

Test your endpoints before and after:

```bash
# Test metrics endpoint (should be much faster after caching)
time curl -s http://localhost:3001/api/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test accounts endpoint
time curl -s http://localhost:3001/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Step 7: Monitoring and Alerts

### 7.1 Redis Monitoring

```bash
# Check Redis instance status
gcloud redis instances describe openaccounting-redis --region=us-central1

# View Redis metrics in Cloud Console
# Go to MemoryStore > Redis > openaccounting-redis > Monitoring
```

### 7.2 Application Monitoring

Add Redis stats endpoint:

```javascript
app.get('/api/cache/stats', validateToken, async (req, res) => {
  try {
    const stats = await cacheService.getStats()
    const health = await cacheService.healthCheck()
    
    res.json({
      success: true,
      data: {
        health,
        stats
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})
```

## 🔧 Step 8: Production Optimizations

### 8.1 Connection Pooling

Update Redis configuration for production:

```javascript
// In redis-cache.ts
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // Production optimizations
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  // Connection pooling
  family: 4,
  keepAlive: true,
  // Cluster support (if using Standard tier)
  enableAutoPipelining: true,
})
```

### 8.2 Memory Management

```javascript
// Add memory monitoring
setInterval(async () => {
  const stats = await cacheService.getStats()
  if (stats?.memory) {
    const memoryUsage = parseFloat(stats.memory.used_memory_human)
    if (memoryUsage > 800) { // 800MB threshold for 1GB instance
      logger.warn('Redis memory usage high', { memoryUsage })
    }
  }
}, 60000) // Check every minute
```

## 🚨 Step 9: Troubleshooting

### Common Issues:

1. **Connection Refused**
   ```bash
   # Check if Redis instance is running
   gcloud redis instances describe openaccounting-redis --region=us-central1
   
   # Verify network connectivity
   # Your BFF must be in the same VPC as Redis
   ```

2. **Cache Misses**
   ```javascript
   // Add debug logging
   logger.debug('Cache attempt', { orgId, key, hit: !!cachedData })
   ```

3. **Memory Issues**
   ```bash
   # Monitor Redis memory
   gcloud logging read "resource.type=redis_instance" --limit=50
   ```

4. **Performance Not Improved**
   ```javascript
   // Check if middleware is applied correctly
   // Verify TTL settings
   // Monitor cache hit rates
   ```

## 📈 Step 10: Expected Results

After implementation, you should see:

### Performance Improvements:
- **Dashboard metrics**: 2-4s → 50-200ms (95% improvement)
- **Chart of Accounts**: 500-800ms → 50-100ms (90% improvement)
- **Items list**: 300-600ms → 30-100ms (85% improvement)
- **Customers list**: 200-400ms → 20-80ms (85% improvement)

### Database Load Reduction:
- **60-80% fewer read queries**
- **Better connection pool utilization**
- **Reduced Cloud SQL costs**

### Cache Hit Rates (Target):
- **Accounts**: 90%+ hit rate
- **Items**: 85%+ hit rate
- **Metrics**: 95%+ hit rate
- **Customers**: 80%+ hit rate

## 🎯 Next Steps

1. **Monitor for 1 week** - Watch performance and cache hit rates
2. **Optimize TTLs** - Adjust based on actual usage patterns
3. **Add more endpoints** - Cache other frequently accessed data
4. **Consider Standard tier** - For high availability if needed
5. **Implement pub/sub** - For real-time features

## 💰 Cost Monitoring

- **MemoryStore Basic 1GB**: ~$50/month
- **Monitor usage**: Set up billing alerts
- **Scale up if needed**: Can increase to 5GB (~$250/month)

Your Redis cache is now ready to dramatically improve your OpenAccounting platform performance! 🚀
