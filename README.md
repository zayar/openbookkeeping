# AI Accounting - Headless Accounting SaaS

A production-lite, headless accounting SaaS built on Open Accounting with modern web technologies.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web  │    │  Node.js BFF   │    │  OA Server     │
│   (Frontend)   │◄──►│  (Auth/Proxy)  │◄──►│  (Go/Cloud Run)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
   Cloud Run/Pages         Cloud Run              Cloud Run
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                           Cloud SQL (MySQL)
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **BFF**: Node.js + Express + NextAuth + JWT
- **Backend**: Open Accounting Server (Go) + Cloud SQL
- **Infrastructure**: GCP Cloud Run + Cloud SQL + Secret Manager
- **Package Manager**: pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose
- GCP CLI configured

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <repo>
   cd aiaccounting
   pnpm install
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Start local services**:
   ```bash
   pnpm dev
   ```

3. **Access services**:
   - Web: http://localhost:3000
   - BFF: http://localhost:3001
   - OA Server: http://localhost:8080

### Environment Variables

Create `.env.local` with:

```bash
# Database
DB_HOST=your_db_host
DB_USER=your_db_user
DB_NAME=your_db_name
DB_PASSWORD=your_secure_password

# OA Server
OA_BASE_URL=https://oa-server.example.com

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# GCP (for production)
GCP_PROJECT_ID=your-project-id
```

## Deployment

### 1. Deploy OA Server

```bash
cd apps/oa-server-deploy
gcloud run deploy oa-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DB_HOST=your_db_host,DB_USER=gtadmin,DB_NAME=openaccounting" \
  --set-secrets="DB_PASSWORD=OA_DB_PASSWORD:latest"
```

### 2. Deploy BFF

```bash
cd apps/bff
gcloud run deploy accounting-bff \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="OA_BASE_URL=https://oa-server-xxx-uc.a.run.app" \
  --set-secrets="JWT_SECRET=JWT_SECRET:latest"
```

### 3. Deploy Web App

```bash
cd apps/web
gcloud run deploy accounting-web \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Features

- ✅ Multi-tenant architecture
- ✅ JWT-based authentication
- ✅ Chart of Accounts management
- ✅ Journal Entry creation with balance validation
- ✅ Trial Balance & Ledger reports
- ✅ Secure API proxy (no client-side orgId)
- ✅ Modern, responsive UI
- ✅ Production-ready deployment

## Security

- No secrets in repository
- JWT tokens with short expiry
- Server-side orgId enforcement
- CORS locked to web origins
- Rate limiting on BFF
- Input validation and sanitization

## Development

- ESLint + Prettier + Husky
- TypeScript throughout
- Unit tests for critical business logic
- Docker Compose for local development
- pnpm workspaces for monorepo management
