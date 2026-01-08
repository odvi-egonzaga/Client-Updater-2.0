# Client Updater Version 2 - Supabase Integration

## Overview

The Client Updater Version 2 uses [Supabase](https://supabase.com/) as the primary database and storage solution. Supabase provides a PostgreSQL database, file storage, and edge functions, all managed through a single platform.

### Why Supabase?

- **PostgreSQL**: Powerful, open-source relational database
- **Managed Service**: No database administration required
- **Real-time**: Real-time database subscriptions (not currently used)
- **Storage**: Built-in S3-compatible file storage
- **Edge Functions**: Serverless compute with Deno runtime
- **Open Source**: Self-hostable if needed
- **Connection Pooling**: Transaction mode for serverless optimization

---

## Database Setup with Drizzle ORM

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign up
2. Create a new project
3. Wait for the database to be provisioned
4. Get your project URL and anon key from the dashboard

### 2. Install Dependencies

```bash
pnpm add drizzle-orm postgres @supabase/supabase-js @supabase/ssr
pnpm add -D drizzle-kit
```

### 3. Configure Environment Variables

Add the following to your [`.env`](./environment-variables.md) file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Where to find these keys:**

- **Supabase URL**: Supabase Dashboard → Your Project → Settings → API → Project URL
- **Anon Key**: Supabase Dashboard → Your Project → Settings → API → anon/public key
- **Service Role Key**: Supabase Dashboard → Your Project → Settings → API → service_role key
- **Database URL**: Supabase Dashboard → Your Project → Settings → Database → Connection String → Transaction mode

### 4. Configure Drizzle

Create [`drizzle.config.ts`](../../drizzle.config.ts):

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/server/db/schema/index.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

### 5. Create Database Client

Create [`src/server/db/index.ts`](../../src/server/db/index.ts):

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env'
import * as schema from './schema'

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL, { prepare: false })
if (env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema })
```

**Important:** The `prepare: false` option is required for Supabase Transaction mode connection pooling.

### 6. Define Database Schema

Create schema files in [`src/server/db/schema/`](../../src/server/db/schema/):

**users.ts:**

```typescript
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

**health-checks.ts:**

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const healthCheckTests = pgTable('health_check_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  testKey: text('test_key').notNull(),
  testValue: text('test_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type HealthCheckTest = typeof healthCheckTests.$inferSelect
export type NewHealthCheckTest = typeof healthCheckTests.$inferInsert
```

**index.ts:**

```typescript
export * from './users'
export * from './health-checks'
```

### 7. Generate and Run Migrations

```bash
# Generate migration files
pnpm db:generate

# Push schema to database (development)
# This is required for health checks to pass (creates health_check_tests table)
pnpm db:push

# Or run migrations (production)
pnpm db:migrate
```

---

## Storage Configuration

### Supabase Storage Setup

### 1. Create Storage Buckets

Go to Supabase Dashboard → Your Project → Storage → Create a new bucket:

- **Bucket Name**: `health-check-bucket` (or your preferred name)
- **Public Bucket**: No (for security)

### 2. Configure Storage Clients

Create [`src/lib/supabase/client.ts`](../../src/lib/supabase/client.ts):

```typescript
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

Create [`src/lib/supabase/admin.ts`](../../src/lib/supabase/admin.ts):

```typescript
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)
```

**Note:** Use `supabaseAdmin` for server-side operations that bypass RLS (Row Level Security).

### 3. Storage Operations

**Upload a file:**

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin'

async function uploadFile(file: File, path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from('your-bucket')
    .upload(path, file, { upsert: true })

  if (error) throw error
  return data
}
```

**Download a file (signed URL):**

```typescript
async function getSignedUrl(path: string, expiresIn: number = 60) {
  const { data, error } = await supabaseAdmin.storage
    .from('your-bucket')
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}
```

**Delete a file:**

```typescript
async function deleteFile(path: string) {
  const { error } = await supabaseAdmin.storage
    .from('your-bucket')
    .remove([path])

  if (error) throw error
}
```

**List files:**

```typescript
async function listFiles(folder: string) {
  const { data, error } = await supabaseAdmin.storage
    .from('your-bucket')
    .list(folder)

  if (error) throw error
  return data
}
```

---

## Edge Functions Setup

### Supabase Edge Functions

Supabase Edge Functions are serverless functions that run on Deno at the edge. They're useful for:

- Background processing
- Webhook handling
- Third-party API integrations
- Custom business logic

### 1. Install Supabase CLI

```bash
pnpm add -g supabase
```

### 2. Initialize Edge Functions

```bash
supabase functions deploy
```

### 3. Create an Edge Function

Create a function in `supabase/functions/your-function/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { method } = req

  if (method === 'POST') {
    const { name } = await req.json()
    
    return new Response(
      JSON.stringify({ message: `Hello, ${name}!` }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response('Method not allowed', { status: 405 })
})
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy your-function
```

### 5. Invoke Edge Functions

**From the application:**

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin'

async function invokeEdgeFunction(functionName: string, payload: any) {
  const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
    body: payload,
  })

  if (error) throw error
  return data
}
```

---

## Connection Pooling Configuration

### Supabase Connection Modes

Supabase offers two connection modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Session Mode** | Direct connection to database | Serverful applications |
| **Transaction Mode** | Connection pooling | Serverless applications |

### Transaction Mode (Recommended for Next.js)

The framework uses Transaction mode for optimal performance in serverless environments.

**Database URL Format:**

```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Key Points:**

- Uses `.pooler.supabase.com` domain
- Port `6543` instead of `5432`
- Requires `prepare: false` in postgres client

### Connection Pooling Best Practices

1. **Use Transaction Mode**: Always use transaction mode for serverless
2. **Reuse Connections**: Cache connection in development (see [`src/server/db/index.ts`](../../src/server/db/index.ts))
3. **Close Connections**: Connections are automatically closed when the lambda function terminates
4. **Monitor Connections**: Check Supabase dashboard for connection usage

---

## Schema Management

### Drizzle Migrations

### Generate Migration

```bash
pnpm db:generate
```

This creates a new migration file in `src/server/db/migrations/`.

### Push Schema (Development)

```bash
pnpm db:push
```

This pushes the schema directly to the database without creating a migration file. Useful for development.

### Run Migrations (Production)

```bash
pnpm db:migrate
```

This applies all pending migrations to the database.

### Rollback Migration

```bash
drizzle-kit drop
```

### View Migrations

```bash
drizzle-kit studio
```

Opens Drizzle Studio to view and edit your database.

---

## Query Patterns

### Basic Queries

**Select:**

```typescript
import { db } from '@/server/db'
import { users } from '@/server/db/schema'

// Select all users
const allUsers = await db.select().from(users)

// Select with where
const user = await db.select().from(users).where(eq(users.id, userId))

// Select specific columns
const userEmails = await db.select({ email: users.email }).from(users)
```

**Insert:**

```typescript
// Insert single row
const newUser = await db.insert(users).values({
  id: 'user_123',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
}).returning()

// Insert multiple rows
await db.insert(users).values([
  { id: 'user_1', email: 'user1@example.com' },
  { id: 'user_2', email: 'user2@example.com' },
])
```

**Update:**

```typescript
await db.update(users)
  .set({ firstName: 'Jane' })
  .where(eq(users.id, userId))
```

**Delete:**

```typescript
await db.delete(users).where(eq(users.id, userId))
```

### Advanced Queries

**Joins:**

```typescript
const result = await db
  .select({
    user: users,
    // other tables...
  })
  .from(users)
  .leftJoin(otherTable, eq(users.id, otherTable.userId))
```

**Aggregations:**

```typescript
const result = await db
  .select({ count: sql<number>`count(*)` })
  .from(users)
```

**Transactions:**

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ id: 'user_1', email: 'user1@example.com' })
  await tx.insert(users).values({ id: 'user_2', email: 'user2@example.com' })
})
```

---

## Health Check Endpoints

The framework includes health check endpoints for verifying Supabase integration:

### Database Health Checks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/database/write` | POST | Write test row to database |
| `/api/health/database/read` | GET | Read test row from database |
| `/api/health/database/delete` | DELETE | Delete test row from database |

### Storage Health Checks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/storage/upload` | POST | Upload test file to storage |
| `/api/health/storage/download` | GET | Generate signed URL for test file |
| `/api/health/storage/delete` | DELETE | Delete test file from storage |

### Edge Functions Health Checks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/edge/ping` | GET | Ping edge function (placeholder) |
| `/api/health/edge/auth` | GET | Test auth header passthrough (placeholder) |

---

## Security Considerations

### Row Level Security (RLS)

Supabase provides Row Level Security to control data access:

1. Enable RLS on tables in Supabase Dashboard
2. Create policies to control access
3. Use `supabase` client (not `supabaseAdmin`) for client-side queries

### Service Role Key

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS:

- **Use**: Server-side operations that need full access
- **Never expose**: This key should never be in client code
- **Store securely**: Keep in environment variables only

### Anon Key

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose:

- **Use**: Client-side queries
- **Limited access**: Respects RLS policies
- **Can be exposed**: Safe to include in client bundles

---

## Troubleshooting

### Common Issues

**Issue: Connection timeout**

- Verify `DATABASE_URL` is correct
- Check if you're using the correct connection mode (Transaction vs Session)
- Verify port is `6543` for Transaction mode

**Issue: "prepare: false" error**

- Ensure `prepare: false` is set in the postgres client
- This is required for Supabase Transaction mode

**Issue: Storage upload fails**

- Check if bucket exists
- Verify bucket permissions
- Ensure `supabaseAdmin` is used for server-side uploads

**Issue: Migration fails**

- Verify `DATABASE_URL` is set correctly
- Check if database is accessible
- Ensure you have write permissions

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Supabase environment variables
- [Clerk Authentication](./clerk-authentication.md) - User schema and webhooks
- [API Layer](./api-layer.md) - Database queries in API routes
- [Health Check System](./health-check-system.md) - Health check endpoints
- [Snowflake Integration](./snowflake-integration.md) - Data warehouse integration
