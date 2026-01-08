# Client Updater Version 2 - API Layer

## Overview

The Client Updater Version 2 uses [Hono](https://hono.dev/) as the API layer. Hono is a lightweight, fast web framework that provides an excellent developer experience with full TypeScript support.

### Why Hono?

- **Lightweight**: Small bundle size (~14KB)
- **Fast**: Built on Web Standards, optimized for performance
- **Type-Safe**: Full TypeScript support with inferred types
- **Middleware Support**: Composable middleware system
- **Flexible**: Works with multiple runtimes (Node.js, Edge, Deno)
- **Easy to Learn**: Simple, intuitive API

---

## Hono Framework Setup

### 1. Install Hono

```bash
pnpm add hono
```

### 2. Create Hono App

Create [`src/server/api/index.ts`](../../src/server/api/index.ts):

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'

const app = new Hono().basePath('/api')

// Global middleware
app.use('*', logger())
app.use('*', cors())

// Public routes
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Protected routes - require authentication
app.use('*', authMiddleware)
app.route('/health', healthRoutes)
app.route('/users', usersRoutes)

export { app }
export type AppType = typeof app
```

### 3. Mount Hono in Next.js

Create [`src/app/api/[[...route]]/route.ts`](../../src/app/api/[[...route]]/route.ts):

```typescript
import { handle } from 'hono/vercel'
import { app } from '@/server/api'

export const runtime = 'nodejs'

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
```

---

## Route Organization

### Directory Structure

```
src/server/api/
├── index.ts              # Hono app instance
├── middleware/            # Middleware functions
│   ├── auth.ts          # Authentication middleware
│   └── logger.ts       # Logger middleware
└── routes/              # Route definitions
    ├── health/          # Health check routes
    │   ├── index.ts     # Health route aggregation
    │   ├── clerk.ts     # Clerk health checks
    │   ├── database.ts  # Database health checks
    │   ├── storage.ts   # Storage health checks
    │   ├── edge-functions.ts # Edge function checks
    │   ├── snowflake.ts # Snowflake health checks
    │   └── nextbank.ts # NextBank health checks
    └── users.ts        # User routes
```

### Route Aggregation

Health routes are aggregated in [`src/server/api/routes/health/index.ts`](../../src/server/api/routes/health/index.ts):

```typescript
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
```

### Creating New Routes

**Step 1: Create route file**

```typescript
// src/server/api/routes/products.ts
import { Hono } from 'hono'
import { db } from '@/server/db'

export const productsRoutes = new Hono()

productsRoutes.get('/', async (c) => {
  const products = await db.query.products.findMany()
  return c.json({ products })
})

productsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
  })
  
  if (!product) {
    return c.json({ error: 'Product not found' }, 404)
  }
  
  return c.json({ product })
})
```

**Step 2: Register route in main app**

```typescript
// src/server/api/index.ts
import { productsRoutes } from './routes/products'

// Add to protected routes
app.route('/products', productsRoutes)
```

---

## Middleware Usage

### Available Middleware

#### Logger Middleware

Located at [`src/server/api/middleware/logger.ts`](../../src/server/api/middleware/logger.ts):

```typescript
import { logger } from 'hono/logger'

export { logger }
```

The logger middleware logs all incoming requests to the console:

```
GET /api/ping 200 5ms
POST /api/health/database/write 200 123ms
```

#### Auth Middleware

Located at [`src/server/api/middleware/auth.ts`](../../src/server/api/middleware/auth.ts):

```typescript
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

### Using Middleware

**Global middleware (applies to all routes):**

```typescript
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())
```

**Route-specific middleware:**

```typescript
const protectedRoutes = new Hono()

protectedRoutes.use('*', authMiddleware)
protectedRoutes.get('/data', handler)
```

**Middleware on specific routes:**

```typescript
app.get('/public', handler)
app.get('/protected', authMiddleware, handler)
```

### Creating Custom Middleware

```typescript
import { createMiddleware } from 'hono/factory'

export const timingMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  c.header('X-Response-Time', `${duration}ms`)
})
```

### Middleware Order

Middleware is executed in the order they are defined:

```typescript
app.use('*', middleware1)  // Executed first
app.use('*', middleware2)  // Executed second
app.use('*', middleware3)  // Executed third
```

---

## Authentication Middleware

### How It Works

The auth middleware:

1. Extracts the request from Hono context
2. Calls Clerk's `getAuth()` to verify session
3. Returns 401 if no user is authenticated
4. Sets auth data in context for downstream handlers

### Accessing Auth Data

**In route handlers:**

```typescript
app.get('/protected', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const orgId = c.get('orgId')
  const auth = c.get('auth')
  
  return c.json({ userId, orgId })
})
```

### Middleware Context Types

```typescript
import type { Context } from 'hono'

// Extend Hono context with your custom types
type Env = {
  Variables: {
    userId: string
    orgId: string | null
    auth: any
  }
}

const app = new Hono<Env>()
```

---

## Request/Response Patterns

### Request Handling

**Getting query parameters:**

```typescript
app.get('/search', async (c) => {
  const query = c.req.query('q')
  const page = c.req.query('page') || '1'
  const limit = c.req.query('limit') || '10'
  
  return c.json({ query, page, limit })
})
```

**Getting path parameters:**

```typescript
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})
```

**Getting request body:**

```typescript
app.post('/users', async (c) => {
  const body = await c.req.json()
  const { name, email } = body
  
  return c.json({ name, email })
})
```

**Getting headers:**

```typescript
app.get('/data', async (c) => {
  const authHeader = c.req.header('authorization')
  const contentType = c.req.header('content-type')
  
  return c.json({ authHeader, contentType })
})
```

### Response Handling

**JSON response:**

```typescript
app.get('/data', (c) => {
  return c.json({ message: 'Hello, World!' })
})
```

**Setting status code:**

```typescript
app.get('/not-found', (c) => {
  return c.json({ error: 'Not found' }, 404)
})
```

**Setting headers:**

```typescript
app.get('/data', (c) => {
  return c.json({ data: '...' }, 200, {
    'X-Custom-Header': 'value',
  })
})
```

**Text response:**

```typescript
app.get('/text', (c) => {
  return c.text('Plain text response')
})
```

**File response:**

```typescript
app.get('/download', (c) => {
  return c.file('/path/to/file.pdf')
})
```

### Error Handling

**Try-catch pattern:**

```typescript
app.get('/data', async (c) => {
  try {
    const data = await fetchData()
    return c.json({ data })
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})
```

**Global error handler:**

```typescript
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json(
    { error: 'Internal server error' },
    500
  )
})
```

**Not found handler:**

```typescript
app.notFound((c) => {
  return c.json(
    { error: 'Not found' },
    404
  )
})
```

---

## Route Examples

### GET Request

```typescript
app.get('/users', async (c) => {
  const users = await db.select().from(usersTable)
  return c.json({ users })
})
```

### POST Request

```typescript
app.post('/users', async (c) => {
  const body = await c.req.json()
  const { email, name } = body
  
  const user = await db.insert(usersTable).values({
    email,
    name,
  }).returning()
  
  return c.json({ user: user[0] }, 201)
})
```

### PUT Request

```typescript
app.put('/users/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { name } = body
  
  const user = await db.update(usersTable)
    .set({ name })
    .where(eq(usersTable.id, id))
    .returning()
  
  return c.json({ user: user[0] })
})
```

### DELETE Request

```typescript
app.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  
  await db.delete(usersTable).where(eq(usersTable.id, id))
  
  return c.json({ message: 'User deleted' })
})
```

---

## Type Safety

### Inferring Request Types

```typescript
import type { z } from 'zod'

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
})

app.post('/users', async (c) => {
  const body = await c.req.json()
  const user = userSchema.parse(body)
  
  // user is now typed as { name: string; email: string }
  return c.json({ user })
})
```

### Inferring Response Types

```typescript
const app = new Hono()

app.get('/data', (c) => {
  return c.json<{ message: string }>({ message: 'Hello' })
})

// Type-safe client
type AppType = typeof app
```

---

## Health Check Routes

### Available Health Check Endpoints

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
| **NextBank** | `/api/health/nextbank/auth` | GET | Test authentication |
| **All** | `/api/health/all` | GET | Run all checks |

---

## Best Practices

### 1. Use TypeScript

Always leverage TypeScript for type safety:

```typescript
// ✅ Good - Type-safe
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  // TypeScript knows id is a string
})

// ❌ Bad - No type safety
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  // Could be undefined
})
```

### 2. Validate Input

Always validate request input:

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

app.post('/users', async (c) => {
  const body = await c.req.json()
  const validated = createUserSchema.parse(body)
  // validated is now type-safe
})
```

### 3. Handle Errors Gracefully

Always handle errors properly:

```typescript
app.get('/data', async (c) => {
  try {
    const data = await fetchData()
    return c.json({ data })
  } catch (error) {
    console.error('Error fetching data:', error)
    return c.json(
      { error: 'Failed to fetch data' },
      500
    )
  }
})
```

### 4. Use Middleware for Cross-Cutting Concerns

Use middleware for authentication, logging, etc.:

```typescript
app.use('*', authMiddleware)
app.use('*', logger())
app.use('*', timingMiddleware())
```

### 5. Keep Routes Focused

Keep each route focused on a single responsibility:

```typescript
// ✅ Good - Focused route
app.get('/users/:id', async (c) => {
  const user = await getUserById(c.req.param('id'))
  return c.json({ user })
})

// ❌ Bad - Doing too much
app.get('/users/:id', async (c) => {
  const user = await getUserById(c.req.param('id'))
  const posts = await getUserPosts(user.id)
  const comments = await getUserComments(user.id)
  const analytics = await getUserAnalytics(user.id)
  return c.json({ user, posts, comments, analytics })
})
```

---

## Troubleshooting

### Common Issues

**Issue: Routes not found**

- Verify route is registered in main app
- Check base path configuration
- Ensure route file is imported

**Issue: Auth middleware not working**

- Verify Clerk is configured
- Check if auth token is being sent
- Ensure middleware is applied before route

**Issue: CORS errors**

- Verify CORS middleware is applied
- Check allowed origins configuration
- Ensure preflight requests are handled

---

## Related Documentation

- [Clerk Authentication](./clerk-authentication.md) - Authentication setup
- [Supabase Integration](./supabase-integration.md) - Database queries
- [Snowflake Integration](./snowflake-integration.md) - Snowflake queries
- [Health Check System](./health-check-system.md) - Health check endpoints
- [State Management](./state-management.md) - Data fetching patterns
