# Client Updater Version 2 App

This is a Client Updater Version 2 application created with the CLI.

## Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** 10 or higher
- **Supabase account** ([Sign up](https://supabase.com/))
- **Clerk account** ([Sign up](https://clerk.com/))
- **Snowflake account** (optional)

### 1. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required keys for Clerk and Supabase. See [Environment Variables](docs/framework/environment-variables.md) for details.

### 2. Database Setup

Push the database schema to your Supabase project:

```bash
pnpm db:push
```

This will create the necessary tables, including `health_check_tests` required for the health dashboard.

### 3. Deploy Edge Functions

The health check system requires a Supabase Edge Function. Deploy it using the Supabase CLI:

```bash
# Login to Supabase
npx supabase login

# Link your project (get your-project-ref from Supabase dashboard URL)
npx supabase link --project-ref your-project-ref

# Deploy the function
npx supabase functions deploy health-check
```

### 4. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Verify Health

Visit [http://localhost:3000/health](http://localhost:3000/health) to verify all services are connected and working.

---

## Documentation

- [Overview](./docs/framework/01-overview.md)
- [Tech Stack](./docs/framework/02-techstack.md)
- [Environment Variables](./docs/framework/environment-variables.md)
- [CLI Installation](./docs/framework/cli-installation.md)
- [Health Check System](./docs/framework/health-check-system.md)
- [Clerk Authentication](./docs/framework/clerk-authentication.md)
- [Supabase Integration](./docs/framework/supabase-integration.md)
- [Snowflake Integration](./docs/framework/snowflake-integration.md)

## Key Features

### 1. Authentication & User Management
- **Clerk Integration**: Complete authentication solution with sign-in, sign-up, and user management
- **Organization Support**: Multi-tenant architecture with organization memberships
- **Webhook Synchronization**: Automatic user data sync to local database
- **Protected Routes**: Middleware-based route protection

### 2. Database Layer
- **PostgreSQL**: Robust relational database via Supabase
- **Drizzle ORM**: Type-safe database queries with excellent TypeScript support
- **Connection Pooling**: Optimized for Supabase Transaction mode
- **Schema Management**: Migration-based schema evolution

### 3. Storage & Edge Computing
- **Supabase Storage**: File upload/download with signed URLs
- **Edge Functions**: Serverless compute with auth header passthrough
- **Bucket Management**: Organized file storage structure

### 4. Data Warehouse
- **Snowflake Integration**: Direct connection to Snowflake data warehouse
- **Query Execution**: Execute SQL queries from the application
- **Warehouse Configuration**: Support for multiple warehouses and databases

### 5. API Layer
- **Hono Framework**: Lightweight and fast API framework
- **Middleware Support**: Authentication, logging, CORS
- **Route Organization**: Modular route structure
- **Type Safety**: Full TypeScript support with inferred types

### 6. State Management
- **TanStack Query**: Server state management with caching and synchronization
- **Zustand**: Lightweight client state management
- **React Hooks**: Custom hooks for common patterns

### 7. Health Check System
- **Comprehensive Monitoring**: Health checks for all integrated services
- **Dashboard UI**: Visual health status display
- **Response Time Tracking**: Performance monitoring
- **Error Reporting**: Detailed error messages and status codes

### 8. Developer Experience
- **TypeScript**: Full type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: Beautiful, accessible UI components
- **Hot Reload**: Fast development with Next.js Turbo
- **Linting & Formatting**: ESLint and Prettier configured

## Folder Structure

```
dtt-framework/
├── docs/                          # Framework documentation
├── public/                        # Static assets
├── src/                           # Source code
│   ├── app/                       # Next.js App Router
│   ├── components/                # React components
│   ├── features/                  # Feature modules
│   ├── hooks/                     # React hooks
│   ├── lib/                       # Utility libraries and clients
│   ├── server/                    # Server-side code (API, database)
│   ├── stores/                    # Zustand state stores
│   ├── types/                     # TypeScript types
│   ├── config/                    # Configuration files
│   ├── env.js                     # Environment variables
│   ├── middleware.ts              # Next.js middleware
│   └── styles/                    # Styles
├── .env.example                   # Environment variables template
├── drizzle.config.ts              # Drizzle ORM configuration
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with Turbo |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format:write` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:generate` | Generate database migrations |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:studio` | Open Drizzle Studio |

## Deployment

For deployment instructions, please refer to the [Deployment Guide](docs/framework/deployment/vercel.md).

## Support

If you need help:

1. **Check the documentation** in `docs/` folder
2. **Check the health dashboard** at `/health`
3. **Open an issue** on GitHub

## License

MIT
