# 🔗 Open Accounting BFF (Backend for Frontend)

A secure, multi-tenant authentication and API proxy server for the Open Accounting SaaS platform.

## 🏗️ Architecture

- **Authentication**: JWT + Google OAuth with Passport.js
- **Database**: Prisma ORM + MySQL (separate from OA database)
- **Multi-tenancy**: Organization-scoped access control
- **Security**: Rate limiting, CORS, Helmet, encrypted sessions
- **Caching**: Smart caching with tag-based invalidation
- **Audit**: Comprehensive audit logging for compliance

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure:

```bash
cp env.example .env
```

Configure these essential variables:
```env
# Database
BFF_DATABASE_URL="mysql://username:password@host:port/database"

# Open Accounting Server
OA_BASE_URL="https://your-oa-server.run.app"

# Authentication
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-secret"
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations in production
npx prisma migrate deploy
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Test Authentication

```bash
npm run test:auth
```

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Register user + create organization
- `POST /auth/login` - Email/password login
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user
- `POST /auth/switch-organization` - Switch organization context

### Health & Monitoring
- `GET /health` - System health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## 🔐 Authentication Flow

### 1. Registration
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "organizationName": "Acme Corp",
  "organizationDescription": "Sample company"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "organization": { "id": "...", "name": "...", "slug": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2. Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. Using JWT Token
```bash
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 4. Google OAuth
```bash
# Redirect user to:
GET /auth/google

# User will be redirected back to frontend with token
```

## 🏢 Multi-Tenancy

Every API request requires organization context:

```bash
# Method 1: JWT token with organizationId
Authorization: Bearer <token-with-org-id>

# Method 2: Header
X-Organization-ID: org_123456789

# Method 3: URL parameter
GET /api/accounts?organizationId=org_123456
```

The BFF automatically:
- Validates user access to organization
- Maps BFF organization ID to OA organization ID
- Injects correct tenant context in OA API calls

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and profiles
- `organizations` - Tenant organizations
- `organization_members` - User-organization relationships
- `organization_settings` - Tenant configurations

### Security & Audit
- `audit_logs` - All user actions and changes
- `api_keys` - API key management
- `sessions` - User sessions
- `accounts` - OAuth accounts (NextAuth compatible)

### Performance
- `cache_entries` - Smart caching with tag-based invalidation
- `sync_status` - OA synchronization status

## 🛡️ Security Features

### Authentication
- JWT tokens with configurable expiration
- Google OAuth integration
- Secure password hashing (bcrypt)
- Session management

### Authorization
- Role-based access control (owner, admin, member, viewer)
- Organization-scoped permissions
- API key authentication for service-to-service

### Security Headers
- CORS with configurable origins
- Helmet.js security headers
- Rate limiting per IP and endpoint
- Request logging and monitoring

### Data Protection
- Audit trail for all changes
- Encrypted sessions
- No sensitive data in JWT payload
- Secure cookie configuration

## 🚀 Deployment

### Cloud Run Deployment

1. **Build and push image:**
```bash
# Build for production
npm run build

# Create Dockerfile (already provided)
docker build -t bff-image .

# Push to Google Container Registry
docker tag bff-image gcr.io/PROJECT-ID/bff
docker push gcr.io/PROJECT-ID/bff
```

2. **Deploy to Cloud Run:**
```bash
gcloud run deploy bff-service \
  --image gcr.io/PROJECT-ID/bff \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets BFF_DATABASE_URL=BFF_DB_URL:latest,JWT_SECRET=JWT_SECRET:latest
```

3. **Configure secrets in Secret Manager:**
```bash
# Database connection
echo "mysql://user:pass@host:port/db" | gcloud secrets create BFF_DB_URL --data-file=-

# JWT secret
echo "your-production-jwt-secret" | gcloud secrets create JWT_SECRET --data-file=-

# Google OAuth
echo "google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BFF_DATABASE_URL` | MySQL connection string | Required |
| `OA_BASE_URL` | Open Accounting server URL | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Optional |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_CACHING` | Enable smart caching | `true` |
| `ENABLE_AUDIT_LOGS` | Enable audit logging | `true` |
| `ENABLE_RATE_LIMITING` | Enable rate limiting | `true` |
| `ENABLE_WEBHOOKS` | Enable webhook support | `false` |

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Authentication Tests
```bash
npm run test:auth
```

### Manual Testing
```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User","organizationName":"Test Org"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📊 Monitoring

### Health Checks
- `/health` - Overall system health
- `/health/ready` - Kubernetes readiness probe
- `/health/live` - Kubernetes liveness probe

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking and alerting
- Performance metrics

### Database Monitoring
- Connection pool status
- Query performance
- Cache hit rates
- Sync status with OA server

## 🤝 Development

### Adding New Features

1. **Create route handler:**
```typescript
// src/routes/myFeature.ts
import { authenticate, requireOrganization } from '../middleware/auth'

router.get('/my-endpoint', authenticate, requireOrganization, async (req, res) => {
  // Your logic here
})
```

2. **Add to main server:**
```typescript
// src/server.ts
import myFeatureRoutes from './routes/myFeature'
app.use('/api/my-feature', myFeatureRoutes)
```

3. **Add tests:**
```typescript
// src/tests/myFeature.test.ts
describe('My Feature', () => {
  it('should work correctly', async () => {
    // Test implementation
  })
})
```

### Database Changes

1. **Update Prisma schema:**
```prisma
// prisma/schema.prisma
model NewModel {
  id String @id @default(cuid())
  // fields...
}
```

2. **Generate client:**
```bash
npm run db:generate
```

3. **Create migration:**
```bash
npx prisma migrate dev --name add-new-model
```

## 📚 Next Steps

1. **API Proxy Routes** - Create secure proxy routes to OA server
2. **Frontend Integration** - Connect Next.js frontend with authentication
3. **Advanced Features** - Multi-currency, reporting, webhooks
4. **Performance** - Redis caching, connection pooling
5. **Monitoring** - Grafana dashboards, alerting

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check database connectivity
npx prisma db push --preview-feature
```

**Authentication Problems:**
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check Google OAuth credentials
curl "http://localhost:3001/auth/google"
```

**CORS Issues:**
```bash
# Verify CORS origins in environment
echo $ALLOWED_ORIGINS
```

For more help, check the logs:
```bash
# Development
npm run dev

# Production
docker logs container-id
```
