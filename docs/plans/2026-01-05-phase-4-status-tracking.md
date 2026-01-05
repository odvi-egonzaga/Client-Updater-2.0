# Phase 4: Status Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build unified status tracking system for both FCASH and PCNI with period-based updates, workflow validation, audit trail, and dashboards.

**Architecture:** Single `client_period_status` table with company-based filtering. Status workflow validated per company (FCASH includes VISITED, PCNI doesn't). Event sourcing via `status_events` for audit trail. Dashboard summaries computed from status counts.

**Tech Stack:** Next.js 15, Hono, Drizzle ORM, Zustand, TanStack Query, Zod, Vitest

**Reference:** See `docs/plans/2026-01-05-client-updater-v2-design.md` Section 2.5 for schema.

**Prerequisites:** Phases 0-3 must be completed.

---

## Overview

| Task | Description | Files |
|------|-------------|-------|
| 1 | Status schema with Drizzle | `src/server/db/schema/status.ts` |
| 2 | Status workflow service | `src/lib/status/workflow.ts` |
| 3 | Status queries | `src/server/db/queries/status.ts` |
| 4 | Period initialization service | `src/lib/status/period.ts` |
| 5 | Status update API | `src/server/api/routes/status/update.ts` |
| 6 | Status history API | `src/server/api/routes/status/history.ts` |
| 7 | Dashboard summary API | `src/server/api/routes/status/summary.ts` |
| 8 | Wire up status routes | `src/server/api/routes/status/index.ts` |
| 9 | Status feature module | `src/features/status/` |
| 10 | Period selector component | `src/components/shared/period-selector.tsx` |
| 11 | Status update dialog | `src/features/status/components/` |
| 12 | FCASH dashboard page | `src/app/(dashboard)/dashboard/fcash/` |
| 13 | PCNI dashboard page | `src/app/(dashboard)/dashboard/pcni/` |

---

## Task 1: Create Status Schema with Drizzle

**Files:**
- Create: `src/server/db/schema/status.ts`
- Modify: `src/server/db/schema/index.ts`

**Step 1: Write the status schema**

Create: `src/server/db/schema/status.ts`

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { clients } from './clients'

// Enums
export const periodTypeEnum = pgEnum('period_type', ['monthly', 'quarterly'])

// Status Types (lookup)
export const statusTypes = pgTable('status_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sequence: integer('sequence').notNull().default(0),
  companyId: uuid('company_id'), // null = all companies
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Status Reasons (lookup)
export const statusReasons = pgTable('status_reasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  isTerminal: boolean('is_terminal').notNull().default(false),
  requiresRemarks: boolean('requires_remarks').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Client Period Status (current snapshot)
export const clientPeriodStatus = pgTable(
  'client_period_status',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    periodType: periodTypeEnum('period_type').notNull(),
    periodMonth: integer('period_month'), // 1-12, null if quarterly
    periodQuarter: integer('period_quarter'), // 1-4, null if monthly
    periodYear: integer('period_year').notNull(),
    statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
    reasonId: uuid('reason_id').references(() => statusReasons.id),
    remarks: text('remarks'),
    hasPayment: boolean('has_payment').notNull().default(false),
    updateCount: integer('update_count').notNull().default(0),
    isTerminal: boolean('is_terminal').notNull().default(false),
    updatedBy: uuid('updated_by').references(() => users.id),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniquePeriod: unique('unique_client_period').on(
      table.clientId,
      table.periodType,
      table.periodMonth,
      table.periodQuarter,
      table.periodYear
    ),
  })
)

// Status Events (audit trail)
export const statusEvents = pgTable('status_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientPeriodStatusId: uuid('client_period_status_id')
    .notNull()
    .references(() => clientPeriodStatus.id),
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  reasonId: uuid('reason_id').references(() => statusReasons.id),
  remarks: text('remarks'),
  hasPayment: boolean('has_payment').notNull().default(false),
  eventSequence: integer('event_sequence').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const statusTypesRelations = relations(statusTypes, ({ many }) => ({
  reasons: many(statusReasons),
  periodStatuses: many(clientPeriodStatus),
}))

export const statusReasonsRelations = relations(statusReasons, ({ one }) => ({
  statusType: one(statusTypes, {
    fields: [statusReasons.statusTypeId],
    references: [statusTypes.id],
  }),
}))

export const clientPeriodStatusRelations = relations(
  clientPeriodStatus,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [clientPeriodStatus.clientId],
      references: [clients.id],
    }),
    statusType: one(statusTypes, {
      fields: [clientPeriodStatus.statusTypeId],
      references: [statusTypes.id],
    }),
    reason: one(statusReasons, {
      fields: [clientPeriodStatus.reasonId],
      references: [statusReasons.id],
    }),
    updatedByUser: one(users, {
      fields: [clientPeriodStatus.updatedBy],
      references: [users.id],
    }),
    events: many(statusEvents),
  })
)

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  periodStatus: one(clientPeriodStatus, {
    fields: [statusEvents.clientPeriodStatusId],
    references: [clientPeriodStatus.id],
  }),
  statusType: one(statusTypes, {
    fields: [statusEvents.statusTypeId],
    references: [statusTypes.id],
  }),
  reason: one(statusReasons, {
    fields: [statusEvents.reasonId],
    references: [statusReasons.id],
  }),
  createdByUser: one(users, {
    fields: [statusEvents.createdBy],
    references: [users.id],
  }),
}))

// Types
export type StatusType = typeof statusTypes.$inferSelect
export type NewStatusType = typeof statusTypes.$inferInsert
export type StatusReason = typeof statusReasons.$inferSelect
export type ClientPeriodStatus = typeof clientPeriodStatus.$inferSelect
export type NewClientPeriodStatus = typeof clientPeriodStatus.$inferInsert
export type StatusEvent = typeof statusEvents.$inferSelect
export type NewStatusEvent = typeof statusEvents.$inferInsert
```

**Step 2: Update schema index**

Modify: `src/server/db/schema/index.ts` - Add exports:

```typescript
// Add to existing exports
export * from './status'
```

**Step 3: Generate migration**

Run: `cd client-updater-version-2 && pnpm db:generate`
Expected: Migration file created

**Step 4: Apply migration**

Run: `cd client-updater-version-2 && pnpm db:push`
Expected: Tables created in database

**Step 5: Commit**

```bash
git add src/server/db/schema/status.ts src/server/db/schema/index.ts
git commit -m "feat: add status tracking schema with period status and events"
```

---

## Task 2: Create Status Workflow Service

**Files:**
- Create: `src/lib/status/workflow.ts`
- Create: `src/lib/status/types.ts`
- Create: `src/lib/status/__tests__/workflow.test.ts`

**Step 1: Create status types**

Create: `src/lib/status/types.ts`

```typescript
// Status codes
export const STATUS_CODES = {
  PENDING: 'PENDING',
  TO_FOLLOW: 'TO_FOLLOW',
  CALLED: 'CALLED',
  VISITED: 'VISITED', // FCASH only
  UPDATED: 'UPDATED',
  DONE: 'DONE',
} as const

export type StatusCode = (typeof STATUS_CODES)[keyof typeof STATUS_CODES]

// Company codes
export const COMPANY_CODES = {
  FCASH: 'FCASH',
  PCNI: 'PCNI',
} as const

export type CompanyCode = (typeof COMPANY_CODES)[keyof typeof COMPANY_CODES]

// Period types
export type PeriodType = 'monthly' | 'quarterly'

// Status workflow definition
export interface StatusWorkflow {
  code: StatusCode
  sequence: number
  allowedTransitions: StatusCode[]
}

// Period definition
export interface Period {
  type: PeriodType
  year: number
  month?: number // 1-12 for monthly
  quarter?: number // 1-4 for quarterly
}

// Status update input
export interface StatusUpdateInput {
  clientId: string
  period: Period
  statusCode: StatusCode
  reasonId?: string
  remarks?: string
  hasPayment?: boolean
}

// Validation result
export interface ValidationResult {
  valid: boolean
  error?: string
}
```

**Step 2: Write failing test for workflow service**

Create: `src/lib/status/__tests__/workflow.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  getWorkflowForCompany,
  validateStatusTransition,
  getNextAllowedStatuses,
  isValidStatus,
} from '../workflow'
import { STATUS_CODES, COMPANY_CODES } from '../types'

describe('Status Workflow Service', () => {
  describe('getWorkflowForCompany', () => {
    it('should return FCASH workflow with VISITED status', () => {
      const workflow = getWorkflowForCompany(COMPANY_CODES.FCASH)
      const codes = workflow.map((w) => w.code)
      expect(codes).toContain(STATUS_CODES.VISITED)
      expect(codes).toHaveLength(6)
    })

    it('should return PCNI workflow without VISITED status', () => {
      const workflow = getWorkflowForCompany(COMPANY_CODES.PCNI)
      const codes = workflow.map((w) => w.code)
      expect(codes).not.toContain(STATUS_CODES.VISITED)
      expect(codes).toHaveLength(5)
    })
  })

  describe('validateStatusTransition', () => {
    it('should allow PENDING to TO_FOLLOW', () => {
      const result = validateStatusTransition(
        COMPANY_CODES.FCASH,
        STATUS_CODES.PENDING,
        STATUS_CODES.TO_FOLLOW
      )
      expect(result.valid).toBe(true)
    })

    it('should allow skipping statuses forward', () => {
      const result = validateStatusTransition(
        COMPANY_CODES.FCASH,
        STATUS_CODES.PENDING,
        STATUS_CODES.CALLED
      )
      expect(result.valid).toBe(true)
    })

    it('should NOT allow going backwards', () => {
      const result = validateStatusTransition(
        COMPANY_CODES.FCASH,
        STATUS_CODES.CALLED,
        STATUS_CODES.PENDING
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Cannot go backwards')
    })

    it('should NOT allow VISITED for PCNI', () => {
      const result = validateStatusTransition(
        COMPANY_CODES.PCNI,
        STATUS_CODES.CALLED,
        STATUS_CODES.VISITED
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not available')
    })

    it('should allow same status (re-update)', () => {
      const result = validateStatusTransition(
        COMPANY_CODES.FCASH,
        STATUS_CODES.CALLED,
        STATUS_CODES.CALLED
      )
      expect(result.valid).toBe(true)
    })
  })

  describe('getNextAllowedStatuses', () => {
    it('should return all forward statuses from PENDING for FCASH', () => {
      const allowed = getNextAllowedStatuses(COMPANY_CODES.FCASH, STATUS_CODES.PENDING)
      expect(allowed).toContain(STATUS_CODES.TO_FOLLOW)
      expect(allowed).toContain(STATUS_CODES.CALLED)
      expect(allowed).toContain(STATUS_CODES.VISITED)
      expect(allowed).toContain(STATUS_CODES.UPDATED)
      expect(allowed).toContain(STATUS_CODES.DONE)
    })

    it('should NOT include VISITED for PCNI', () => {
      const allowed = getNextAllowedStatuses(COMPANY_CODES.PCNI, STATUS_CODES.CALLED)
      expect(allowed).not.toContain(STATUS_CODES.VISITED)
      expect(allowed).toContain(STATUS_CODES.UPDATED)
      expect(allowed).toContain(STATUS_CODES.DONE)
    })
  })

  describe('isValidStatus', () => {
    it('should return true for valid FCASH status', () => {
      expect(isValidStatus(COMPANY_CODES.FCASH, STATUS_CODES.VISITED)).toBe(true)
    })

    it('should return false for VISITED in PCNI', () => {
      expect(isValidStatus(COMPANY_CODES.PCNI, STATUS_CODES.VISITED)).toBe(false)
    })
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/lib/status/__tests__/workflow.test.ts`
Expected: FAIL - module not found

**Step 4: Implement workflow service**

Create: `src/lib/status/workflow.ts`

```typescript
import type {
  StatusCode,
  CompanyCode,
  StatusWorkflow,
  ValidationResult,
} from './types'
import { STATUS_CODES, COMPANY_CODES } from './types'

// FCASH workflow (includes VISITED)
const FCASH_WORKFLOW: StatusWorkflow[] = [
  { code: STATUS_CODES.PENDING, sequence: 1, allowedTransitions: ['TO_FOLLOW', 'CALLED', 'VISITED', 'UPDATED', 'DONE'] },
  { code: STATUS_CODES.TO_FOLLOW, sequence: 2, allowedTransitions: ['CALLED', 'VISITED', 'UPDATED', 'DONE'] },
  { code: STATUS_CODES.CALLED, sequence: 3, allowedTransitions: ['VISITED', 'UPDATED', 'DONE'] },
  { code: STATUS_CODES.VISITED, sequence: 4, allowedTransitions: ['UPDATED', 'DONE'] },
  { code: STATUS_CODES.UPDATED, sequence: 5, allowedTransitions: ['DONE'] },
  { code: STATUS_CODES.DONE, sequence: 6, allowedTransitions: [] },
]

// PCNI workflow (no VISITED)
const PCNI_WORKFLOW: StatusWorkflow[] = [
  { code: STATUS_CODES.PENDING, sequence: 1, allowedTransitions: ['TO_FOLLOW', 'CALLED', 'UPDATED', 'DONE'] },
  { code: STATUS_CODES.TO_FOLLOW, sequence: 2, allowedTransitions: ['CALLED', 'UPDATED', 'DONE'] },
  { code: STATUS_CODES.CALLED, sequence: 3, allowedTransitions: ['UPDATED', 'DONE'] },
  { code: STATUS_CODES.UPDATED, sequence: 4, allowedTransitions: ['DONE'] },
  { code: STATUS_CODES.DONE, sequence: 5, allowedTransitions: [] },
]

// Get workflow for company
export function getWorkflowForCompany(company: CompanyCode): StatusWorkflow[] {
  return company === COMPANY_CODES.FCASH ? FCASH_WORKFLOW : PCNI_WORKFLOW
}

// Check if status is valid for company
export function isValidStatus(company: CompanyCode, status: StatusCode): boolean {
  const workflow = getWorkflowForCompany(company)
  return workflow.some((w) => w.code === status)
}

// Get sequence number for a status
function getSequence(company: CompanyCode, status: StatusCode): number {
  const workflow = getWorkflowForCompany(company)
  const found = workflow.find((w) => w.code === status)
  return found?.sequence ?? 0
}

// Validate status transition
export function validateStatusTransition(
  company: CompanyCode,
  currentStatus: StatusCode | null,
  newStatus: StatusCode
): ValidationResult {
  // Check if new status is valid for this company
  if (!isValidStatus(company, newStatus)) {
    return {
      valid: false,
      error: `Status ${newStatus} is not available for ${company}`,
    }
  }

  // If no current status (new record), any valid status is allowed
  if (!currentStatus) {
    return { valid: true }
  }

  // Same status is allowed (re-update with new remarks/reason)
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // Get sequences
  const currentSeq = getSequence(company, currentStatus)
  const newSeq = getSequence(company, newStatus)

  // Cannot go backwards
  if (newSeq < currentSeq) {
    return {
      valid: false,
      error: `Cannot go backwards from ${currentStatus} to ${newStatus}`,
    }
  }

  return { valid: true }
}

// Get allowed next statuses from current status
export function getNextAllowedStatuses(
  company: CompanyCode,
  currentStatus: StatusCode | null
): StatusCode[] {
  const workflow = getWorkflowForCompany(company)

  if (!currentStatus) {
    // All statuses are allowed for new records
    return workflow.map((w) => w.code)
  }

  const current = workflow.find((w) => w.code === currentStatus)
  if (!current) {
    return []
  }

  // Include current status (for re-updates) plus all forward transitions
  const allowed = [currentStatus, ...current.allowedTransitions] as StatusCode[]

  // Filter to only statuses valid for this company
  return allowed.filter((s) => isValidStatus(company, s))
}

// Get initial status (PENDING)
export function getInitialStatus(): StatusCode {
  return STATUS_CODES.PENDING
}

// Check if status is terminal (DONE or has terminal reason)
export function isTerminalStatus(status: StatusCode): boolean {
  return status === STATUS_CODES.DONE
}
```

**Step 5: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/lib/status/__tests__/workflow.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/status/
git commit -m "feat: add status workflow service with company-specific rules"
```

---

## Task 3: Create Status Queries

**Files:**
- Create: `src/server/db/queries/status.ts`
- Create: `src/server/db/queries/__tests__/status.test.ts`

**Step 1: Write failing test for status queries**

Create: `src/server/db/queries/__tests__/status.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  },
}))

describe('Status Queries', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export getClientPeriodStatus function', async () => {
    const { getClientPeriodStatus } = await import('../status')
    expect(getClientPeriodStatus).toBeDefined()
  })

  it('should export upsertClientPeriodStatus function', async () => {
    const { upsertClientPeriodStatus } = await import('../status')
    expect(upsertClientPeriodStatus).toBeDefined()
  })

  it('should export getStatusHistory function', async () => {
    const { getStatusHistory } = await import('../status')
    expect(getStatusHistory).toBeDefined()
  })

  it('should export createStatusEvent function', async () => {
    const { createStatusEvent } = await import('../status')
    expect(createStatusEvent).toBeDefined()
  })

  it('should export getStatusSummary function', async () => {
    const { getStatusSummary } = await import('../status')
    expect(getStatusSummary).toBeDefined()
  })

  it('should export initializePeriodStatuses function', async () => {
    const { initializePeriodStatuses } = await import('../status')
    expect(initializePeriodStatuses).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/status.test.ts`
Expected: FAIL - module not found

**Step 3: Implement status queries**

Create: `src/server/db/queries/status.ts`

```typescript
import { db } from '../index'
import {
  clientPeriodStatus,
  statusEvents,
  statusTypes,
  statusReasons,
  clients,
  companies,
  pensionTypes,
} from '../schema'
import { eq, and, sql, desc, inArray } from 'drizzle-orm'
import type {
  ClientPeriodStatus,
  NewClientPeriodStatus,
  StatusEvent,
  NewStatusEvent,
} from '../schema/status'
import type { Period } from '@/lib/status/types'

// Get client's status for a specific period
export async function getClientPeriodStatus(
  clientId: string,
  period: Period
): Promise<ClientPeriodStatus | null> {
  const conditions = [
    eq(clientPeriodStatus.clientId, clientId),
    eq(clientPeriodStatus.periodType, period.type),
    eq(clientPeriodStatus.periodYear, period.year),
  ]

  if (period.type === 'monthly' && period.month) {
    conditions.push(eq(clientPeriodStatus.periodMonth, period.month))
  } else if (period.type === 'quarterly' && period.quarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, period.quarter))
  }

  const result = await db
    .select()
    .from(clientPeriodStatus)
    .where(and(...conditions))
    .limit(1)

  return result[0] ?? null
}

// Get client's status with related data
export async function getClientPeriodStatusWithDetails(
  clientId: string,
  period: Period
) {
  const conditions = [
    eq(clientPeriodStatus.clientId, clientId),
    eq(clientPeriodStatus.periodType, period.type),
    eq(clientPeriodStatus.periodYear, period.year),
  ]

  if (period.type === 'monthly' && period.month) {
    conditions.push(eq(clientPeriodStatus.periodMonth, period.month))
  } else if (period.type === 'quarterly' && period.quarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, period.quarter))
  }

  const result = await db
    .select({
      status: clientPeriodStatus,
      statusType: statusTypes,
      reason: statusReasons,
    })
    .from(clientPeriodStatus)
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .leftJoin(statusReasons, eq(clientPeriodStatus.reasonId, statusReasons.id))
    .where(and(...conditions))
    .limit(1)

  return result[0] ?? null
}

// Upsert client period status
export async function upsertClientPeriodStatus(
  data: NewClientPeriodStatus
): Promise<ClientPeriodStatus> {
  const result = await db
    .insert(clientPeriodStatus)
    .values(data)
    .onConflictDoUpdate({
      target: [
        clientPeriodStatus.clientId,
        clientPeriodStatus.periodType,
        clientPeriodStatus.periodMonth,
        clientPeriodStatus.periodQuarter,
        clientPeriodStatus.periodYear,
      ],
      set: {
        statusTypeId: data.statusTypeId,
        reasonId: data.reasonId,
        remarks: data.remarks,
        hasPayment: data.hasPayment,
        updateCount: sql`${clientPeriodStatus.updateCount} + 1`,
        isTerminal: data.isTerminal,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning()

  return result[0]
}

// Create status event (audit trail)
export async function createStatusEvent(
  data: NewStatusEvent
): Promise<StatusEvent> {
  // Get the next sequence number
  const [maxSeq] = await db
    .select({ max: sql<number>`COALESCE(MAX(event_sequence), 0)` })
    .from(statusEvents)
    .where(eq(statusEvents.clientPeriodStatusId, data.clientPeriodStatusId))

  const result = await db
    .insert(statusEvents)
    .values({
      ...data,
      eventSequence: (maxSeq?.max ?? 0) + 1,
    })
    .returning()

  return result[0]
}

// Get status history for a client period
export async function getStatusHistory(
  clientPeriodStatusId: string,
  limit = 50
) {
  return db
    .select({
      event: statusEvents,
      statusType: statusTypes,
      reason: statusReasons,
    })
    .from(statusEvents)
    .leftJoin(statusTypes, eq(statusEvents.statusTypeId, statusTypes.id))
    .leftJoin(statusReasons, eq(statusEvents.reasonId, statusReasons.id))
    .where(eq(statusEvents.clientPeriodStatusId, clientPeriodStatusId))
    .orderBy(desc(statusEvents.eventSequence))
    .limit(limit)
}

// Get all status history for a client across periods
export async function getClientStatusHistory(clientId: string, limit = 100) {
  return db
    .select({
      periodStatus: clientPeriodStatus,
      event: statusEvents,
      statusType: statusTypes,
      reason: statusReasons,
    })
    .from(statusEvents)
    .innerJoin(
      clientPeriodStatus,
      eq(statusEvents.clientPeriodStatusId, clientPeriodStatus.id)
    )
    .leftJoin(statusTypes, eq(statusEvents.statusTypeId, statusTypes.id))
    .leftJoin(statusReasons, eq(statusEvents.reasonId, statusReasons.id))
    .where(eq(clientPeriodStatus.clientId, clientId))
    .orderBy(desc(statusEvents.createdAt))
    .limit(limit)
}

// Get status summary for dashboard (counts by status)
export async function getStatusSummary(
  companyCode: string,
  period: Period,
  branchIds?: string[]
) {
  // Build conditions
  const conditions = [
    eq(clientPeriodStatus.periodType, period.type),
    eq(clientPeriodStatus.periodYear, period.year),
  ]

  if (period.type === 'monthly' && period.month) {
    conditions.push(eq(clientPeriodStatus.periodMonth, period.month))
  } else if (period.type === 'quarterly' && period.quarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, period.quarter))
  }

  // Filter by company via client -> pension_type -> company
  // This requires joining through the relations

  const result = await db
    .select({
      statusTypeId: clientPeriodStatus.statusTypeId,
      statusCode: statusTypes.code,
      statusName: statusTypes.name,
      count: sql<number>`count(*)::int`,
    })
    .from(clientPeriodStatus)
    .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
    .innerJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
    .innerJoin(companies, eq(pensionTypes.companyId, companies.id))
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .where(
      and(
        ...conditions,
        eq(companies.code, companyCode),
        branchIds && branchIds.length > 0
          ? inArray(clients.branchId, branchIds)
          : undefined
      )
    )
    .groupBy(
      clientPeriodStatus.statusTypeId,
      statusTypes.code,
      statusTypes.name
    )

  return result
}

// Get status summary grouped by pension type
export async function getStatusSummaryByPensionType(
  companyCode: string,
  period: Period,
  branchIds?: string[]
) {
  const conditions = [
    eq(clientPeriodStatus.periodType, period.type),
    eq(clientPeriodStatus.periodYear, period.year),
  ]

  if (period.type === 'monthly' && period.month) {
    conditions.push(eq(clientPeriodStatus.periodMonth, period.month))
  } else if (period.type === 'quarterly' && period.quarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, period.quarter))
  }

  const result = await db
    .select({
      pensionTypeId: pensionTypes.id,
      pensionTypeCode: pensionTypes.code,
      pensionTypeName: pensionTypes.name,
      statusTypeId: clientPeriodStatus.statusTypeId,
      statusCode: statusTypes.code,
      statusName: statusTypes.name,
      count: sql<number>`count(*)::int`,
    })
    .from(clientPeriodStatus)
    .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
    .innerJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
    .innerJoin(companies, eq(pensionTypes.companyId, companies.id))
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .where(
      and(
        ...conditions,
        eq(companies.code, companyCode),
        branchIds && branchIds.length > 0
          ? inArray(clients.branchId, branchIds)
          : undefined
      )
    )
    .groupBy(
      pensionTypes.id,
      pensionTypes.code,
      pensionTypes.name,
      clientPeriodStatus.statusTypeId,
      statusTypes.code,
      statusTypes.name
    )

  return result
}

// Initialize period statuses for clients (bulk create PENDING)
export async function initializePeriodStatuses(
  clientIds: string[],
  period: Period,
  pendingStatusTypeId: string
): Promise<number> {
  if (clientIds.length === 0) return 0

  const values = clientIds.map((clientId) => ({
    clientId,
    periodType: period.type,
    periodMonth: period.type === 'monthly' ? period.month : null,
    periodQuarter: period.type === 'quarterly' ? period.quarter : null,
    periodYear: period.year,
    statusTypeId: pendingStatusTypeId,
    hasPayment: false,
    updateCount: 0,
    isTerminal: false,
  }))

  // Use onConflictDoNothing to skip already initialized
  const result = await db
    .insert(clientPeriodStatus)
    .values(values)
    .onConflictDoNothing()
    .returning()

  return result.length
}

// Get status types for a company
export async function getStatusTypesForCompany(companyCode: string) {
  // Get company ID
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.code, companyCode))
    .limit(1)

  if (!company) return []

  // Get status types where companyId is null (all) or matches this company
  return db
    .select()
    .from(statusTypes)
    .where(
      and(
        eq(statusTypes.isActive, true),
        sql`(${statusTypes.companyId} IS NULL OR ${statusTypes.companyId} = ${company.id})`
      )
    )
    .orderBy(statusTypes.sequence)
}

// Get status reasons for a status type
export async function getStatusReasonsForType(statusTypeId: string) {
  return db
    .select()
    .from(statusReasons)
    .where(
      and(
        eq(statusReasons.statusTypeId, statusTypeId),
        eq(statusReasons.isActive, true)
      )
    )
    .orderBy(statusReasons.sortOrder)
}
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/status.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/queries/status.ts src/server/db/queries/__tests__/status.test.ts
git commit -m "feat: add status queries with summary and history functions"
```

---

## Task 4: Create Period Initialization Service

**Files:**
- Create: `src/lib/status/period.ts`
- Create: `src/lib/status/__tests__/period.test.ts`

**Step 1: Write failing test for period service**

Create: `src/lib/status/__tests__/period.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  getCurrentPeriod,
  getPreviousPeriod,
  getNextPeriod,
  formatPeriod,
  parsePeriod,
  getAvailableYears,
} from '../period'

describe('Period Service', () => {
  describe('getCurrentPeriod', () => {
    it('should return monthly period for non-PNP', () => {
      const period = getCurrentPeriod('monthly')
      expect(period.type).toBe('monthly')
      expect(period.month).toBeDefined()
      expect(period.quarter).toBeUndefined()
    })

    it('should return quarterly period for PNP', () => {
      const period = getCurrentPeriod('quarterly')
      expect(period.type).toBe('quarterly')
      expect(period.quarter).toBeDefined()
      expect(period.month).toBeUndefined()
    })
  })

  describe('getPreviousPeriod', () => {
    it('should return previous month', () => {
      const current = { type: 'monthly' as const, year: 2026, month: 3 }
      const prev = getPreviousPeriod(current)
      expect(prev.year).toBe(2026)
      expect(prev.month).toBe(2)
    })

    it('should handle year boundary for monthly', () => {
      const current = { type: 'monthly' as const, year: 2026, month: 1 }
      const prev = getPreviousPeriod(current)
      expect(prev.year).toBe(2025)
      expect(prev.month).toBe(12)
    })

    it('should return previous quarter', () => {
      const current = { type: 'quarterly' as const, year: 2026, quarter: 2 }
      const prev = getPreviousPeriod(current)
      expect(prev.year).toBe(2026)
      expect(prev.quarter).toBe(1)
    })

    it('should handle year boundary for quarterly', () => {
      const current = { type: 'quarterly' as const, year: 2026, quarter: 1 }
      const prev = getPreviousPeriod(current)
      expect(prev.year).toBe(2025)
      expect(prev.quarter).toBe(4)
    })
  })

  describe('formatPeriod', () => {
    it('should format monthly period', () => {
      const period = { type: 'monthly' as const, year: 2026, month: 3 }
      expect(formatPeriod(period)).toBe('March 2026')
    })

    it('should format quarterly period', () => {
      const period = { type: 'quarterly' as const, year: 2026, quarter: 2 }
      expect(formatPeriod(period)).toBe('Q2 2026')
    })
  })

  describe('getAvailableYears', () => {
    it('should return 3 years including current', () => {
      const years = getAvailableYears()
      expect(years).toHaveLength(3)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/lib/status/__tests__/period.test.ts`
Expected: FAIL - module not found

**Step 3: Implement period service**

Create: `src/lib/status/period.ts`

```typescript
import type { Period, PeriodType } from './types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Get current period based on type
export function getCurrentPeriod(type: PeriodType): Period {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12

  if (type === 'monthly') {
    return { type, year, month }
  }

  // Quarterly: Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12
  const quarter = Math.ceil(month / 3)
  return { type, year, quarter }
}

// Get previous period
export function getPreviousPeriod(period: Period): Period {
  if (period.type === 'monthly' && period.month) {
    if (period.month === 1) {
      return { type: 'monthly', year: period.year - 1, month: 12 }
    }
    return { type: 'monthly', year: period.year, month: period.month - 1 }
  }

  if (period.type === 'quarterly' && period.quarter) {
    if (period.quarter === 1) {
      return { type: 'quarterly', year: period.year - 1, quarter: 4 }
    }
    return { type: 'quarterly', year: period.year, quarter: period.quarter - 1 }
  }

  return period
}

// Get next period
export function getNextPeriod(period: Period): Period {
  if (period.type === 'monthly' && period.month) {
    if (period.month === 12) {
      return { type: 'monthly', year: period.year + 1, month: 1 }
    }
    return { type: 'monthly', year: period.year, month: period.month + 1 }
  }

  if (period.type === 'quarterly' && period.quarter) {
    if (period.quarter === 4) {
      return { type: 'quarterly', year: period.year + 1, quarter: 1 }
    }
    return { type: 'quarterly', year: period.year, quarter: period.quarter + 1 }
  }

  return period
}

// Format period for display
export function formatPeriod(period: Period): string {
  if (period.type === 'monthly' && period.month) {
    return `${MONTH_NAMES[period.month - 1]} ${period.year}`
  }

  if (period.type === 'quarterly' && period.quarter) {
    return `Q${period.quarter} ${period.year}`
  }

  return `${period.year}`
}

// Format period as short string
export function formatPeriodShort(period: Period): string {
  if (period.type === 'monthly' && period.month) {
    return `${period.month.toString().padStart(2, '0')}/${period.year}`
  }

  if (period.type === 'quarterly' && period.quarter) {
    return `Q${period.quarter}/${period.year}`
  }

  return `${period.year}`
}

// Parse period from string (e.g., "2026-03" or "2026-Q2")
export function parsePeriod(str: string, type: PeriodType): Period | null {
  if (type === 'monthly') {
    const match = str.match(/^(\d{4})-(\d{1,2})$/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10)
      if (month >= 1 && month <= 12) {
        return { type: 'monthly', year, month }
      }
    }
  }

  if (type === 'quarterly') {
    const match = str.match(/^(\d{4})-Q(\d)$/i)
    if (match) {
      const year = parseInt(match[1], 10)
      const quarter = parseInt(match[2], 10)
      if (quarter >= 1 && quarter <= 4) {
        return { type: 'quarterly', year, quarter }
      }
    }
  }

  return null
}

// Get available years for selection
// Logic: If current month >= September, include next year
export function getAvailableYears(): number[] {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  if (currentMonth >= 9) {
    return [currentYear - 1, currentYear, currentYear + 1]
  }

  return [currentYear - 2, currentYear - 1, currentYear]
}

// Get available months for a year
export function getAvailableMonths(): { value: number; label: string }[] {
  return MONTH_NAMES.map((name, index) => ({
    value: index + 1,
    label: name,
  }))
}

// Get available quarters
export function getAvailableQuarters(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' },
  ]
}

// Check if period is in the past
export function isPastPeriod(period: Period): boolean {
  const current = getCurrentPeriod(period.type)

  if (period.year < current.year) return true
  if (period.year > current.year) return false

  if (period.type === 'monthly' && period.month && current.month) {
    return period.month < current.month
  }

  if (period.type === 'quarterly' && period.quarter && current.quarter) {
    return period.quarter < current.quarter
  }

  return false
}

// Check if period is current
export function isCurrentPeriod(period: Period): boolean {
  const current = getCurrentPeriod(period.type)

  if (period.year !== current.year) return false

  if (period.type === 'monthly') {
    return period.month === current.month
  }

  if (period.type === 'quarterly') {
    return period.quarter === current.quarter
  }

  return false
}
```

**Step 4: Create index file**

Create: `src/lib/status/index.ts`

```typescript
// Types
export * from './types'

// Workflow
export {
  getWorkflowForCompany,
  validateStatusTransition,
  getNextAllowedStatuses,
  isValidStatus,
  getInitialStatus,
  isTerminalStatus,
} from './workflow'

// Period
export {
  getCurrentPeriod,
  getPreviousPeriod,
  getNextPeriod,
  formatPeriod,
  formatPeriodShort,
  parsePeriod,
  getAvailableYears,
  getAvailableMonths,
  getAvailableQuarters,
  isPastPeriod,
  isCurrentPeriod,
} from './period'
```

**Step 5: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/lib/status/__tests__/period.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/status/
git commit -m "feat: add period service with formatting and navigation"
```

---

## Task 5: Create Status Update API

**Files:**
- Create: `src/server/api/routes/status/update.ts`
- Create: `src/server/api/routes/status/__tests__/update.test.ts`

**Step 1: Write failing test for status update API**

Create: `src/server/api/routes/status/__tests__/update.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/server/db/queries/status', () => ({
  getClientPeriodStatus: vi.fn().mockResolvedValue({
    id: 'status-123',
    statusTypeId: 'pending-id',
  }),
  upsertClientPeriodStatus: vi.fn().mockResolvedValue({
    id: 'status-123',
    statusTypeId: 'called-id',
  }),
  createStatusEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
  getStatusTypesForCompany: vi.fn().mockResolvedValue([
    { id: 'pending-id', code: 'PENDING', sequence: 1 },
    { id: 'called-id', code: 'CALLED', sequence: 3 },
  ]),
}))

vi.mock('@/server/db/queries/clients', () => ({
  getClientById: vi.fn().mockResolvedValue({
    id: 'client-123',
    pensionTypeId: 'pt-1',
  }),
}))

vi.mock('@/lib/status', () => ({
  validateStatusTransition: vi.fn().mockReturnValue({ valid: true }),
}))

describe('Status Update API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update client status', async () => {
    const { statusUpdateRoute } = await import('../update')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', statusUpdateRoute)

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'client-123',
        period: { type: 'monthly', year: 2026, month: 1 },
        statusCode: 'CALLED',
        remarks: 'Contacted client',
      }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should reject invalid status transition', async () => {
    const { validateStatusTransition } = await import('@/lib/status')
    vi.mocked(validateStatusTransition).mockReturnValue({
      valid: false,
      error: 'Cannot go backwards',
    })

    const { statusUpdateRoute } = await import('../update')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', statusUpdateRoute)

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'client-123',
        period: { type: 'monthly', year: 2026, month: 1 },
        statusCode: 'PENDING',
      }),
    })

    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/status/__tests__/update.test.ts`
Expected: FAIL - module not found

**Step 3: Implement status update route**

Create: `src/server/api/routes/status/update.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  getClientPeriodStatus,
  upsertClientPeriodStatus,
  createStatusEvent,
  getStatusTypesForCompany,
} from '@/server/db/queries/status'
import { getClientById } from '@/server/db/queries/clients'
import { validateStatusTransition, isTerminalStatus } from '@/lib/status'
import { canAccessBranch } from '@/lib/territories'
import { cache, cacheKeys } from '@/lib/cache'
import { db } from '@/server/db'
import { pensionTypes, companies } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { CompanyCode, Period } from '@/lib/status/types'

const periodSchema = z.object({
  type: z.enum(['monthly', 'quarterly']),
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12).optional(),
  quarter: z.number().min(1).max(4).optional(),
})

const updateSchema = z.object({
  clientId: z.string().uuid(),
  period: periodSchema,
  statusCode: z.string(),
  reasonId: z.string().uuid().optional(),
  remarks: z.string().max(1000).optional(),
  hasPayment: z.boolean().optional(),
})

const bulkUpdateSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1).max(100),
  period: periodSchema,
  statusCode: z.string(),
  reasonId: z.string().uuid().optional(),
  remarks: z.string().max(1000).optional(),
})

export const statusUpdateRoute = new Hono()

// Update single client status
statusUpdateRoute.post(
  '/',
  zValidator('json', updateSchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const data = c.req.valid('json')

      // Get client and verify access
      const client = await getClientById(data.clientId)
      if (!client) {
        return c.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
          404
        )
      }

      if (client.branchId) {
        const hasAccess = await canAccessBranch(userId, client.branchId, 'status:update')
        if (!hasAccess) {
          return c.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'No access to this client' } },
            403
          )
        }
      }

      // Get company from client's pension type
      const companyCode = await getCompanyCodeForClient(client.pensionTypeId)
      if (!companyCode) {
        return c.json(
          { success: false, error: { code: 'CONFIG_ERROR', message: 'Client company not found' } },
          500
        )
      }

      // Get status types for company
      const statusTypes = await getStatusTypesForCompany(companyCode)
      const newStatusType = statusTypes.find((s) => s.code === data.statusCode)
      if (!newStatusType) {
        return c.json(
          { success: false, error: { code: 'INVALID_STATUS', message: `Status ${data.statusCode} not available for ${companyCode}` } },
          400
        )
      }

      // Get current status
      const currentStatus = await getClientPeriodStatus(data.clientId, data.period as Period)
      const currentStatusCode = currentStatus
        ? statusTypes.find((s) => s.id === currentStatus.statusTypeId)?.code ?? null
        : null

      // Validate transition
      const validation = validateStatusTransition(
        companyCode as CompanyCode,
        currentStatusCode as any,
        data.statusCode as any
      )

      if (!validation.valid) {
        return c.json(
          { success: false, error: { code: 'INVALID_TRANSITION', message: validation.error } },
          400
        )
      }

      // Update status
      const updatedStatus = await upsertClientPeriodStatus({
        clientId: data.clientId,
        periodType: data.period.type,
        periodMonth: data.period.month ?? null,
        periodQuarter: data.period.quarter ?? null,
        periodYear: data.period.year,
        statusTypeId: newStatusType.id,
        reasonId: data.reasonId,
        remarks: data.remarks,
        hasPayment: data.hasPayment ?? currentStatus?.hasPayment ?? false,
        isTerminal: isTerminalStatus(data.statusCode as any),
        updatedBy: userId,
      })

      // Create audit event
      await createStatusEvent({
        clientPeriodStatusId: updatedStatus.id,
        statusTypeId: newStatusType.id,
        reasonId: data.reasonId,
        remarks: data.remarks,
        hasPayment: data.hasPayment ?? false,
        createdBy: userId,
      })

      // Invalidate dashboard cache
      await cache.del(cacheKeys.dashboardSummary(companyCode, data.period.year, data.period.month ?? 0))

      return c.json({
        success: true,
        data: updatedStatus,
        message: `Status updated to ${data.statusCode}`,
      })
    } catch (error) {
      console.error('Error updating status:', error)
      return c.json(
        { success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update status' } },
        500
      )
    }
  }
)

// Bulk update status
statusUpdateRoute.post(
  '/bulk',
  zValidator('json', bulkUpdateSchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const data = c.req.valid('json')

      const results = {
        success: 0,
        failed: 0,
        errors: [] as { clientId: string; error: string }[],
      }

      for (const clientId of data.clientIds) {
        try {
          // Simplified bulk update - skip detailed validation for speed
          const client = await getClientById(clientId)
          if (!client) {
            results.failed++
            results.errors.push({ clientId, error: 'Client not found' })
            continue
          }

          const companyCode = await getCompanyCodeForClient(client.pensionTypeId)
          if (!companyCode) {
            results.failed++
            results.errors.push({ clientId, error: 'Company not found' })
            continue
          }

          const statusTypes = await getStatusTypesForCompany(companyCode)
          const newStatusType = statusTypes.find((s) => s.code === data.statusCode)
          if (!newStatusType) {
            results.failed++
            results.errors.push({ clientId, error: `Invalid status ${data.statusCode}` })
            continue
          }

          const updatedStatus = await upsertClientPeriodStatus({
            clientId,
            periodType: data.period.type,
            periodMonth: data.period.month ?? null,
            periodQuarter: data.period.quarter ?? null,
            periodYear: data.period.year,
            statusTypeId: newStatusType.id,
            reasonId: data.reasonId,
            remarks: data.remarks,
            isTerminal: isTerminalStatus(data.statusCode as any),
            updatedBy: userId,
          })

          await createStatusEvent({
            clientPeriodStatusId: updatedStatus.id,
            statusTypeId: newStatusType.id,
            reasonId: data.reasonId,
            remarks: data.remarks,
            hasPayment: false,
            createdBy: userId,
          })

          results.success++
        } catch {
          results.failed++
          results.errors.push({ clientId, error: 'Update failed' })
        }
      }

      return c.json({
        success: true,
        data: results,
        message: `Updated ${results.success} of ${data.clientIds.length} clients`,
      })
    } catch (error) {
      console.error('Error bulk updating status:', error)
      return c.json(
        { success: false, error: { code: 'BULK_UPDATE_ERROR', message: 'Failed to bulk update' } },
        500
      )
    }
  }
)

// Helper: Get company code for client
async function getCompanyCodeForClient(pensionTypeId: string | null): Promise<string | null> {
  if (!pensionTypeId) return null

  const result = await db
    .select({ companyCode: companies.code })
    .from(pensionTypes)
    .innerJoin(companies, eq(pensionTypes.companyId, companies.id))
    .where(eq(pensionTypes.id, pensionTypeId))
    .limit(1)

  return result[0]?.companyCode ?? null
}
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/status/__tests__/update.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/status/
git commit -m "feat: add status update API with workflow validation"
```

---

## Task 6: Create Status History API

**Files:**
- Create: `src/server/api/routes/status/history.ts`

**Step 1: Create status history route**

Create: `src/server/api/routes/status/history.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  getStatusHistory,
  getClientStatusHistory,
  getClientPeriodStatusWithDetails,
} from '@/server/db/queries/status'
import type { Period } from '@/lib/status/types'

const periodQuerySchema = z.object({
  type: z.enum(['monthly', 'quarterly']),
  year: z.coerce.number().min(2020).max(2100),
  month: z.coerce.number().min(1).max(12).optional(),
  quarter: z.coerce.number().min(1).max(4).optional(),
})

export const statusHistoryRoute = new Hono()

// Get status for a specific client and period
statusHistoryRoute.get(
  '/client/:clientId',
  zValidator('query', periodQuerySchema),
  async (c) => {
    try {
      const clientId = c.req.param('clientId')
      const query = c.req.valid('query')

      const period: Period = {
        type: query.type,
        year: query.year,
        month: query.month,
        quarter: query.quarter,
      }

      const status = await getClientPeriodStatusWithDetails(clientId, period)

      if (!status) {
        return c.json({
          success: true,
          data: null,
          message: 'No status found for this period',
        })
      }

      return c.json({
        success: true,
        data: status,
      })
    } catch (error) {
      console.error('Error fetching client status:', error)
      return c.json(
        { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch status' } },
        500
      )
    }
  }
)

// Get all status history for a client
statusHistoryRoute.get('/client/:clientId/all', async (c) => {
  try {
    const clientId = c.req.param('clientId')
    const limit = parseInt(c.req.query('limit') ?? '100', 10)

    const history = await getClientStatusHistory(clientId, limit)

    return c.json({
      success: true,
      data: history,
    })
  } catch (error) {
    console.error('Error fetching status history:', error)
    return c.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch history' } },
      500
    )
  }
})

// Get event history for a specific period status
statusHistoryRoute.get('/period/:periodStatusId/events', async (c) => {
  try {
    const periodStatusId = c.req.param('periodStatusId')
    const limit = parseInt(c.req.query('limit') ?? '50', 10)

    const events = await getStatusHistory(periodStatusId, limit)

    return c.json({
      success: true,
      data: events,
    })
  } catch (error) {
    console.error('Error fetching status events:', error)
    return c.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch events' } },
      500
    )
  }
})
```

**Step 2: Commit**

```bash
git add src/server/api/routes/status/history.ts
git commit -m "feat: add status history API endpoints"
```

---

## Task 7: Create Dashboard Summary API

**Files:**
- Create: `src/server/api/routes/status/summary.ts`

**Step 1: Create dashboard summary route**

Create: `src/server/api/routes/status/summary.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  getStatusSummary,
  getStatusSummaryByPensionType,
  getStatusTypesForCompany,
  getStatusReasonsForType,
} from '@/server/db/queries/status'
import { getUserBranchFilter } from '@/lib/territories'
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache'
import type { Period } from '@/lib/status/types'

const summaryQuerySchema = z.object({
  company: z.enum(['FCASH', 'PCNI']),
  type: z.enum(['monthly', 'quarterly']),
  year: z.coerce.number().min(2020).max(2100),
  month: z.coerce.number().min(1).max(12).optional(),
  quarter: z.coerce.number().min(1).max(4).optional(),
})

export const statusSummaryRoute = new Hono()

// Get dashboard summary (counts by status)
statusSummaryRoute.get(
  '/',
  zValidator('query', summaryQuerySchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const query = c.req.valid('query')

      // Get user's branch filter
      const { scope, branchIds } = await getUserBranchFilter(userId, 'status:read')

      if (scope === 'none') {
        return c.json({
          success: true,
          data: { summary: [], total: 0 },
        })
      }

      const period: Period = {
        type: query.type,
        year: query.year,
        month: query.month,
        quarter: query.quarter,
      }

      // Try cache first
      const cacheKey = cacheKeys.dashboardSummary(query.company, query.year, query.month ?? query.quarter ?? 0)
      const cached = await cache.get(cacheKey)
      if (cached && scope === 'all') {
        return c.json({ success: true, data: cached })
      }

      const summary = await getStatusSummary(
        query.company,
        period,
        scope === 'territory' ? branchIds : undefined
      )

      const total = summary.reduce((acc, s) => acc + s.count, 0)

      const result = { summary, total }

      // Cache only for admin users (all scope)
      if (scope === 'all') {
        await cache.set(cacheKey, result, CACHE_TTL.DASHBOARD)
      }

      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('Error fetching summary:', error)
      return c.json(
        { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch summary' } },
        500
      )
    }
  }
)

// Get summary by pension type (detailed breakdown)
statusSummaryRoute.get(
  '/by-pension-type',
  zValidator('query', summaryQuerySchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const query = c.req.valid('query')

      const { scope, branchIds } = await getUserBranchFilter(userId, 'status:read')

      if (scope === 'none') {
        return c.json({
          success: true,
          data: [],
        })
      }

      const period: Period = {
        type: query.type,
        year: query.year,
        month: query.month,
        quarter: query.quarter,
      }

      const summary = await getStatusSummaryByPensionType(
        query.company,
        period,
        scope === 'territory' ? branchIds : undefined
      )

      // Group by pension type
      const grouped = summary.reduce(
        (acc, item) => {
          const key = item.pensionTypeCode ?? 'UNKNOWN'
          if (!acc[key]) {
            acc[key] = {
              pensionTypeId: item.pensionTypeId,
              pensionTypeCode: item.pensionTypeCode,
              pensionTypeName: item.pensionTypeName,
              statuses: [],
              total: 0,
            }
          }
          acc[key].statuses.push({
            statusCode: item.statusCode,
            statusName: item.statusName,
            count: item.count,
          })
          acc[key].total += item.count
          return acc
        },
        {} as Record<string, any>
      )

      return c.json({
        success: true,
        data: Object.values(grouped),
      })
    } catch (error) {
      console.error('Error fetching summary by pension type:', error)
      return c.json(
        { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch summary' } },
        500
      )
    }
  }
)

// Get available status types for a company
statusSummaryRoute.get('/types/:company', async (c) => {
  try {
    const company = c.req.param('company')

    if (company !== 'FCASH' && company !== 'PCNI') {
      return c.json(
        { success: false, error: { code: 'INVALID_COMPANY', message: 'Invalid company code' } },
        400
      )
    }

    const types = await getStatusTypesForCompany(company)

    return c.json({
      success: true,
      data: types,
    })
  } catch (error) {
    console.error('Error fetching status types:', error)
    return c.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch status types' } },
      500
    )
  }
})

// Get reasons for a status type
statusSummaryRoute.get('/reasons/:statusTypeId', async (c) => {
  try {
    const statusTypeId = c.req.param('statusTypeId')
    const reasons = await getStatusReasonsForType(statusTypeId)

    return c.json({
      success: true,
      data: reasons,
    })
  } catch (error) {
    console.error('Error fetching reasons:', error)
    return c.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch reasons' } },
      500
    )
  }
})
```

**Step 2: Commit**

```bash
git add src/server/api/routes/status/summary.ts
git commit -m "feat: add dashboard summary API with caching"
```

---

## Task 8: Wire Up Status Routes

**Files:**
- Create: `src/server/api/routes/status/index.ts`
- Modify: `src/server/api/index.ts`

**Step 1: Create status routes index**

Create: `src/server/api/routes/status/index.ts`

```typescript
import { Hono } from 'hono'
import { statusUpdateRoute } from './update'
import { statusHistoryRoute } from './history'
import { statusSummaryRoute } from './summary'

export const statusRoutes = new Hono()

// Update endpoints
statusRoutes.route('/update', statusUpdateRoute)

// History endpoints
statusRoutes.route('/history', statusHistoryRoute)

// Summary/dashboard endpoints
statusRoutes.route('/summary', statusSummaryRoute)
```

**Step 2: Update API index**

Modify: `src/server/api/index.ts` - Add status routes:

```typescript
// Add import
import { statusRoutes } from './routes/status'

// Add route (after clients)
app.route('/status', statusRoutes)
```

**Step 3: Run all tests**

Run: `cd client-updater-version-2 && pnpm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/server/api/routes/status/index.ts src/server/api/index.ts
git commit -m "feat: wire up status routes in API"
```

---

## Task 9: Create Status Feature Module

**Files:**
- Create: `src/features/status/types.ts`
- Create: `src/features/status/stores/status-store.ts`
- Create: `src/features/status/hooks/use-status.ts`
- Create: `src/features/status/index.ts`

**Step 1: Create status feature types**

Create: `src/features/status/types.ts`

```typescript
export interface StatusType {
  id: string
  code: string
  name: string
  sequence: number
}

export interface StatusReason {
  id: string
  code: string
  name: string
  isTerminal: boolean
  requiresRemarks: boolean
}

export interface ClientPeriodStatus {
  id: string
  clientId: string
  periodType: 'monthly' | 'quarterly'
  periodMonth: number | null
  periodQuarter: number | null
  periodYear: number
  statusTypeId: string | null
  reasonId: string | null
  remarks: string | null
  hasPayment: boolean
  updateCount: number
  isTerminal: boolean
  updatedAt: string
}

export interface StatusWithDetails {
  status: ClientPeriodStatus
  statusType: StatusType | null
  reason: StatusReason | null
}

export interface StatusEvent {
  id: string
  statusTypeId: string | null
  reasonId: string | null
  remarks: string | null
  hasPayment: boolean
  eventSequence: number
  createdBy: string | null
  createdAt: string
}

export interface StatusSummaryItem {
  statusTypeId: string | null
  statusCode: string | null
  statusName: string | null
  count: number
}

export interface StatusSummary {
  summary: StatusSummaryItem[]
  total: number
}

export interface PensionTypeSummary {
  pensionTypeId: string
  pensionTypeCode: string
  pensionTypeName: string
  statuses: { statusCode: string; statusName: string; count: number }[]
  total: number
}

export interface Period {
  type: 'monthly' | 'quarterly'
  year: number
  month?: number
  quarter?: number
}

export interface StatusUpdateInput {
  clientId: string
  period: Period
  statusCode: string
  reasonId?: string
  remarks?: string
  hasPayment?: boolean
}

export type CompanyCode = 'FCASH' | 'PCNI'
```

**Step 2: Create status store**

Create: `src/features/status/stores/status-store.ts`

```typescript
import { create } from 'zustand'
import type { Period, CompanyCode, StatusSummary } from '../types'

interface StatusState {
  // Current period selection
  company: CompanyCode
  period: Period

  // Dashboard data
  summary: StatusSummary | null
  isLoadingSummary: boolean

  // Actions
  setCompany: (company: CompanyCode) => void
  setPeriod: (period: Period) => void
  setSummary: (summary: StatusSummary | null) => void
  setLoadingSummary: (loading: boolean) => void
}

const getCurrentMonthlyPeriod = (): Period => {
  const now = new Date()
  return {
    type: 'monthly',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

export const useStatusStore = create<StatusState>((set) => ({
  company: 'FCASH',
  period: getCurrentMonthlyPeriod(),
  summary: null,
  isLoadingSummary: false,

  setCompany: (company) => set({ company }),
  setPeriod: (period) => set({ period }),
  setSummary: (summary) => set({ summary }),
  setLoadingSummary: (loading) => set({ isLoadingSummary: loading }),
}))
```

**Step 3: Create status hooks**

Create: `src/features/status/hooks/use-status.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  StatusType,
  StatusReason,
  StatusSummary,
  PensionTypeSummary,
  StatusWithDetails,
  StatusEvent,
  Period,
  StatusUpdateInput,
  CompanyCode,
} from '../types'

const API_BASE = '/api/status'

// Build period query string
function buildPeriodQuery(period: Period, company: CompanyCode): string {
  const params = new URLSearchParams()
  params.set('company', company)
  params.set('type', period.type)
  params.set('year', String(period.year))
  if (period.month) params.set('month', String(period.month))
  if (period.quarter) params.set('quarter', String(period.quarter))
  return params.toString()
}

// Fetch dashboard summary
export function useStatusSummary(company: CompanyCode, period: Period) {
  const query = buildPeriodQuery(period, company)

  return useQuery<{ success: boolean; data: StatusSummary }>({
    queryKey: ['status-summary', company, period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/summary?${query}`)
      if (!res.ok) throw new Error('Failed to fetch summary')
      return res.json()
    },
  })
}

// Fetch summary by pension type
export function useStatusSummaryByPensionType(company: CompanyCode, period: Period) {
  const query = buildPeriodQuery(period, company)

  return useQuery<{ success: boolean; data: PensionTypeSummary[] }>({
    queryKey: ['status-summary-pension', company, period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/summary/by-pension-type?${query}`)
      if (!res.ok) throw new Error('Failed to fetch summary')
      return res.json()
    },
  })
}

// Fetch status types for company
export function useStatusTypes(company: CompanyCode) {
  return useQuery<{ success: boolean; data: StatusType[] }>({
    queryKey: ['status-types', company],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/summary/types/${company}`)
      if (!res.ok) throw new Error('Failed to fetch status types')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch reasons for status type
export function useStatusReasons(statusTypeId: string | null) {
  return useQuery<{ success: boolean; data: StatusReason[] }>({
    queryKey: ['status-reasons', statusTypeId],
    queryFn: async () => {
      if (!statusTypeId) return { success: true, data: [] }
      const res = await fetch(`${API_BASE}/summary/reasons/${statusTypeId}`)
      if (!res.ok) throw new Error('Failed to fetch reasons')
      return res.json()
    },
    enabled: !!statusTypeId,
  })
}

// Fetch client status for period
export function useClientStatus(clientId: string | null, period: Period) {
  return useQuery<{ success: boolean; data: StatusWithDetails | null }>({
    queryKey: ['client-status', clientId, period],
    queryFn: async () => {
      if (!clientId) throw new Error('No client ID')
      const params = new URLSearchParams()
      params.set('type', period.type)
      params.set('year', String(period.year))
      if (period.month) params.set('month', String(period.month))
      if (period.quarter) params.set('quarter', String(period.quarter))
      const res = await fetch(`${API_BASE}/history/client/${clientId}?${params}`)
      if (!res.ok) throw new Error('Failed to fetch client status')
      return res.json()
    },
    enabled: !!clientId,
  })
}

// Fetch client status history
export function useClientStatusHistory(clientId: string | null) {
  return useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['client-status-history', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('No client ID')
      const res = await fetch(`${API_BASE}/history/client/${clientId}/all`)
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json()
    },
    enabled: !!clientId,
  })
}

// Update status mutation
export function useUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: StatusUpdateInput) => {
      const res = await fetch(`${API_BASE}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update status')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['status-summary'] })
      queryClient.invalidateQueries({ queryKey: ['client-status', variables.clientId] })
      queryClient.invalidateQueries({ queryKey: ['client-status-history', variables.clientId] })
    },
  })
}

// Bulk update mutation
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      clientIds: string[]
      period: Period
      statusCode: string
      reasonId?: string
      remarks?: string
    }) => {
      const res = await fetch(`${API_BASE}/update/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to bulk update')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-summary'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
```

**Step 4: Create feature index**

Create: `src/features/status/index.ts`

```typescript
// Types
export * from './types'

// Store
export { useStatusStore } from './stores/status-store'

// Hooks
export {
  useStatusSummary,
  useStatusSummaryByPensionType,
  useStatusTypes,
  useStatusReasons,
  useClientStatus,
  useClientStatusHistory,
  useUpdateStatus,
  useBulkUpdateStatus,
} from './hooks/use-status'
```

**Step 5: Commit**

```bash
git add src/features/status/
git commit -m "feat: add status feature module with store and hooks"
```

---

## Task 10: Create Period Selector Component

**Files:**
- Create: `src/components/shared/period-selector.tsx`

**Step 1: Create period selector component**

Create: `src/components/shared/period-selector.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  getAvailableYears,
  getAvailableMonths,
  getAvailableQuarters,
  formatPeriod,
  getCurrentPeriod,
} from '@/lib/status'
import type { Period, PeriodType } from '@/lib/status/types'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
  allowedTypes?: PeriodType[]
  className?: string
}

export function PeriodSelector({
  value,
  onChange,
  allowedTypes = ['monthly', 'quarterly'],
  className,
}: PeriodSelectorProps) {
  const years = getAvailableYears()
  const months = getAvailableMonths()
  const quarters = getAvailableQuarters()

  const handleTypeChange = (type: PeriodType) => {
    const newPeriod = getCurrentPeriod(type)
    newPeriod.year = value.year
    onChange(newPeriod)
  }

  const handleYearChange = (year: number) => {
    onChange({ ...value, year })
  }

  const handleMonthChange = (month: number) => {
    onChange({ ...value, month, quarter: undefined })
  }

  const handleQuarterChange = (quarter: number) => {
    onChange({ ...value, quarter, month: undefined })
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Period Type Toggle */}
      {allowedTypes.length > 1 && (
        <div className="flex rounded-md border">
          {allowedTypes.includes('monthly') && (
            <Button
              variant={value.type === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTypeChange('monthly')}
              className="rounded-r-none"
            >
              Monthly
            </Button>
          )}
          {allowedTypes.includes('quarterly') && (
            <Button
              variant={value.type === 'quarterly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTypeChange('quarterly')}
              className="rounded-l-none"
            >
              Quarterly
            </Button>
          )}
        </div>
      )}

      {/* Year Selector */}
      <select
        value={value.year}
        onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
        className="px-3 py-2 border rounded-md bg-background"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Month Selector (for monthly) */}
      {value.type === 'monthly' && (
        <select
          value={value.month ?? 1}
          onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
          className="px-3 py-2 border rounded-md bg-background"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {/* Quarter Selector (for quarterly) */}
      {value.type === 'quarterly' && (
        <select
          value={value.quarter ?? 1}
          onChange={(e) => handleQuarterChange(parseInt(e.target.value, 10))}
          className="px-3 py-2 border rounded-md bg-background"
        >
          {quarters.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      )}

      {/* Current Period Display */}
      <span className="text-sm text-muted-foreground ml-2">
        {formatPeriod(value)}
      </span>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/shared/period-selector.tsx
git commit -m "feat: add period selector component"
```

---

## Task 11: Create Status Update Dialog

**Files:**
- Create: `src/features/status/components/status-update-dialog.tsx`
- Create: `src/features/status/components/status-badge.tsx`

**Step 1: Create status badge component**

Create: `src/features/status/components/status-badge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  code: string | null
  name?: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-500',
  TO_FOLLOW: 'bg-yellow-500',
  CALLED: 'bg-blue-500',
  VISITED: 'bg-purple-500',
  UPDATED: 'bg-green-500',
  DONE: 'bg-emerald-600',
}

export function StatusBadge({ code, name }: StatusBadgeProps) {
  if (!code) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No Status
      </Badge>
    )
  }

  const colorClass = STATUS_COLORS[code] ?? 'bg-gray-500'

  return (
    <Badge className={`${colorClass} text-white`}>
      {name ?? code}
    </Badge>
  )
}
```

**Step 2: Create status update dialog**

Create: `src/features/status/components/status-update-dialog.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  useStatusTypes,
  useStatusReasons,
  useUpdateStatus,
  useClientStatus,
} from '../hooks/use-status'
import { StatusBadge } from './status-badge'
import type { Period, CompanyCode } from '../types'

interface StatusUpdateDialogProps {
  clientId: string
  clientName: string
  company: CompanyCode
  period: Period
  onClose: () => void
  onSuccess?: () => void
}

export function StatusUpdateDialog({
  clientId,
  clientName,
  company,
  period,
  onClose,
  onSuccess,
}: StatusUpdateDialogProps) {
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null)
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [hasPayment, setHasPayment] = useState(false)

  const { data: statusTypesData } = useStatusTypes(company)
  const { data: currentStatusData } = useClientStatus(clientId, period)
  const { data: reasonsData } = useStatusReasons(selectedStatusId)
  const updateStatus = useUpdateStatus()

  const statusTypes = statusTypesData?.data ?? []
  const reasons = reasonsData?.data ?? []
  const currentStatus = currentStatusData?.data

  // Find selected status type
  const selectedStatusType = statusTypes.find((s) => s.id === selectedStatusId)

  // Check if reason is required
  const selectedReason = reasons.find((r) => r.id === selectedReasonId)
  const requiresRemarks = selectedReason?.requiresRemarks ?? false

  const handleSubmit = async () => {
    if (!selectedStatusType) return

    if (requiresRemarks && !remarks.trim()) {
      alert('Remarks are required for this reason')
      return
    }

    try {
      await updateStatus.mutateAsync({
        clientId,
        period,
        statusCode: selectedStatusType.code,
        reasonId: selectedReasonId ?? undefined,
        remarks: remarks.trim() || undefined,
        hasPayment,
      })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">Update Status</h2>
            <p className="text-muted-foreground">{clientName}</p>
          </div>

          {/* Current Status */}
          {currentStatus && (
            <div>
              <label className="text-sm text-muted-foreground">Current Status</label>
              <div className="mt-1">
                <StatusBadge
                  code={currentStatus.statusType?.code ?? null}
                  name={currentStatus.statusType?.name}
                />
              </div>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="text-sm font-medium">New Status</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {statusTypes.map((status) => (
                <Button
                  key={status.id}
                  variant={selectedStatusId === status.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedStatusId(status.id)
                    setSelectedReasonId(null)
                  }}
                  className="justify-start"
                >
                  {status.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Reason Selection */}
          {selectedStatusId && reasons.length > 0 && (
            <div>
              <label className="text-sm font-medium">Reason</label>
              <select
                value={selectedReasonId ?? ''}
                onChange={(e) => setSelectedReasonId(e.target.value || null)}
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="">Select a reason...</option>
                {reasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                    {reason.isTerminal && ' (Terminal)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="text-sm font-medium">
              Remarks {requiresRemarks && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              className="w-full mt-2 px-3 py-2 border rounded-md h-24 resize-none"
            />
          </div>

          {/* Has Payment */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasPayment"
              checked={hasPayment}
              onChange={(e) => setHasPayment(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="hasPayment" className="text-sm">
              Payment received this period
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedStatusId || updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/features/status/components/
git commit -m "feat: add status badge and update dialog components"
```

---

## Task 12: Create FCASH Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/fcash/page.tsx`
- Create: `src/features/status/components/dashboard-summary.tsx`

**Step 1: Create dashboard summary component**

Create: `src/features/status/components/dashboard-summary.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { StatusBadge } from './status-badge'
import { useStatusSummary, useStatusSummaryByPensionType } from '../hooks/use-status'
import type { Period, CompanyCode } from '../types'

interface DashboardSummaryProps {
  company: CompanyCode
  period: Period
}

export function DashboardSummary({ company, period }: DashboardSummaryProps) {
  const { data: summaryData, isLoading } = useStatusSummary(company, period)
  const { data: byPensionData } = useStatusSummaryByPensionType(company, period)

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center">Loading summary...</div>
      </Card>
    )
  }

  const summary = summaryData?.data?.summary ?? []
  const total = summaryData?.data?.total ?? 0
  const byPension = byPensionData?.data ?? []

  return (
    <div className="space-y-6">
      {/* Total Count */}
      <Card className="p-6">
        <div className="text-center">
          <div className="text-4xl font-bold">{total.toLocaleString()}</div>
          <div className="text-muted-foreground">Total Clients</div>
        </div>
      </Card>

      {/* Status Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summary.map((item) => (
          <Card key={item.statusCode ?? 'unknown'} className="p-4">
            <div className="flex flex-col items-center gap-2">
              <StatusBadge code={item.statusCode} name={item.statusName} />
              <div className="text-2xl font-bold">{item.count.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* By Pension Type */}
      {byPension.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">By Pension Type</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Pension Type</th>
                  {summary.map((s) => (
                    <th key={s.statusCode} className="px-4 py-2 text-center text-sm">
                      {s.statusName}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byPension.map((pt) => (
                  <tr key={pt.pensionTypeCode}>
                    <td className="px-4 py-2 font-medium">{pt.pensionTypeName}</td>
                    {summary.map((s) => {
                      const count = pt.statuses.find(
                        (x) => x.statusCode === s.statusCode
                      )?.count ?? 0
                      return (
                        <td key={s.statusCode} className="px-4 py-2 text-center">
                          {count > 0 ? count.toLocaleString() : '-'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-center font-semibold">
                      {pt.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Create FCASH dashboard page**

Create: `src/app/(dashboard)/dashboard/fcash/page.tsx`

```typescript
'use client'

import { useStatusStore } from '@/features/status'
import { PeriodSelector } from '@/components/shared/period-selector'
import { DashboardSummary } from '@/features/status/components/dashboard-summary'
import type { Period } from '@/features/status/types'

export default function FcashDashboardPage() {
  const { period, setPeriod } = useStatusStore()

  // FCASH is always monthly
  const fcashPeriod: Period = {
    ...period,
    type: 'monthly',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FCASH Dashboard</h1>
          <p className="text-muted-foreground">
            Client status tracking for FCASH
          </p>
        </div>

        <PeriodSelector
          value={fcashPeriod}
          onChange={(p) => setPeriod({ ...p, type: 'monthly' })}
          allowedTypes={['monthly']}
        />
      </div>

      <DashboardSummary company="FCASH" period={fcashPeriod} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/fcash/ src/features/status/components/dashboard-summary.tsx
git commit -m "feat: add FCASH dashboard page with summary"
```

---

## Task 13: Create PCNI Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/pcni/page.tsx`

**Step 1: Create PCNI dashboard page**

Create: `src/app/(dashboard)/dashboard/pcni/page.tsx`

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useStatusStore } from '@/features/status'
import { PeriodSelector } from '@/components/shared/period-selector'
import { DashboardSummary } from '@/features/status/components/dashboard-summary'
import { Button } from '@/components/ui/button'
import type { Period, PeriodType } from '@/features/status/types'

export default function PcniDashboardPage() {
  const searchParams = useSearchParams()
  const isPnp = searchParams.get('type') === 'pnp'

  const { period, setPeriod } = useStatusStore()

  // PNP is quarterly, non-PNP is monthly
  const periodType: PeriodType = isPnp ? 'quarterly' : 'monthly'

  const pcniPeriod: Period = {
    ...period,
    type: periodType,
    month: periodType === 'monthly' ? period.month : undefined,
    quarter: periodType === 'quarterly' ? period.quarter : undefined,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PCNI Dashboard</h1>
          <p className="text-muted-foreground">
            Client status tracking for PCNI {isPnp ? '(PNP - Quarterly)' : '(Non-PNP - Monthly)'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* PNP/Non-PNP Toggle */}
          <div className="flex rounded-md border">
            <a href="/dashboard/pcni">
              <Button
                variant={!isPnp ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
              >
                Non-PNP
              </Button>
            </a>
            <a href="/dashboard/pcni?type=pnp">
              <Button
                variant={isPnp ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
              >
                PNP
              </Button>
            </a>
          </div>

          <PeriodSelector
            value={pcniPeriod}
            onChange={(p) => setPeriod(p)}
            allowedTypes={[periodType]}
          />
        </div>
      </div>

      <DashboardSummary company="PCNI" period={pcniPeriod} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/pcni/
git commit -m "feat: add PCNI dashboard page with PNP toggle"
```

---

## Summary

Phase 4: Status Tracking covers 13 tasks:

**Backend (Tasks 1-8)**
- Status schema with Drizzle (period status, events)
- Status workflow service (company-specific rules)
- Status queries (CRUD, summary, history)
- Period initialization service
- Status update API with validation
- Status history API
- Dashboard summary API with caching
- Route wiring

**Frontend (Tasks 9-13)**
- Status feature module (types, store, hooks)
- Period selector component
- Status update dialog
- FCASH dashboard page
- PCNI dashboard page

**Total: 13 tasks**

---

## Execution Handoff

**Plan complete. Continuing with Phase 5...**
