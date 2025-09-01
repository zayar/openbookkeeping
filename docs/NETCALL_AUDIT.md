## Network Call Audit

Scope: apps/web, apps/bff, root libs. Goal: ensure Web → BFF only; BFF is the sole caller to OpenAccounting (OA).

### Findings Table

| File | Lines | Verb | URL / Pattern | Notes |
|---|---:|---|---|---|
| apps/web/components/providers/auth-provider.tsx | 46 | POST | /api/bff/auth/login | via Next rewrite to BFF |
| apps/web/components/providers/auth-provider.tsx | 87 | POST | /api/bff/auth/logout | via Next rewrite to BFF |
| apps/web/app/register/page.tsx | 42 | POST | http://localhost:3001/auth/register | Hardcoded absolute URL – bypasses Next rewrite; fix to /auth/register via /api/bff |
| apps/web/app/... (many) | various | GET/POST | /api/... | Correct pattern (proxies to BFF) |
| apps/web/next.config.js | 13,20,24 | - | BFF_URL env rewrite | Source of truth for proxying Web→BFF |
| contracts/oa-api-contracts.test.js | various | GET/POST | ${OA_BASE_URL}/... | Test-only OA calls; allowed outside Web |
| apps/bff/src/services/oaClient.ts | 28 | - | baseUrl: process.env.OA_BASE_URL || 'http://localhost:8080' | OA client base URL |
| apps/bff/src/services/oaClient.v2.ts | 41 | - | baseUrl: process.env.OA_BASE_URL || 'http://localhost:8080' | OA client base URL |
| apps/bff/src/routes/tenants.ts | 16,43,105 | GET/POST/GET | `${process.env.OA_BASE_URL}/organizations...` | Direct OA calls (OK inside BFF) |
| apps/bff/src/routes/reports.ts | 14,43 | GET | `${process.env.OA_BASE_URL}/organizations...` | Direct OA calls (OK inside BFF) |
| apps/bff/src/routes/journal.ts | 15,39,91,150,183 | GET/POST/PUT/DELETE | `${process.env.OA_BASE_URL}/organizations...` | Direct OA calls (OK inside BFF) |
| lib/auth.ts (root) | 7 | - | NEXT_PUBLIC_BFF_URL || 'http://localhost:3001' | Legacy; ensure Web uses /api/* only |
| perf/*, apps/bff/test-auth.js | various | - | http://localhost:3001 | Local perf/tests; not shipped |

### Base URL Definitions

- apps/web/next.config.js: `BFF_URL` controls rewrites `/api/bff/:path*` and `/api/:path*` → BFF.
- root `next.config.js`: also defines `BFF_URL` for non-apps/web environment (legacy; consolidate).
- BFF OA client(s): `process.env.OA_BASE_URL` with localhost fallback.
- Root docs/examples: references to `OA_BASE_URL` placeholders.

### BFF Route Surface (mounted in apps/bff/src/server.ts)

- /auth/*
- /api/items, /api/accounts, /api/bank-accounts, /api/customers, /api/warehouses, /api/branches, /api/taxes, /api/salespersons, /api/metrics
- Health: /health, /health/ready, /health/live
- Info: /, /api

Duplicates/Drift:
- Multiple server variants exist (`server-clean.ts`, `server-final.ts`, `server-working.ts`) – keep `src/server.ts` as the single entry.
- Accounts endpoints have hardened and v2 variants under `routes/accounts.hardened.ts` and `accounts.v2.ts` that aren’t mounted – potential drift; decide and remove or mount intentionally with versioned paths.

### Problems Identified

- Hardcoded absolute URL in `apps/web/app/register/page.tsx` (http://localhost:3001). This bypasses rewrites and breaks in non-local envs.
- Multiple baseURL definitions (root and apps/web). Risk of drift.
- OA calls are correctly isolated to the BFF, except tests.

### Recommendations

1) Replace all absolute URLs in Web with `/api/...` and centralize base via a helper `lib/getApiBase.ts` that always returns `/api` in browser.
2) Consolidate `BFF_URL` rewrite logic to a single source (apps/web/next.config.js) and remove root duplication.
3) Adopt `packages/config` for env loading and zod validation across monorepo.
4) Decide on accounts router variant; version under `/api/v1/...` and remove unused variants to avoid drift.

—
Generated on: ${new Date().toISOString()}

