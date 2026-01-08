# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Client Updater Version 2** - an enterprise Next.js 15 boilerplate for full-stack TypeScript applications. It's designed as a modern foundation with integrated authentication, database management, API layer, health monitoring, and third-party service integrations.

## Development Commands

```bash
# Development
pnpm dev                  # Start Next.js dev server with Turbo

# Building
pnpm build                # Production build
pnpm start                # Start production server
pnpm preview              # Build and preview

# Database (Drizzle ORM)
pnpm db:generate          # Generate migration from schema changes
pnpm db:push              # Push schema directly to database (dev)
pnpm db:migrate           # Apply pending migrations
pnpm db:studio            # Open Drizzle Studio GUI
pnpm db:seed              # Run database seeding script
pnpm db:enable-rls        # Enable Row Level Security
pnpm db:disable-rls       # Disable Row Level Security

# Code Quality
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix ESLint issues
pnpm format:check         # Check Prettier formatting
pnpm format:write         # Apply Prettier formatting
pnpm typecheck            # TypeScript type checking
pnpm check                # Run both eslint and tsc

# Testing (Vitest)
pnpm test                 # Run tests once
pnpm test:watch           # Watch mode
pnpm test:ui              # Vitest UI dashboard
pnpm test:coverage        # Coverage report (80% threshold)
```

## Architecture

### API Layer: Hono Integration

This application uses **Hono** for the API layer instead of traditional Next.js route handlers. The API is centralized in `src/server/api/` and mounted via a catch-all route at `src/app/api/[[...route]]/route.ts`.

**Key entry points:**
- `src/server/api/index.ts` - Main Hono app with middleware and routes
- `src/server/api/middleware/auth.ts` - Clerk authentication middleware
- `src/server/api/routes/` - Route handlers organized by resource

**API routing structure:**
```
/api (Hono base path)
├── /ping (public)
├── /health (protected)
├── /users (protected)
├── /clients (protected)
├── /sync (protected)
└── /status (protected)
```

When adding new API routes:
1. Create route file in `src/server/api/routes/[resource]/`
2. Export a Hono router from `index.ts`
3. Import and mount in `src/server/api/index.ts`

### Database: Drizzle ORM with PostgreSQL

**Schema organization:**
- `src/server/db/schema/` - Table definitions organized by domain
- `src/server/db/index.ts` - Drizzle client with connection pooling
- `src/server/db/queries/` - Database query functions (business logic layer)
- `src/server/db/seed/` - Database seeding scripts

**Transaction pooler configuration:**
The app uses Supabase's Transaction mode pooler. Key settings in `src/server/db/index.ts`:
- `prepare: false` - Required for pooler
- `max: 1` - Single connection for transaction mode
- Connection detection via `.pooler.supabase.com` in DATABASE_URL

**Adding database changes:**
1. Modify schema in `src/server/db/schema/[domain].ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:push` (dev) or `pnpm db:migrate` (prod)

### Authentication: Clerk + Webhooks

**Clerk middleware:**
- `src/middleware.ts` - Next.js middleware for route protection
- Public routes: `/sign-in`, `/sign-up`, `/api/webhooks`, `/api/ping`

**Webhook sync:**
- `src/app/api/webhooks/clerk/route.ts` - Clerk webhook handler
- Syncs user/org data to local database via `webhooks` table
- Uses Svix for signature verification

### Feature Organization

Features use a **module pattern** with co-located concerns:

```
src/features/[feature]/
├── components/     # Feature-specific React components
├── hooks/          # Custom React hooks
├── stores/         # Zustand stores
├── types.ts        # TypeScript types
└── index.ts        # Public exports
```

### Infrastructure Libraries

Located in `src/lib/`:

| Directory | Purpose |
|-----------|---------|
| `aws-s3/` | AWS S3 client for file operations |
| `cache/` | Redis caching with Upstash |
| `health/` | Health check system for services |
| `logger/` | Structured logging utility |
| `nextbank/` | NextBank API integration |
| `permissions/` | CASL-based authorization |
| `rate-limit/` | Upstash rate limiting |
| `resilience/` | Circuit breaker pattern |
| `snowflake/` | Snowflake data warehouse client |
| `status/` | Status period validation |
| `supabase/` | Supabase client (admin, server, browser) |
| `sync/` | Snowflake sync types |
| `synology/` | Synology DSM client |
| `territories/` | Territory filtering logic |

### Environment Configuration

**Two env systems:**
1. `src/env.js` - T3 Env (legacy, minimal)
2. `src/config/env.ts` - Zod schema (current, comprehensive)

**Always use `src/config/env.ts`** - it has the full schema including Clerk, Supabase, Snowflake, NextBank, AWS, Upstash, rate limits, and circuit breakers.

### Testing: Vitest

**Configuration:** `vitest.config.ts`
- Environment: jsdom
- Setup: `src/test/setup.ts`
- Coverage: 80% threshold (lines, functions, branches, statements)

**Test location patterns:**
- `**/__tests__/**/*.{test,spec}.{ts,tsx}`
- `**/*.{test,spec}.{ts,tsx}`

**Running single tests:**
```bash
pnpm test src/path/to/test.test.ts
```

### App Router Structure

Uses Next.js 15 App Router with route groups:

```
src/app/
├── (auth)/           # Authentication routes (sign-in, sign-up)
├── (dashboard)/      # Protected dashboard routes
│   ├── clients/
│   ├── admin/
│   ├── health/
│   └── ...
└── page.tsx          # Landing page
```

Route groups `(auth)` and `(dashboard)` are URL segments that don't affect routing path but allow shared layouts.

## Key Patterns

### Database Queries

Use the query layer in `src/server/db/queries/` instead of direct Drizzle calls in route handlers. This separates business logic from API layer.

### Hono Context

The auth middleware sets context values:
```typescript
c.get("auth")   // Clerk auth object
c.get("userId") // Clerk user ID
c.get("orgId")  // Clerk organization ID
```

### Health Check System

Health checks are defined in `src/lib/health/` and exposed via `/api/health/*`. Each service (database, snowflake, clerk, etc.) has its own health check implementation.

### Error Handling

Infrastructure libraries use circuit breakers (`src/lib/resilience/`) and rate limiting (`src/lib/rate-limit/`) for external service calls.

## Environment Variables

Critical variables for local development:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Clerk auth
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access
- `CLERK_WEBHOOK_SECRET` - Webhook verification
- `SNOWFLAKE_*` - Snowflake data warehouse (optional)

See `.env.example` for complete reference.
