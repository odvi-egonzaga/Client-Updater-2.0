# DTT Framework - Environment Variables

## Overview

Environment variables are used to configure the DTT Framework. This document provides a complete reference for all available environment variables, their purposes, and how to configure them.

---

## Complete .env.example Reference

```bash
# ============================================
# DTT Framework Environment Variables
# ============================================
# Copy this file to .env and fill in your values
# Never commit .env to version control
# ============================================

# ============================================
# Application
# ============================================

# The URL where your application is deployed
# Used for redirects, webhooks, and callbacks
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# Clerk Authentication
# ============================================

# Clerk publishable key (starts with pk_)
# Used for client-side Clerk operations
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Clerk secret key (starts with sk_)
# Used for server-side Clerk operations
CLERK_SECRET_KEY=sk_test_xxx

# Clerk webhook secret (starts with whsec_)
# Used to verify webhook signatures
CLERK_WEBHOOK_SECRET=whsec_xxx

# URL for sign-in page
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

# URL for sign-up page
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Redirect URL after successful sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health

# Redirect URL after successful sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# ============================================
# Supabase
# ============================================

# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co

# Supabase anonymous/public key
# Used for client-side Supabase operations
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# Supabase service role key
# Used for server-side Supabase operations (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# PostgreSQL connection URL (Transaction mode)
# Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# ============================================
# Snowflake (Optional)
# ============================================

# Snowflake account identifier
# Format: [account_locator].[region]
SNOWFLAKE_ACCOUNT=xxx.us-east-1

# Snowflake username
SNOWFLAKE_USERNAME=xxx

# Snowflake password
SNOWFLAKE_PASSWORD=xxx

# Snowflake warehouse name
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# Snowflake database name
SNOWFLAKE_DATABASE=ANALYTICS

# Snowflake schema name
SNOWFLAKE_SCHEMA=PUBLIC

# Snowflake role name
SNOWFLAKE_ROLE=ANALYST

# ============================================
# AWS S3 (Optional)
# ============================================

# AWS Access Key ID
AWS_ACCESS_KEY_ID=AKIA...

# AWS Secret Access Key
AWS_ACCESS_SECRET_KEY=wJalr...

# AWS Region (e.g., us-east-1, ap-southeast-1)
AWS_REGION=us-east-1

# ============================================
# Synology (Optional)
# ============================================

# Synology DSM Host URL
SYNOLOGY_HOST=http://synology:5000

# Synology Username
SYNOLOGY_USERNAME=admin

# Synology Password
SYNOLOGY_PASSWORD=secret

# ============================================
# NextBank (Placeholder - Optional)
# ============================================

# NextBank API URL
NEXTBANK_API=https://api.nextbank.com

# NextBank API username
NEXTBANK_API_USERNAME=user

# NextBank API password
NEXTBANK_API_PASSWORD=pass
```

---

## How to Configure Each Variable

### Application Variables

#### NEXT_PUBLIC_APP_URL

**Purpose:** Base URL for your application

**Where to find:** This is your application's URL

**Examples:**
```bash
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://your-app.com

# Staging
NEXT_PUBLIC_APP_URL=https://staging.your-app.com
```

**Notes:**
- Must include protocol (http:// or https://)
- No trailing slash
- Used for webhook callbacks and redirects

---

### Clerk Authentication Variables

#### NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

**Purpose:** Client-side Clerk operations

**Where to find:** Clerk Dashboard → Your App → API Keys → Publishable Key

**Format:** Starts with `pk_`

**Example:**
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

**Notes:**
- Safe to expose to client (starts with NEXT_PUBLIC_)
- Used for Clerk components on client-side
- Different keys for test and production environments

#### CLERK_SECRET_KEY

**Purpose:** Server-side Clerk operations

**Where to find:** Clerk Dashboard → Your App → API Keys → Secret Key

**Format:** Starts with `sk_`

**Example:**
```bash
CLERK_SECRET_KEY=sk_test_xxx
```

**Notes:**
- Never expose to client (no NEXT_PUBLIC_ prefix)
- Used for server-side auth verification
- Keep secret and never commit to version control

#### CLERK_WEBHOOK_SECRET

**Purpose:** Verify webhook signatures

**Where to find:** Clerk Dashboard → Your App → Webhooks → Add Endpoint → Copy Secret

**Format:** Starts with `whsec_`

**Example:**
```bash
CLERK_WEBHOOK_SECRET=whsec_xxx
```

**Notes:**
- Never expose to client
- Used to verify incoming webhooks are from Clerk
- Required for webhook endpoint

#### Clerk URL Variables

**Purpose:** Configure Clerk authentication flow

**Examples:**
```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health
```

**Notes:**
- All start with NEXT_PUBLIC_ (used in client)
- Can be absolute URLs or relative paths
- Customize based on your routing structure

---

### Supabase Variables

#### NEXT_PUBLIC_SUPABASE_URL

**Purpose:** Supabase project URL

**Where to find:** Supabase Dashboard → Your Project → Settings → API → Project URL

**Format:** Full URL including protocol

**Example:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

**Notes:**
- Safe to expose to client
- Used for all Supabase client operations
- Different URL for each project

#### NEXT_PUBLIC_SUPABASE_ANON_KEY

**Purpose:** Client-side Supabase operations

**Where to find:** Supabase Dashboard → Your Project → Settings → API → anon/public key

**Format:** JWT token (starts with `eyJ`)

**Example:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

**Notes:**
- Safe to expose to client
- Respects Row Level Security (RLS) policies
- Limited permissions by default

#### SUPABASE_SERVICE_ROLE_KEY

**Purpose:** Server-side Supabase operations with full access

**Where to find:** Supabase Dashboard → Your Project → Settings → API → service_role key

**Format:** JWT token (starts with `eyJ`)

**Example:**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

**Notes:**
- Never expose to client
- Bypasses Row Level Security (RLS)
- Full database access
- Use only on server-side

#### DATABASE_URL

**Purpose:** PostgreSQL connection string

**Where to find:** Supabase Dashboard → Your Project → Settings → Database → Connection String → Transaction mode

**Format:** PostgreSQL connection string

**Example:**
```bash
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Notes:**
- Never expose to client
- Use Transaction mode for serverless (port 6543, .pooler. domain)
- Required for Drizzle ORM
- Format: `postgresql://[user]:[password]@[host]:[port]/[database]`

**Connection Modes:**

| Mode | URL Format | Use Case |
|-------|-------------|----------|
| **Session** | `postgres://[user]:[password]@[host]:5432/[database]` | Serverful applications |
| **Transaction** | `postgres://[user]:[password]@[host]:6543/[database]` | Serverless applications |

---

### Snowflake Variables (Optional)

#### SNOWFLAKE_ACCOUNT

**Purpose:** Snowflake account identifier

**Where to find:** Snowflake URL when logged in

**Format:** `[account_locator].[region]`

**Example:**
```bash
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
```

**Notes:**
- Extract from Snowflake URL: `https://xy12345.us-east-1.snowflakecomputing.com`
- Different regions: `us-east-1`, `us-west-2`, `eu-west-1`, etc.

#### SNOWFLAKE_USERNAME

**Purpose:** Snowflake username

**Where to find:** Your Snowflake username

**Example:**
```bash
SNOWFLAKE_USERNAME=myuser
```

**Notes:**
- Case-sensitive
- Usually email or custom username

#### SNOWFLAKE_PASSWORD

**Purpose:** Snowflake password

**Where to find:** Your Snowflake password

**Example:**
```bash
SNOWFLAKE_PASSWORD=mypassword
```

**Notes:**
- Never commit to version control
- May need to be updated if password changes
- Consider using password rotation policies

#### SNOWFLAKE_WAREHOUSE

**Purpose:** Compute warehouse to use

**Where to find:** Snowflake → Warehouses

**Example:**
```bash
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
```

**Notes:**
- Warehouse must exist in your Snowflake account
- Different sizes: X-Small, Small, Medium, Large, etc.
- Affects query performance and cost

#### SNOWFLAKE_DATABASE

**Purpose:** Database to connect to

**Where to find:** Snowflake → Databases

**Example:**
```bash
SNOWFLAKE_DATABASE=ANALYTICS
```

**Notes:**
- Database must exist in your Snowflake account
- User must have access to database
- Default is often `SNOWFLAKE` or `ANALYTICS`

#### SNOWFLAKE_SCHEMA

**Purpose:** Schema to use

**Where to find:** Snowflake → Databases → Your Database → Schemas

**Example:**
```bash
SNOWFLAKE_SCHEMA=PUBLIC
```

**Notes:**
- Schema must exist in database
- Default is usually `PUBLIC`
- User must have access to schema

#### SNOWFLAKE_ROLE

**Purpose:** Role to use for queries

**Where to find:** Snowflake → Roles

**Example:**
```bash
SNOWFLAKE_ROLE=ANALYST
```

**Notes:**
- Role must exist in your Snowflake account
- User must be granted the role
- Determines permissions and access

---

### AWS S3 Variables (Optional)

#### AWS_ACCESS_KEY_ID

**Purpose:** AWS Access Key ID for S3 access

**Where to find:** AWS IAM Console → Users → Security credentials

**Example:**
```bash
AWS_ACCESS_KEY_ID=AKIA...
```

#### AWS_ACCESS_SECRET_KEY

**Purpose:** AWS Secret Access Key for S3 access

**Where to find:** AWS IAM Console → Users → Security credentials (only visible when created)

**Example:**
```bash
AWS_ACCESS_SECRET_KEY=wJalr...
```

**Notes:**
- Never commit to version control
- Ensure the user has appropriate S3 permissions (e.g., `AmazonS3ReadOnlyAccess` or custom policy)

#### AWS_REGION

**Purpose:** AWS Region where your S3 buckets are located

**Example:**
```bash
AWS_REGION=us-east-1
```

---

### Synology Variables (Optional)

#### SYNOLOGY_HOST

**Purpose:** URL of your Synology DSM

**Example:**
```bash
SYNOLOGY_HOST=http://192.168.1.100:5000
```

#### SYNOLOGY_USERNAME

**Purpose:** Username for Synology authentication

**Example:**
```bash
SYNOLOGY_USERNAME=admin
```

#### SYNOLOGY_PASSWORD

**Purpose:** Password for Synology authentication

**Example:**
```bash
SYNOLOGY_PASSWORD=secret
```

---

### NextBank Variables (Placeholder)

**Note:** NextBank is a placeholder integration. These variables are optional and not currently used.

#### NEXTBANK_API

**Purpose:** NextBank API endpoint

**Example:**
```bash
NEXTBANK_API=https://api.nextbank.com
```

#### NEXTBANK_API_USERNAME

**Purpose:** API username for NextBank

**Example:**
```bash
NEXTBANK_API_USERNAME=user
```

#### NEXTBANK_API_PASSWORD

**Purpose:** API password for NextBank

**Example:**
```bash
NEXTBANK_API_PASSWORD=pass
```

---

## Security Considerations

### 1. Never Commit .env Files

Always add `.env` to `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 2. Use Environment-Specific Files

Use different environment files for different stages:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

Load appropriate file based on environment:

```bash
# In package.json scripts
"dev": "cp .env.development .env && next dev",
"build": "cp .env.production .env && next build"
```

### 3. Prefix Client Variables

Only prefix variables with `NEXT_PUBLIC_` if they need to be exposed to client:

```bash
# ✅ Good - Exposed to client
NEXT_PUBLIC_API_URL=https://api.example.com

# ❌ Bad - Not exposed, but might be needed
API_URL=https://api.example.com
```

### 4. Validate Environment Variables

The framework uses `@t3-oss/env-nextjs` for validation:

```typescript
// src/config/env.ts
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  },
})
```

This ensures:
- All required variables are present
- Variables are correctly formatted
- Build fails if variables are missing

### 5. Use Secret Management Services

For production, consider using secret management:

- **Vercel Environment Variables**: For Vercel deployments
- **AWS Secrets Manager**: For AWS deployments
- **GitHub Secrets**: For GitHub Actions
- **Docker Secrets**: For containerized deployments

---

## Environment Variable Validation

### Schema Validation

The framework validates environment variables at build time:

```typescript
// src/config/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
})
```

### Validation Errors

If validation fails, you'll see an error like:

```
❌ Invalid environment variables:
- DATABASE_URL: Required
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Must start with "pk_"
```

### Skipping Validation

For Docker builds, you can skip validation:

```bash
SKIP_ENV_VALIDATION=true pnpm build
```

---

## Troubleshooting

### Common Issues

**Issue: "Environment variable not found"**

**Solution:** Ensure `.env` file exists and is loaded:

```bash
# Check if .env exists
ls -la .env

# Copy from example if missing
cp .env.example .env

# Restart development server
pnpm dev
```

**Issue: "Invalid environment variable format"**

**Solution:** Check variable format matches expected pattern:

```bash
# Clerk keys must start with specific prefixes
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx  # ✅ Correct
CLERK_SECRET_KEY=sk_test_xxx              # ✅ Correct

# Database URL must be valid URL
DATABASE_URL=postgresql://user:pass@host:5432/db  # ✅ Correct
```

**Issue: "Database connection failed"**

**Solution:** Verify DATABASE_URL is correct:

```bash
# Test connection
psql $DATABASE_URL

# Check for correct mode (Transaction vs Session)
# Transaction mode: port 6543, .pooler. domain
# Session mode: port 5432, direct domain
```

**Issue: "Clerk webhook verification failed"**

**Solution:** Verify webhook secret is correct:

```bash
# Check webhook secret matches Clerk dashboard
CLERK_WEBHOOK_SECRET=whsec_xxx  # Must match exactly
```

---

## Related Documentation

- [Overview](./01-overview.md) - Framework introduction
- [Tech Stack](./02-techstack.md) - Technology breakdown
- [Clerk Authentication](./clerk-authentication.md) - Auth configuration
- [Supabase Integration](./supabase-integration.md) - Database configuration
- [Snowflake Integration](./snowflake-integration.md) - Data warehouse configuration
