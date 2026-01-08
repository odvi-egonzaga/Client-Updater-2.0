# Client Updater Version 2 - Health Check System

## Overview

The Health Check System provides comprehensive monitoring of all integrated services. It verifies that each service is properly configured and functioning correctly, providing real-time visibility into the system's health.

### Purpose

- **Service Verification**: Ensure all services are properly connected
- **Performance Monitoring**: Track response times for each service
- **Error Detection**: Identify and report service issues
- **Dashboard UI**: Visual representation of system health
- **Troubleshooting**: Quick diagnosis of integration issues

---

## Health Check Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Health Check Dashboard                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  │   Status     │  │   Status     │  │   Status     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TanStack Query Hook                       │
│              useHealthChecks()                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Hono API Routes                           │
│              /api/health/all                               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Service    │    │   Service    │    │   Service    │
│   Health     │    │   Health     │    │   Health     │
│   Check      │    │   Check      │    │   Check      │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Component Structure

```
src/features/health-check/
├── components/
│   └── health-dashboard.tsx    # Dashboard UI component
├── config.ts                   # Service configuration
├── types.ts                    # TypeScript types
└── index.ts                   # Feature exports

src/hooks/queries/
└── use-health-checks.ts        # TanStack Query hook

src/server/api/routes/health/
├── index.ts                   # Health route aggregation
├── clerk.ts                   # Clerk health checks
├── database.ts                # Database health checks
├── storage.ts                 # Storage health checks
├── edge-functions.ts          # Edge function checks
├── snowflake.ts               # Snowflake health checks
└── nextbank.ts               # NextBank health checks
```

---

## All Available Endpoints

### Health Check Endpoints

| Service | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Clerk** | `/api/health/clerk/user` | GET | Get current user |
| **Clerk** | `/api/health/clerk/org` | GET | Get organization membership |
| **Clerk** | `/api/health/clerk/members` | GET | List organization members |
| **Database** | `/api/health/database/write` | POST | Write test row to database |
| **Database** | `/api/health/database/read` | GET | Read test row from database |
| **Database** | `/api/health/database/delete` | DELETE | Delete test row from database |
| **Storage** | `/api/health/storage/upload` | POST | Upload test file to storage |
| **Storage** | `/api/health/storage/download` | GET | Generate signed URL for test file |
| **Storage** | `/api/health/storage/delete` | DELETE | Delete test file from storage |
| **Edge Functions** | `/api/health/edge/ping` | GET | Ping edge function (placeholder) |
| **Edge Functions** | `/api/health/edge/auth` | GET | Test auth header passthrough (placeholder) |
| **Snowflake** | `/api/health/snowflake/connect` | GET | Test Snowflake connection |
| **Snowflake** | `/api/health/snowflake/query` | GET | Execute test query |
| **NextBank** | `/api/health/nextbank/ping` | GET | Ping NextBank API |
| **NextBank** | `/api/health/nextbank/auth` | GET | Test NextBank authentication |
| **All** | `/api/health/all` | GET | Run all health checks |

---

## Dashboard Usage

### Accessing the Dashboard

Navigate to `/health` in your application:

```
http://localhost:3000/health
```

### Dashboard Components

**Overall Status Card**

Shows the overall system status:
- **Status Badge**: `HEALTHY`, `UNHEALTHY`, `PARTIAL`, or `PENDING`
- **Response Time**: Total time to run all checks
- **"Run All" Button**: Execute all health checks with counter showing total number of checks
- **Last Updated**: Timestamp of last check

**Service Cards**

Each service has its own card:
- **Service Name**: Display name of the service
- **Status Badge**: Service-level status
- **Check Count**: Number of checks for this service
- **Individual Check Buttons**: Each check has a dedicated "Run Check" button
- **Check Results**: Results display below each button

**Individual Check Buttons**

Each health check has its own button:
- **"Run Check" Button**: Execute individual health check
- **Loading State**: Spinner shows while check is in progress
- **Disabled State**: Button is disabled during execution

**Check Results Display**

Results appear below each check button:
- **Status Badge**: Individual check status with color coding
- **Response Time**: Time taken for the check (in milliseconds)
- **Error Message**: Detailed error if check failed
- **HTTP Status Code**: HTTP response status
- **Timestamp**: When the check was executed

### Status Types

| Status | Description | Color |
|---------|-------------|--------|
| **healthy** | Service is functioning correctly | Green |
| **unhealthy** | Service is not functioning | Red |
| **error** | Check failed with an error | Red |
| **pending** | Check is in progress | Yellow |
| **unconfigured** | Service is not configured | Gray |

### Using the Dashboard Hook

Located at [`src/hooks/queries/use-health-checks.ts`](../../src/hooks/queries/use-health-checks.ts):

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export function useHealthChecks() {
  return useQuery({
    queryKey: ['health-checks'],
    queryFn: async () => {
      const response = await fetch('/api/health/all')
      if (!response.ok) throw new Error('Failed to fetch health checks')
      return response.json()
    },
  })
}
```

**Usage:**

```typescript
import { useHealthChecks } from '@/hooks/queries/use-health-checks'

function MyComponent() {
  const { data, isLoading, error, refetch } = useHealthChecks()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>Status: {data?.status}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  )
}
```

---

## Adding New Health Checks

### Step 1: Define Service Configuration

Add to [`src/features/health-check/config.ts`](../../src/features/health-check/config.ts):

```typescript
export const SERVICES = [
  // ... existing services
  {
    name: 'Your Service',
    icon: 'icon-name',
    checks: [
      { name: 'Check Name', endpoint: '/your-service/check' },
    ],
  },
] as const
```

### Step 2: Create Health Check Routes

Create [`src/server/api/routes/health/your-service.ts`](../../src/server/api/routes/health/your-service.ts):

```typescript
import { Hono } from 'hono'

export const yourServiceHealthRoutes = new Hono()

yourServiceHealthRoutes.get('/check', async (c) => {
  const start = performance.now()

  try {
    // Perform your health check logic
    const result = await checkYourService()

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully checked service',
      data: result,
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Check failed',
      },
      500
    )
  }
})
```

### Step 3: Register Routes

Add to [`src/server/api/routes/health/index.ts`](../../src/server/api/routes/health/index.ts):

```typescript
import { yourServiceHealthRoutes } from './your-service'

export const healthRoutes = new Hono()

// ... existing routes
healthRoutes.route('/your-service', yourServiceHealthRoutes)
```

### Step 4: Add to Aggregated Check

Update the `/all` endpoint in [`src/server/api/routes/health/index.ts`](../../src/server/api/routes/health/index.ts):

```typescript
healthRoutes.get('/all', async (c) => {
  const start = performance.now()
  const baseUrl = new URL(c.req.url).origin

  const checks = [
    // ... existing checks
    { name: 'Your Service Check', url: `${baseUrl}/api/health/your-service/check` },
  ]

  // ... rest of the implementation
})
```

---

## Response Format Specification

### Standard Response Format

All health check endpoints follow this response format:

```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'error' | 'unconfigured' | 'pending'
  responseTimeMs: number
  message: string
  data?: any
  error?: string
}
```

### Successful Response

```json
{
  "status": "healthy",
  "responseTimeMs": 45,
  "message": "Successfully retrieved current user",
  "data": {
    "userId": "user_abc123",
    "hasOrg": true
  }
}
```

### Error Response

```json
{
  "status": "error",
  "responseTimeMs": 123,
  "error": "Connection failed"
}
```

### Unconfigured Response

```json
{
  "status": "unconfigured",
  "responseTimeMs": 5,
  "message": "Service not configured"
}
```

### Aggregated Response

The `/api/health/all` endpoint returns:

```typescript
interface AggregatedHealthResponse {
  status: 'healthy' | 'unhealthy' | 'partial'
  responseTimeMs: number
  timestamp: string
  services: {
    clerk: CheckResult[]
    database: CheckResult[]
    storage: CheckResult[]
    edge: CheckResult[]
    snowflake: CheckResult[]
    nextbank: CheckResult[]
  }
  checks: CheckResult[]
}
```

```json
{
  "status": "healthy",
  "responseTimeMs": 1234,
  "timestamp": "2025-12-29T08:00:00.000Z",
  "services": {
    "clerk": [
      {
        "name": "Clerk User",
        "status": "healthy",
        "responseTimeMs": 45,
        "httpStatus": 200
      }
    ],
    "database": [
      {
        "name": "Database Write",
        "status": "healthy",
        "responseTimeMs": 123,
        "httpStatus": 200
      }
    ]
  },
  "checks": [
    {
      "name": "Clerk User",
      "status": "healthy",
      "responseTimeMs": 45,
      "httpStatus": 200
    }
  ]
}
```

---

## Health Check Types

Located at [`src/features/health-check/types.ts`](../../src/features/health-check/types.ts):

```typescript
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
```

---

## Service Configuration

Located at [`src/features/health-check/config.ts`](../../src/features/health-check/config.ts):

```typescript
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
      { name: 'Test Authentication', endpoint: '/nextbank/auth' },
    ],
  },
] as const
```

---

## Best Practices

### 1. Keep Checks Fast

Health checks should be quick and lightweight:

```typescript
// ✅ Good - Fast check
const result = await db.select().from(table).limit(1)

// ❌ Bad - Slow check
const result = await db.select().from(table) // No limit
```

### 2. Use Meaningful Messages

Provide clear, actionable error messages:

```typescript
// ✅ Good - Clear message
return c.json({
  status: 'error',
  error: 'Failed to connect to database: connection timeout',
})

// ❌ Bad - Vague message
return c.json({
  status: 'error',
  error: 'Error',
})
```

### 3. Handle Unconfigured Services

Gracefully handle services that aren't configured:

```typescript
if (!env.SERVICE_API_KEY) {
  return c.json({
    status: 'unconfigured',
    message: 'Service not configured',
  })
}
```

### 4. Measure Response Time

Always track response time for performance monitoring:

```typescript
const start = performance.now()

try {
  // Perform check
  const result = await performCheck()
  
  return c.json({
    status: 'healthy',
    responseTimeMs: Math.round(performance.now() - start),
  })
} catch (error) {
  return c.json({
    status: 'error',
    responseTimeMs: Math.round(performance.now() - start),
    error: error.message,
  })
}
```

---

## Troubleshooting

### Common Issues

**Issue: Health check shows "unconfigured"**

- Verify environment variables are set
- Check if service credentials are correct
- Ensure service is enabled in configuration

**Issue: Health check shows "error"**

- Check service logs for detailed error messages
- Verify network connectivity to the service
- Check if service is running and accessible
- For Supabase Database: Ensure migrations are applied (`pnpm db:push` or `pnpm db:migrate`) so `health_check_tests` table exists

**Issue: Health check is slow**

- Optimize the check query or operation
- Check if service is experiencing high load
- Consider caching results for frequently checked services

---

## Related Documentation

- [API Layer](./api-layer.md) - API route implementation
- [Clerk Authentication](./clerk-authentication.md) - Clerk health checks
- [Supabase Integration](./supabase-integration.md) - Database and storage checks
- [Snowflake Integration](./snowflake-integration.md) - Snowflake health checks
- [State Management](./state-management.md) - Data fetching with TanStack Query
