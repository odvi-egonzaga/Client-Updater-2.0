# Phase 7: Polish & Documentation

**Date:** 2026-01-05
**Phase:** 7 of 7 (Final)
**Status:** Planning
**Depends on:** All previous phases (0-6)

---

## Overview

This final phase focuses on production readiness: performance optimization, error handling improvements, comprehensive documentation, and final polish. The goal is to ensure the system is maintainable, well-documented, and ready for production deployment.

### Goals

1. **Performance Optimization** - Identify and fix bottlenecks
2. **Error Handling** - Consistent error responses, user-friendly messages
3. **Activity Logging** - Complete audit trail for user actions
4. **Documentation** - Module READMEs, API docs, AI context
5. **Testing** - Ensure adequate test coverage
6. **Production Readiness** - Environment configs, deployment scripts

---

## Prerequisites

Before starting this phase, ensure:

- [x] All previous phases completed
- [x] Core features working
- [x] Basic error handling in place
- [x] Database schema finalized

---

## Tasks

### Task 1: Activity Logging Schema

**File:** `src/lib/db/schema/activity.ts`

Complete activity logging for audit trail:

```typescript
import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }).notNull(),
    resourceId: uuid('resource_id'),
    details: jsonb('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    durationMs: integer('duration_ms'),
    statusCode: integer('status_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_activity_logs_user').on(table.userId),
    resourceIdx: index('idx_activity_logs_resource').on(table.resource, table.resourceId),
    createdAtIdx: index('idx_activity_logs_created_at').on(table.createdAt),
    actionIdx: index('idx_activity_logs_action').on(table.action),
  })
)

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}))

// Predefined action types for consistency
export const ActivityAction = {
  // Auth
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  PASSWORD_CHANGE: 'user.password_change',

  // Client
  CLIENT_VIEW: 'client.view',
  CLIENT_SEARCH: 'client.search',
  CLIENT_UPDATE_CONTACT: 'client.update_contact',

  // Status
  STATUS_VIEW: 'status.view',
  STATUS_UPDATE: 'status.update',
  STATUS_BULK_UPDATE: 'status.bulk_update',

  // Sync
  SYNC_TRIGGER: 'sync.trigger',
  SYNC_COMPLETE: 'sync.complete',
  SYNC_FAILED: 'sync.failed',

  // Export
  EXPORT_REQUEST: 'export.request',
  EXPORT_DOWNLOAD: 'export.download',

  // Admin
  CONFIG_CREATE: 'config.create',
  CONFIG_UPDATE: 'config.update',
  CONFIG_DELETE: 'config.delete',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  PERMISSION_ASSIGN: 'permission.assign',
  PERMISSION_REVOKE: 'permission.revoke',

  // Organization
  BRANCH_CREATE: 'branch.create',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_DELETE: 'branch.delete',
  AREA_CREATE: 'area.create',
  AREA_UPDATE: 'area.update',
  AREA_DELETE: 'area.delete',
} as const

export type ActivityActionType = (typeof ActivityAction)[keyof typeof ActivityAction]
```

**Acceptance Criteria:**
- [ ] Activity log table with indexes
- [ ] Predefined action types
- [ ] Foreign key to users

---

### Task 2: Activity Logging Service

**File:** `src/lib/services/activity-logger.ts`

```typescript
import { db } from '@/lib/db'
import { activityLogs, ActivityActionType } from '@/lib/db/schema'

export interface LogActivityParams {
  userId?: string
  action: ActivityActionType
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  durationMs?: number
  statusCode?: number
  errorMessage?: string
}

// Main logging function
export async function logActivity(params: LogActivityParams) {
  try {
    await db.insert(activityLogs).values({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      durationMs: params.durationMs,
      statusCode: params.statusCode,
      errorMessage: params.errorMessage,
    })
  } catch (error) {
    // Don't throw - logging should never break the main flow
    console.error('Failed to log activity:', error)
  }
}

// Helper to extract request metadata
export function extractRequestMeta(req: Request): {
  ipAddress?: string
  userAgent?: string
} {
  return {
    ipAddress:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }
}

// Middleware-style logger for Hono
export function createActivityLogger() {
  return async function activityLoggerMiddleware(
    c: any,
    next: () => Promise<void>
  ) {
    const startTime = Date.now()
    const requestMeta = extractRequestMeta(c.req.raw)

    await next()

    // Only log for authenticated requests
    const userId = c.get('userId')
    if (!userId) return

    // Determine action from route
    const method = c.req.method
    const path = new URL(c.req.url).pathname

    // Map routes to actions (simplified)
    const action = mapRouteToAction(method, path)
    if (!action) return

    const resource = extractResource(path)
    const resourceId = extractResourceId(path)

    await logActivity({
      userId,
      action,
      resource,
      resourceId,
      details: {
        method,
        path,
        query: Object.fromEntries(new URL(c.req.url).searchParams),
      },
      ...requestMeta,
      durationMs: Date.now() - startTime,
      statusCode: c.res.status,
    })
  }
}

// Map HTTP method + path to action type
function mapRouteToAction(method: string, path: string): ActivityActionType | null {
  const pathParts = path.split('/').filter(Boolean)

  // Skip internal routes
  if (pathParts[0] === 'health' || pathParts[0] === 'api' && pathParts[1] === 'health') {
    return null
  }

  // Client routes
  if (path.includes('/clients')) {
    if (method === 'GET') return 'client.view'
    if (method === 'PATCH') return 'client.update_contact'
  }

  // Status routes
  if (path.includes('/status')) {
    if (method === 'GET') return 'status.view'
    if (method === 'POST' && path.includes('bulk')) return 'status.bulk_update'
    if (method === 'POST') return 'status.update'
  }

  // Export routes
  if (path.includes('/exports')) {
    if (method === 'POST') return 'export.request'
    if (method === 'GET' && path.includes('download')) return 'export.download'
  }

  // Config routes
  if (path.includes('/config')) {
    if (method === 'POST') return 'config.create'
    if (method === 'PATCH' || method === 'PUT') return 'config.update'
    if (method === 'DELETE') return 'config.delete'
  }

  // User routes
  if (path.includes('/users')) {
    if (method === 'POST') return 'user.create'
    if (method === 'PATCH') return 'user.update'
    if (method === 'DELETE') return 'user.delete'
  }

  // Branch routes
  if (path.includes('/branches')) {
    if (method === 'POST') return 'branch.create'
    if (method === 'PATCH') return 'branch.update'
    if (method === 'DELETE') return 'branch.delete'
  }

  // Area routes
  if (path.includes('/areas')) {
    if (method === 'POST') return 'area.create'
    if (method === 'PATCH') return 'area.update'
    if (method === 'DELETE') return 'area.delete'
  }

  return null
}

function extractResource(path: string): string {
  const parts = path.split('/').filter(Boolean)
  // Skip 'api' prefix
  const start = parts[0] === 'api' ? 1 : 0
  return parts[start] || 'unknown'
}

function extractResourceId(path: string): string | undefined {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const match = path.match(uuidRegex)
  return match?.[0]
}
```

**Acceptance Criteria:**
- [ ] Log activity function
- [ ] Request metadata extraction
- [ ] Route-to-action mapping
- [ ] Non-blocking logging

---

### Task 3: Activity Log Queries

**File:** `src/features/activity/queries/activity.queries.ts`

```typescript
import { db } from '@/lib/db'
import { activityLogs } from '@/lib/db/schema'
import { eq, and, gte, lte, ilike, or, sql, desc } from 'drizzle-orm'

export interface ActivityLogFilters {
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  fromDate?: Date
  toDate?: Date
  search?: string
}

export interface ActivityLogOptions {
  page?: number
  pageSize?: number
  filters?: ActivityLogFilters
}

export async function listActivityLogs(options: ActivityLogOptions = {}) {
  const { page = 1, pageSize = 50, filters = {} } = options
  const offset = (page - 1) * pageSize

  const conditions = []

  if (filters.userId) {
    conditions.push(eq(activityLogs.userId, filters.userId))
  }

  if (filters.action) {
    conditions.push(eq(activityLogs.action, filters.action))
  }

  if (filters.resource) {
    conditions.push(eq(activityLogs.resource, filters.resource))
  }

  if (filters.resourceId) {
    conditions.push(eq(activityLogs.resourceId, filters.resourceId))
  }

  if (filters.fromDate) {
    conditions.push(gte(activityLogs.createdAt, filters.fromDate))
  }

  if (filters.toDate) {
    conditions.push(lte(activityLogs.createdAt, filters.toDate))
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(activityLogs.action, `%${filters.search}%`),
        ilike(activityLogs.resource, `%${filters.search}%`)
      )!
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(whereClause)

  // Get data with user info
  const data = await db.query.activityLogs.findMany({
    where: whereClause,
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [desc(activityLogs.createdAt)],
    limit: pageSize,
    offset,
  })

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  }
}

export async function getActivityForResource(resource: string, resourceId: string) {
  return db.query.activityLogs.findMany({
    where: and(eq(activityLogs.resource, resource), eq(activityLogs.resourceId, resourceId)),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [desc(activityLogs.createdAt)],
    limit: 100,
  })
}

export async function getUserActivitySummary(userId: string, days: number = 30) {
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)

  const result = await db
    .select({
      action: activityLogs.action,
      count: sql<number>`count(*)::int`,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), gte(activityLogs.createdAt, fromDate)))
    .groupBy(activityLogs.action)
    .orderBy(sql`count(*) desc`)

  return result
}
```

**Acceptance Criteria:**
- [ ] List with filters and pagination
- [ ] Resource-specific activity
- [ ] User activity summary

---

### Task 4: Activity Log API

**File:** `src/app/api/[[...route]]/routes/activity.routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requirePermission } from '@/lib/api/middleware/auth'
import { listActivityLogs, getActivityForResource, getUserActivitySummary } from '@/features/activity/queries/activity.queries'
import { successResponse } from '@/lib/api/response'

const app = new Hono()

app.use('*', requireAuth())

// List activity logs
app.get(
  '/',
  requirePermission('activity:read'),
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(50),
      userId: z.string().uuid().optional(),
      action: z.string().optional(),
      resource: z.string().optional(),
      resourceId: z.string().uuid().optional(),
      fromDate: z.string().datetime().optional().transform((s) => (s ? new Date(s) : undefined)),
      toDate: z.string().datetime().optional().transform((s) => (s ? new Date(s) : undefined)),
      search: z.string().optional(),
    })
  ),
  async (c) => {
    const { page, pageSize, ...filters } = c.req.valid('query')
    const result = await listActivityLogs({ page, pageSize, filters })
    return c.json(successResponse(result.data, { ...result, data: undefined }))
  }
)

// Get activity for specific resource
app.get(
  '/resource/:resource/:resourceId',
  requirePermission('activity:read'),
  zValidator(
    'param',
    z.object({
      resource: z.string(),
      resourceId: z.string().uuid(),
    })
  ),
  async (c) => {
    const { resource, resourceId } = c.req.valid('param')
    const activity = await getActivityForResource(resource, resourceId)
    return c.json(successResponse(activity))
  }
)

// Get user activity summary
app.get(
  '/user/:userId/summary',
  requirePermission('activity:read'),
  zValidator('param', z.object({ userId: z.string().uuid() })),
  zValidator('query', z.object({ days: z.coerce.number().min(1).max(365).default(30) })),
  async (c) => {
    const { userId } = c.req.valid('param')
    const { days } = c.req.valid('query')
    const summary = await getUserActivitySummary(userId, days)
    return c.json(successResponse(summary))
  }
)

export default app
```

**Acceptance Criteria:**
- [ ] List activity with filters
- [ ] Resource-specific activity
- [ ] User summary endpoint
- [ ] Permission checks

---

### Task 5: Enhanced Error Handling

**File:** `src/lib/api/errors.ts`

Standardized error classes and handling:

```typescript
// Application error codes
export const ErrorCode = {
  // Auth errors (401, 403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Business logic errors (422)
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  PERIOD_NOT_INITIALIZED: 'PERIOD_NOT_INITIALIZED',
  TERMINAL_STATUS: 'TERMINAL_STATUS',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // External service errors (502, 503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// Base application error
export class AppError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

// Specific error classes
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      ErrorCode.NOT_FOUND,
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      404,
      { resource, id }
    )
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(ErrorCode.FORBIDDEN, message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, 409, details)
  }
}

export class BusinessLogicError extends AppError {
  constructor(code: ErrorCodeType, message: string, details?: Record<string, unknown>) {
    super(code, message, 422, details)
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(ErrorCode.RATE_LIMITED, 'Too many requests', 429, { retryAfter })
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(ErrorCode.SERVICE_UNAVAILABLE, `${service} is currently unavailable`, 503, { service })
  }
}
```

**File:** `src/lib/api/middleware/error-handler.ts`

```typescript
import { AppError, ErrorCode } from '../errors'
import { logActivity } from '@/lib/services/activity-logger'

export function errorHandler() {
  return async (err: Error, c: any) => {
    // Extract request info
    const userId = c.get('userId')
    const requestId = c.get('requestId') || crypto.randomUUID()

    // Log error
    console.error(`[${requestId}] Error:`, err)

    // Handle known errors
    if (err instanceof AppError) {
      // Log activity for significant errors
      if (err.statusCode >= 500) {
        await logActivity({
          userId,
          action: 'error.server',
          resource: 'system',
          details: {
            code: err.code,
            message: err.message,
            stack: err.stack,
          },
          statusCode: err.statusCode,
          errorMessage: err.message,
        }).catch(() => {})
      }

      return c.json(
        {
          success: false,
          error: err.toJSON(),
          requestId,
        },
        err.statusCode
      )
    }

    // Handle Zod validation errors
    if (err.name === 'ZodError') {
      return c.json(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            details: (err as any).errors,
          },
          requestId,
        },
        400
      )
    }

    // Handle unknown errors
    await logActivity({
      userId,
      action: 'error.unhandled',
      resource: 'system',
      details: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      statusCode: 500,
      errorMessage: err.message,
    }).catch(() => {})

    return c.json(
      {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
        },
        requestId,
      },
      500
    )
  }
}
```

**Acceptance Criteria:**
- [ ] Standardized error codes
- [ ] Error classes for common cases
- [ ] Error handler middleware
- [ ] Error activity logging
- [ ] Production-safe messages

---

### Task 6: Activity Log UI

**File:** `src/app/(dashboard)/admin/activity/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { Search, RefreshCw, User, FileText, Clock } from 'lucide-react'
import { api } from '@/lib/api/client'
import { formatDistanceToNow, format } from 'date-fns'

const ACTION_CATEGORIES = [
  { value: '', label: 'All Actions' },
  { value: 'user', label: 'User Actions' },
  { value: 'client', label: 'Client Actions' },
  { value: 'status', label: 'Status Actions' },
  { value: 'config', label: 'Config Actions' },
  { value: 'export', label: 'Export Actions' },
  { value: 'sync', label: 'Sync Actions' },
]

const RESOURCE_TYPES = [
  { value: '', label: 'All Resources' },
  { value: 'clients', label: 'Clients' },
  { value: 'status', label: 'Status' },
  { value: 'users', label: 'Users' },
  { value: 'config', label: 'Config' },
  { value: 'branches', label: 'Branches' },
  { value: 'areas', label: 'Areas' },
  { value: 'exports', label: 'Exports' },
]

export default function ActivityLogPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', { page, search, action: actionFilter, resource: resourceFilter }],
    queryFn: () =>
      api.get('/activity', {
        params: {
          page,
          pageSize: 50,
          search: search || undefined,
          action: actionFilter ? `${actionFilter}.%` : undefined,
          resource: resourceFilter || undefined,
        },
      }),
  })

  const columns = [
    {
      accessorKey: 'createdAt',
      header: 'Time',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span title={format(new Date(row.original.createdAt), 'PPpp')}>
            {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>
            {row.original.user
              ? `${row.original.user.firstName} ${row.original.user.lastName}`
              : 'System'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }: any) => {
        const [category, action] = row.original.action.split('.')
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{category}</Badge>
            <span>{action}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'resource',
      header: 'Resource',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.resource}</span>
          {row.original.resourceId && (
            <span className="text-xs text-muted-foreground font-mono">
              {row.original.resourceId.slice(0, 8)}...
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'statusCode',
      header: 'Status',
      cell: ({ row }: any) => {
        const code = row.original.statusCode
        const variant =
          code >= 500 ? 'destructive' : code >= 400 ? 'warning' : code >= 200 ? 'success' : 'secondary'
        return code ? <Badge variant={variant as any}>{code}</Badge> : '-'
      },
    },
    {
      accessorKey: 'durationMs',
      header: 'Duration',
      cell: ({ row }: any) =>
        row.original.durationMs ? `${row.original.durationMs}ms` : '-',
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP',
      cell: ({ row }: any) => (
        <span className="font-mono text-xs">{row.original.ipAddress || '-'}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, resources..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Resource" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((res) => (
                  <SelectItem key={res.value} value={res.value}>
                    {res.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={{
          page,
          pageSize: 50,
          total: data?.meta?.total || 0,
          onPageChange: setPage,
        }}
      />
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Activity log table
- [ ] Filter by action category
- [ ] Filter by resource
- [ ] Search functionality
- [ ] User info display
- [ ] Time display with relative format

---

### Task 7: Performance Optimizations

**File:** `src/lib/db/optimizations.ts`

Query optimization utilities:

```typescript
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// Connection pool monitoring
export async function getConnectionPoolStats() {
  // This would be specific to your connection pool implementation
  return {
    total: 10,
    idle: 5,
    waiting: 0,
  }
}

// Query explain analyzer
export async function explainQuery(query: string) {
  const result = await db.execute(sql.raw(`EXPLAIN ANALYZE ${query}`))
  return result
}

// Common query optimizations
export const optimizedQueries = {
  // Use cursor-based pagination for large tables
  cursorPaginate: async <T>(
    table: any,
    cursor: string | undefined,
    limit: number,
    orderBy: any
  ) => {
    // Implementation depends on your cursor strategy
    return { data: [] as T[], nextCursor: undefined }
  },

  // Batch fetch to avoid N+1
  batchFetch: async <T>(
    ids: string[],
    fetcher: (ids: string[]) => Promise<T[]>
  ): Promise<Map<string, T>> => {
    const results = await fetcher(ids)
    return new Map(results.map((r: any) => [r.id, r]))
  },
}

// Cache warming for frequently accessed data
export async function warmCache() {
  const { cache, cacheKeys } = await import('@/lib/cache/redis')

  // Warm lookup tables
  const lookups = await db.query.companies.findMany()
  await cache.set(cacheKeys.lookups, lookups, 3600)

  // Add more cache warming as needed
}

// Query timing wrapper
export function withQueryTiming<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  return fn().finally(() => {
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`Slow query: ${name} took ${duration}ms`)
    }
  })
}
```

**File:** `src/lib/api/middleware/performance.ts`

```typescript
// Request timeout middleware
export function withTimeout(timeoutMs: number = 30000) {
  return async (c: any, next: () => Promise<void>) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      c.set('abortSignal', controller.signal)
      await next()
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// Response compression (if not handled by Vercel)
export function withCompression() {
  return async (c: any, next: () => Promise<void>) => {
    await next()

    // Vercel handles this automatically
    // This is just a placeholder for self-hosted scenarios
  }
}

// Query count limiter
export function withQueryLimit(maxQueries: number = 100) {
  return async (c: any, next: () => Promise<void>) => {
    let queryCount = 0

    // In a real implementation, you'd instrument the db client
    c.set('incrementQueryCount', () => {
      queryCount++
      if (queryCount > maxQueries) {
        throw new Error(`Query limit exceeded: ${queryCount} > ${maxQueries}`)
      }
    })

    await next()

    if (queryCount > maxQueries * 0.8) {
      console.warn(`High query count for request: ${queryCount}`)
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Connection pool monitoring
- [ ] Query explain utility
- [ ] Cache warming function
- [ ] Query timing wrapper
- [ ] Request timeout middleware

---

### Task 8: Documentation Structure

Create documentation folder structure:

**File:** `docs/README.md`

```markdown
# Client Updater v2 Documentation

Welcome to the Client Updater v2 documentation. This folder contains comprehensive documentation for developers, administrators, and AI assistants.

## Quick Links

- [Getting Started](./development/getting-started.md)
- [API Reference](./api/README.md)
- [Business Logic](./business-logic/README.md)
- [AI Context](./ai-context/README.md)

## Documentation Structure

```
docs/
├── README.md                    # This file
├── business-logic/              # Business rules and domain logic
│   ├── README.md
│   ├── 01-domain-overview.md
│   ├── 02-client-lifecycle.md
│   ├── 03-status-workflow.md
│   ├── 04-fcash-vs-pcni.md
│   ├── 05-territory-management.md
│   ├── 06-permission-model.md
│   ├── 07-sync-process.md
│   └── glossary.md
├── architecture/                # Technical architecture
│   ├── README.md
│   ├── 01-system-overview.md
│   ├── 02-database-schema.md
│   ├── 03-data-flow.md
│   ├── 04-auth-and-permissions.md
│   ├── 05-api-design.md
│   ├── 06-caching-strategy.md
│   └── 07-queue-system.md
├── api/                         # API documentation
│   ├── README.md
│   ├── authentication.md
│   ├── error-codes.md
│   ├── clients.md
│   ├── status.md
│   ├── sync.md
│   ├── reports.md
│   ├── admin.md
│   ├── users.md
│   └── organization.md
├── development/                 # Developer guides
│   ├── README.md
│   ├── getting-started.md
│   ├── environment-variables.md
│   ├── database-migrations.md
│   ├── adding-new-feature.md
│   ├── testing-guide.md
│   └── deployment.md
└── ai-context/                  # AI-specific context
    ├── README.md
    ├── quick-reference.md
    ├── common-tasks.md
    └── gotchas.md
```

## For Developers

Start with [Getting Started](./development/getting-started.md) to set up your development environment.

## For AI Assistants

See [AI Context](./ai-context/README.md) for quick reference and common patterns.
```

**File:** `docs/ai-context/README.md`

```markdown
# AI Context

This folder contains documentation specifically designed to help AI assistants understand and work with the Client Updater v2 codebase quickly.

## Quick Reference

### Project Structure

```
client-updater-version-2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (public)
│   │   ├── (dashboard)/        # Dashboard pages (protected)
│   │   └── api/[[...route]]/   # Hono API routes
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn/ui primitives
│   │   └── shared/             # Shared components
│   ├── features/               # Feature modules
│   │   ├── auth/               # Authentication
│   │   ├── clients/            # Client management
│   │   ├── status/             # Status tracking
│   │   ├── exports/            # Export functionality
│   │   └── admin/              # Admin features
│   ├── lib/                    # Core libraries
│   │   ├── db/                 # Database (Drizzle)
│   │   ├── api/                # API utilities
│   │   ├── cache/              # Redis caching
│   │   └── services/           # Core services
│   └── stores/                 # Zustand stores
├── docs/                       # Documentation
└── drizzle/                    # Database migrations
```

### Key Patterns

#### API Routes (Hono)
```typescript
// src/app/api/[[...route]]/routes/*.ts
import { Hono } from 'hono'
import { requireAuth, requirePermission } from '@/lib/api/middleware/auth'

const app = new Hono()
app.use('*', requireAuth())
app.get('/', requirePermission('resource:read'), async (c) => {
  // Handler
})
```

#### Database Queries (Drizzle)
```typescript
// src/features/*/queries/*.ts
import { db } from '@/lib/db'
import { tableName } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getById(id: string) {
  return db.query.tableName.findFirst({
    where: eq(tableName.id, id),
    with: { relation: true },
  })
}
```

#### React Components
```typescript
// src/app/(dashboard)/**/page.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export default function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ['resource'],
    queryFn: () => api.get('/resource'),
  })
  // Render
}
```

### Common Tasks

1. **Add new API endpoint** → Create route in `src/app/api/[[...route]]/routes/`
2. **Add new database table** → Define in `src/lib/db/schema/`, run migrations
3. **Add new page** → Create in `src/app/(dashboard)/`
4. **Add new feature** → Create module in `src/features/`

### Business Logic Summary

- **Companies**: FCASH and PCNI (different status workflows)
- **Status Tracking**: Monthly (FCASH, PCNI Non-PNP) or Quarterly (PCNI PNP)
- **Territory Access**: Users see only clients in their assigned branches/areas
- **Permissions**: Granular permissions (resource:action format)

See [quick-reference.md](./quick-reference.md) for more details.
```

**Acceptance Criteria:**
- [ ] Documentation folder structure created
- [ ] Main README with navigation
- [ ] AI context folder with quick reference
- [ ] Placeholder files for other sections

---

### Task 9: Module READMEs

Create README files for key modules:

**File:** `src/features/clients/README.md`

```markdown
# Clients Module

Handles client data management including listing, searching, and contact updates.

## Files

- `queries/client.queries.ts` - Database queries for clients
- `services/client.service.ts` - Business logic
- `hooks/use-clients.ts` - React Query hooks (frontend)

## Key Functions

### `listClients(options)`
List clients with pagination and filtering.

```typescript
const result = await listClients({
  page: 1,
  pageSize: 25,
  filters: {
    branchIds: ['...'],
    pensionTypeId: '...',
    search: 'john',
  },
})
```

### `getClientById(id)`
Get single client with all relations.

### `updateClientContact(id, data)`
Update client contact information.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | List clients |
| GET | `/api/clients/:id` | Get client |
| PATCH | `/api/clients/:id/contact` | Update contact |

## Permissions

- `clients:read` - View clients
- `clients:update` - Update client info

## Territory Filtering

Clients are automatically filtered based on user's assigned branches/areas.
See `services/territory-filter.service.ts`.
```

**File:** `src/features/status/README.md`

```markdown
# Status Module

Handles client status tracking with workflow validation.

## Business Rules

### Status Workflow
```
PENDING → TO_FOLLOW → CALLED → [VISITED] → UPDATED → DONE
```

- VISITED is only available for FCASH clients
- Terminal statuses (Deceased, Fully-Paid) exclude from future periods

### Period Types
- **Monthly**: FCASH and PCNI Non-PNP
- **Quarterly**: PCNI PNP only

## Files

- `queries/status.queries.ts` - Database queries
- `services/status-workflow.service.ts` - Workflow validation
- `services/period.service.ts` - Period initialization

## Key Functions

### `updateStatus(clientId, data, userId)`
Update client status with validation.

### `initializePeriod(year, month, companyId)`
Create PENDING records for new period.

### `validateStatusTransition(from, to, companyId)`
Check if status transition is valid.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status/:clientId` | Get current status |
| POST | `/api/status/update` | Update status |
| GET | `/api/status/history/:clientId` | Get history |
| GET | `/api/status/summary` | Dashboard counts |
```

**Acceptance Criteria:**
- [ ] README for clients module
- [ ] README for status module
- [ ] README for each major feature
- [ ] Clear documentation of key functions

---

### Task 10: Seed Data Scripts

**File:** `src/lib/db/seeds/lookups.seed.ts`

```typescript
import { db } from '@/lib/db'
import { companies, pensionTypes, statusTypes, statusReasons, parStatuses, accountTypes } from '@/lib/db/schema'

export async function seedLookups() {
  console.log('Seeding lookup tables...')

  // Companies
  const companiesData = [
    { code: 'FCASH', name: 'FastCash' },
    { code: 'PCNI', name: 'PCNI' },
  ]

  const insertedCompanies = await db
    .insert(companies)
    .values(companiesData)
    .onConflictDoNothing()
    .returning()

  const fcashId = insertedCompanies.find((c) => c.code === 'FCASH')?.id
  const pcniId = insertedCompanies.find((c) => c.code === 'PCNI')?.id

  // Pension Types
  const pensionTypesData = [
    { code: 'SSS', name: 'SSS', companyId: fcashId },
    { code: 'GSIS', name: 'GSIS', companyId: fcashId },
    { code: 'PVAO', name: 'PVAO', companyId: fcashId },
    { code: 'NON_PNP', name: 'Non-PNP', companyId: pcniId },
    { code: 'PNP', name: 'PNP', companyId: pcniId },
  ]

  await db.insert(pensionTypes).values(pensionTypesData).onConflictDoNothing()

  // Status Types
  const statusTypesData = [
    { code: 'PENDING', name: 'Pending', sequence: 1 },
    { code: 'TO_FOLLOW', name: 'To Follow', sequence: 2 },
    { code: 'CALLED', name: 'Called', sequence: 3 },
    { code: 'VISITED', name: 'Visited', sequence: 4, companyId: fcashId }, // FCASH only
    { code: 'UPDATED', name: 'Updated', sequence: 5 },
    { code: 'DONE', name: 'Done', sequence: 6 },
  ]

  const insertedStatuses = await db
    .insert(statusTypes)
    .values(statusTypesData)
    .onConflictDoNothing()
    .returning()

  // Status Reasons
  const doneStatusId = insertedStatuses.find((s) => s.code === 'DONE')?.id

  const statusReasonsData = [
    { code: 'DECEASED', name: 'Deceased', statusTypeId: doneStatusId, isTerminal: true },
    { code: 'FULLY_PAID', name: 'Fully Paid', statusTypeId: doneStatusId, isTerminal: true },
    { code: 'CONFIRMED', name: 'Confirmed', statusTypeId: doneStatusId, isTerminal: false },
  ]

  await db.insert(statusReasons).values(statusReasonsData).onConflictDoNothing()

  // PAR Statuses
  const parStatusesData = [
    { code: 'do_not_show', name: 'Current', isTrackable: true },
    { code: 'tele_130', name: '30+ Days', isTrackable: true },
    { code: 'tele_hardcore', name: '60+ Days (Hardcore)', isTrackable: false },
  ]

  await db.insert(parStatuses).values(parStatusesData).onConflictDoNothing()

  // Account Types
  const accountTypesData = [
    { code: 'PASSBOOK', name: 'Passbook' },
    { code: 'ATM', name: 'ATM' },
    { code: 'BOTH', name: 'Both' },
    { code: 'NONE', name: 'None' },
  ]

  await db.insert(accountTypes).values(accountTypesData).onConflictDoNothing()

  console.log('Lookup tables seeded successfully')
}
```

**File:** `src/lib/db/seeds/permissions.seed.ts`

```typescript
import { db } from '@/lib/db'
import { permissions } from '@/lib/db/schema'

export async function seedPermissions() {
  console.log('Seeding permissions...')

  const permissionsData = [
    // Client permissions
    { code: 'clients:read', resource: 'clients', action: 'read', description: 'View clients' },
    { code: 'clients:update', resource: 'clients', action: 'update', description: 'Update client info' },

    // Status permissions
    { code: 'status:read', resource: 'status', action: 'read', description: 'View status' },
    { code: 'status:update', resource: 'status', action: 'update', description: 'Update status' },

    // Report permissions
    { code: 'reports:read', resource: 'reports', action: 'read', description: 'View reports' },
    { code: 'reports:export', resource: 'reports', action: 'export', description: 'Export data' },

    // User permissions
    { code: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { code: 'users:manage', resource: 'users', action: 'manage', description: 'Manage users' },

    // Branch permissions
    { code: 'branches:read', resource: 'branches', action: 'read', description: 'View branches' },
    { code: 'branches:manage', resource: 'branches', action: 'manage', description: 'Manage branches' },

    // Area permissions
    { code: 'areas:read', resource: 'areas', action: 'read', description: 'View areas' },
    { code: 'areas:manage', resource: 'areas', action: 'manage', description: 'Manage areas' },

    // Config permissions
    { code: 'config:read', resource: 'config', action: 'read', description: 'View config' },
    { code: 'config:manage', resource: 'config', action: 'manage', description: 'Manage config' },

    // Sync permissions
    { code: 'sync:read', resource: 'sync', action: 'read', description: 'View sync status' },
    { code: 'sync:execute', resource: 'sync', action: 'execute', description: 'Trigger sync' },

    // Activity permissions
    { code: 'activity:read', resource: 'activity', action: 'read', description: 'View activity logs' },
  ]

  await db.insert(permissions).values(permissionsData).onConflictDoNothing()

  console.log('Permissions seeded successfully')
}
```

**File:** `src/lib/db/seeds/index.ts`

```typescript
import { seedLookups } from './lookups.seed'
import { seedPermissions } from './permissions.seed'

export async function runAllSeeds() {
  try {
    await seedLookups()
    await seedPermissions()
    console.log('All seeds completed successfully')
  } catch (error) {
    console.error('Seed failed:', error)
    throw error
  }
}

// CLI runner
if (require.main === module) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
```

**Acceptance Criteria:**
- [ ] Lookup tables seed
- [ ] Permissions seed
- [ ] Combined seed runner
- [ ] Idempotent (safe to run multiple times)

---

### Task 11: Environment Configuration

**File:** `.env.example`

```bash
# ===========================================
# Client Updater v2 - Environment Variables
# ===========================================

# =========== Application ===========
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# =========== Database ===========
DATABASE_URL=postgresql://postgres:password@localhost:5432/client_updater

# =========== Supabase ===========
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# =========== Authentication (Clerk) ===========
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# =========== Redis (Upstash) ===========
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# =========== Snowflake ===========
SNOWFLAKE_ACCOUNT=xxx.ap-southeast-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_ROLE=CLIENT_UPDATER_ROLE
SNOWFLAKE_AUTHENTICATOR=SNOWFLAKE_JWT
SNOWFLAKE_DATABASE_SOURCE=DTT_LMS
SNOWFLAKE_DATABASE_APP=CFB_TOOLS_QA
SNOWFLAKE_SCHEMA_APP=CLIENT_UPDATER

# =========== NextBank API ===========
NEXTBANK_API_URL=https://api.nextbank.cloud
NEXTBANK_API_KEY=xxx

# =========== Rate Limiting ===========
RATE_LIMIT_READ_REQUESTS=100
RATE_LIMIT_WRITE_REQUESTS=30
RATE_LIMIT_EXPORT_REQUESTS=5
RATE_LIMIT_LOGIN_ATTEMPTS=5

# =========== Circuit Breaker ===========
CIRCUIT_SNOWFLAKE_THRESHOLD=5
CIRCUIT_SNOWFLAKE_COOLDOWN_MS=60000
CIRCUIT_NEXTBANK_THRESHOLD=3
CIRCUIT_NEXTBANK_COOLDOWN_MS=30000

# =========== Data Retention (days) ===========
RETENTION_ACTIVITY_LOGS=90
RETENTION_COMPLETED_JOBS=7
RETENTION_EXPIRED_SESSIONS=7
RETENTION_EXPORT_FILES=30

# =========== Health Check ===========
HEALTH_CHECK_TIMEOUT_MS=5000
```

**File:** `src/config/env.ts`

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Snowflake
  SNOWFLAKE_ACCOUNT: z.string().optional(),
  SNOWFLAKE_USERNAME: z.string().optional(),
  SNOWFLAKE_PRIVATE_KEY: z.string().optional(),
  SNOWFLAKE_WAREHOUSE: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_READ_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WRITE_REQUESTS: z.coerce.number().default(30),
  RATE_LIMIT_EXPORT_REQUESTS: z.coerce.number().default(5),

  // Retention
  RETENTION_ACTIVITY_LOGS: z.coerce.number().default(90),
  RETENTION_EXPORT_FILES: z.coerce.number().default(30),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw new Error('Invalid environment configuration')
  }
}

export const env = validateEnv()
```

**Acceptance Criteria:**
- [ ] Complete .env.example
- [ ] Environment validation with Zod
- [ ] Type-safe env access
- [ ] Clear error messages for missing vars

---

### Task 12: Final Testing Checklist

**File:** `docs/development/testing-checklist.md`

```markdown
# Testing Checklist

## Pre-Deployment Testing

### Authentication
- [ ] User can sign in with Clerk
- [ ] User can sign out
- [ ] Unauthorized access returns 401
- [ ] Forbidden access returns 403
- [ ] Session persists across page refreshes

### Clients
- [ ] List clients with pagination
- [ ] Filter by branch, pension type, PAR status
- [ ] Search by name, code
- [ ] View client details
- [ ] Update client contact

### Status Tracking
- [ ] View client status for period
- [ ] Update status (valid transition)
- [ ] Invalid transition shows error
- [ ] Status history displays correctly
- [ ] Terminal status excludes from future

### Dashboard
- [ ] Status summary shows correct counts
- [ ] Charts render correctly
- [ ] Period selector works
- [ ] Company filter works

### Exports
- [ ] Create export job
- [ ] Job status updates
- [ ] Download completed export
- [ ] CSV format works
- [ ] XLSX format works

### Organization
- [ ] List/create/update/delete branches
- [ ] Branch contacts CRUD
- [ ] List/create/update/delete areas
- [ ] Assign branches to areas

### Config
- [ ] View config categories
- [ ] View/create/update/delete options
- [ ] System options protected
- [ ] Settings CRUD
- [ ] Audit log records changes

### Activity
- [ ] Activity log populated
- [ ] Filter by action, resource
- [ ] Search works

### Performance
- [ ] Pages load in < 3s
- [ ] API responses in < 1s
- [ ] No N+1 query warnings
- [ ] Rate limiting works

### Error Handling
- [ ] Validation errors show details
- [ ] 404 for missing resources
- [ ] 500 errors logged
- [ ] User-friendly error messages

## Browser Testing

- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest (if applicable)
- [ ] Mobile responsive

## Accessibility

- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Color contrast
- [ ] Focus indicators
```

**Acceptance Criteria:**
- [ ] Comprehensive testing checklist
- [ ] Covers all major features
- [ ] Browser compatibility section
- [ ] Accessibility checks

---

## Dependencies

### NPM Packages
No new packages beyond what's already installed.

### Database Tables
- `activity_logs` - Activity logging

### Permissions Required
- `activity:read` - View activity logs

---

## Testing Checklist

- [ ] Activity logging works
- [ ] Activity queries with filters
- [ ] Error handling middleware
- [ ] Performance optimizations
- [ ] Documentation created
- [ ] Seed scripts work
- [ ] Environment validation

---

## Notes

1. **Activity Logging** - Non-blocking, never fails requests
2. **Error Messages** - Production hides stack traces
3. **Documentation** - Should be kept up to date with code changes
4. **Seeds** - Idempotent, safe to run multiple times
5. **Testing** - Manual testing checklist for deployment verification

---

## Completion Criteria

Phase 7 is complete when:

1. Activity logging captures all user actions
2. Error handling is consistent across all endpoints
3. Documentation folder structure is created
4. Module READMEs exist for key features
5. Seed scripts populate initial data
6. Environment configuration is documented
7. Testing checklist is complete
8. All previous phase features are verified working

---

## Post-Phase Considerations

After Phase 7, the system should be ready for:

1. **User Acceptance Testing** - Real users validate functionality
2. **Performance Testing** - Load testing with realistic data
3. **Security Audit** - Review of auth, permissions, data access
4. **Production Deployment** - Vercel + Supabase setup
5. **Monitoring Setup** - Error tracking, performance monitoring
