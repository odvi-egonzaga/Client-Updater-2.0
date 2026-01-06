# Client Updater V2 - Documentation

Welcome to the Client Updater V2 documentation. This system is designed to manage client information, track status updates, and generate reports for pension management.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Features](#features)
- [Development](#development)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

Client Updater V2 is a modern web application built with Next.js, TypeScript, and Drizzle ORM. It provides a comprehensive solution for managing client information, tracking status updates, and generating reports for pension management operations.

### Key Technologies

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Hono, Drizzle ORM, PostgreSQL (Supabase)
- **Authentication**: Clerk
- **State Management**: TanStack Query, Zustand
- **Testing**: Vitest, React Testing Library
- **Data Warehouse**: Snowflake

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                           │
│  (Next.js 14, React, TypeScript, Tailwind CSS)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                            │
│           (Hono, Middleware, Validation)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  PostgreSQL  │ │  Redis   │ │  Snowflake   │
│  (Supabase) │ │ (Upstash)│ │ (Data Lake)  │
└──────────────┘ └──────────┘ └──────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (Supabase recommended)
- Clerk account for authentication
- Snowflake account (optional, for data warehousing)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd client-updater-version-2
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
pnpm db:push
pnpm db:seed
```

5. Run the development server:
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application.

## Architecture

### Project Structure

```
client-updater-version-2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/       # Dashboard layout and pages
│   │   ├── admin/             # Admin pages
│   │   ├── api/               # API routes
│   │   └── health/            # Health check pages
│   ├── components/            # Shared UI components
│   │   ├── ui/               # Base UI components (shadcn/ui)
│   │   └── shared/           # Shared application components
│   ├── features/              # Feature-specific modules
│   │   ├── activity/          # Activity logging
│   │   ├── clients/           # Client management
│   │   ├── config/           # Configuration management
│   │   ├── exports/           # Export functionality
│   │   ├── status/            # Status tracking
│   │   └── users/            # User management
│   ├── lib/                  # Utility libraries
│   │   ├── api/              # API utilities
│   │   ├── db/               # Database utilities
│   │   ├── permissions/      # Permission management
│   │   └── validators/      # Validation schemas
│   ├── server/               # Server-side code
│   │   ├── api/             # API routes
│   │   │   ├── middleware/   # API middleware
│   │   │   └── routes/      # API route handlers
│   │   └── db/              # Database
│   │       ├── queries/      # Database queries
│   │       ├── schema/       # Database schema
│   │       └── seed/         # Seed data
│   └── test/                # Test utilities
├── docs/                    # Documentation
├── drizzle/                 # Drizzle ORM migrations
└── public/                  # Static assets
```

### Key Design Patterns

1. **Feature-Based Organization**: Code is organized by feature rather than by type
2. **Separation of Concerns**: Clear separation between UI, business logic, and data access
3. **Type Safety**: Comprehensive TypeScript usage throughout the codebase
4. **Performance Optimization**: Connection pooling, caching, and query optimization
5. **Error Handling**: Centralized error handling and logging
6. **Permission-Based Access**: Granular permission system for fine-grained access control

## Features

### Client Management

- View and search client information
- Update client details
- Filter by company, pension type, and status
- Bulk operations for efficient updates

### Status Tracking

- Track client status changes over time
- Status validation and workflow rules
- Status history and audit trail
- Bulk status updates

### Reports & Exports

- Dashboard with summary statistics
- Performance charts and trends
- Export data to various formats (CSV, Excel, PDF)
- Scheduled export jobs

### User Management

- User authentication and authorization
- Role-based access control
- Territory-based access restrictions
- User activity tracking

### Organization Management

- Branch and area management
- Branch contact information
- Territory assignments

### Configuration

- Dynamic configuration system
- Company-specific settings
- Audit trail for configuration changes

### Health Monitoring

- System health checks
- Database connectivity
- External service monitoring
- Performance metrics

## Development

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add comments for complex logic

### Testing

- Write unit tests for utilities and business logic
- Write integration tests for API routes
- Write component tests for UI components
- Maintain test coverage above 80%

### Performance

- Use connection pooling for database operations
- Implement caching for frequently accessed data
- Optimize database queries with proper indexes
- Monitor query performance and slow queries

### Security

- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Sanitize data before rendering

## Deployment

### Environment Setup

1. Set up production environment variables
2. Configure production database
3. Set up authentication providers
4. Configure external services

### Build Process

```bash
pnpm build
```

### Deployment Options

- **Vercel**: Recommended for Next.js applications
- **Docker**: Containerized deployment
- **Traditional**: Node.js server deployment

### Monitoring

- Set up application monitoring
- Configure error tracking (Sentry recommended)
- Set up log aggregation
- Monitor performance metrics

## API Documentation

### Authentication

All API endpoints require authentication using Clerk. Include the authentication token in the request headers.

### Rate Limiting

API endpoints are rate-limited to prevent abuse. Default limits:
- Read operations: 100 requests per minute
- Write operations: 50 requests per minute

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "data": {...},
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

### Endpoints

#### Clients
- `GET /api/clients` - List clients with pagination and filters
- `GET /api/clients/:id` - Get client details
- `PATCH /api/clients/:id` - Update client information
- `GET /api/clients/search` - Search clients

#### Status
- `GET /api/status/summary` - Get status summary
- `GET /api/status/client/:id` - Get client status
- `PATCH /api/status/update` - Update client status
- `POST /api/status/bulk-update` - Bulk update status
- `GET /api/status/history` - Get status history

#### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `GET /api/users/:id/permissions` - Get user permissions
- `PUT /api/users/:id/permissions` - Set user permissions

#### Reports
- `GET /api/reports/dashboard` - Get dashboard statistics
- `GET /api/reports/exports` - List export jobs
- `POST /api/reports/exports` - Create export job

#### Organization
- `GET /api/organization/branches` - List branches
- `POST /api/organization/branches` - Create branch
- `GET /api/organization/areas` - List areas
- `POST /api/organization/areas` - Create area

#### Admin
- `GET /api/admin/config/settings` - List configuration settings
- `PUT /api/admin/config/settings/:key` - Update configuration setting
- `GET /api/admin/activity` - List activity logs

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Test Structure

Tests are organized alongside the code they test:

```
src/
├── features/
│   ├── clients/
│   │   └── __tests__/
│   │       └── clients.test.ts
├── lib/
│   └── __tests__/
│       └── utils.test.ts
└── server/
    └── api/
        └── routes/
            └── __tests__/
                └── clients.test.ts
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

If you're experiencing database connection issues:

1. Check your `DATABASE_URL` in `.env`
2. Verify your database is running
3. Check connection pool settings
4. Review database logs

#### Performance Issues

If the application is slow:

1. Check for N+1 queries
2. Review slow query logs
3. Verify database indexes
4. Check connection pool statistics
5. Monitor memory usage

#### Authentication Issues

If users can't authenticate:

1. Verify Clerk API keys
2. Check webhook configuration
3. Review authentication middleware
4. Check user permissions

### Getting Help

- Check the [AI Context](./ai-context/README.md) for AI-specific guidance
- Review the [Phase Implementation Plans](./plans/) for detailed implementation guides
- Check the [Completion Reports](./phase-3-completion.md, etc.) for phase-specific information

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Hono Documentation](https://hono.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
