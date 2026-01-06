# AI Context for Client Updater V2

This document provides AI-specific context for understanding and working with the Client Updater V2 codebase.

## Project Overview

Client Updater V2 is a pension management system that handles client information, status tracking, and reporting. The system is built with modern web technologies and follows best practices for type safety, performance, and maintainability.

## Key Architectural Decisions

### 1. Feature-Based Organization

The codebase is organized by feature rather than by type. This makes it easier to find related code and understand the business logic.

```
src/features/
├── activity/          # Activity logging feature
├── clients/           # Client management feature
├── config/           # Configuration management feature
├── exports/           # Export functionality feature
├── status/            # Status tracking feature
└── users/            # User management feature
```

Each feature contains its own:
- Types and interfaces
- Components
- Hooks (for state management)
- Queries (for data fetching)
- Tests

### 2. Separation of Concerns

The application maintains clear separation between:
- **UI Layer**: React components in `src/app/` and `src/components/`
- **Business Logic**: Feature modules in `src/features/`
- **Data Access**: Database queries in `src/server/db/queries/`
- **API Layer**: API routes in `src/server/api/routes/`

### 3. Type Safety

TypeScript is used throughout the codebase for:
- Type checking at compile time
- Better IDE support and autocomplete
- Self-documenting code
- Reduced runtime errors

### 4. Performance Optimization

Several performance optimizations are implemented:
- Connection pooling for database operations
- Cursor-based pagination for large datasets
- Caching for frequently accessed data
- Query optimization with proper indexes
- Batch operations to avoid N+1 queries

### 5. Error Handling

Centralized error handling ensures consistent error responses:
- API errors are caught and formatted consistently
- User-friendly error messages are displayed
- Detailed errors are logged for debugging
- Error boundaries in React components

## Technology Stack

### Frontend

- **Next.js 14**: React framework with App Router
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable UI components
- **TanStack Query**: Data fetching and caching
- **Zustand**: State management

### Backend

- **Hono**: Fast and lightweight web framework
- **Drizzle ORM**: Type-safe SQL toolkit
- **PostgreSQL**: Primary database (via Supabase)
- **Redis**: Caching layer (via Upstash)
- **Snowflake**: Data warehouse for analytics

### Authentication & Authorization

- **Clerk**: Authentication service
- **Custom Permission System**: Granular access control

### Testing

- **Vitest**: Unit and integration testing
- **React Testing Library**: Component testing
- **MSW**: API mocking for tests

## Code Patterns

### 1. API Routes

API routes follow a consistent pattern:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const routes = new Hono()

// Validation schema
const schema = z.object({
  // Define validation rules
})

routes.get('/', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'resource', 'action')
    if (!hasReadPermission) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: '...' } }, 403)
    }

    // Execute business logic
    const data = await someFunction()

    // Log success
    logger.info('...', { action: '...', userId, orgId })

    return c.json({ success: true, data })
  } catch (error) {
    // Log error
    logger.error('...', error as Error, { action: '...', userId, orgId })

    return c.json({ success: false, error: { message: '...' } }, 500)
  }
})
```

### 2. Database Queries

Database queries use Drizzle ORM:

```typescript
import { db } from '@/server/db/index'
import { someTable } from '@/server/db/schema/someTable'
import { eq, and, desc } from 'drizzle-orm'

export async function getSomeData(params: SomeParams) {
  try {
    const result = await db
      .select()
      .from(someTable)
      .where(and(
        eq(someTable.field1, params.value1),
        eq(someTable.field2, params.value2)
      ))
      .orderBy(desc(someTable.createdAt))

    logger.info('Retrieved data', { action: '...', count: result.length })

    return result
  } catch (error) {
    logger.error('Failed to retrieve data', error as Error, { params })
    throw error
  }
}
```

### 3. React Components

React components follow a consistent pattern:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function SomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['some-key'],
    queryFn: async () => {
      const response = await fetch('/api/some-endpoint')
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="size-8" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Component content */}
    </div>
  )
}
```

### 4. TanStack Query Hooks

Custom hooks for data fetching:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useSomeData(params?: SomeParams) {
  return useQuery({
    queryKey: ['some-key', params],
    queryFn: async () => {
      const response = await fetch(`/api/some-endpoint?${new URLSearchParams(params).toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      return response.json()
    },
  })
}

export function useUpdateSomeData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SomeData) => {
      const response = await fetch('/api/some-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update data')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['some-key'] })
    },
  })
}
```

## Database Schema

The database schema is defined using Drizzle ORM in `src/server/db/schema/`. Key tables include:

- **users**: User accounts and authentication
- **clients**: Client information
- **status**: Client status tracking
- **branches**: Organization branches
- **areas**: Organization areas
- **config**: Configuration settings
- **activity_logs**: Activity tracking
- **exports**: Export jobs
- **jobs**: Background jobs
- **lookups**: Lookup tables (companies, pension types, etc.)

## Permission System

The application uses a granular permission system:

- Permissions are defined in the `permissions` table
- Each permission has a resource and action
- Users are granted permissions through user_permissions table
- Permission checks are performed in API routes

Example permissions:
- `clients:read` - View client information
- `clients:update` - Update client information
- `status:update` - Update client status
- `reports:export` - Export reports

## Testing Strategy

### Unit Tests

Unit tests are written for:
- Utility functions
- Business logic
- Data transformations

### Integration Tests

Integration tests are written for:
- API routes
- Database operations
- External service interactions

### Component Tests

Component tests are written for:
- React components
- User interactions
- UI rendering

### Test Structure

Tests are organized alongside the code they test:

```
src/features/some-feature/
├── some-component.tsx
└── __tests__/
    └── some-component.test.tsx
```

## Performance Considerations

### Database Optimization

- Use connection pooling
- Implement proper indexing
- Use cursor-based pagination for large datasets
- Avoid N+1 queries with batch fetching
- Monitor slow queries

### Caching

- Cache frequently accessed data
- Use Redis for distributed caching
- Implement cache invalidation strategies
- Monitor cache hit rates

### API Optimization

- Implement rate limiting
- Use compression for large responses
- Optimize payload sizes
- Implement request timeouts

## Security Considerations

### Authentication

- All API routes require authentication
- Use Clerk for authentication
- Implement session management
- Handle token expiration

### Authorization

- Check permissions for all operations
- Implement resource-level access control
- Use territory-based restrictions
- Audit all permission changes

### Input Validation

- Validate all user inputs
- Use Zod schemas for validation
- Sanitize data before storage
- Prevent SQL injection with parameterized queries

### Data Protection

- Encrypt sensitive data
- Implement data retention policies
- Audit access to sensitive data
- Follow GDPR/privacy regulations

## Common Tasks

### Adding a New Feature

1. Create feature directory in `src/features/`
2. Define types and interfaces
3. Implement database queries
4. Create API routes
5. Build UI components
6. Write tests
7. Update documentation

### Adding a New API Endpoint

1. Define validation schema
2. Implement route handler
3. Add permission checks
4. Add error handling
5. Add logging
6. Write tests
7. Update API documentation

### Modifying Database Schema

1. Update schema in `src/server/db/schema/`
2. Create migration with Drizzle
3. Run migration
4. Update related queries
5. Update types
6. Write tests
7. Update documentation

## Debugging Tips

### Database Issues

- Check connection pool statistics
- Review slow query logs
- Verify indexes are being used
- Check for N+1 queries

### Performance Issues

- Monitor response times
- Check for memory leaks
- Review query performance
- Verify caching is working

### Authentication Issues

- Verify Clerk configuration
- Check token validity
- Review permission assignments
- Check middleware configuration

## Future Enhancements

Potential areas for improvement:

1. **Real-time Updates**: Implement WebSocket support for real-time updates
2. **Advanced Analytics**: Enhance Snowflake integration for advanced analytics
3. **Mobile App**: Develop a mobile application for field workers
4. **AI Integration**: Add AI-powered insights and recommendations
5. **Advanced Reporting**: Implement more sophisticated reporting capabilities
6. **Performance Monitoring**: Integrate APM tools for better monitoring
7. **Automated Testing**: Implement E2E testing with Playwright
8. **Internationalization**: Add support for multiple languages

## Contact & Support

For questions or issues related to this codebase:
1. Check the main documentation in `docs/README.md`
2. Review phase implementation plans in `docs/plans/`
3. Check completion reports in `docs/phase-*-completion.md`
4. Review existing code patterns and tests
