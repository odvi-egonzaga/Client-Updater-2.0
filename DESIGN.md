# Client Updater Version 2 - Design Document

## Overview

A production-ready Next.js boilerplate with integrated services, featuring a health check dashboard to verify all connections are working. This serves as the foundation for enterprise applications at ODVI.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js latest (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + Shadcn/ui | Utility-first CSS + component primitives |
| **Auth** | Clerk | Authentication & user management |
| **Database** | Supabase (PostgreSQL) | Primary transactional database |
| **ORM** | Drizzle | Type-safe database access |
| **Storage** | Supabase Storage | File uploads |
| **Edge Functions** | Supabase Edge Functions | Serverless compute |
| **API Layer** | Hono | Lightweight API framework |
| **Server State** | TanStack Query | Data fetching & caching |
| **Client State** | Zustand | UI state management |
| **Data Warehouse** | Snowflake | Analytics & reporting |
| **Core Banking** | NextBank API | Banking operations (placeholder) |

---

## Services to Integrate

### 1. Clerk Authentication
- User sign-up / sign-in (built-in Clerk components)
- Organization membership
- Session management
- Webhook sync to local DB

### 2. Supabase Database
- PostgreSQL via Drizzle ORM
- Connection pooling (Transaction mode)
- CRUD operations test

### 3. Supabase Storage
- File upload / download
- Signed URLs
- Bucket management

### 4. Supabase Edge Functions
- Serverless function invocation
- Auth header passthrough

### 5. Snowflake Data Warehouse
- Connection test via `snowflake-sdk`
- Query execution
- Warehouse/database verification

### 6. NextBank API (Placeholder)
- API connectivity check
- Authentication test
- Basic endpoint verification

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx              # Clerk <SignIn /> component
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx              # Clerk <SignUp /> component
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── health/
│   │   │   └── page.tsx              # Health check dashboard
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Dashboard index
│   │
│   ├── api/
│   │   ├── [[...route]]/
│   │   │   └── route.ts              # Hono catch-all
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts          # Clerk webhook handler
│   │
│   ├── layout.tsx
│   ├── page.tsx                      # Landing / redirect to sign-in
│   └── providers.tsx
│
│
├── server/
│   ├── api/
│   │   ├── index.ts                  # Hono app instance
│   │   ├── middleware/
│   │   │   ├── auth.ts               # Clerk auth middleware for Hono
│   │   │   └── logger.ts
│   │   └── routes/
│   │       ├── health/
│   │       │   ├── index.ts          # Aggregates all health routes
│   │       │   ├── clerk.ts
│   │       │   ├── database.ts
│   │       │   ├── storage.ts
│   │       │   ├── edge-functions.ts
│   │       │   ├── snowflake.ts
│   │       │   └── nextbank.ts       # Placeholder
│   │       └── users.ts
│   │
│   └── db/
│       ├── index.ts                  # Drizzle client
│       ├── schema/
│       │   ├── index.ts
│       │   ├── users.ts
│       │   └── health-checks.ts
│       ├── queries/
│       │   └── users.ts
│       └── migrations/
│
│
├── hooks/
│   ├── queries/
│   │   └── use-health-checks.ts
│   └── utils/
│       └── use-debounce.ts
│
│
├── stores/
│   └── ui-store.ts
│
│
├── components/
│   ├── ui/                           # Shadcn primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── collapsible.tsx
│   │   └── [...]
│   │
│   ├── layouts/
│   │   └── navbar.tsx
│   │
│   └── shared/
│       └── loading-spinner.tsx
│
│
├── features/
│   └── health-check/
│       ├── components/
│       │   └── health-dashboard.tsx
│       ├── config.ts
│       ├── types.ts
│       └── index.ts
│
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   │
│   ├── snowflake/
│   │   └── client.ts
│   │
│   ├── nextbank/
│   │   └── client.ts                 # Placeholder
│   │
│   ├── utils.ts
│   └── validators.ts
│
│
├── types/
│   └── index.ts
│
│
└── config/
    ├── env.ts
    └── site.ts

# Root files
├── drizzle.config.ts
├── middleware.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
└── .env.example
```

---

## Environment Variables

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST

# NextBank (placeholder)
NEXTBANK_API=https://api.nextbank.com
NEXTBANK_API_USERNAME=user
NEXTBANK_API_PASSWORD=pass
```

---

## Database Schema

### users.ts
```typescript
// src/server/db/schema/users.ts
import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),                    // Clerk user ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  imageUrl: text('image_url'),
  clerkOrgId: text('clerk_org_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### health-checks.ts
```typescript
// src/server/db/schema/health-checks.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const healthCheckTests = pgTable('health_check_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  testKey: text('test_key').notNull(),
  testValue: text('test_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type HealthCheckTest = typeof healthCheckTests.$inferSelect
```

---

## Health Check API Endpoints

| Service | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **Clerk** | `/api/health/clerk/user` | GET | Get current user |
| **Clerk** | `/api/health/clerk/org` | GET | Get org membership |
| **Clerk** | `/api/health/clerk/members` | GET | List org members |
| **Database** | `/api/health/database/write` | POST | Write test row |
| **Database** | `/api/health/database/read` | GET | Read test row |
| **Database** | `/api/health/database/delete` | DELETE | Delete test row |
| **Storage** | `/api/health/storage/upload` | POST | Upload test file |
| **Storage** | `/api/health/storage/download` | GET | Download test file |
| **Storage** | `/api/health/storage/delete` | DELETE | Delete test file |
| **Edge Functions** | `/api/health/edge/ping` | GET | Ping edge function |
| **Edge Functions** | `/api/health/edge/auth` | GET | Test auth header |
| **Snowflake** | `/api/health/snowflake/connect` | GET | Test connection |
| **Snowflake** | `/api/health/snowflake/query` | GET | Execute test query |
| **NextBank** | `/api/health/nextbank/ping` | GET | Ping API |
| **All** | `/api/health/all` | GET | Run all checks |

---

## Key Implementation Files

### 1. Hono App Setup

```typescript
// src/server/api/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'

const app = new Hono().basePath('/api')

app.use('*', logger())
app.use('*', cors())

// Public routes
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Protected routes
app.use('*', authMiddleware)
app.route('/health', healthRoutes)
app.route('/users', usersRoutes)

export { app }
export type AppType = typeof app
```

### 2. Hono Mount in Next.js

```typescript
// src/app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel'
import { app } from '@/server/api'

export const runtime = 'nodejs'

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
```

### 3. Auth Middleware for Hono

```typescript
// src/server/api/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { getAuth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'

export const authMiddleware = createMiddleware(async (c, next) => {
  const request = c.req.raw as NextRequest
  const auth = getAuth(request)
  
  if (!auth.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  c.set('auth', auth)
  c.set('userId', auth.userId)
  c.set('orgId', auth.orgId)
  
  await next()
})
```

### 4. Health Routes Aggregation

```typescript
// src/server/api/routes/health/index.ts
import { Hono } from 'hono'
import { clerkHealthRoutes } from './clerk'
import { databaseHealthRoutes } from './database'
import { storageHealthRoutes } from './storage'
import { edgeFunctionsHealthRoutes } from './edge-functions'
import { snowflakeHealthRoutes } from './snowflake'
import { nextbankHealthRoutes } from './nextbank'

export const healthRoutes = new Hono()

healthRoutes.route('/clerk', clerkHealthRoutes)
healthRoutes.route('/database', databaseHealthRoutes)
healthRoutes.route('/storage', storageHealthRoutes)
healthRoutes.route('/edge', edgeFunctionsHealthRoutes)
healthRoutes.route('/snowflake', snowflakeHealthRoutes)
healthRoutes.route('/nextbank', nextbankHealthRoutes)

healthRoutes.get('/all', async (c) => {
  // Run all checks in parallel and return aggregated results
  return c.json({ timestamp: new Date().toISOString(), services: {} })
})
```

### 5. Drizzle Client

```typescript
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { env } from '@/config/env'

const client = postgres(env.DATABASE_URL, { 
  prepare: false  // Required for Supabase Transaction pooling
})

export const db = drizzle(client, { schema })
```

### 6. Snowflake Client

```typescript
// src/lib/snowflake/client.ts
import snowflake from 'snowflake-sdk'
import { env } from '@/config/env'

const config = {
  account: env.SNOWFLAKE_ACCOUNT,
  username: env.SNOWFLAKE_USERNAME,
  password: env.SNOWFLAKE_PASSWORD,
  warehouse: env.SNOWFLAKE_WAREHOUSE,
  database: env.SNOWFLAKE_DATABASE,
  schema: env.SNOWFLAKE_SCHEMA,
  role: env.SNOWFLAKE_ROLE,
}

export function createSnowflakeConnection() {
  return snowflake.createConnection(config)
}

export async function connectSnowflake(): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    const connection = createSnowflakeConnection()
    connection.connect((err, conn) => {
      if (err) reject(err)
      else resolve(conn)
    })
  })
}

export async function executeQuery<T = unknown>(
  connection: snowflake.Connection,
  sqlText: string,
  binds?: unknown[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) reject(err)
        else resolve((rows || []) as T[])
      },
    })
  })
}

export async function destroyConnection(connection: snowflake.Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.destroy((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
```

### 7. Snowflake Health Routes

```typescript
// src/server/api/routes/health/snowflake.ts
import { Hono } from 'hono'
import { connectSnowflake, executeQuery, destroyConnection } from '@/lib/snowflake/client'

export const snowflakeHealthRoutes = new Hono()

snowflakeHealthRoutes.get('/connect', async (c) => {
  const start = performance.now()
  
  try {
    const connection = await connectSnowflake()
    await destroyConnection(connection)
    
    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully connected to Snowflake',
    })
  } catch (error) {
    return c.json({
      status: 'error',
      responseTimeMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Connection failed',
    }, 500)
  }
})

snowflakeHealthRoutes.get('/query', async (c) => {
  const start = performance.now()
  
  try {
    const connection = await connectSnowflake()
    const rows = await executeQuery<{ CURRENT_TIMESTAMP: string }>(
      connection,
      'SELECT CURRENT_TIMESTAMP()'
    )
    await destroyConnection(connection)
    
    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Query executed successfully',
      data: { timestamp: rows[0]?.CURRENT_TIMESTAMP },
    })
  } catch (error) {
    return c.json({
      status: 'error',
      responseTimeMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Query failed',
    }, 500)
  }
})
```

### 8. NextBank Client (Placeholder)

```typescript
// src/lib/nextbank/client.ts
import { env } from '@/config/env'

class NextBankClient {
  private apiUrl: string
  private username: string
  private password: string

  constructor() {
    this.apiUrl = env.NEXTBANK_API ?? ''
    this.username = env.NEXTBANK_API_USERNAME ?? ''
    this.password = env.NEXTBANK_API_PASSWORD ?? ''
  }

  async ping(fingerprint: string): Promise<{ status: string; timestamp: string }> {
    // TODO: Implement actual NextBank API ping
    const response = await fetch(`${this.apiUrl}/management/status`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${this.username}:${this.password}`),
        'Content-Type': 'application/json',
        'User-Agent': 'client-updater-version-2-health-check',
      },
      body: JSON.stringify({
        fingerprint,
      }),
    })
    if (!response.ok) throw new Error(`NextBank API error: ${response.status}`)
    return response.json()
  }
}

export const nextbankClient = new NextBankClient()
```

### 9. NextBank Health Routes (Placeholder)

```typescript
// src/server/api/routes/health/nextbank.ts
import { Hono } from 'hono'
import { nextbankClient } from '@/lib/nextbank/client'
import { env } from '@/config/env'

export const nextbankHealthRoutes = new Hono()

nextbankHealthRoutes.get('/ping', async (c) => {
  const start = performance.now()
  
  if (!env.NEXTBANK_API) {
    return c.json({
      status: 'unconfigured',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'NextBank API not configured',
    })
  }
  
  try {
    const result = await nextbankClient.ping()
    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      data: result,
    })
  } catch (error) {
    return c.json({
      status: 'error',
      responseTimeMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Ping failed',
    }, 500)
  }
})
```

### 10. Environment Validation

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  
  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  DATABASE_URL: z.string(),
  
  // Snowflake
  SNOWFLAKE_ACCOUNT: z.string(),
  SNOWFLAKE_USERNAME: z.string(),
  SNOWFLAKE_PASSWORD: z.string(),
  SNOWFLAKE_WAREHOUSE: z.string(),
  SNOWFLAKE_DATABASE: z.string(),
  SNOWFLAKE_SCHEMA: z.string(),
  SNOWFLAKE_ROLE: z.string(),
  
  // NextBank (optional)
  NEXTBANK_API: z.string().url().optional(),
  NEXTBANK_API_USERNAME: z.string().optional(),
  NEXTBANK_API_PASSWORD: z.string().optional(),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

---

## Auth Pages (Clerk Built-in Components)

```typescript
// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

```typescript
// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
```

---

## Health Check Dashboard

### Overview

The Health Check Dashboard provides a comprehensive monitoring interface for all integrated services. It features:

- **Overall System Status Card**: Shows aggregate health status with response time
- **"Run All" Button**: Executes all health checks with a counter showing total number of checks
- **Individual Service Cards**: Each service has its own card with status badge
- **Individual Check Buttons**: Each health check has a dedicated "Run Check" button
- **Real-time Results**: Check results are displayed below each button with detailed information
- **Loading States**: Visual feedback while checks are in progress

### Types

```typescript
// src/features/health-check/types.ts
export type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'pending' | 'unconfigured'

export interface ServiceCheck {
  name: string
  endpoint: string
  status: HealthStatus
  responseTimeMs?: number
  error?: string
}

export interface ServiceHealth {
  name: string
  icon: string
  status: HealthStatus
  responseTimeMs: number
  checks: ServiceCheck[]
}

export interface IndividualCheckResult {
  name: string
  status: HealthStatus
  responseTimeMs?: number
  error?: string
  httpStatus?: number
  timestamp?: string
}
```

### Service Configuration

```typescript
// src/features/health-check/config.ts
export const SERVICES = [
  {
    name: 'Clerk Authentication',
    icon: 'key',
    checks: [
      { name: 'Get Current User', endpoint: '/clerk/user' },
      { name: 'Get Org Membership', endpoint: '/clerk/org' },
      { name: 'List Org Members', endpoint: '/clerk/members' },
    ],
  },
  {
    name: 'Supabase Database',
    icon: 'database',
    checks: [
      { name: 'Write Test Row', endpoint: '/database/write' },
      { name: 'Read Test Row', endpoint: '/database/read' },
      { name: 'Delete Test Row', endpoint: '/database/delete' },
    ],
  },
  {
    name: 'Supabase Storage',
    icon: 'folder',
    checks: [
      { name: 'Upload Test File', endpoint: '/storage/upload' },
      { name: 'Download Test File', endpoint: '/storage/download' },
      { name: 'Delete Test File', endpoint: '/storage/delete' },
    ],
  },
  {
    name: 'Supabase Edge Functions',
    icon: 'zap',
    checks: [
      { name: 'Ping Edge Function', endpoint: '/edge/ping' },
      { name: 'Test Auth Header', endpoint: '/edge/auth' },
    ],
  },
  {
    name: 'Snowflake',
    icon: 'snowflake',
    checks: [
      { name: 'Test Connection', endpoint: '/snowflake/connect' },
      { name: 'Execute Query', endpoint: '/snowflake/query' },
    ],
  },
  {
    name: 'NextBank',
    icon: 'building',
    checks: [
      { name: 'Ping API', endpoint: '/nextbank/ping' },
    ],
  },
] as const
```

### Dashboard Component

```typescript
// src/features/health-check/components/health-dashboard.tsx
'use client'

import { useHealthChecks } from '@/hooks/queries/use-health-checks'
import { SERVICES } from '@/features/health-check/config'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, Clock, Shield, Play, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { HealthStatus } from '@/features/health-check/types'

const statusIcons: Record<HealthStatus, React.ReactNode> = {
  healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
  unhealthy: <XCircle className="h-5 w-5 text-red-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  unconfigured: <Shield className="h-5 w-5 text-gray-400" />,
}

const statusColors: Record<HealthStatus, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-200',
  unhealthy: 'bg-red-100 text-red-800 border-red-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  unconfigured: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function HealthDashboard() {
  const { data, isLoading, error, refetch } = useHealthChecks()
  const [individualChecks, setIndividualChecks] = useState<Record<string, IndividualCheckResult>>({})
  const [loadingChecks, setLoadingChecks] = useState<Set<string>>(new Set())

  const totalHealthChecks = SERVICES.reduce((total, service) => total + service.checks.length, 0)

  const runIndividualCheck = async (serviceName: string, checkName: string, endpoint: string) => {
    const checkKey = `${serviceName}-${checkName}`
    setLoadingChecks((prev) => new Set(prev).add(checkKey))

    try {
      const response = await fetch(`/api/health${endpoint}`)
      const result = await response.json()

      setIndividualChecks((prev) => ({
        ...prev,
        [checkKey]: {
          name: checkName,
          status: result.status || (response.ok ? 'healthy' : 'error'),
          responseTimeMs: result.responseTimeMs,
          error: result.error,
          httpStatus: response.status,
          timestamp: new Date().toISOString(),
        },
      }))
    } catch (err) {
      setIndividualChecks((prev) => ({
        ...prev,
        [checkKey]: {
          name: checkName,
          status: 'error',
          error: err instanceof Error ? err.message : 'Check failed',
          timestamp: new Date().toISOString(),
        },
      }))
    } finally {
      setLoadingChecks((prev) => {
        const next = new Set(prev)
        next.delete(checkKey)
        return next
      })
    }
  }

  const runAllChecks = async () => {
    refetch()
    // Also run individual checks for better UX
    for (const service of SERVICES) {
      for (const check of service.checks) {
        await runIndividualCheck(service.name, check.name, check.endpoint)
      }
    }
  }

  // ... UI rendering code
}
```

### Dashboard Page

```typescript
// src/app/(dashboard)/health/page.tsx
import { HealthDashboard } from '@/features/health-check'

export default function HealthPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Health Check Dashboard</h1>
        <p className="text-muted-foreground">
          Verify all services are connected and working correctly.
        </p>
      </div>
      <HealthDashboard />
    </div>
  )
}
```

### Dashboard Layout

```typescript
// src/app/(dashboard)/layout.tsx
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/health" className="font-semibold">Client Updater Version 2</Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

### Dashboard Features

1. **Overall Status Card**
   - Shows aggregate health status of all services
   - Displays total response time for all checks
   - "Run All Checks" button with counter showing total number of health checks
   - Last updated timestamp

2. **Individual Service Cards**
   - Each service has its own card with status badge
   - Shows number of checks for the service
   - Displays service-level health status

3. **Individual Check Buttons**
   - Each health check has a dedicated "Run Check" button
   - Loading spinner while check is in progress
   - Button is disabled during execution

4. **Check Results Display**
   - Results appear below each check button
   - Shows status badge with color coding
   - Displays response time in milliseconds
   - Shows error message if check failed
   - Displays HTTP status code
   - Shows timestamp of when check was executed

5. **Status Indicators**
   - Green checkmark for healthy status
   - Red X for error/unhealthy status
   - Yellow clock for pending status
   - Gray shield for unconfigured status

---

## Providers

```typescript
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/nextjs'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
  }))

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  )
}
```

---

## Clerk Middleware

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/ping',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

---

## Setup Commands

```bash
# Create Next.js app
npx create-next-app@latest odvi-boilerplate --typescript --tailwind --eslint --app --src-dir

# Core dependencies
pnpm add hono @clerk/nextjs
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add drizzle-orm postgres
pnpm add @tanstack/react-query zustand
pnpm add snowflake-sdk
pnpm add zod svix

# Dev dependencies
pnpm add -D drizzle-kit @types/snowflake-sdk

# Shadcn
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge collapsible

# Database
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

---

## Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/server/db/schema/index.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

---

## Summary

| Service | Status | Health Checks |
|---------|--------|---------------|
| Clerk Authentication | Implemented | User, Org, Members |
| Supabase Database | Implemented | Write, Read, Delete |
| Supabase Storage | Implemented | Upload, Download, Delete |
| Supabase Edge Functions | Implemented | Ping, Auth Header |
| Snowflake | Implemented | Connect, Query |
| NextBank | Placeholder | Ping |

The health check dashboard uses:
- **Clerk built-in components** for auth (`<SignIn />`, `<SignUp />`, `<UserButton />`)
- **Shadcn primitives** for UI (`Card`, `Button`, `Badge`, `Collapsible`)
- **Lucide icons** for service indicators
