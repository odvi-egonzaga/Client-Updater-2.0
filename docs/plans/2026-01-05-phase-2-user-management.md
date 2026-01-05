# Phase 2: User Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete user management system with CRUD operations, permission assignment, territory management, and session tracking.

**Architecture:** Hono API routes with Drizzle ORM queries, Clerk webhook sync for user creation, Zustand stores for frontend state, permission-based access control using cached user permissions.

**Tech Stack:** Next.js 15, Hono, Drizzle ORM, Clerk, Zustand, TanStack Query, Zod, Vitest

**Reference:** See `docs/plans/2026-01-05-client-updater-v2-design.md` for full design document.

**Prerequisites:** Phase 0-1 must be completed (infrastructure + database schema).

---

## Overview

Phase 2 implements user management features:

| Task | Description | Files |
|------|-------------|-------|
| 1 | User queries with Drizzle | `src/server/db/queries/users.ts` |
| 2 | User list API endpoint | `src/server/api/routes/users/` |
| 3 | User detail API endpoint | `src/server/api/routes/users/` |
| 4 | User create/update API | `src/server/api/routes/users/` |
| 5 | Permission queries | `src/server/db/queries/permissions.ts` |
| 6 | Permission assignment API | `src/server/api/routes/users/permissions.ts` |
| 7 | Territory assignment API | `src/server/api/routes/users/territories.ts` |
| 8 | Session management API | `src/server/api/routes/auth/sessions.ts` |
| 9 | Enhanced Clerk webhook | `src/app/api/webhooks/clerk/route.ts` |
| 10 | Permission caching service | `src/lib/permissions/` |
| 11 | Users feature module | `src/features/users/` |
| 12 | User list page | `src/app/(dashboard)/admin/users/` |
| 13 | User detail page | `src/app/(dashboard)/admin/users/[id]/` |
| 14 | Permission assignment UI | `src/features/users/components/` |

---

## Task 1: Create User Queries with Drizzle

**Files:**
- Modify: `src/server/db/queries/users.ts`
- Create: `src/server/db/queries/__tests__/users.test.ts`

**Step 1: Write failing test for user queries**

Create: `src/server/db/queries/__tests__/users.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database
vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}))

describe('User Queries', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export getAllUsers function', async () => {
    const { getAllUsers } = await import('../users')
    expect(getAllUsers).toBeDefined()
    expect(typeof getAllUsers).toBe('function')
  })

  it('should export getUserById function', async () => {
    const { getUserById } = await import('../users')
    expect(getUserById).toBeDefined()
    expect(typeof getUserById).toBe('function')
  })

  it('should export getUserWithPermissions function', async () => {
    const { getUserWithPermissions } = await import('../users')
    expect(getUserWithPermissions).toBeDefined()
    expect(typeof getUserWithPermissions).toBe('function')
  })

  it('should export createUser function', async () => {
    const { createUser } = await import('../users')
    expect(createUser).toBeDefined()
    expect(typeof createUser).toBe('function')
  })

  it('should export updateUser function', async () => {
    const { updateUser } = await import('../users')
    expect(updateUser).toBeDefined()
    expect(typeof updateUser).toBe('function')
  })

  it('should export deactivateUser function', async () => {
    const { deactivateUser } = await import('../users')
    expect(deactivateUser).toBeDefined()
    expect(typeof deactivateUser).toBe('function')
  })

  it('should export getUserBranches function', async () => {
    const { getUserBranches } = await import('../users')
    expect(getUserBranches).toBeDefined()
    expect(typeof getUserBranches).toBe('function')
  })

  it('should export getUserAreas function', async () => {
    const { getUserAreas } = await import('../users')
    expect(getUserAreas).toBeDefined()
    expect(typeof getUserAreas).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/users.test.ts`
Expected: FAIL - functions not exported

**Step 3: Implement user queries**

Replace: `src/server/db/queries/users.ts`

```typescript
import { db } from '../index'
import { users, userPermissions, userBranches, userAreas, permissions, userSessions } from '../schema'
import { branches, areas } from '../schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import type { NewUser, User } from '../schema/users'

// Pagination interface
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Get all users with pagination
export async function getAllUsers(
  params: PaginationParams = {}
): Promise<PaginatedResult<User>> {
  const { page = 1, pageSize = 25, sortOrder = 'desc' } = params
  const offset = (page - 1) * pageSize

  const [usersData, countResult] = await Promise.all([
    db
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(sortOrder === 'asc' ? users.createdAt : desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(isNull(users.deletedAt)),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return {
    data: usersData,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1)

  return result[0] ?? null
}

// Get user by Clerk ID
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkId, clerkId), isNull(users.deletedAt)))
    .limit(1)

  return result[0] ?? null
}

// Get user with permissions
export async function getUserWithPermissions(userId: string) {
  const user = await getUserById(userId)
  if (!user) return null

  const userPerms = await db
    .select({
      permission: permissions,
      scope: userPermissions.scope,
      companyId: userPermissions.companyId,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId))

  return {
    ...user,
    permissions: userPerms.map((p) => ({
      code: p.permission.code,
      resource: p.permission.resource,
      action: p.permission.action,
      scope: p.scope,
      companyId: p.companyId,
    })),
  }
}

// Create user
export async function createUser(data: NewUser): Promise<User> {
  const result = await db.insert(users).values(data).returning()
  return result[0]
}

// Update user
export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
  const result = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()

  return result[0] ?? null
}

// Deactivate user (soft delete)
export async function deactivateUser(id: string): Promise<User | null> {
  const result = await db
    .update(users)
    .set({
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()

  return result[0] ?? null
}

// Reactivate user
export async function reactivateUser(id: string): Promise<User | null> {
  const result = await db
    .update(users)
    .set({
      isActive: true,
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()

  return result[0] ?? null
}

// Get user's assigned branches
export async function getUserBranches(userId: string) {
  return db
    .select({
      branchId: userBranches.branchId,
      branch: branches,
      grantedAt: userBranches.grantedAt,
    })
    .from(userBranches)
    .innerJoin(branches, eq(userBranches.branchId, branches.id))
    .where(eq(userBranches.userId, userId))
}

// Get user's assigned areas
export async function getUserAreas(userId: string) {
  return db
    .select({
      areaId: userAreas.areaId,
      area: areas,
      grantedAt: userAreas.grantedAt,
    })
    .from(userAreas)
    .innerJoin(areas, eq(userAreas.areaId, areas.id))
    .where(eq(userAreas.userId, userId))
}

// Get user's active sessions
export async function getUserSessions(userId: string) {
  return db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt)
      )
    )
    .orderBy(desc(userSessions.createdAt))
}

// Update login tracking
export async function recordUserLogin(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      loginCount: sql`${users.loginCount} + 1`,
      failedLoginCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

// Record failed login attempt
export async function recordFailedLogin(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      failedLoginCount: sql`${users.failedLoginCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/users.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/queries/users.ts src/server/db/queries/__tests__/users.test.ts
git commit -m "feat: add comprehensive user query functions"
```

---

## Task 2: Create User List API Endpoint

**Files:**
- Create: `src/server/api/routes/users/index.ts`
- Create: `src/server/api/routes/users/list.ts`
- Create: `src/server/api/routes/users/__tests__/list.test.ts`
- Modify: `src/server/api/index.ts`

**Step 1: Write failing test for user list endpoint**

Create: `src/server/api/routes/users/__tests__/list.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock user queries
vi.mock('@/server/db/queries/users', () => ({
  getAllUsers: vi.fn().mockResolvedValue({
    data: [
      { id: '1', email: 'user1@test.com', firstName: 'John', lastName: 'Doe' },
      { id: '2', email: 'user2@test.com', firstName: 'Jane', lastName: 'Smith' },
    ],
    meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
  }),
}))

describe('User List Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return paginated user list', async () => {
    const { userListRoute } = await import('../list')
    const app = new Hono()
    app.route('/', userListRoute)

    const res = await app.request('/')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.meta).toBeDefined()
    expect(data.meta.total).toBe(2)
  })

  it('should accept pagination parameters', async () => {
    const { userListRoute } = await import('../list')
    const app = new Hono()
    app.route('/', userListRoute)

    const res = await app.request('/?page=2&pageSize=10')
    expect(res.status).toBe(200)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/list.test.ts`
Expected: FAIL - module not found

**Step 3: Create user list route**

Create: `src/server/api/routes/users/list.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getAllUsers } from '@/server/db/queries/users'

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const userListRoute = new Hono()

userListRoute.get(
  '/',
  zValidator('query', paginationSchema),
  async (c) => {
    try {
      const { page, pageSize, sortOrder } = c.req.valid('query')

      const result = await getAllUsers({ page, pageSize, sortOrder })

      return c.json({
        success: true,
        data: result.data,
        meta: result.meta,
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch users',
          },
        },
        500
      )
    }
  }
)
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/list.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/users/
git commit -m "feat: add user list API endpoint with pagination"
```

---

## Task 3: Create User Detail API Endpoint

**Files:**
- Create: `src/server/api/routes/users/detail.ts`
- Create: `src/server/api/routes/users/__tests__/detail.test.ts`

**Step 1: Write failing test for user detail endpoint**

Create: `src/server/api/routes/users/__tests__/detail.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  isActive: true,
  permissions: [
    { code: 'users:read', resource: 'users', action: 'read', scope: 'all' },
  ],
}

vi.mock('@/server/db/queries/users', () => ({
  getUserWithPermissions: vi.fn().mockImplementation((id) => {
    if (id === 'user-123') return Promise.resolve(mockUser)
    return Promise.resolve(null)
  }),
  getUserBranches: vi.fn().mockResolvedValue([]),
  getUserAreas: vi.fn().mockResolvedValue([]),
}))

describe('User Detail Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user details with permissions', async () => {
    const { userDetailRoute } = await import('../detail')
    const app = new Hono()
    app.route('/:id', userDetailRoute)

    const res = await app.request('/user-123')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.user.id).toBe('user-123')
    expect(data.data.user.permissions).toBeDefined()
  })

  it('should return 404 for non-existent user', async () => {
    const { userDetailRoute } = await import('../detail')
    const app = new Hono()
    app.route('/:id', userDetailRoute)

    const res = await app.request('/non-existent')
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/detail.test.ts`
Expected: FAIL - module not found

**Step 3: Create user detail route**

Create: `src/server/api/routes/users/detail.ts`

```typescript
import { Hono } from 'hono'
import {
  getUserWithPermissions,
  getUserBranches,
  getUserAreas,
} from '@/server/db/queries/users'

export const userDetailRoute = new Hono()

userDetailRoute.get('/', async (c) => {
  try {
    const id = c.req.param('id')

    const [user, branches, areas] = await Promise.all([
      getUserWithPermissions(id),
      getUserBranches(id),
      getUserAreas(id),
    ])

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        404
      )
    }

    return c.json({
      success: true,
      data: {
        user,
        branches: branches.map((b) => b.branch),
        areas: areas.map((a) => a.area),
      },
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch user',
        },
      },
      500
    )
  }
})
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/detail.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/users/detail.ts src/server/api/routes/users/__tests__/detail.test.ts
git commit -m "feat: add user detail API endpoint with permissions and territories"
```

---

## Task 4: Create User Create/Update API

**Files:**
- Create: `src/server/api/routes/users/mutations.ts`
- Create: `src/server/api/routes/users/__tests__/mutations.test.ts`

**Step 1: Write failing test for user mutations**

Create: `src/server/api/routes/users/__tests__/mutations.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockUser = {
  id: 'user-123',
  email: 'new@example.com',
  firstName: 'New',
  lastName: 'User',
  isActive: true,
}

vi.mock('@/server/db/queries/users', () => ({
  createUser: vi.fn().mockResolvedValue(mockUser),
  updateUser: vi.fn().mockImplementation((id, data) => {
    if (id === 'user-123') return Promise.resolve({ ...mockUser, ...data })
    return Promise.resolve(null)
  }),
  deactivateUser: vi.fn().mockResolvedValue({ ...mockUser, isActive: false }),
  reactivateUser: vi.fn().mockResolvedValue({ ...mockUser, isActive: true }),
}))

describe('User Mutations Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new user', async () => {
    const { userMutationsRoute } = await import('../mutations')
    const app = new Hono()
    app.route('/', userMutationsRoute)

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      }),
    })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.email).toBe('new@example.com')
  })

  it('should update an existing user', async () => {
    const { userMutationsRoute } = await import('../mutations')
    const app = new Hono()
    app.route('/', userMutationsRoute)

    const res = await app.request('/user-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Updated',
      }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.firstName).toBe('Updated')
  })

  it('should toggle user active status', async () => {
    const { userMutationsRoute } = await import('../mutations')
    const app = new Hono()
    app.route('/', userMutationsRoute)

    const res = await app.request('/user-123/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/mutations.test.ts`
Expected: FAIL - module not found

**Step 3: Create user mutations route**

Create: `src/server/api/routes/users/mutations.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
} from '@/server/db/queries/users'

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  clerkId: z.string().optional(),
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
})

const toggleStatusSchema = z.object({
  isActive: z.boolean(),
})

export const userMutationsRoute = new Hono()

// Create user
userMutationsRoute.post(
  '/',
  zValidator('json', createUserSchema),
  async (c) => {
    try {
      const data = c.req.valid('json')
      const user = await createUser(data)

      return c.json(
        {
          success: true,
          data: user,
        },
        201
      )
    } catch (error) {
      console.error('Error creating user:', error)

      // Handle unique constraint violation
      if ((error as Error).message?.includes('unique')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_EMAIL',
              message: 'A user with this email already exists',
            },
          },
          409
        )
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'CREATE_ERROR',
            message: 'Failed to create user',
          },
        },
        500
      )
    }
  }
)

// Update user
userMutationsRoute.patch(
  '/:id',
  zValidator('json', updateUserSchema),
  async (c) => {
    try {
      const id = c.req.param('id')
      const data = c.req.valid('json')

      const user = await updateUser(id, data)

      if (!user) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
          404
        )
      }

      return c.json({
        success: true,
        data: user,
      })
    } catch (error) {
      console.error('Error updating user:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update user',
          },
        },
        500
      )
    }
  }
)

// Toggle user status (activate/deactivate)
userMutationsRoute.post(
  '/:id/toggle-status',
  zValidator('json', toggleStatusSchema),
  async (c) => {
    try {
      const id = c.req.param('id')
      const { isActive } = c.req.valid('json')

      const user = isActive
        ? await reactivateUser(id)
        : await deactivateUser(id)

      if (!user) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          },
          404
        )
      }

      return c.json({
        success: true,
        data: user,
        message: isActive ? 'User activated' : 'User deactivated',
      })
    } catch (error) {
      console.error('Error toggling user status:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'STATUS_ERROR',
            message: 'Failed to update user status',
          },
        },
        500
      )
    }
  }
)
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/mutations.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/users/mutations.ts src/server/api/routes/users/__tests__/mutations.test.ts
git commit -m "feat: add user create/update/toggle-status API endpoints"
```

---

## Task 5: Create Permission Queries

**Files:**
- Create: `src/server/db/queries/permissions.ts`
- Create: `src/server/db/queries/__tests__/permissions.test.ts`

**Step 1: Write failing test for permission queries**

Create: `src/server/db/queries/__tests__/permissions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  },
}))

describe('Permission Queries', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export getAllPermissions function', async () => {
    const { getAllPermissions } = await import('../permissions')
    expect(getAllPermissions).toBeDefined()
  })

  it('should export getPermissionsByResource function', async () => {
    const { getPermissionsByResource } = await import('../permissions')
    expect(getPermissionsByResource).toBeDefined()
  })

  it('should export assignPermissionToUser function', async () => {
    const { assignPermissionToUser } = await import('../permissions')
    expect(assignPermissionToUser).toBeDefined()
  })

  it('should export removePermissionFromUser function', async () => {
    const { removePermissionFromUser } = await import('../permissions')
    expect(removePermissionFromUser).toBeDefined()
  })

  it('should export setUserPermissions function', async () => {
    const { setUserPermissions } = await import('../permissions')
    expect(setUserPermissions).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/permissions.test.ts`
Expected: FAIL - module not found

**Step 3: Create permission queries**

Create: `src/server/db/queries/permissions.ts`

```typescript
import { db } from '../index'
import { permissions, userPermissions } from '../schema'
import { eq, and, inArray } from 'drizzle-orm'
import type { Permission, UserPermission } from '../schema/users'

// Get all permissions
export async function getAllPermissions(): Promise<Permission[]> {
  return db.select().from(permissions)
}

// Get permissions by resource
export async function getPermissionsByResource(
  resource: string
): Promise<Permission[]> {
  return db
    .select()
    .from(permissions)
    .where(eq(permissions.resource, resource))
}

// Get permission by code
export async function getPermissionByCode(
  code: string
): Promise<Permission | null> {
  const result = await db
    .select()
    .from(permissions)
    .where(eq(permissions.code, code))
    .limit(1)

  return result[0] ?? null
}

// Get user's permissions
export async function getUserPermissions(userId: string) {
  return db
    .select({
      permission: permissions,
      scope: userPermissions.scope,
      companyId: userPermissions.companyId,
      grantedAt: userPermissions.grantedAt,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId))
}

// Assign permission to user
export async function assignPermissionToUser(
  userId: string,
  permissionId: string,
  options?: {
    scope?: 'self' | 'branch' | 'area' | 'all'
    companyId?: string
  }
): Promise<void> {
  await db
    .insert(userPermissions)
    .values({
      userId,
      permissionId,
      scope: options?.scope ?? 'self',
      companyId: options?.companyId,
    })
    .onConflictDoNothing()
}

// Remove permission from user
export async function removePermissionFromUser(
  userId: string,
  permissionId: string
): Promise<void> {
  await db
    .delete(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionId, permissionId)
      )
    )
}

// Set user permissions (replace all)
export async function setUserPermissions(
  userId: string,
  permissionData: Array<{
    permissionId: string
    scope?: 'self' | 'branch' | 'area' | 'all'
    companyId?: string
  }>
): Promise<void> {
  // Delete existing permissions
  await db.delete(userPermissions).where(eq(userPermissions.userId, userId))

  // Insert new permissions
  if (permissionData.length > 0) {
    await db.insert(userPermissions).values(
      permissionData.map((p) => ({
        userId,
        permissionId: p.permissionId,
        scope: p.scope ?? 'self',
        companyId: p.companyId,
      }))
    )
  }
}

// Check if user has permission
export async function userHasPermission(
  userId: string,
  permissionCode: string,
  companyId?: string
): Promise<boolean> {
  const permission = await getPermissionByCode(permissionCode)
  if (!permission) return false

  const result = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionId, permission.id),
        companyId ? eq(userPermissions.companyId, companyId) : undefined
      )
    )
    .limit(1)

  return result.length > 0
}
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/permissions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/queries/permissions.ts src/server/db/queries/__tests__/permissions.test.ts
git commit -m "feat: add permission query functions"
```

---

## Task 6: Create Permission Assignment API

**Files:**
- Create: `src/server/api/routes/users/permissions.ts`
- Create: `src/server/api/routes/users/__tests__/permissions.test.ts`

**Step 1: Write failing test for permission assignment API**

Create: `src/server/api/routes/users/__tests__/permissions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/server/db/queries/permissions', () => ({
  getAllPermissions: vi.fn().mockResolvedValue([
    { id: 'perm-1', code: 'users:read', resource: 'users', action: 'read' },
    { id: 'perm-2', code: 'users:manage', resource: 'users', action: 'manage' },
  ]),
  getUserPermissions: vi.fn().mockResolvedValue([
    { permission: { id: 'perm-1', code: 'users:read' }, scope: 'all' },
  ]),
  setUserPermissions: vi.fn().mockResolvedValue(undefined),
}))

describe('Permission Assignment API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return all available permissions', async () => {
    const { userPermissionsRoute } = await import('../permissions')
    const app = new Hono()
    app.route('/permissions', userPermissionsRoute)

    const res = await app.request('/permissions')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
  })

  it('should get user permissions', async () => {
    const { userPermissionsRoute } = await import('../permissions')
    const app = new Hono()
    app.route('/permissions', userPermissionsRoute)

    const res = await app.request('/permissions/user/user-123')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('should update user permissions', async () => {
    const { userPermissionsRoute } = await import('../permissions')
    const app = new Hono()
    app.route('/permissions', userPermissionsRoute)

    const res = await app.request('/permissions/user/user-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: [
          { permissionId: 'perm-1', scope: 'all' },
          { permissionId: 'perm-2', scope: 'branch' },
        ],
      }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/permissions.test.ts`
Expected: FAIL - module not found

**Step 3: Create permission assignment route**

Create: `src/server/api/routes/users/permissions.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  getAllPermissions,
  getUserPermissions,
  setUserPermissions,
} from '@/server/db/queries/permissions'
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache'

const setPermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      permissionId: z.string().uuid(),
      scope: z.enum(['self', 'branch', 'area', 'all']).default('self'),
      companyId: z.string().uuid().optional(),
    })
  ),
})

export const userPermissionsRoute = new Hono()

// Get all available permissions
userPermissionsRoute.get('/', async (c) => {
  try {
    const permissions = await getAllPermissions()

    // Group by resource for easier UI rendering
    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = []
        }
        acc[perm.resource].push(perm)
        return acc
      },
      {} as Record<string, typeof permissions>
    )

    return c.json({
      success: true,
      data: permissions,
      grouped,
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch permissions',
        },
      },
      500
    )
  }
})

// Get user's permissions
userPermissionsRoute.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const userPerms = await getUserPermissions(userId)

    return c.json({
      success: true,
      data: userPerms,
    })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch user permissions',
        },
      },
      500
    )
  }
})

// Set user's permissions (replace all)
userPermissionsRoute.put(
  '/user/:userId',
  zValidator('json', setPermissionsSchema),
  async (c) => {
    try {
      const userId = c.req.param('userId')
      const { permissions } = c.req.valid('json')

      await setUserPermissions(userId, permissions)

      // Invalidate permission cache
      await cache.del(cacheKeys.userPermissions(userId))

      // Fetch updated permissions
      const updated = await getUserPermissions(userId)

      return c.json({
        success: true,
        data: updated,
        message: 'Permissions updated successfully',
      })
    } catch (error) {
      console.error('Error updating user permissions:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update user permissions',
          },
        },
        500
      )
    }
  }
)
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/permissions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/users/permissions.ts src/server/api/routes/users/__tests__/permissions.test.ts
git commit -m "feat: add permission assignment API endpoints"
```

---

## Task 7: Create Territory Assignment API

**Files:**
- Create: `src/server/db/queries/territories.ts`
- Create: `src/server/api/routes/users/territories.ts`
- Create: `src/server/api/routes/users/__tests__/territories.test.ts`

**Step 1: Create territory queries**

Create: `src/server/db/queries/territories.ts`

```typescript
import { db } from '../index'
import { userBranches, userAreas, branches, areas, areaBranches } from '../schema'
import { eq, and, inArray } from 'drizzle-orm'

// Assign branches to user
export async function assignBranchesToUser(
  userId: string,
  branchIds: string[]
): Promise<void> {
  // Delete existing assignments
  await db.delete(userBranches).where(eq(userBranches.userId, userId))

  // Insert new assignments
  if (branchIds.length > 0) {
    await db.insert(userBranches).values(
      branchIds.map((branchId) => ({
        userId,
        branchId,
      }))
    )
  }
}

// Assign areas to user
export async function assignAreasToUser(
  userId: string,
  areaIds: string[]
): Promise<void> {
  // Delete existing assignments
  await db.delete(userAreas).where(eq(userAreas.userId, userId))

  // Insert new assignments
  if (areaIds.length > 0) {
    await db.insert(userAreas).values(
      areaIds.map((areaId) => ({
        userId,
        areaId,
      }))
    )
  }
}

// Get all accessible branches for user (direct + via areas)
export async function getUserAccessibleBranches(userId: string) {
  // Get directly assigned branches
  const directBranches = await db
    .select({ branch: branches })
    .from(userBranches)
    .innerJoin(branches, eq(userBranches.branchId, branches.id))
    .where(eq(userBranches.userId, userId))

  // Get branches via areas
  const userAreaRows = await db
    .select({ areaId: userAreas.areaId })
    .from(userAreas)
    .where(eq(userAreas.userId, userId))

  const areaIds = userAreaRows.map((r) => r.areaId)

  let areaBranchRows: { branch: typeof branches.$inferSelect }[] = []
  if (areaIds.length > 0) {
    areaBranchRows = await db
      .select({ branch: branches })
      .from(areaBranches)
      .innerJoin(branches, eq(areaBranches.branchId, branches.id))
      .where(inArray(areaBranches.areaId, areaIds))
  }

  // Combine and dedupe
  const branchMap = new Map<string, typeof branches.$inferSelect>()
  for (const { branch } of [...directBranches, ...areaBranchRows]) {
    branchMap.set(branch.id, branch)
  }

  return Array.from(branchMap.values())
}

// Get all available branches (for selection)
export async function getAllBranches() {
  return db.select().from(branches).where(eq(branches.deletedAt, null as any))
}

// Get all available areas (for selection)
export async function getAllAreas() {
  return db.select().from(areas).where(eq(areas.deletedAt, null as any))
}
```

**Step 2: Write failing test for territory assignment API**

Create: `src/server/api/routes/users/__tests__/territories.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/server/db/queries/territories', () => ({
  assignBranchesToUser: vi.fn().mockResolvedValue(undefined),
  assignAreasToUser: vi.fn().mockResolvedValue(undefined),
  getUserAccessibleBranches: vi.fn().mockResolvedValue([
    { id: 'branch-1', code: 'MNLA01', name: 'Manila Branch 1' },
  ]),
  getAllBranches: vi.fn().mockResolvedValue([
    { id: 'branch-1', code: 'MNLA01', name: 'Manila Branch 1' },
    { id: 'branch-2', code: 'CEBU01', name: 'Cebu Branch 1' },
  ]),
  getAllAreas: vi.fn().mockResolvedValue([
    { id: 'area-1', code: 'NCR', name: 'National Capital Region' },
  ]),
}))

vi.mock('@/server/db/queries/users', () => ({
  getUserBranches: vi.fn().mockResolvedValue([]),
  getUserAreas: vi.fn().mockResolvedValue([]),
}))

describe('Territory Assignment API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get available branches', async () => {
    const { userTerritoriesRoute } = await import('../territories')
    const app = new Hono()
    app.route('/territories', userTerritoriesRoute)

    const res = await app.request('/territories/branches')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
  })

  it('should get available areas', async () => {
    const { userTerritoriesRoute } = await import('../territories')
    const app = new Hono()
    app.route('/territories', userTerritoriesRoute)

    const res = await app.request('/territories/areas')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('should assign branches to user', async () => {
    const { userTerritoriesRoute } = await import('../territories')
    const app = new Hono()
    app.route('/territories', userTerritoriesRoute)

    const res = await app.request('/territories/user/user-123/branches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchIds: ['branch-1', 'branch-2'] }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should assign areas to user', async () => {
    const { userTerritoriesRoute } = await import('../territories')
    const app = new Hono()
    app.route('/territories', userTerritoriesRoute)

    const res = await app.request('/territories/user/user-123/areas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaIds: ['area-1'] }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/territories.test.ts`
Expected: FAIL - module not found

**Step 4: Create territory assignment route**

Create: `src/server/api/routes/users/territories.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  assignBranchesToUser,
  assignAreasToUser,
  getUserAccessibleBranches,
  getAllBranches,
  getAllAreas,
} from '@/server/db/queries/territories'
import { getUserBranches, getUserAreas } from '@/server/db/queries/users'
import { cache, cacheKeys } from '@/lib/cache'

const assignBranchesSchema = z.object({
  branchIds: z.array(z.string().uuid()),
})

const assignAreasSchema = z.object({
  areaIds: z.array(z.string().uuid()),
})

export const userTerritoriesRoute = new Hono()

// Get all available branches
userTerritoriesRoute.get('/branches', async (c) => {
  try {
    const branches = await getAllBranches()
    return c.json({
      success: true,
      data: branches,
    })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch branches',
        },
      },
      500
    )
  }
})

// Get all available areas
userTerritoriesRoute.get('/areas', async (c) => {
  try {
    const areas = await getAllAreas()
    return c.json({
      success: true,
      data: areas,
    })
  } catch (error) {
    console.error('Error fetching areas:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch areas',
        },
      },
      500
    )
  }
})

// Get user's current territory assignments
userTerritoriesRoute.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    const [branches, areas, accessibleBranches] = await Promise.all([
      getUserBranches(userId),
      getUserAreas(userId),
      getUserAccessibleBranches(userId),
    ])

    return c.json({
      success: true,
      data: {
        directBranches: branches.map((b) => b.branch),
        directAreas: areas.map((a) => a.area),
        accessibleBranches, // All branches user can access (direct + via areas)
      },
    })
  } catch (error) {
    console.error('Error fetching user territories:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch user territories',
        },
      },
      500
    )
  }
})

// Assign branches to user
userTerritoriesRoute.put(
  '/user/:userId/branches',
  zValidator('json', assignBranchesSchema),
  async (c) => {
    try {
      const userId = c.req.param('userId')
      const { branchIds } = c.req.valid('json')

      await assignBranchesToUser(userId, branchIds)

      // Invalidate cache
      await cache.del(cacheKeys.userBranches(userId))

      const updatedBranches = await getUserBranches(userId)

      return c.json({
        success: true,
        data: updatedBranches.map((b) => b.branch),
        message: 'Branches assigned successfully',
      })
    } catch (error) {
      console.error('Error assigning branches:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'ASSIGN_ERROR',
            message: 'Failed to assign branches',
          },
        },
        500
      )
    }
  }
)

// Assign areas to user
userTerritoriesRoute.put(
  '/user/:userId/areas',
  zValidator('json', assignAreasSchema),
  async (c) => {
    try {
      const userId = c.req.param('userId')
      const { areaIds } = c.req.valid('json')

      await assignAreasToUser(userId, areaIds)

      // Invalidate cache
      await cache.del(cacheKeys.userBranches(userId))

      const updatedAreas = await getUserAreas(userId)

      return c.json({
        success: true,
        data: updatedAreas.map((a) => a.area),
        message: 'Areas assigned successfully',
      })
    } catch (error) {
      console.error('Error assigning areas:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'ASSIGN_ERROR',
            message: 'Failed to assign areas',
          },
        },
        500
      )
    }
  }
)
```

**Step 5: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/users/__tests__/territories.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/db/queries/territories.ts src/server/api/routes/users/territories.ts src/server/api/routes/users/__tests__/territories.test.ts
git commit -m "feat: add territory assignment API endpoints"
```

---

## Task 8: Create Session Management API

**Files:**
- Create: `src/server/db/queries/sessions.ts`
- Create: `src/server/api/routes/auth/sessions.ts`
- Create: `src/server/api/routes/auth/__tests__/sessions.test.ts`

**Step 1: Create session queries**

Create: `src/server/db/queries/sessions.ts`

```typescript
import { db } from '../index'
import { userSessions } from '../schema'
import { eq, and, isNull, lt, desc } from 'drizzle-orm'
import type { UserSession } from '../schema/users'

// Create a new session
export async function createSession(data: {
  userId: string
  sessionToken: string
  ipAddress?: string
  userAgent?: string
  expiresAt: Date
}): Promise<UserSession> {
  const result = await db.insert(userSessions).values(data).returning()
  return result[0]
}

// Get session by token
export async function getSessionByToken(
  token: string
): Promise<UserSession | null> {
  const result = await db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.sessionToken, token),
        isNull(userSessions.revokedAt)
      )
    )
    .limit(1)

  return result[0] ?? null
}

// Get user's active sessions
export async function getUserActiveSessions(
  userId: string
): Promise<UserSession[]> {
  return db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
        // Not expired - but we check this in app logic since SQL comparison varies
      )
    )
    .orderBy(desc(userSessions.createdAt))
}

// Revoke a session
export async function revokeSession(
  sessionId: string,
  reason?: string
): Promise<UserSession | null> {
  const result = await db
    .update(userSessions)
    .set({
      revokedAt: new Date(),
      revokedReason: reason ?? 'User requested',
    })
    .where(eq(userSessions.id, sessionId))
    .returning()

  return result[0] ?? null
}

// Revoke all user sessions
export async function revokeAllUserSessions(
  userId: string,
  reason?: string
): Promise<number> {
  const result = await db
    .update(userSessions)
    .set({
      revokedAt: new Date(),
      revokedReason: reason ?? 'All sessions revoked',
    })
    .where(
      and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt))
    )
    .returning()

  return result.length
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, new Date()))
    .returning()

  return result.length
}
```

**Step 2: Write failing test for session API**

Create: `src/server/api/routes/auth/__tests__/sessions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/server/db/queries/sessions', () => ({
  getUserActiveSessions: vi.fn().mockResolvedValue([
    {
      id: 'session-1',
      userId: 'user-123',
      sessionToken: 'token-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/120',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  ]),
  revokeSession: vi.fn().mockResolvedValue({
    id: 'session-1',
    revokedAt: new Date(),
  }),
  revokeAllUserSessions: vi.fn().mockResolvedValue(2),
}))

describe('Session Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get user sessions', async () => {
    const { sessionsRoute } = await import('../sessions')
    const app = new Hono()
    app.route('/sessions', sessionsRoute)

    const res = await app.request('/sessions/user/user-123')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('should revoke a session', async () => {
    const { sessionsRoute } = await import('../sessions')
    const app = new Hono()
    app.route('/sessions', sessionsRoute)

    const res = await app.request('/sessions/session-1', {
      method: 'DELETE',
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should revoke all user sessions', async () => {
    const { sessionsRoute } = await import('../sessions')
    const app = new Hono()
    app.route('/sessions', sessionsRoute)

    const res = await app.request('/sessions/user/user-123/revoke-all', {
      method: 'POST',
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.revokedCount).toBe(2)
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/auth/__tests__/sessions.test.ts`
Expected: FAIL - module not found

**Step 4: Create session management route**

Create: `src/server/api/routes/auth/sessions.ts`

```typescript
import { Hono } from 'hono'
import {
  getUserActiveSessions,
  revokeSession,
  revokeAllUserSessions,
} from '@/server/db/queries/sessions'

export const sessionsRoute = new Hono()

// Get user's active sessions
sessionsRoute.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const sessions = await getUserActiveSessions(userId)

    // Filter out expired sessions and mask token
    const now = new Date()
    const activeSessions = sessions
      .filter((s) => new Date(s.expiresAt) > now)
      .map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        // Don't expose the actual token
        tokenPreview: s.sessionToken.slice(0, 8) + '...',
      }))

    return c.json({
      success: true,
      data: activeSessions,
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch sessions',
        },
      },
      500
    )
  }
})

// Revoke a specific session
sessionsRoute.delete('/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const session = await revokeSession(sessionId)

    if (!session) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Session not found',
          },
        },
        404
      )
    }

    return c.json({
      success: true,
      message: 'Session revoked successfully',
    })
  } catch (error) {
    console.error('Error revoking session:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'REVOKE_ERROR',
          message: 'Failed to revoke session',
        },
      },
      500
    )
  }
})

// Revoke all user sessions
sessionsRoute.post('/user/:userId/revoke-all', async (c) => {
  try {
    const userId = c.req.param('userId')
    const revokedCount = await revokeAllUserSessions(userId)

    return c.json({
      success: true,
      data: { revokedCount },
      message: `${revokedCount} session(s) revoked`,
    })
  } catch (error) {
    console.error('Error revoking all sessions:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'REVOKE_ERROR',
          message: 'Failed to revoke sessions',
        },
      },
      500
    )
  }
})
```

**Step 5: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/auth/__tests__/sessions.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/db/queries/sessions.ts src/server/api/routes/auth/
git commit -m "feat: add session management API endpoints"
```

---

## Task 9: Enhance Clerk Webhook Handler

**Files:**
- Modify: `src/app/api/webhooks/clerk/route.ts`

**Step 1: Update Clerk webhook to handle enhanced user schema**

Replace: `src/app/api/webhooks/clerk/route.ts`

```typescript
import type { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { env } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    // Get headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      logger.warn('Missing Svix headers', { requestId })
      return new Response('Error: Missing Svix headers', { status: 400 })
    }

    const payload = await req.json()
    const body = JSON.stringify(payload)

    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET ?? '')

    let event: WebhookEvent

    try {
      event = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      logger.error('Webhook verification failed', err as Error, { requestId })
      return new Response('Error: Invalid signature', { status: 400 })
    }

    const eventType = event.type

    logger.info('Processing Clerk webhook', {
      requestId,
      eventType,
      userId: 'id' in event.data ? event.data.id : undefined,
    })

    // Handle user.created
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      await db.insert(users).values({
        id: crypto.randomUUID(), // Generate our own UUID
        clerkId: id,
        email: email_addresses[0]?.email_address ?? '',
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        imageUrl: image_url ?? null,
        isActive: true,
        mustChangePassword: false,
        loginCount: 0,
        failedLoginCount: 0,
      })

      logger.info('User created from Clerk webhook', { requestId, clerkId: id })
    }

    // Handle user.updated
    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      if (id) {
        await db
          .update(users)
          .set({
            email: email_addresses?.[0]?.email_address,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, id))

        logger.info('User updated from Clerk webhook', { requestId, clerkId: id })
      }
    }

    // Handle user.deleted
    if (eventType === 'user.deleted') {
      const { id } = event.data

      if (id) {
        // Soft delete instead of hard delete
        await db
          .update(users)
          .set({
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, id))

        logger.info('User soft-deleted from Clerk webhook', { requestId, clerkId: id })
      }
    }

    // Handle session.created (track logins)
    if (eventType === 'session.created') {
      const data = event.data as any
      const userId = data.user_id

      if (userId) {
        // Find user by Clerk ID and update login tracking
        const user = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1)

        if (user[0]) {
          await db
            .update(users)
            .set({
              lastLoginAt: new Date(),
              loginCount: (user[0].loginCount ?? 0) + 1,
              failedLoginCount: 0,
              updatedAt: new Date(),
            })
            .where(eq(users.clerkId, userId))

          logger.info('User login recorded', { requestId, clerkId: userId })
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    logger.error('Webhook processing failed', error as Error, { requestId })
    return new Response('Error: Webhook processing failed', { status: 500 })
  }
}
```

**Step 2: Verify the app still builds**

Run: `cd client-updater-version-2 && pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/webhooks/clerk/route.ts
git commit -m "feat: enhance Clerk webhook with login tracking and soft delete"
```

---

## Task 10: Create Permission Caching Service

**Files:**
- Create: `src/lib/permissions/index.ts`
- Create: `src/lib/permissions/__tests__/permissions.test.ts`

**Step 1: Write failing test for permission caching**

Create: `src/lib/permissions/__tests__/permissions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
  cacheKeys: {
    userPermissions: (id: string) => `user:${id}:permissions`,
  },
  CACHE_TTL: {
    USER_PERMISSIONS: 300,
  },
}))

vi.mock('@/server/db/queries/permissions', () => ({
  getUserPermissions: vi.fn().mockResolvedValue([
    { permission: { code: 'users:read' }, scope: 'all' },
    { permission: { code: 'clients:read' }, scope: 'branch' },
  ]),
}))

describe('Permission Caching Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export getCachedUserPermissions function', async () => {
    const { getCachedUserPermissions } = await import('../index')
    expect(getCachedUserPermissions).toBeDefined()
  })

  it('should export hasPermission function', async () => {
    const { hasPermission } = await import('../index')
    expect(hasPermission).toBeDefined()
  })

  it('should export invalidateUserPermissions function', async () => {
    const { invalidateUserPermissions } = await import('../index')
    expect(invalidateUserPermissions).toBeDefined()
  })

  it('should check permission correctly', async () => {
    const { hasPermission } = await import('../index')
    const result = await hasPermission('user-123', 'users:read')
    expect(result).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/lib/permissions/__tests__/permissions.test.ts`
Expected: FAIL - module not found

**Step 3: Create permission caching service**

Create: `src/lib/permissions/index.ts`

```typescript
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache'
import { getUserPermissions } from '@/server/db/queries/permissions'

interface CachedPermission {
  code: string
  resource: string
  action: string
  scope: 'self' | 'branch' | 'area' | 'all'
  companyId?: string
}

// Get user permissions with caching
export async function getCachedUserPermissions(
  userId: string
): Promise<CachedPermission[]> {
  const cacheKey = cacheKeys.userPermissions(userId)

  // Try cache first
  const cached = await cache.get<CachedPermission[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from database
  const permissions = await getUserPermissions(userId)

  const mapped: CachedPermission[] = permissions.map((p) => ({
    code: p.permission.code,
    resource: p.permission.resource,
    action: p.permission.action,
    scope: p.scope as 'self' | 'branch' | 'area' | 'all',
    companyId: p.companyId ?? undefined,
  }))

  // Cache the result
  await cache.set(cacheKey, mapped, CACHE_TTL.USER_PERMISSIONS)

  return mapped
}

// Check if user has a specific permission
export async function hasPermission(
  userId: string,
  permissionCode: string,
  options?: {
    companyId?: string
    requiredScope?: 'self' | 'branch' | 'area' | 'all'
  }
): Promise<boolean> {
  const permissions = await getCachedUserPermissions(userId)

  return permissions.some((p) => {
    if (p.code !== permissionCode) return false
    if (options?.companyId && p.companyId !== options.companyId) return false

    // Check scope hierarchy: all > area > branch > self
    if (options?.requiredScope) {
      const scopeHierarchy = { all: 4, area: 3, branch: 2, self: 1 }
      const userScopeLevel = scopeHierarchy[p.scope] ?? 0
      const requiredLevel = scopeHierarchy[options.requiredScope] ?? 0
      return userScopeLevel >= requiredLevel
    }

    return true
  })
}

// Check if user has any of the specified permissions
export async function hasAnyPermission(
  userId: string,
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getCachedUserPermissions(userId)
  const userCodes = new Set(permissions.map((p) => p.code))
  return permissionCodes.some((code) => userCodes.has(code))
}

// Check if user has all of the specified permissions
export async function hasAllPermissions(
  userId: string,
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getCachedUserPermissions(userId)
  const userCodes = new Set(permissions.map((p) => p.code))
  return permissionCodes.every((code) => userCodes.has(code))
}

// Invalidate user's permission cache
export async function invalidateUserPermissions(userId: string): Promise<void> {
  await cache.del(cacheKeys.userPermissions(userId))
}

// Get user's permission scope for a resource
export async function getPermissionScope(
  userId: string,
  permissionCode: string
): Promise<'self' | 'branch' | 'area' | 'all' | null> {
  const permissions = await getCachedUserPermissions(userId)
  const permission = permissions.find((p) => p.code === permissionCode)
  return permission?.scope ?? null
}
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/lib/permissions/__tests__/permissions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/permissions/
git commit -m "feat: add permission caching service with scope checking"
```

---

## Task 11: Wire Up User Routes in API Index

**Files:**
- Create: `src/server/api/routes/users/index.ts`
- Modify: `src/server/api/index.ts`

**Step 1: Create users route index**

Create: `src/server/api/routes/users/index.ts`

```typescript
import { Hono } from 'hono'
import { userListRoute } from './list'
import { userDetailRoute } from './detail'
import { userMutationsRoute } from './mutations'
import { userPermissionsRoute } from './permissions'
import { userTerritoriesRoute } from './territories'

export const usersRoutes = new Hono()

// List users
usersRoutes.route('/', userListRoute)

// User mutations (create)
usersRoutes.route('/', userMutationsRoute)

// User detail and mutations by ID
usersRoutes.route('/:id', userDetailRoute)
usersRoutes.route('/', userMutationsRoute)

// Permission management
usersRoutes.route('/permissions', userPermissionsRoute)

// Territory management
usersRoutes.route('/territories', userTerritoriesRoute)
```

**Step 2: Update API index with auth routes**

Modify: `src/server/api/index.ts`

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'
import { sessionsRoute } from './routes/auth/sessions'

const app = new Hono().basePath('/api')

app.use('*', logger())
app.use('*', cors())

// Public routes
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Protected routes - require authentication
app.use('*', authMiddleware)
app.route('/health', healthRoutes)
app.route('/users', usersRoutes)
app.route('/auth/sessions', sessionsRoute)

export { app }
export type AppType = typeof app
```

**Step 3: Run tests to verify no regressions**

Run: `cd client-updater-version-2 && pnpm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/server/api/routes/users/index.ts src/server/api/index.ts
git commit -m "feat: wire up user management routes in API"
```

---

## Task 12: Create Users Feature Module

**Files:**
- Create: `src/features/users/index.ts`
- Create: `src/features/users/types.ts`
- Create: `src/features/users/stores/users-store.ts`
- Create: `src/features/users/hooks/use-users.ts`

**Step 1: Create user types**

Create: `src/features/users/types.ts`

```typescript
export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  isActive: boolean
  lastLoginAt: string | null
  loginCount: number
  createdAt: string
  updatedAt: string
}

export interface UserWithPermissions extends User {
  permissions: UserPermission[]
}

export interface UserPermission {
  code: string
  resource: string
  action: string
  scope: 'self' | 'branch' | 'area' | 'all'
  companyId?: string
}

export interface Branch {
  id: string
  code: string
  name: string
  location: string | null
}

export interface Area {
  id: string
  code: string
  name: string
}

export interface UserDetail {
  user: UserWithPermissions
  branches: Branch[]
  areas: Area[]
}

export interface Permission {
  id: string
  code: string
  resource: string
  action: string
  description: string | null
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: {
    code: string
    message: string
  }
}
```

**Step 2: Create users store**

Create: `src/features/users/stores/users-store.ts`

```typescript
import { create } from 'zustand'
import type { User, UserDetail } from '../types'

interface UsersState {
  // List state
  users: User[]
  totalUsers: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // Selected user state
  selectedUser: UserDetail | null
  isLoadingUser: boolean

  // Actions
  setUsers: (users: User[], total: number) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedUser: (user: UserDetail | null) => void
  setLoadingUser: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  users: [],
  totalUsers: 0,
  currentPage: 1,
  pageSize: 25,
  isLoading: false,
  error: null,
  selectedUser: null,
  isLoadingUser: false,
}

export const useUsersStore = create<UsersState>((set) => ({
  ...initialState,

  setUsers: (users, total) => set({ users, totalUsers: total }),
  setPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setLoadingUser: (loading) => set({ isLoadingUser: loading }),
  reset: () => set(initialState),
}))
```

**Step 3: Create users hooks**

Create: `src/features/users/hooks/use-users.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsersStore } from '../stores/users-store'
import type {
  User,
  UserDetail,
  PaginatedResponse,
  ApiResponse,
  Permission,
} from '../types'

const API_BASE = '/api/users'

// Fetch users list
export function useUsers(page = 1, pageSize = 25) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page, pageSize],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}?page=${page}&pageSize=${pageSize}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })
}

// Fetch single user
export function useUser(userId: string | null) {
  return useQuery<ApiResponse<UserDetail>>({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')
      const res = await fetch(`${API_BASE}/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
    enabled: !!userId,
  })
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      email: string
      firstName?: string
      lastName?: string
    }) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to create user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string
      data: Partial<User>
    }) => {
      const res = await fetch(`${API_BASE}/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}

// Toggle user status mutation
export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string
      isActive: boolean
    }) => {
      const res = await fetch(`${API_BASE}/${userId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle user status')
      return res.json()
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}

// Fetch all permissions
export function usePermissions() {
  return useQuery<ApiResponse<Permission[]>>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/permissions`)
      if (!res.ok) throw new Error('Failed to fetch permissions')
      return res.json()
    },
  })
}

// Update user permissions mutation
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string
      permissions: Array<{
        permissionId: string
        scope?: 'self' | 'branch' | 'area' | 'all'
        companyId?: string
      }>
    }) => {
      const res = await fetch(`${API_BASE}/permissions/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })
      if (!res.ok) throw new Error('Failed to update permissions')
      return res.json()
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}

// Update user territories mutation
export function useUpdateUserTerritories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      branchIds,
      areaIds,
    }: {
      userId: string
      branchIds?: string[]
      areaIds?: string[]
    }) => {
      const promises = []

      if (branchIds !== undefined) {
        promises.push(
          fetch(`${API_BASE}/territories/user/${userId}/branches`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchIds }),
          })
        )
      }

      if (areaIds !== undefined) {
        promises.push(
          fetch(`${API_BASE}/territories/user/${userId}/areas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ areaIds }),
          })
        )
      }

      await Promise.all(promises)
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}
```

**Step 4: Create feature index**

Create: `src/features/users/index.ts`

```typescript
// Types
export * from './types'

// Store
export { useUsersStore } from './stores/users-store'

// Hooks
export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useToggleUserStatus,
  usePermissions,
  useUpdateUserPermissions,
  useUpdateUserTerritories,
} from './hooks/use-users'
```

**Step 5: Commit**

```bash
git add src/features/users/
git commit -m "feat: add users feature module with types, store, and hooks"
```

---

## Task 13: Create User List Page

**Files:**
- Create: `src/app/(dashboard)/admin/users/page.tsx`
- Create: `src/features/users/components/user-table.tsx`
- Create: `src/features/users/components/user-filters.tsx`

**Step 1: Create user table component**

Create: `src/features/users/components/user-table.tsx`

```typescript
'use client'

import { useUsers, useToggleUserStatus } from '../hooks/use-users'
import { useUsersStore } from '../stores/users-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export function UserTable() {
  const { currentPage, pageSize, setPage } = useUsersStore()
  const { data, isLoading, error } = useUsers(currentPage, pageSize)
  const toggleStatus = useToggleUserStatus()

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center">Loading users...</div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-500">
          Error loading users: {error.message}
        </div>
      </Card>
    )
  }

  const users = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Last Login</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleStatus.mutate({
                            userId: user.id,
                            isActive: !user.isActive,
                          })
                        }
                        disabled={toggleStatus.isPending}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.pageSize + 1} to{' '}
            {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create user list page**

Create: `src/app/(dashboard)/admin/users/page.tsx`

```typescript
import { UserTable } from '@/features/users/components/user-table'

export const metadata = {
  title: 'Users | Admin',
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      <UserTable />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/users/ src/features/users/components/user-table.tsx
git commit -m "feat: add user list page with table component"
```

---

## Task 14: Create User Detail Page

**Files:**
- Create: `src/app/(dashboard)/admin/users/[id]/page.tsx`
- Create: `src/features/users/components/user-detail.tsx`
- Create: `src/features/users/components/permission-editor.tsx`
- Create: `src/features/users/components/territory-editor.tsx`

**Step 1: Create user detail component**

Create: `src/features/users/components/user-detail.tsx`

```typescript
'use client'

import { useUser } from '../hooks/use-users'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UserDetailProps {
  userId: string
}

export function UserDetail({ userId }: UserDetailProps) {
  const { data, isLoading, error } = useUser(userId)

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center">Loading user details...</div>
      </Card>
    )
  }

  if (error || !data?.data) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-500">
          {error?.message || 'User not found'}
        </div>
      </Card>
    )
  }

  const { user, branches, areas } = data.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-16 w-16 rounded-full"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl">
              {(user.firstName?.[0] || user.email[0]).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
            <Badge variant={user.isActive ? 'default' : 'secondary'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Account Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last Login</dt>
              <dd>
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Login Count</dt>
              <dd>{user.loginCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>

        {/* Permissions Summary */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Permissions</h3>
          {user.permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((perm) => (
                <Badge key={perm.code} variant="outline">
                  {perm.code}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Territories */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Assigned Branches</h3>
          {branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches assigned</p>
          ) : (
            <div className="space-y-2">
              {branches.map((branch) => (
                <div key={branch.id} className="flex justify-between text-sm">
                  <span>{branch.name}</span>
                  <span className="text-muted-foreground">{branch.code}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Assigned Areas</h3>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No areas assigned</p>
          ) : (
            <div className="space-y-2">
              {areas.map((area) => (
                <div key={area.id} className="flex justify-between text-sm">
                  <span>{area.name}</span>
                  <span className="text-muted-foreground">{area.code}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
```

**Step 2: Create user detail page**

Create: `src/app/(dashboard)/admin/users/[id]/page.tsx`

```typescript
import { UserDetail } from '@/features/users/components/user-detail'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `User ${id} | Admin`,
  }
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <UserDetail userId={id} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin/users/\[id\]/ src/features/users/components/user-detail.tsx
git commit -m "feat: add user detail page with permissions and territories view"
```

---

## Summary

This plan covers Phase 2: User Management with 14 tasks:

**Backend (Tasks 1-10)**
- User CRUD queries and API endpoints
- Permission management queries and API
- Territory assignment queries and API
- Session management API
- Enhanced Clerk webhook
- Permission caching service

**Frontend (Tasks 11-14)**
- Users feature module (types, store, hooks)
- User list page with table
- User detail page with permissions/territories

**Total: 14 tasks**

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-01-05-phase-2-user-management.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
