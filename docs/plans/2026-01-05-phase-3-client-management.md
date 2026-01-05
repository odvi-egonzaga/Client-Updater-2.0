# Phase 3: Client Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build client data management system with Snowflake sync, client list/detail APIs, territory-based filtering, and client UI.

**Architecture:** Snowflake SDK for data warehouse queries, Drizzle ORM for PostgreSQL operations, background job queue for large syncs, territory-based access control for client visibility.

**Tech Stack:** Next.js 15, Hono, Drizzle ORM, Snowflake SDK, Zustand, TanStack Query, Zod, Vitest

**Reference:** See `docs/plans/2026-01-05-client-updater-v2-design.md` for full design document.

**Prerequisites:** Phase 0-1 (infrastructure + schema) and Phase 2 (user management) must be completed.

---

## Overview

Phase 3 implements client management features:

| Task | Description | Files |
|------|-------------|-------|
| 1 | Client queries with Drizzle | `src/server/db/queries/clients.ts` |
| 2 | Snowflake sync service | `src/lib/sync/snowflake-sync.ts` |
| 3 | Client sync job handler | `src/server/jobs/sync-clients.ts` |
| 4 | Client list API with filters | `src/server/api/routes/clients/list.ts` |
| 5 | Client detail API | `src/server/api/routes/clients/detail.ts` |
| 6 | Client search API | `src/server/api/routes/clients/search.ts` |
| 7 | Territory filter service | `src/lib/territories/filter.ts` |
| 8 | Sync job API | `src/server/api/routes/sync/` |
| 9 | Clients feature module | `src/features/clients/` |
| 10 | Client list page | `src/app/(dashboard)/clients/` |
| 11 | Client detail page | `src/app/(dashboard)/clients/[id]/` |
| 12 | Sync status UI | `src/features/sync/` |

---

## Task 1: Create Client Queries with Drizzle

**Files:**
- Create: `src/server/db/queries/clients.ts`
- Create: `src/server/db/queries/__tests__/clients.test.ts`

**Step 1: Write failing test for client queries**

Create: `src/server/db/queries/__tests__/clients.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database
vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  },
}))

describe('Client Queries', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export getClients function', async () => {
    const { getClients } = await import('../clients')
    expect(getClients).toBeDefined()
    expect(typeof getClients).toBe('function')
  })

  it('should export getClientById function', async () => {
    const { getClientById } = await import('../clients')
    expect(getClientById).toBeDefined()
    expect(typeof getClientById).toBe('function')
  })

  it('should export getClientByCode function', async () => {
    const { getClientByCode } = await import('../clients')
    expect(getClientByCode).toBeDefined()
    expect(typeof getClientByCode).toBe('function')
  })

  it('should export upsertClient function', async () => {
    const { upsertClient } = await import('../clients')
    expect(upsertClient).toBeDefined()
    expect(typeof upsertClient).toBe('function')
  })

  it('should export bulkUpsertClients function', async () => {
    const { bulkUpsertClients } = await import('../clients')
    expect(bulkUpsertClients).toBeDefined()
    expect(typeof bulkUpsertClients).toBe('function')
  })

  it('should export searchClients function', async () => {
    const { searchClients } = await import('../clients')
    expect(searchClients).toBeDefined()
    expect(typeof searchClients).toBe('function')
  })

  it('should export getClientWithDetails function', async () => {
    const { getClientWithDetails } = await import('../clients')
    expect(getClientWithDetails).toBeDefined()
    expect(typeof getClientWithDetails).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/clients.test.ts`
Expected: FAIL - functions not exported

**Step 3: Implement client queries**

Create: `src/server/db/queries/clients.ts`

```typescript
import { db } from '../index'
import {
  clients,
  clientPeriodStatus,
  clientSyncHistory,
  pensionTypes,
  pensionerTypes,
  products,
  branches,
  parStatuses,
  accountTypes,
  statusTypes,
  statusReasons,
} from '../schema'
import { eq, and, or, isNull, desc, asc, sql, ilike, inArray } from 'drizzle-orm'
import type { Client, NewClient } from '../schema/clients'

// Pagination interface
export interface ClientPaginationParams {
  page?: number
  pageSize?: number
  sortBy?: 'fullName' | 'clientCode' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

// Filter interface
export interface ClientFilterParams {
  branchIds?: string[]
  pensionTypeId?: string
  pensionerTypeId?: string
  productId?: string
  parStatusId?: string
  isActive?: boolean
  search?: string
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

// Get clients with pagination and filters
export async function getClients(
  pagination: ClientPaginationParams = {},
  filters: ClientFilterParams = {}
): Promise<PaginatedResult<Client>> {
  const { page = 1, pageSize = 25, sortBy = 'createdAt', sortOrder = 'desc' } = pagination
  const offset = (page - 1) * pageSize

  // Build where conditions
  const conditions = [isNull(clients.deletedAt)]

  if (filters.branchIds && filters.branchIds.length > 0) {
    conditions.push(inArray(clients.branchId, filters.branchIds))
  }
  if (filters.pensionTypeId) {
    conditions.push(eq(clients.pensionTypeId, filters.pensionTypeId))
  }
  if (filters.pensionerTypeId) {
    conditions.push(eq(clients.pensionerTypeId, filters.pensionerTypeId))
  }
  if (filters.productId) {
    conditions.push(eq(clients.productId, filters.productId))
  }
  if (filters.parStatusId) {
    conditions.push(eq(clients.parStatusId, filters.parStatusId))
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(clients.isActive, filters.isActive))
  }
  if (filters.search) {
    conditions.push(
      or(
        ilike(clients.fullName, `%${filters.search}%`),
        ilike(clients.clientCode, `%${filters.search}%`),
        ilike(clients.pensionNumber, `%${filters.search}%`)
      )!
    )
  }

  // Build sort
  const sortColumn = {
    fullName: clients.fullName,
    clientCode: clients.clientCode,
    createdAt: clients.createdAt,
    updatedAt: clients.updatedAt,
  }[sortBy]

  const orderFn = sortOrder === 'asc' ? asc : desc

  const [clientsData, countResult] = await Promise.all([
    db
      .select()
      .from(clients)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(and(...conditions)),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return {
    data: clientsData,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// Get client by ID
export async function getClientById(id: string): Promise<Client | null> {
  const result = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1)

  return result[0] ?? null
}

// Get client by code
export async function getClientByCode(clientCode: string): Promise<Client | null> {
  const result = await db
    .select()
    .from(clients)
    .where(and(eq(clients.clientCode, clientCode), isNull(clients.deletedAt)))
    .limit(1)

  return result[0] ?? null
}

// Get client with all related data
export async function getClientWithDetails(id: string) {
  const client = await db
    .select({
      client: clients,
      pensionType: pensionTypes,
      pensionerType: pensionerTypes,
      product: products,
      branch: branches,
      parStatus: parStatuses,
      accountType: accountTypes,
    })
    .from(clients)
    .leftJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
    .leftJoin(pensionerTypes, eq(clients.pensionerTypeId, pensionerTypes.id))
    .leftJoin(products, eq(clients.productId, products.id))
    .leftJoin(branches, eq(clients.branchId, branches.id))
    .leftJoin(parStatuses, eq(clients.parStatusId, parStatuses.id))
    .leftJoin(accountTypes, eq(clients.accountTypeId, accountTypes.id))
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1)

  if (!client[0]) return null

  // Get current period status
  const currentStatus = await db
    .select({
      status: clientPeriodStatus,
      statusType: statusTypes,
      reason: statusReasons,
    })
    .from(clientPeriodStatus)
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .leftJoin(statusReasons, eq(clientPeriodStatus.reasonId, statusReasons.id))
    .where(eq(clientPeriodStatus.clientId, id))
    .orderBy(desc(clientPeriodStatus.periodYear), desc(clientPeriodStatus.periodMonth))
    .limit(1)

  return {
    ...client[0].client,
    pensionType: client[0].pensionType,
    pensionerType: client[0].pensionerType,
    product: client[0].product,
    branch: client[0].branch,
    parStatus: client[0].parStatus,
    accountType: client[0].accountType,
    currentStatus: currentStatus[0] ?? null,
  }
}

// Search clients (fast search for autocomplete)
export async function searchClients(
  query: string,
  branchIds?: string[],
  limit = 10
): Promise<Pick<Client, 'id' | 'clientCode' | 'fullName' | 'pensionNumber'>[]> {
  const conditions = [
    isNull(clients.deletedAt),
    or(
      ilike(clients.fullName, `%${query}%`),
      ilike(clients.clientCode, `%${query}%`),
      ilike(clients.pensionNumber, `%${query}%`)
    )!,
  ]

  if (branchIds && branchIds.length > 0) {
    conditions.push(inArray(clients.branchId, branchIds))
  }

  return db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      pensionNumber: clients.pensionNumber,
    })
    .from(clients)
    .where(and(...conditions))
    .limit(limit)
}

// Upsert single client (for sync)
export async function upsertClient(data: NewClient): Promise<Client> {
  const result = await db
    .insert(clients)
    .values(data)
    .onConflictDoUpdate({
      target: clients.clientCode,
      set: {
        fullName: data.fullName,
        pensionNumber: data.pensionNumber,
        birthDate: data.birthDate,
        contactNumber: data.contactNumber,
        contactNumberAlt: data.contactNumberAlt,
        pensionTypeId: data.pensionTypeId,
        pensionerTypeId: data.pensionerTypeId,
        productId: data.productId,
        branchId: data.branchId,
        parStatusId: data.parStatusId,
        accountTypeId: data.accountTypeId,
        pastDueAmount: data.pastDueAmount,
        loanStatus: data.loanStatus,
        isActive: data.isActive,
        lastSyncedAt: new Date(),
        syncSource: data.syncSource,
        updatedAt: new Date(),
      },
    })
    .returning()

  return result[0]
}

// Bulk upsert clients (for batch sync)
export async function bulkUpsertClients(
  dataList: NewClient[]
): Promise<{ created: number; updated: number }> {
  if (dataList.length === 0) {
    return { created: 0, updated: 0 }
  }

  // Get existing client codes
  const existingCodes = await db
    .select({ clientCode: clients.clientCode })
    .from(clients)
    .where(inArray(clients.clientCode, dataList.map((d) => d.clientCode)))

  const existingSet = new Set(existingCodes.map((e) => e.clientCode))

  // Split into creates and updates
  const toCreate = dataList.filter((d) => !existingSet.has(d.clientCode))
  const toUpdate = dataList.filter((d) => existingSet.has(d.clientCode))

  // Batch insert new records
  if (toCreate.length > 0) {
    await db.insert(clients).values(toCreate)
  }

  // Batch update existing records
  for (const data of toUpdate) {
    await db
      .update(clients)
      .set({
        fullName: data.fullName,
        pensionNumber: data.pensionNumber,
        birthDate: data.birthDate,
        contactNumber: data.contactNumber,
        contactNumberAlt: data.contactNumberAlt,
        pensionTypeId: data.pensionTypeId,
        pensionerTypeId: data.pensionerTypeId,
        productId: data.productId,
        branchId: data.branchId,
        parStatusId: data.parStatusId,
        accountTypeId: data.accountTypeId,
        pastDueAmount: data.pastDueAmount,
        loanStatus: data.loanStatus,
        isActive: data.isActive,
        lastSyncedAt: new Date(),
        syncSource: data.syncSource,
        updatedAt: new Date(),
      })
      .where(eq(clients.clientCode, data.clientCode))
  }

  return {
    created: toCreate.length,
    updated: toUpdate.length,
  }
}

// Record sync history for field changes
export async function recordClientSyncChange(
  clientId: string,
  fieldChanged: string,
  oldValue: string | null,
  newValue: string | null,
  syncJobId?: string
): Promise<void> {
  await db.insert(clientSyncHistory).values({
    clientId,
    fieldChanged,
    oldValue,
    newValue,
    syncJobId,
  })
}

// Get client sync history
export async function getClientSyncHistory(clientId: string, limit = 50) {
  return db
    .select()
    .from(clientSyncHistory)
    .where(eq(clientSyncHistory.clientId, clientId))
    .orderBy(desc(clientSyncHistory.changedAt))
    .limit(limit)
}

// Count clients by status for dashboard
export async function countClientsByStatus(
  branchIds: string[],
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number
) {
  const conditions = [eq(clientPeriodStatus.periodYear, periodYear)]

  if (periodMonth) {
    conditions.push(eq(clientPeriodStatus.periodMonth, periodMonth))
  }
  if (periodQuarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, periodQuarter))
  }

  // Join with clients to filter by branch
  const result = await db
    .select({
      statusTypeId: clientPeriodStatus.statusTypeId,
      count: sql<number>`count(*)`,
    })
    .from(clientPeriodStatus)
    .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
    .where(
      and(
        ...conditions,
        branchIds.length > 0 ? inArray(clients.branchId, branchIds) : undefined
      )
    )
    .groupBy(clientPeriodStatus.statusTypeId)

  return result
}
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/db/queries/__tests__/clients.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/queries/clients.ts src/server/db/queries/__tests__/clients.test.ts
git commit -m "feat: add comprehensive client query functions"
```

---

## Task 2: Create Snowflake Sync Service

**Files:**
- Create: `src/lib/sync/snowflake-sync.ts`
- Create: `src/lib/sync/types.ts`
- Create: `src/lib/sync/__tests__/snowflake-sync.test.ts`

**Step 1: Create sync types**

Create: `src/lib/sync/types.ts`

```typescript
// Raw data from Snowflake
export interface SnowflakeClientRecord {
  CLIENT_CODE: string
  FULL_NAME: string
  PENSION_NUMBER: string | null
  BIRTH_DATE: string | null
  CONTACT_NUMBER: string | null
  CONTACT_NUMBER_ALT: string | null
  PENSION_TYPE: string // Code like 'SSS', 'GSIS'
  PENSIONER_TYPE: string | null // Code like 'RETIREE', 'DEPENDENT'
  PRODUCT: string | null // Code like 'FCASH_SSS'
  BRANCH_CODE: string
  PAR_STATUS: string | null // Code like 'tele_130'
  ACCOUNT_TYPE: string | null // Code like 'ATM', 'PASSBOOK'
  PAST_DUE_AMOUNT: number | null
  LOAN_STATUS: string | null
  IS_ACTIVE: boolean
}

// Sync job status
export interface SyncJobProgress {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  startedAt: Date | null
  completedAt: Date | null
  error: string | null
}

// Sync options
export interface SyncOptions {
  batchSize?: number
  dryRun?: boolean
  branchCodes?: string[] // Only sync specific branches
  fullSync?: boolean // Sync all records, not just changed
}

// Lookup cache for mapping codes to IDs
export interface LookupCache {
  pensionTypes: Map<string, string>
  pensionerTypes: Map<string, string>
  products: Map<string, string>
  branches: Map<string, string>
  parStatuses: Map<string, string>
  accountTypes: Map<string, string>
}
```

**Step 2: Write failing test for Snowflake sync service**

Create: `src/lib/sync/__tests__/snowflake-sync.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Snowflake client
vi.mock('@/lib/snowflake/client', () => ({
  snowflakeClient: {
    query: vi.fn().mockResolvedValue([
      {
        CLIENT_CODE: 'FC-001',
        FULL_NAME: 'John Doe',
        PENSION_NUMBER: 'PN-123',
        BRANCH_CODE: 'MNLA01',
        PENSION_TYPE: 'SSS',
        IS_ACTIVE: true,
      },
    ]),
  },
}))

// Mock database queries
vi.mock('@/server/db/queries/clients', () => ({
  bulkUpsertClients: vi.fn().mockResolvedValue({ created: 1, updated: 0 }),
}))

vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'job-123' }]),
  },
}))

describe('Snowflake Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export SnowflakeSyncService class', async () => {
    const { SnowflakeSyncService } = await import('../snowflake-sync')
    expect(SnowflakeSyncService).toBeDefined()
  })

  it('should export fetchClientsFromSnowflake function', async () => {
    const { fetchClientsFromSnowflake } = await import('../snowflake-sync')
    expect(fetchClientsFromSnowflake).toBeDefined()
  })

  it('should export syncClientsFromSnowflake function', async () => {
    const { syncClientsFromSnowflake } = await import('../snowflake-sync')
    expect(syncClientsFromSnowflake).toBeDefined()
  })

  it('should export buildLookupCache function', async () => {
    const { buildLookupCache } = await import('../snowflake-sync')
    expect(buildLookupCache).toBeDefined()
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/lib/sync/__tests__/snowflake-sync.test.ts`
Expected: FAIL - module not found

**Step 4: Create Snowflake sync service**

Create: `src/lib/sync/snowflake-sync.ts`

```typescript
import { snowflakeClient } from '@/lib/snowflake/client'
import { db } from '@/server/db'
import {
  syncJobs,
  pensionTypes,
  pensionerTypes,
  products,
  branches,
  parStatuses,
  accountTypes,
} from '@/server/db/schema'
import { bulkUpsertClients } from '@/server/db/queries/clients'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { circuits } from '@/lib/resilience'
import type {
  SnowflakeClientRecord,
  SyncJobProgress,
  SyncOptions,
  LookupCache,
} from './types'
import type { NewClient } from '@/server/db/schema/clients'

// SQL query to fetch clients from Snowflake
const FETCH_CLIENTS_SQL = `
SELECT
  CLIENT_CODE,
  FULL_NAME,
  PENSION_NUMBER,
  BIRTH_DATE,
  CONTACT_NUMBER,
  CONTACT_NUMBER_ALT,
  PENSION_TYPE,
  PENSIONER_TYPE,
  PRODUCT,
  BRANCH_CODE,
  PAR_STATUS,
  ACCOUNT_TYPE,
  PAST_DUE_AMOUNT,
  LOAN_STATUS,
  IS_ACTIVE
FROM CLIENT_UPDATER.CLIENTS_VIEW
WHERE 1=1
`

// Build lookup cache from database
export async function buildLookupCache(): Promise<LookupCache> {
  const [
    pensionTypesData,
    pensionerTypesData,
    productsData,
    branchesData,
    parStatusesData,
    accountTypesData,
  ] = await Promise.all([
    db.select({ id: pensionTypes.id, code: pensionTypes.code }).from(pensionTypes),
    db.select({ id: pensionerTypes.id, code: pensionerTypes.code }).from(pensionerTypes),
    db.select({ id: products.id, code: products.code }).from(products),
    db.select({ id: branches.id, code: branches.code }).from(branches),
    db.select({ id: parStatuses.id, code: parStatuses.code }).from(parStatuses),
    db.select({ id: accountTypes.id, code: accountTypes.code }).from(accountTypes),
  ])

  return {
    pensionTypes: new Map(pensionTypesData.map((p) => [p.code, p.id])),
    pensionerTypes: new Map(pensionerTypesData.map((p) => [p.code, p.id])),
    products: new Map(productsData.map((p) => [p.code, p.id])),
    branches: new Map(branchesData.map((b) => [b.code, b.id])),
    parStatuses: new Map(parStatusesData.map((p) => [p.code, p.id])),
    accountTypes: new Map(accountTypesData.map((a) => [a.code, a.id])),
  }
}

// Fetch clients from Snowflake
export async function fetchClientsFromSnowflake(
  options: SyncOptions = {}
): Promise<SnowflakeClientRecord[]> {
  let sql = FETCH_CLIENTS_SQL

  if (options.branchCodes && options.branchCodes.length > 0) {
    const branchList = options.branchCodes.map((c) => `'${c}'`).join(',')
    sql += ` AND BRANCH_CODE IN (${branchList})`
  }

  // Use circuit breaker for Snowflake calls
  return circuits.snowflake.execute(async () => {
    const results = await snowflakeClient.query<SnowflakeClientRecord>(sql)
    return results
  })
}

// Transform Snowflake record to database record
function transformRecord(
  record: SnowflakeClientRecord,
  cache: LookupCache
): NewClient | null {
  const branchId = cache.branches.get(record.BRANCH_CODE)
  if (!branchId) {
    logger.warn('Unknown branch code', { branchCode: record.BRANCH_CODE })
    return null
  }

  return {
    clientCode: record.CLIENT_CODE,
    fullName: record.FULL_NAME,
    pensionNumber: record.PENSION_NUMBER,
    birthDate: record.BIRTH_DATE ? new Date(record.BIRTH_DATE).toISOString().split('T')[0] : null,
    contactNumber: record.CONTACT_NUMBER,
    contactNumberAlt: record.CONTACT_NUMBER_ALT,
    pensionTypeId: record.PENSION_TYPE ? cache.pensionTypes.get(record.PENSION_TYPE) : undefined,
    pensionerTypeId: record.PENSIONER_TYPE ? cache.pensionerTypes.get(record.PENSIONER_TYPE) : undefined,
    productId: record.PRODUCT ? cache.products.get(record.PRODUCT) : undefined,
    branchId,
    parStatusId: record.PAR_STATUS ? cache.parStatuses.get(record.PAR_STATUS) : undefined,
    accountTypeId: record.ACCOUNT_TYPE ? cache.accountTypes.get(record.ACCOUNT_TYPE) : undefined,
    pastDueAmount: record.PAST_DUE_AMOUNT?.toString(),
    loanStatus: record.LOAN_STATUS,
    isActive: record.IS_ACTIVE,
    syncSource: 'snowflake',
    lastSyncedAt: new Date(),
  }
}

// Main sync function
export async function syncClientsFromSnowflake(
  options: SyncOptions = {},
  userId?: string
): Promise<SyncJobProgress> {
  const batchSize = options.batchSize ?? 500

  // Create sync job record
  const [job] = await db
    .insert(syncJobs)
    .values({
      type: 'snowflake',
      status: 'pending',
      parameters: options,
      createdBy: userId,
    })
    .returning()

  const progress: SyncJobProgress = {
    jobId: job.id,
    status: 'processing',
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    startedAt: new Date(),
    completedAt: null,
    error: null,
  }

  try {
    // Update job status to processing
    await db
      .update(syncJobs)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(syncJobs.id, job.id))

    logger.info('Starting Snowflake sync', { jobId: job.id, options })

    // Build lookup cache
    const cache = await buildLookupCache()

    // Fetch data from Snowflake
    const records = await fetchClientsFromSnowflake(options)
    logger.info('Fetched records from Snowflake', { count: records.length })

    // Transform records
    const transformed: NewClient[] = []
    for (const record of records) {
      const client = transformRecord(record, cache)
      if (client) {
        transformed.push(client)
      } else {
        progress.recordsFailed++
      }
      progress.recordsProcessed++
    }

    // Process in batches
    if (!options.dryRun) {
      for (let i = 0; i < transformed.length; i += batchSize) {
        const batch = transformed.slice(i, i + batchSize)
        const result = await bulkUpsertClients(batch)
        progress.recordsCreated += result.created
        progress.recordsUpdated += result.updated

        logger.info('Processed batch', {
          jobId: job.id,
          batch: Math.floor(i / batchSize) + 1,
          created: result.created,
          updated: result.updated,
        })
      }
    }

    // Update job as completed
    progress.status = 'completed'
    progress.completedAt = new Date()

    await db
      .update(syncJobs)
      .set({
        status: 'completed',
        recordsProcessed: progress.recordsProcessed,
        recordsCreated: progress.recordsCreated,
        recordsUpdated: progress.recordsUpdated,
        completedAt: progress.completedAt,
      })
      .where(eq(syncJobs.id, job.id))

    logger.info('Snowflake sync completed', {
      jobId: job.id,
      processed: progress.recordsProcessed,
      created: progress.recordsCreated,
      updated: progress.recordsUpdated,
      failed: progress.recordsFailed,
    })
  } catch (error) {
    progress.status = 'failed'
    progress.error = (error as Error).message
    progress.completedAt = new Date()

    await db
      .update(syncJobs)
      .set({
        status: 'failed',
        error: progress.error,
        completedAt: progress.completedAt,
      })
      .where(eq(syncJobs.id, job.id))

    logger.error('Snowflake sync failed', error as Error, { jobId: job.id })
  }

  return progress
}

// Sync service class for more control
export class SnowflakeSyncService {
  private cache: LookupCache | null = null

  async refreshCache(): Promise<void> {
    this.cache = await buildLookupCache()
  }

  async sync(options: SyncOptions = {}, userId?: string): Promise<SyncJobProgress> {
    return syncClientsFromSnowflake(options, userId)
  }

  async fetchPreview(options: SyncOptions = {}): Promise<{
    totalRecords: number
    sampleRecords: SnowflakeClientRecord[]
  }> {
    const records = await fetchClientsFromSnowflake(options)
    return {
      totalRecords: records.length,
      sampleRecords: records.slice(0, 10),
    }
  }
}
```

**Step 5: Create sync index**

Create: `src/lib/sync/index.ts`

```typescript
export * from './types'
export {
  SnowflakeSyncService,
  fetchClientsFromSnowflake,
  syncClientsFromSnowflake,
  buildLookupCache,
} from './snowflake-sync'
```

**Step 6: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/lib/sync/__tests__/snowflake-sync.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/sync/
git commit -m "feat: add Snowflake sync service with batch processing"
```

---

## Task 3: Create Territory Filter Service

**Files:**
- Create: `src/lib/territories/filter.ts`
- Create: `src/lib/territories/index.ts`
- Create: `src/lib/territories/__tests__/filter.test.ts`

**Step 1: Write failing test for territory filter**

Create: `src/lib/territories/__tests__/filter.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/db/queries/territories', () => ({
  getUserAccessibleBranches: vi.fn().mockResolvedValue([
    { id: 'branch-1', code: 'MNLA01', name: 'Manila 1' },
    { id: 'branch-2', code: 'MNLA02', name: 'Manila 2' },
  ]),
}))

vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
  cacheKeys: {
    userBranches: (id: string) => `user:${id}:branches`,
  },
  CACHE_TTL: {
    USER_PERMISSIONS: 300,
  },
}))

describe('Territory Filter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export getUserBranchIds function', async () => {
    const { getUserBranchIds } = await import('../filter')
    expect(getUserBranchIds).toBeDefined()
  })

  it('should export getUserBranchFilter function', async () => {
    const { getUserBranchFilter } = await import('../filter')
    expect(getUserBranchFilter).toBeDefined()
  })

  it('should return branch IDs for user', async () => {
    const { getUserBranchIds } = await import('../filter')
    const branchIds = await getUserBranchIds('user-123')
    expect(branchIds).toHaveLength(2)
    expect(branchIds).toContain('branch-1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/lib/territories/__tests__/filter.test.ts`
Expected: FAIL - module not found

**Step 3: Create territory filter service**

Create: `src/lib/territories/filter.ts`

```typescript
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache'
import { getUserAccessibleBranches } from '@/server/db/queries/territories'
import { getPermissionScope } from '@/lib/permissions'

// Get cached branch IDs for user
export async function getUserBranchIds(userId: string): Promise<string[]> {
  const cacheKey = cacheKeys.userBranches(userId)

  // Try cache first
  const cached = await cache.get<string[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from database
  const branches = await getUserAccessibleBranches(userId)
  const branchIds = branches.map((b) => b.id)

  // Cache the result
  await cache.set(cacheKey, branchIds, CACHE_TTL.USER_PERMISSIONS)

  return branchIds
}

// Get branch filter based on user's permission scope
export async function getUserBranchFilter(
  userId: string,
  permissionCode: string
): Promise<{
  scope: 'all' | 'territory' | 'none'
  branchIds: string[]
}> {
  const scope = await getPermissionScope(userId, permissionCode)

  if (!scope) {
    return { scope: 'none', branchIds: [] }
  }

  if (scope === 'all') {
    return { scope: 'all', branchIds: [] }
  }

  // For branch, area, or self scope, use territory
  const branchIds = await getUserBranchIds(userId)
  return { scope: 'territory', branchIds }
}

// Check if user can access a specific branch
export async function canAccessBranch(
  userId: string,
  branchId: string,
  permissionCode?: string
): Promise<boolean> {
  if (permissionCode) {
    const scope = await getPermissionScope(userId, permissionCode)
    if (scope === 'all') return true
    if (!scope) return false
  }

  const branchIds = await getUserBranchIds(userId)
  return branchIds.includes(branchId)
}

// Invalidate user's branch cache
export async function invalidateUserBranchCache(userId: string): Promise<void> {
  await cache.del(cacheKeys.userBranches(userId))
}
```

**Step 4: Create territory index**

Create: `src/lib/territories/index.ts`

```typescript
export {
  getUserBranchIds,
  getUserBranchFilter,
  canAccessBranch,
  invalidateUserBranchCache,
} from './filter'
```

**Step 5: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/lib/territories/__tests__/filter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/territories/
git commit -m "feat: add territory filter service with caching"
```

---

## Task 4: Create Client List API

**Files:**
- Create: `src/server/api/routes/clients/list.ts`
- Create: `src/server/api/routes/clients/__tests__/list.test.ts`

**Step 1: Write failing test for client list API**

Create: `src/server/api/routes/clients/__tests__/list.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/server/db/queries/clients', () => ({
  getClients: vi.fn().mockResolvedValue({
    data: [
      { id: '1', clientCode: 'FC-001', fullName: 'John Doe' },
      { id: '2', clientCode: 'FC-002', fullName: 'Jane Smith' },
    ],
    meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
  }),
}))

vi.mock('@/lib/territories', () => ({
  getUserBranchFilter: vi.fn().mockResolvedValue({
    scope: 'all',
    branchIds: [],
  }),
}))

describe('Client List API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return paginated client list', async () => {
    const { clientListRoute } = await import('../list')
    const app = new Hono()

    // Mock auth context
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })

    app.route('/', clientListRoute)

    const res = await app.request('/')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.meta.total).toBe(2)
  })

  it('should accept filter parameters', async () => {
    const { clientListRoute } = await import('../list')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', clientListRoute)

    const res = await app.request('/?pensionTypeId=abc&isActive=true')
    expect(res.status).toBe(200)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/clients/__tests__/list.test.ts`
Expected: FAIL - module not found

**Step 3: Create client list route**

Create: `src/server/api/routes/clients/list.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getClients } from '@/server/db/queries/clients'
import { getUserBranchFilter } from '@/lib/territories'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25),
  sortBy: z.enum(['fullName', 'clientCode', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  pensionTypeId: z.string().uuid().optional(),
  pensionerTypeId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  parStatusId: z.string().uuid().optional(),
  isActive: z.preprocess(
    (val) => val === 'true' ? true : val === 'false' ? false : undefined,
    z.boolean().optional()
  ),
  search: z.string().min(1).max(100).optional(),
})

export const clientListRoute = new Hono()

clientListRoute.get(
  '/',
  rateLimitMiddleware('read'),
  zValidator('query', querySchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const query = c.req.valid('query')

      // Get user's branch filter
      const { scope, branchIds } = await getUserBranchFilter(userId, 'clients:read')

      if (scope === 'none') {
        return c.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view clients',
          },
        }, 403)
      }

      // Build filters
      const filters = {
        branchIds: scope === 'territory' ? branchIds : undefined,
        pensionTypeId: query.pensionTypeId,
        pensionerTypeId: query.pensionerTypeId,
        productId: query.productId,
        parStatusId: query.parStatusId,
        isActive: query.isActive,
        search: query.search,
      }

      const result = await getClients(
        {
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        },
        filters
      )

      return c.json({
        success: true,
        data: result.data,
        meta: result.meta,
      })
    } catch (error) {
      console.error('Error fetching clients:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch clients',
          },
        },
        500
      )
    }
  }
)
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/clients/__tests__/list.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/clients/
git commit -m "feat: add client list API with territory filtering"
```

---

## Task 5: Create Client Detail API

**Files:**
- Create: `src/server/api/routes/clients/detail.ts`
- Create: `src/server/api/routes/clients/__tests__/detail.test.ts`

**Step 1: Write failing test for client detail API**

Create: `src/server/api/routes/clients/__tests__/detail.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockClient = {
  id: 'client-123',
  clientCode: 'FC-001',
  fullName: 'John Doe',
  branchId: 'branch-1',
  branch: { id: 'branch-1', code: 'MNLA01', name: 'Manila 1' },
  pensionType: { id: 'pt-1', code: 'SSS', name: 'SSS' },
  currentStatus: { statusType: { code: 'PENDING', name: 'Pending' } },
}

vi.mock('@/server/db/queries/clients', () => ({
  getClientWithDetails: vi.fn().mockImplementation((id) => {
    if (id === 'client-123') return Promise.resolve(mockClient)
    return Promise.resolve(null)
  }),
  getClientSyncHistory: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/territories', () => ({
  canAccessBranch: vi.fn().mockResolvedValue(true),
}))

describe('Client Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return client details', async () => {
    const { clientDetailRoute } = await import('../detail')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/:id', clientDetailRoute)

    const res = await app.request('/client-123')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.client.id).toBe('client-123')
  })

  it('should return 404 for non-existent client', async () => {
    const { clientDetailRoute } = await import('../detail')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/:id', clientDetailRoute)

    const res = await app.request('/non-existent')
    expect(res.status).toBe(404)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/clients/__tests__/detail.test.ts`
Expected: FAIL - module not found

**Step 3: Create client detail route**

Create: `src/server/api/routes/clients/detail.ts`

```typescript
import { Hono } from 'hono'
import { getClientWithDetails, getClientSyncHistory } from '@/server/db/queries/clients'
import { canAccessBranch } from '@/lib/territories'

export const clientDetailRoute = new Hono()

clientDetailRoute.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string
    const id = c.req.param('id')

    const client = await getClientWithDetails(id)

    if (!client) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Client not found',
          },
        },
        404
      )
    }

    // Check territory access
    if (client.branchId) {
      const hasAccess = await canAccessBranch(userId, client.branchId, 'clients:read')
      if (!hasAccess) {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this client',
            },
          },
          403
        )
      }
    }

    return c.json({
      success: true,
      data: {
        client,
      },
    })
  } catch (error) {
    console.error('Error fetching client:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch client',
        },
      },
      500
    )
  }
})

// Get client sync history
clientDetailRoute.get('/sync-history', async (c) => {
  try {
    const id = c.req.param('id')
    const history = await getClientSyncHistory(id)

    return c.json({
      success: true,
      data: history,
    })
  } catch (error) {
    console.error('Error fetching sync history:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch sync history',
        },
      },
      500
    )
  }
})
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/clients/__tests__/detail.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/clients/detail.ts src/server/api/routes/clients/__tests__/detail.test.ts
git commit -m "feat: add client detail API with territory access check"
```

---

## Task 6: Create Client Search API

**Files:**
- Create: `src/server/api/routes/clients/search.ts`
- Create: `src/server/api/routes/clients/__tests__/search.test.ts`

**Step 1: Write failing test for client search API**

Create: `src/server/api/routes/clients/__tests__/search.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/server/db/queries/clients', () => ({
  searchClients: vi.fn().mockResolvedValue([
    { id: '1', clientCode: 'FC-001', fullName: 'John Doe', pensionNumber: 'PN-123' },
  ]),
}))

vi.mock('@/lib/territories', () => ({
  getUserBranchFilter: vi.fn().mockResolvedValue({
    scope: 'all',
    branchIds: [],
  }),
}))

describe('Client Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should search clients by query', async () => {
    const { clientSearchRoute } = await import('../search')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', clientSearchRoute)

    const res = await app.request('/?q=john')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('should require search query', async () => {
    const { clientSearchRoute } = await import('../search')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', clientSearchRoute)

    const res = await app.request('/')
    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/clients/__tests__/search.test.ts`
Expected: FAIL - module not found

**Step 3: Create client search route**

Create: `src/server/api/routes/clients/search.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { searchClients } from '@/server/db/queries/clients'
import { getUserBranchFilter } from '@/lib/territories'

const querySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export const clientSearchRoute = new Hono()

clientSearchRoute.get(
  '/',
  zValidator('query', querySchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const { q, limit } = c.req.valid('query')

      // Get user's branch filter
      const { scope, branchIds } = await getUserBranchFilter(userId, 'clients:read')

      if (scope === 'none') {
        return c.json({
          success: true,
          data: [],
        })
      }

      const results = await searchClients(
        q,
        scope === 'territory' ? branchIds : undefined,
        limit
      )

      return c.json({
        success: true,
        data: results,
      })
    } catch (error) {
      console.error('Error searching clients:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'SEARCH_ERROR',
            message: 'Failed to search clients',
          },
        },
        500
      )
    }
  }
)
```

**Step 4: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/clients/__tests__/search.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/api/routes/clients/search.ts src/server/api/routes/clients/__tests__/search.test.ts
git commit -m "feat: add client search API with autocomplete"
```

---

## Task 7: Create Sync Job API

**Files:**
- Create: `src/server/api/routes/sync/index.ts`
- Create: `src/server/api/routes/sync/jobs.ts`
- Create: `src/server/api/routes/sync/__tests__/jobs.test.ts`

**Step 1: Write failing test for sync job API**

Create: `src/server/api/routes/sync/__tests__/jobs.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/lib/sync', () => ({
  syncClientsFromSnowflake: vi.fn().mockResolvedValue({
    jobId: 'job-123',
    status: 'completed',
    recordsProcessed: 100,
    recordsCreated: 50,
    recordsUpdated: 50,
  }),
  SnowflakeSyncService: vi.fn().mockImplementation(() => ({
    fetchPreview: vi.fn().mockResolvedValue({
      totalRecords: 100,
      sampleRecords: [],
    }),
  })),
}))

vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      { id: 'job-1', status: 'completed', recordsProcessed: 100 },
    ]),
  },
}))

describe('Sync Job API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list recent sync jobs', async () => {
    const { syncJobsRoute } = await import('../jobs')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', syncJobsRoute)

    const res = await app.request('/')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('should trigger a new sync job', async () => {
    const { syncJobsRoute } = await import('../jobs')
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('userId', 'user-123')
      await next()
    })
    app.route('/', syncJobsRoute)

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'snowflake' }),
    })
    const data = await res.json()

    expect(res.status).toBe(202)
    expect(data.success).toBe(true)
    expect(data.data.jobId).toBe('job-123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/sync/__tests__/jobs.test.ts`
Expected: FAIL - module not found

**Step 3: Create sync jobs route**

Create: `src/server/api/routes/sync/jobs.ts`

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '@/server/db'
import { syncJobs } from '@/server/db/schema'
import { syncClientsFromSnowflake, SnowflakeSyncService } from '@/lib/sync'
import { desc, eq } from 'drizzle-orm'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'

const triggerSyncSchema = z.object({
  type: z.enum(['snowflake', 'nextbank']),
  options: z
    .object({
      branchCodes: z.array(z.string()).optional(),
      dryRun: z.boolean().optional(),
      fullSync: z.boolean().optional(),
    })
    .optional(),
})

export const syncJobsRoute = new Hono()

// List recent sync jobs
syncJobsRoute.get('/', async (c) => {
  try {
    const jobs = await db
      .select()
      .from(syncJobs)
      .orderBy(desc(syncJobs.createdAt))
      .limit(20)

    return c.json({
      success: true,
      data: jobs,
    })
  } catch (error) {
    console.error('Error fetching sync jobs:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch sync jobs',
        },
      },
      500
    )
  }
})

// Get single sync job
syncJobsRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const [job] = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.id, id))
      .limit(1)

    if (!job) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Sync job not found',
          },
        },
        404
      )
    }

    return c.json({
      success: true,
      data: job,
    })
  } catch (error) {
    console.error('Error fetching sync job:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch sync job',
        },
      },
      500
    )
  }
})

// Trigger new sync job
syncJobsRoute.post(
  '/',
  rateLimitMiddleware('write'),
  zValidator('json', triggerSyncSchema),
  async (c) => {
    try {
      const userId = c.get('userId') as string
      const { type, options } = c.req.valid('json')

      // Check permission
      const canSync = await hasPermission(userId, 'sync:execute')
      if (!canSync) {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to trigger sync',
            },
          },
          403
        )
      }

      if (type === 'snowflake') {
        // Start sync in background (don't await)
        const result = await syncClientsFromSnowflake(options ?? {}, userId)

        return c.json(
          {
            success: true,
            data: result,
            message: 'Sync job started',
          },
          202
        )
      }

      // NextBank sync not implemented yet
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'NextBank sync not yet implemented',
          },
        },
        501
      )
    } catch (error) {
      console.error('Error triggering sync:', error)
      return c.json(
        {
          success: false,
          error: {
            code: 'SYNC_ERROR',
            message: 'Failed to start sync job',
          },
        },
        500
      )
    }
  }
)

// Preview sync (dry run)
syncJobsRoute.post('/preview', rateLimitMiddleware('read'), async (c) => {
  try {
    const service = new SnowflakeSyncService()
    const preview = await service.fetchPreview()

    return c.json({
      success: true,
      data: preview,
    })
  } catch (error) {
    console.error('Error fetching preview:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'PREVIEW_ERROR',
          message: 'Failed to fetch sync preview',
        },
      },
      500
    )
  }
})
```

**Step 4: Create sync routes index**

Create: `src/server/api/routes/sync/index.ts`

```typescript
import { Hono } from 'hono'
import { syncJobsRoute } from './jobs'

export const syncRoutes = new Hono()

syncRoutes.route('/jobs', syncJobsRoute)
```

**Step 5: Run test to verify it passes**

Run: `cd client-updater-version-2 && pnpm test src/server/api/routes/sync/__tests__/jobs.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/api/routes/sync/
git commit -m "feat: add sync job API for triggering and monitoring syncs"
```

---

## Task 8: Wire Up Client and Sync Routes

**Files:**
- Create: `src/server/api/routes/clients/index.ts`
- Modify: `src/server/api/index.ts`

**Step 1: Create clients route index**

Create: `src/server/api/routes/clients/index.ts`

```typescript
import { Hono } from 'hono'
import { clientListRoute } from './list'
import { clientDetailRoute } from './detail'
import { clientSearchRoute } from './search'

export const clientsRoutes = new Hono()

// List clients
clientsRoutes.route('/', clientListRoute)

// Search clients
clientsRoutes.route('/search', clientSearchRoute)

// Client detail by ID
clientsRoutes.route('/:id', clientDetailRoute)
```

**Step 2: Update API index**

Modify: `src/server/api/index.ts` - Add client and sync routes:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { tracingMiddleware } from './middleware/tracing'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'
import { sessionsRoute } from './routes/auth/sessions'
import { clientsRoutes } from './routes/clients'
import { syncRoutes } from './routes/sync'

const app = new Hono().basePath('/api')

// Global middleware
app.use('*', tracingMiddleware)
app.use('*', logger())
app.use('*', cors())

// Public routes
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Protected routes - require authentication
app.use('*', authMiddleware)
app.route('/health', healthRoutes)
app.route('/users', usersRoutes)
app.route('/auth/sessions', sessionsRoute)
app.route('/clients', clientsRoutes)
app.route('/sync', syncRoutes)

export { app }
export type AppType = typeof app
```

**Step 3: Run all tests**

Run: `cd client-updater-version-2 && pnpm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/server/api/routes/clients/index.ts src/server/api/index.ts
git commit -m "feat: wire up client and sync routes in API"
```

---

## Task 9: Create Clients Feature Module

**Files:**
- Create: `src/features/clients/index.ts`
- Create: `src/features/clients/types.ts`
- Create: `src/features/clients/stores/clients-store.ts`
- Create: `src/features/clients/hooks/use-clients.ts`

**Step 1: Create client types**

Create: `src/features/clients/types.ts`

```typescript
export interface Client {
  id: string
  clientCode: string
  fullName: string
  pensionNumber: string | null
  birthDate: string | null
  contactNumber: string | null
  contactNumberAlt: string | null
  pensionTypeId: string | null
  pensionerTypeId: string | null
  productId: string | null
  branchId: string | null
  parStatusId: string | null
  accountTypeId: string | null
  pastDueAmount: string | null
  loanStatus: string | null
  isActive: boolean
  lastSyncedAt: string | null
  syncSource: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientWithDetails extends Client {
  pensionType: LookupItem | null
  pensionerType: LookupItem | null
  product: LookupItem | null
  branch: Branch | null
  parStatus: LookupItem | null
  accountType: LookupItem | null
  currentStatus: ClientStatus | null
}

export interface LookupItem {
  id: string
  code: string
  name: string
}

export interface Branch {
  id: string
  code: string
  name: string
  location: string | null
}

export interface ClientStatus {
  id: string
  periodType: 'monthly' | 'quarterly'
  periodMonth: number | null
  periodQuarter: number | null
  periodYear: number
  statusType: LookupItem | null
  reason: LookupItem | null
  remarks: string | null
  hasPayment: boolean
  updateCount: number
  isTerminal: boolean
}

export interface ClientSearchResult {
  id: string
  clientCode: string
  fullName: string
  pensionNumber: string | null
}

export interface SyncJob {
  id: string
  type: 'snowflake' | 'nextbank'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  startedAt: string | null
  completedAt: string | null
  error: string | null
  createdAt: string
}

export interface ClientFilters {
  pensionTypeId?: string
  pensionerTypeId?: string
  productId?: string
  parStatusId?: string
  isActive?: boolean
  search?: string
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

**Step 2: Create clients store**

Create: `src/features/clients/stores/clients-store.ts`

```typescript
import { create } from 'zustand'
import type { Client, ClientFilters } from '../types'

interface ClientsState {
  // List state
  clients: Client[]
  totalClients: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // Filters
  filters: ClientFilters

  // Selected client
  selectedClientId: string | null

  // Actions
  setClients: (clients: Client[], total: number) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setFilters: (filters: Partial<ClientFilters>) => void
  clearFilters: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedClient: (id: string | null) => void
  reset: () => void
}

const initialFilters: ClientFilters = {}

const initialState = {
  clients: [],
  totalClients: 0,
  currentPage: 1,
  pageSize: 25,
  isLoading: false,
  error: null,
  filters: initialFilters,
  selectedClientId: null,
}

export const useClientsStore = create<ClientsState>((set) => ({
  ...initialState,

  setClients: (clients, total) => set({ clients, totalClients: total }),
  setPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1,
    })),
  clearFilters: () => set({ filters: initialFilters, currentPage: 1 }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSelectedClient: (id) => set({ selectedClientId: id }),
  reset: () => set(initialState),
}))
```

**Step 3: Create clients hooks**

Create: `src/features/clients/hooks/use-clients.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useClientsStore } from '../stores/clients-store'
import type {
  Client,
  ClientWithDetails,
  ClientSearchResult,
  SyncJob,
  PaginatedResponse,
  ApiResponse,
  ClientFilters,
} from '../types'

const API_BASE = '/api/clients'
const SYNC_API = '/api/sync/jobs'

// Build query string from filters
function buildQueryString(
  page: number,
  pageSize: number,
  filters: ClientFilters
): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  if (filters.pensionTypeId) params.set('pensionTypeId', filters.pensionTypeId)
  if (filters.pensionerTypeId) params.set('pensionerTypeId', filters.pensionerTypeId)
  if (filters.productId) params.set('productId', filters.productId)
  if (filters.parStatusId) params.set('parStatusId', filters.parStatusId)
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive))
  if (filters.search) params.set('search', filters.search)

  return params.toString()
}

// Fetch clients list
export function useClients(
  page = 1,
  pageSize = 25,
  filters: ClientFilters = {}
) {
  return useQuery<PaginatedResponse<Client>>({
    queryKey: ['clients', page, pageSize, filters],
    queryFn: async () => {
      const query = buildQueryString(page, pageSize, filters)
      const res = await fetch(`${API_BASE}?${query}`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json()
    },
  })
}

// Fetch single client
export function useClient(clientId: string | null) {
  return useQuery<ApiResponse<{ client: ClientWithDetails }>>({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('No client ID')
      const res = await fetch(`${API_BASE}/${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch client')
      return res.json()
    },
    enabled: !!clientId,
  })
}

// Search clients
export function useClientSearch(query: string, enabled = true) {
  return useQuery<ApiResponse<ClientSearchResult[]>>({
    queryKey: ['client-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { success: true, data: [] }
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Failed to search clients')
      return res.json()
    },
    enabled: enabled && query.length >= 2,
  })
}

// Fetch sync jobs
export function useSyncJobs() {
  return useQuery<ApiResponse<SyncJob[]>>({
    queryKey: ['sync-jobs'],
    queryFn: async () => {
      const res = await fetch(SYNC_API)
      if (!res.ok) throw new Error('Failed to fetch sync jobs')
      return res.json()
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

// Fetch single sync job
export function useSyncJob(jobId: string | null) {
  return useQuery<ApiResponse<SyncJob>>({
    queryKey: ['sync-job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID')
      const res = await fetch(`${SYNC_API}/${jobId}`)
      if (!res.ok) throw new Error('Failed to fetch sync job')
      return res.json()
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop refetching when job is complete
      if (data?.data?.status === 'completed' || data?.data?.status === 'failed') {
        return false
      }
      return 2000 // Refetch every 2 seconds while in progress
    },
  })
}

// Trigger sync mutation
export function useTriggerSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      type: 'snowflake' | 'nextbank'
      options?: {
        branchCodes?: string[]
        dryRun?: boolean
        fullSync?: boolean
      }
    }) => {
      const res = await fetch(SYNC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to trigger sync')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
```

**Step 4: Create feature index**

Create: `src/features/clients/index.ts`

```typescript
// Types
export * from './types'

// Store
export { useClientsStore } from './stores/clients-store'

// Hooks
export {
  useClients,
  useClient,
  useClientSearch,
  useSyncJobs,
  useSyncJob,
  useTriggerSync,
} from './hooks/use-clients'
```

**Step 5: Commit**

```bash
git add src/features/clients/
git commit -m "feat: add clients feature module with types, store, and hooks"
```

---

## Task 10: Create Client List Page

**Files:**
- Create: `src/app/(dashboard)/clients/page.tsx`
- Create: `src/features/clients/components/client-table.tsx`
- Create: `src/features/clients/components/client-filters.tsx`

**Step 1: Create client filters component**

Create: `src/features/clients/components/client-filters.tsx`

```typescript
'use client'

import { useClientsStore } from '../stores/clients-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function ClientFilters() {
  const { filters, setFilters, clearFilters } = useClientsStore()

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name, code, or pension number..."
            className="w-full px-3 py-2 border rounded-md"
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 border rounded-md"
            value={filters.isActive === undefined ? '' : String(filters.isActive)}
            onChange={(e) =>
              setFilters({
                isActive:
                  e.target.value === ''
                    ? undefined
                    : e.target.value === 'true',
              })
            }
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>
  )
}
```

**Step 2: Create client table component**

Create: `src/features/clients/components/client-table.tsx`

```typescript
'use client'

import { useClients } from '../hooks/use-clients'
import { useClientsStore } from '../stores/clients-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export function ClientTable() {
  const { currentPage, pageSize, filters, setPage } = useClientsStore()
  const { data, isLoading, error } = useClients(currentPage, pageSize, filters)

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center">Loading clients...</div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-500">
          Error loading clients: {error.message}
        </div>
      </Card>
    )
  }

  const clients = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Client Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Pension #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-mono">
                    {client.clientCode}
                  </td>
                  <td className="px-4 py-3 font-medium">{client.fullName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {client.pensionNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {client.contactNumber || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={client.isActive ? 'default' : 'secondary'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.pageSize + 1} to{' '}
            {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} clients
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

**Step 3: Create client list page**

Create: `src/app/(dashboard)/clients/page.tsx`

```typescript
import { ClientTable } from '@/features/clients/components/client-table'
import { ClientFilters } from '@/features/clients/components/client-filters'

export const metadata = {
  title: 'Clients',
}

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            View and manage client records
          </p>
        </div>
      </div>

      <ClientFilters />
      <ClientTable />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/clients/ src/features/clients/components/
git commit -m "feat: add client list page with filters and table"
```

---

## Task 11: Create Client Detail Page

**Files:**
- Create: `src/app/(dashboard)/clients/[id]/page.tsx`
- Create: `src/features/clients/components/client-detail.tsx`

**Step 1: Create client detail component**

Create: `src/features/clients/components/client-detail.tsx`

```typescript
'use client'

import { useClient } from '../hooks/use-clients'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ClientDetailProps {
  clientId: string
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const { data, isLoading, error } = useClient(clientId)

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center">Loading client details...</div>
      </Card>
    )
  }

  if (error || !data?.data) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-500">
          {error?.message || 'Client not found'}
        </div>
      </Card>
    )
  }

  const { client } = data.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{client.fullName}</h2>
            <Badge variant={client.isActive ? 'default' : 'secondary'}>
              {client.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono">{client.clientCode}</p>
        </div>
        <Link href="/clients">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Basic Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pension Number</dt>
              <dd>{client.pensionNumber || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Birth Date</dt>
              <dd>
                {client.birthDate
                  ? new Date(client.birthDate).toLocaleDateString()
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Contact</dt>
              <dd>{client.contactNumber || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alt Contact</dt>
              <dd>{client.contactNumberAlt || '-'}</dd>
            </div>
          </dl>
        </Card>

        {/* Classification */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Classification</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pension Type</dt>
              <dd>{client.pensionType?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pensioner Type</dt>
              <dd>{client.pensionerType?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Product</dt>
              <dd>{client.product?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Account Type</dt>
              <dd>{client.accountType?.name || '-'}</dd>
            </div>
          </dl>
        </Card>

        {/* Branch & Status */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Branch & PAR Status</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Branch</dt>
              <dd>{client.branch?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Branch Code</dt>
              <dd className="font-mono">{client.branch?.code || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PAR Status</dt>
              <dd>{client.parStatus?.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Past Due Amount</dt>
              <dd>
                {client.pastDueAmount
                  ? `${parseFloat(client.pastDueAmount).toLocaleString()}`
                  : '-'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Current Status */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Current Period Status</h3>
          {client.currentStatus ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Period</dt>
                <dd>
                  {client.currentStatus.periodType === 'monthly'
                    ? `${client.currentStatus.periodMonth}/${client.currentStatus.periodYear}`
                    : `Q${client.currentStatus.periodQuarter}/${client.currentStatus.periodYear}`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="outline">
                    {client.currentStatus.statusType?.name || 'Pending'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reason</dt>
                <dd>{client.currentStatus.reason?.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Has Payment</dt>
                <dd>{client.currentStatus.hasPayment ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Update Count</dt>
                <dd>{client.currentStatus.updateCount}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No status for current period</p>
          )}
        </Card>
      </div>

      {/* Sync Info */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Sync Information</h3>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-muted-foreground">Last Synced</dt>
            <dd>
              {client.lastSyncedAt
                ? new Date(client.lastSyncedAt).toLocaleString()
                : 'Never'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sync Source</dt>
            <dd className="capitalize">{client.syncSource || '-'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
```

**Step 2: Create client detail page**

Create: `src/app/(dashboard)/clients/[id]/page.tsx`

```typescript
import { ClientDetail } from '@/features/clients/components/client-detail'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `Client ${id}`,
  }
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <ClientDetail clientId={id} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/clients/\[id\]/ src/features/clients/components/client-detail.tsx
git commit -m "feat: add client detail page with full client information"
```

---

## Task 12: Create Sync Status UI

**Files:**
- Create: `src/features/sync/index.ts`
- Create: `src/features/sync/components/sync-status.tsx`
- Create: `src/app/(dashboard)/admin/sync/page.tsx`

**Step 1: Create sync status component**

Create: `src/features/sync/components/sync-status.tsx`

```typescript
'use client'

import { useSyncJobs, useTriggerSync } from '@/features/clients'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function SyncStatus() {
  const { data, isLoading, error } = useSyncJobs()
  const triggerSync = useTriggerSync()

  const jobs = data?.data ?? []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Sync Actions</h3>
            <p className="text-sm text-muted-foreground">
              Trigger a new sync from Snowflake
            </p>
          </div>
          <Button
            onClick={() => triggerSync.mutate({ type: 'snowflake' })}
            disabled={triggerSync.isPending}
          >
            {triggerSync.isPending ? 'Starting...' : 'Start Sync'}
          </Button>
        </div>
      </Card>

      {/* Recent Jobs */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent Sync Jobs</h3>

        {isLoading && (
          <div className="text-center py-4">Loading...</div>
        )}

        {error && (
          <div className="text-center py-4 text-red-500">
            Error loading jobs: {error.message}
          </div>
        )}

        {jobs.length === 0 && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            No sync jobs found
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {getStatusBadge(job.status)}
                  <div>
                    <div className="font-medium capitalize">{job.type} Sync</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {job.status === 'completed' && (
                    <div className="text-sm">
                      <span className="text-green-600">
                        {job.recordsCreated} created
                      </span>
                      {' / '}
                      <span className="text-blue-600">
                        {job.recordsUpdated} updated
                      </span>
                    </div>
                  )}
                  {job.status === 'processing' && (
                    <div className="text-sm text-muted-foreground">
                      {job.recordsProcessed} processed
                    </div>
                  )}
                  {job.status === 'failed' && job.error && (
                    <div className="text-sm text-red-500 max-w-xs truncate">
                      {job.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
```

**Step 2: Create sync feature index**

Create: `src/features/sync/index.ts`

```typescript
export { SyncStatus } from './components/sync-status'
```

**Step 3: Create sync admin page**

Create: `src/app/(dashboard)/admin/sync/page.tsx`

```typescript
import { SyncStatus } from '@/features/sync'

export const metadata = {
  title: 'Sync Status | Admin',
}

export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sync Status</h1>
        <p className="text-muted-foreground">
          Monitor and manage data synchronization
        </p>
      </div>

      <SyncStatus />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/features/sync/ src/app/\(dashboard\)/admin/sync/
git commit -m "feat: add sync status UI with job monitoring"
```

---

## Summary

This plan covers Phase 3: Client Management with 12 tasks:

**Backend (Tasks 1-8)**
- Client CRUD queries with filters and pagination
- Snowflake sync service with batch processing
- Territory filter service with caching
- Client list API with territory filtering
- Client detail API with access control
- Client search API (autocomplete)
- Sync job API for triggering and monitoring
- Route wiring

**Frontend (Tasks 9-12)**
- Clients feature module (types, store, hooks)
- Client list page with filters and table
- Client detail page with full information
- Sync status UI with job monitoring

**Total: 12 tasks**

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-01-05-phase-3-client-management.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
