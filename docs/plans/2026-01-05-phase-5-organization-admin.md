# Phase 5: Organization & Admin

**Date:** 2026-01-05
**Phase:** 5 of 7
**Status:** Planning
**Depends on:** Phase 2 (User Management), Phase 3 (Client Management)

---

## Overview

This phase implements branch/area organization management and admin configuration features. These are essential for territory-based access control and system customization without code changes.

### Goals

1. **Branch Management** - CRUD operations for branches with contacts
2. **Area Management** - CRUD operations for areas with branch assignments
3. **Area-Branch Assignments** - Manage which branches belong to which areas
4. **Config Categories & Options** - Admin-editable dropdown options
5. **Config Settings** - System-wide configuration values
6. **Audit Logging** - Track all configuration changes

---

## Prerequisites

Before starting this phase, ensure:

- [x] Phase 2 completed (users, permissions)
- [x] Phase 3 completed (clients with branch filtering)
- [x] Database schema includes: `areas`, `branches`, `area_branches`, `branch_contacts`, `config_categories`, `config_options`, `config_settings`, `config_audit_log`

---

## Tasks

### Task 1: Organization Schema Enhancement

**File:** `src/lib/db/schema/organization.ts`

Enhance existing organization schema with full relationships:

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'

// Areas
export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Branches
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  location: text('location'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Area-Branch Assignments
export const areaBranches = pgTable('area_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  areaId: uuid('area_id').notNull().references(() => areas.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  isPrimary: boolean('is_primary').notNull().default(false),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
})

// Branch Contacts
export const contactTypeEnum = pgEnum('contact_type', ['phone', 'email', 'mobile', 'fax'])

export const branchContacts = pgTable('branch_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  type: contactTypeEnum('type').notNull(),
  label: varchar('label', { length: 100 }),
  value: varchar('value', { length: 255 }).notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const areasRelations = relations(areas, ({ one, many }) => ({
  company: one(companies, {
    fields: [areas.companyId],
    references: [companies.id],
  }),
  areaBranches: many(areaBranches),
}))

export const branchesRelations = relations(branches, ({ many }) => ({
  areaBranches: many(areaBranches),
  contacts: many(branchContacts),
}))

export const areaBranchesRelations = relations(areaBranches, ({ one }) => ({
  area: one(areas, {
    fields: [areaBranches.areaId],
    references: [areas.id],
  }),
  branch: one(branches, {
    fields: [areaBranches.branchId],
    references: [branches.id],
  }),
}))

export const branchContactsRelations = relations(branchContacts, ({ one }) => ({
  branch: one(branches, {
    fields: [branchContacts.branchId],
    references: [branches.id],
  }),
}))
```

**Acceptance Criteria:**
- [ ] Schema includes all organization tables
- [ ] Relations properly defined
- [ ] Indexes created for performance
- [ ] Types exported for queries

---

### Task 2: Config Schema

**File:** `src/lib/db/schema/config.ts`

Define configuration tables:

```typescript
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'
import { users } from './users'

// Config Categories
export const configCategories = pgTable('config_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Config Options (dropdown values, templates, etc.)
export const configOptions = pgTable('config_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => configCategories.id),
  code: varchar('code', { length: 100 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  value: text('value'),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  parentOptionId: uuid('parent_option_id').references(() => configOptions.id),
  companyId: uuid('company_id').references(() => companies.id),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Config Settings (key-value system settings)
export const valueTypeEnum = pgEnum('value_type', ['string', 'number', 'boolean', 'json'])

export const configSettings = pgTable('config_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value'),
  valueType: valueTypeEnum('value_type').notNull().default('string'),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  companyId: uuid('company_id').references(() => companies.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Config Audit Log
export const configAuditLog = pgTable('config_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // create, update, delete
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
})

// Relations
export const configCategoriesRelations = relations(configCategories, ({ many }) => ({
  options: many(configOptions),
}))

export const configOptionsRelations = relations(configOptions, ({ one, many }) => ({
  category: one(configCategories, {
    fields: [configOptions.categoryId],
    references: [configCategories.id],
  }),
  company: one(companies, {
    fields: [configOptions.companyId],
    references: [companies.id],
  }),
  parent: one(configOptions, {
    fields: [configOptions.parentOptionId],
    references: [configOptions.id],
  }),
  children: many(configOptions),
  createdByUser: one(users, {
    fields: [configOptions.createdBy],
    references: [users.id],
  }),
}))
```

**Acceptance Criteria:**
- [ ] Config categories schema defined
- [ ] Config options with parent-child support
- [ ] Config settings for key-value pairs
- [ ] Audit log table created

---

### Task 3: Branch Queries

**File:** `src/features/organization/queries/branch.queries.ts`

```typescript
import { db } from '@/lib/db'
import { branches, branchContacts, areaBranches, areas } from '@/lib/db/schema'
import { eq, and, isNull, ilike, or, sql, inArray, asc, desc } from 'drizzle-orm'

export interface BranchFilters {
  search?: string
  areaId?: string
  isActive?: boolean
  category?: string
}

export interface BranchListOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: BranchFilters
}

// List branches with pagination and filters
export async function listBranches(options: BranchListOptions = {}) {
  const { page = 1, pageSize = 25, sortBy = 'name', sortOrder = 'asc', filters = {} } = options
  const offset = (page - 1) * pageSize

  // Build where conditions
  const conditions = [isNull(branches.deletedAt)]

  if (filters.search) {
    conditions.push(
      or(
        ilike(branches.code, `%${filters.search}%`),
        ilike(branches.name, `%${filters.search}%`)
      )!
    )
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(branches.isActive, filters.isActive))
  }

  if (filters.category) {
    conditions.push(eq(branches.category, filters.category))
  }

  // Filter by area
  let branchIds: string[] | undefined
  if (filters.areaId) {
    const areaAssignments = await db
      .select({ branchId: areaBranches.branchId })
      .from(areaBranches)
      .where(eq(areaBranches.areaId, filters.areaId))
    branchIds = areaAssignments.map(a => a.branchId)
    if (branchIds.length > 0) {
      conditions.push(inArray(branches.id, branchIds))
    } else {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }
  }

  const whereClause = and(...conditions)

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(branches)
    .where(whereClause)

  // Get branches with contacts
  const sortFn = sortOrder === 'desc' ? desc : asc
  const sortColumn = branches[sortBy as keyof typeof branches] || branches.name

  const data = await db.query.branches.findMany({
    where: whereClause,
    with: {
      contacts: true,
      areaBranches: {
        with: { area: true },
      },
    },
    limit: pageSize,
    offset,
    orderBy: [sortFn(sortColumn)],
  })

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  }
}

// Get single branch with all relations
export async function getBranchById(id: string) {
  return db.query.branches.findFirst({
    where: and(eq(branches.id, id), isNull(branches.deletedAt)),
    with: {
      contacts: true,
      areaBranches: {
        with: { area: true },
      },
    },
  })
}

// Get branch by code
export async function getBranchByCode(code: string) {
  return db.query.branches.findFirst({
    where: and(eq(branches.code, code), isNull(branches.deletedAt)),
  })
}

// Create branch
export async function createBranch(data: {
  code: string
  name: string
  location?: string
  category?: string
  isActive?: boolean
  contacts?: Array<{
    type: 'phone' | 'email' | 'mobile' | 'fax'
    label?: string
    value: string
    isPrimary?: boolean
  }>
}) {
  const { contacts, ...branchData } = data

  return db.transaction(async (tx) => {
    // Create branch
    const [branch] = await tx.insert(branches).values(branchData).returning()

    // Create contacts if provided
    if (contacts && contacts.length > 0) {
      await tx.insert(branchContacts).values(
        contacts.map(c => ({
          branchId: branch.id,
          type: c.type,
          label: c.label,
          value: c.value,
          isPrimary: c.isPrimary ?? false,
        }))
      )
    }

    return getBranchById(branch.id)
  })
}

// Update branch
export async function updateBranch(
  id: string,
  data: Partial<{
    code: string
    name: string
    location: string
    category: string
    isActive: boolean
  }>
) {
  const [updated] = await db
    .update(branches)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(branches.id, id), isNull(branches.deletedAt)))
    .returning()

  return updated
}

// Soft delete branch
export async function deleteBranch(id: string) {
  const [deleted] = await db
    .update(branches)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(branches.id, id))
    .returning()

  return deleted
}

// Get branches for dropdown (minimal data)
export async function getBranchOptions(filters?: { companyId?: string; areaId?: string }) {
  const conditions = [isNull(branches.deletedAt), eq(branches.isActive, true)]

  // If filtering by area
  if (filters?.areaId) {
    const areaAssignments = await db
      .select({ branchId: areaBranches.branchId })
      .from(areaBranches)
      .where(eq(areaBranches.areaId, filters.areaId))

    const branchIds = areaAssignments.map(a => a.branchId)
    if (branchIds.length > 0) {
      conditions.push(inArray(branches.id, branchIds))
    } else {
      return []
    }
  }

  return db
    .select({
      id: branches.id,
      code: branches.code,
      name: branches.name,
    })
    .from(branches)
    .where(and(...conditions))
    .orderBy(asc(branches.name))
}

// Get branch categories for filter dropdown
export async function getBranchCategories() {
  const result = await db
    .selectDistinct({ category: branches.category })
    .from(branches)
    .where(and(isNull(branches.deletedAt), sql`${branches.category} IS NOT NULL`))
    .orderBy(asc(branches.category))

  return result.map(r => r.category).filter(Boolean) as string[]
}
```

**Acceptance Criteria:**
- [ ] List branches with pagination
- [ ] Filter by search, area, category, active status
- [ ] Get branch with contacts and areas
- [ ] Create with contacts
- [ ] Update and soft delete
- [ ] Dropdown options endpoint

---

### Task 4: Area Queries

**File:** `src/features/organization/queries/area.queries.ts`

```typescript
import { db } from '@/lib/db'
import { areas, areaBranches, branches } from '@/lib/db/schema'
import { eq, and, isNull, ilike, or, sql, asc, desc } from 'drizzle-orm'

export interface AreaFilters {
  search?: string
  companyId?: string
  isActive?: boolean
}

export interface AreaListOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: AreaFilters
}

// List areas with pagination
export async function listAreas(options: AreaListOptions = {}) {
  const { page = 1, pageSize = 25, sortBy = 'name', sortOrder = 'asc', filters = {} } = options
  const offset = (page - 1) * pageSize

  const conditions = [isNull(areas.deletedAt)]

  if (filters.search) {
    conditions.push(
      or(
        ilike(areas.code, `%${filters.search}%`),
        ilike(areas.name, `%${filters.search}%`)
      )!
    )
  }

  if (filters.companyId) {
    conditions.push(eq(areas.companyId, filters.companyId))
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(areas.isActive, filters.isActive))
  }

  const whereClause = and(...conditions)

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(areas)
    .where(whereClause)

  // Get areas with branch count
  const sortFn = sortOrder === 'desc' ? desc : asc
  const sortColumn = areas[sortBy as keyof typeof areas] || areas.name

  const data = await db.query.areas.findMany({
    where: whereClause,
    with: {
      company: true,
      areaBranches: {
        with: { branch: true },
      },
    },
    limit: pageSize,
    offset,
    orderBy: [sortFn(sortColumn)],
  })

  // Add branch count
  const dataWithCount = data.map(area => ({
    ...area,
    branchCount: area.areaBranches.length,
  }))

  return {
    data: dataWithCount,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  }
}

// Get single area with branches
export async function getAreaById(id: string) {
  return db.query.areas.findFirst({
    where: and(eq(areas.id, id), isNull(areas.deletedAt)),
    with: {
      company: true,
      areaBranches: {
        with: { branch: true },
      },
    },
  })
}

// Create area
export async function createArea(data: {
  code: string
  name: string
  companyId: string
  isActive?: boolean
}) {
  const [area] = await db.insert(areas).values(data).returning()
  return getAreaById(area.id)
}

// Update area
export async function updateArea(
  id: string,
  data: Partial<{
    code: string
    name: string
    companyId: string
    isActive: boolean
  }>
) {
  const [updated] = await db
    .update(areas)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(areas.id, id), isNull(areas.deletedAt)))
    .returning()

  return updated
}

// Soft delete area
export async function deleteArea(id: string) {
  const [deleted] = await db
    .update(areas)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(areas.id, id))
    .returning()

  return deleted
}

// Get areas for dropdown
export async function getAreaOptions(filters?: { companyId?: string }) {
  const conditions = [isNull(areas.deletedAt), eq(areas.isActive, true)]

  if (filters?.companyId) {
    conditions.push(eq(areas.companyId, filters.companyId))
  }

  return db
    .select({
      id: areas.id,
      code: areas.code,
      name: areas.name,
    })
    .from(areas)
    .where(and(...conditions))
    .orderBy(asc(areas.name))
}
```

**Acceptance Criteria:**
- [ ] List areas with pagination
- [ ] Filter by search, company, active status
- [ ] Include branch count
- [ ] Get area with branches
- [ ] Create, update, soft delete
- [ ] Dropdown options

---

### Task 5: Area-Branch Assignment Queries

**File:** `src/features/organization/queries/area-branch.queries.ts`

```typescript
import { db } from '@/lib/db'
import { areaBranches, areas, branches } from '@/lib/db/schema'
import { eq, and, inArray, isNull } from 'drizzle-orm'

// Get branches for an area
export async function getBranchesForArea(areaId: string) {
  return db.query.areaBranches.findMany({
    where: eq(areaBranches.areaId, areaId),
    with: { branch: true },
  })
}

// Get areas for a branch
export async function getAreasForBranch(branchId: string) {
  return db.query.areaBranches.findMany({
    where: eq(areaBranches.branchId, branchId),
    with: { area: true },
  })
}

// Assign branches to area (bulk)
export async function assignBranchesToArea(
  areaId: string,
  branchIds: string[],
  options?: { replaceExisting?: boolean }
) {
  return db.transaction(async (tx) => {
    // Remove existing assignments if replacing
    if (options?.replaceExisting) {
      await tx.delete(areaBranches).where(eq(areaBranches.areaId, areaId))
    }

    // Get existing assignments if not replacing
    let existingBranchIds: string[] = []
    if (!options?.replaceExisting) {
      const existing = await tx
        .select({ branchId: areaBranches.branchId })
        .from(areaBranches)
        .where(eq(areaBranches.areaId, areaId))
      existingBranchIds = existing.map(e => e.branchId)
    }

    // Filter out already assigned branches
    const newBranchIds = branchIds.filter(id => !existingBranchIds.includes(id))

    // Insert new assignments
    if (newBranchIds.length > 0) {
      await tx.insert(areaBranches).values(
        newBranchIds.map((branchId, index) => ({
          areaId,
          branchId,
          isPrimary: index === 0 && options?.replaceExisting, // First is primary if replacing
        }))
      )
    }

    return getBranchesForArea(areaId)
  })
}

// Remove branch from area
export async function removeBranchFromArea(areaId: string, branchId: string) {
  const [deleted] = await db
    .delete(areaBranches)
    .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))
    .returning()

  return deleted
}

// Set primary branch for area
export async function setPrimaryBranch(areaId: string, branchId: string) {
  return db.transaction(async (tx) => {
    // Clear existing primary
    await tx
      .update(areaBranches)
      .set({ isPrimary: false })
      .where(eq(areaBranches.areaId, areaId))

    // Set new primary
    await tx
      .update(areaBranches)
      .set({ isPrimary: true })
      .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))

    return getBranchesForArea(areaId)
  })
}

// Get unassigned branches (not in any area)
export async function getUnassignedBranches() {
  const assignedBranchIds = await db
    .selectDistinct({ branchId: areaBranches.branchId })
    .from(areaBranches)

  const ids = assignedBranchIds.map(a => a.branchId)

  if (ids.length === 0) {
    return db.query.branches.findMany({
      where: and(isNull(branches.deletedAt), eq(branches.isActive, true)),
    })
  }

  return db.query.branches.findMany({
    where: and(
      isNull(branches.deletedAt),
      eq(branches.isActive, true),
      // NOT in assigned list - use raw SQL
    ),
  })
}
```

**Acceptance Criteria:**
- [ ] Get branches for area
- [ ] Get areas for branch
- [ ] Bulk assign branches
- [ ] Remove branch from area
- [ ] Set primary branch
- [ ] Get unassigned branches

---

### Task 6: Branch Contact Queries

**File:** `src/features/organization/queries/branch-contact.queries.ts`

```typescript
import { db } from '@/lib/db'
import { branchContacts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// Get contacts for branch
export async function getContactsForBranch(branchId: string) {
  return db.query.branchContacts.findMany({
    where: eq(branchContacts.branchId, branchId),
    orderBy: (c, { asc }) => [asc(c.type), asc(c.label)],
  })
}

// Add contact to branch
export async function addBranchContact(data: {
  branchId: string
  type: 'phone' | 'email' | 'mobile' | 'fax'
  label?: string
  value: string
  isPrimary?: boolean
}) {
  return db.transaction(async (tx) => {
    // If setting as primary, clear existing primary of same type
    if (data.isPrimary) {
      await tx
        .update(branchContacts)
        .set({ isPrimary: false })
        .where(and(eq(branchContacts.branchId, data.branchId), eq(branchContacts.type, data.type)))
    }

    const [contact] = await tx.insert(branchContacts).values(data).returning()
    return contact
  })
}

// Update contact
export async function updateBranchContact(
  id: string,
  data: Partial<{
    type: 'phone' | 'email' | 'mobile' | 'fax'
    label: string
    value: string
    isPrimary: boolean
  }>
) {
  const [updated] = await db
    .update(branchContacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(branchContacts.id, id))
    .returning()

  return updated
}

// Delete contact
export async function deleteBranchContact(id: string) {
  const [deleted] = await db.delete(branchContacts).where(eq(branchContacts.id, id)).returning()
  return deleted
}

// Set primary contact
export async function setPrimaryContact(branchId: string, contactId: string) {
  const contact = await db.query.branchContacts.findFirst({
    where: eq(branchContacts.id, contactId),
  })

  if (!contact) return null

  return db.transaction(async (tx) => {
    // Clear existing primary of same type
    await tx
      .update(branchContacts)
      .set({ isPrimary: false })
      .where(and(eq(branchContacts.branchId, branchId), eq(branchContacts.type, contact.type)))

    // Set new primary
    const [updated] = await tx
      .update(branchContacts)
      .set({ isPrimary: true })
      .where(eq(branchContacts.id, contactId))
      .returning()

    return updated
  })
}
```

**Acceptance Criteria:**
- [ ] Get contacts for branch
- [ ] Add contact with primary handling
- [ ] Update contact
- [ ] Delete contact
- [ ] Set primary by type

---

### Task 7: Config Queries

**File:** `src/features/admin/queries/config.queries.ts`

```typescript
import { db } from '@/lib/db'
import { configCategories, configOptions, configSettings, configAuditLog } from '@/lib/db/schema'
import { eq, and, isNull, ilike, asc, sql } from 'drizzle-orm'

// ============== Categories ==============

export async function listConfigCategories() {
  return db.query.configCategories.findMany({
    where: eq(configCategories.isActive, true),
    orderBy: [asc(configCategories.sortOrder), asc(configCategories.name)],
  })
}

export async function getCategoryByCode(code: string) {
  return db.query.configCategories.findFirst({
    where: eq(configCategories.code, code),
    with: {
      options: {
        where: eq(configOptions.isActive, true),
        orderBy: [asc(configOptions.sortOrder), asc(configOptions.label)],
      },
    },
  })
}

// ============== Options ==============

export interface ConfigOptionFilters {
  categoryCode?: string
  categoryId?: string
  companyId?: string
  parentId?: string
  isActive?: boolean
}

export async function listConfigOptions(filters: ConfigOptionFilters = {}) {
  const conditions = []

  if (filters.categoryId) {
    conditions.push(eq(configOptions.categoryId, filters.categoryId))
  }

  if (filters.categoryCode) {
    const category = await db.query.configCategories.findFirst({
      where: eq(configCategories.code, filters.categoryCode),
    })
    if (category) {
      conditions.push(eq(configOptions.categoryId, category.id))
    }
  }

  if (filters.companyId) {
    conditions.push(eq(configOptions.companyId, filters.companyId))
  }

  if (filters.parentId) {
    conditions.push(eq(configOptions.parentOptionId, filters.parentId))
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(configOptions.isActive, filters.isActive))
  }

  return db.query.configOptions.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      category: true,
      company: true,
      children: true,
    },
    orderBy: [asc(configOptions.sortOrder), asc(configOptions.label)],
  })
}

export async function getConfigOptionById(id: string) {
  return db.query.configOptions.findFirst({
    where: eq(configOptions.id, id),
    with: {
      category: true,
      company: true,
      parent: true,
      children: true,
    },
  })
}

export async function createConfigOption(
  data: {
    categoryId: string
    code: string
    label: string
    value?: string
    metadata?: Record<string, unknown>
    isActive?: boolean
    isDefault?: boolean
    sortOrder?: number
    parentOptionId?: string
    companyId?: string
  },
  userId: string
) {
  const [option] = await db
    .insert(configOptions)
    .values({
      ...data,
      createdBy: userId,
    })
    .returning()

  // Log creation
  await logConfigChange('config_options', option.id, 'create', null, option, userId)

  return getConfigOptionById(option.id)
}

export async function updateConfigOption(
  id: string,
  data: Partial<{
    code: string
    label: string
    value: string
    metadata: Record<string, unknown>
    isActive: boolean
    isDefault: boolean
    sortOrder: number
    parentOptionId: string
    companyId: string
  }>,
  userId: string
) {
  const existing = await getConfigOptionById(id)
  if (!existing) return null

  // Prevent editing system options
  if (existing.isSystem && (data.code !== undefined || data.label !== undefined)) {
    throw new Error('Cannot modify system option code or label')
  }

  const [updated] = await db
    .update(configOptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(configOptions.id, id))
    .returning()

  // Log update
  await logConfigChange('config_options', id, 'update', existing, updated, userId)

  return getConfigOptionById(updated.id)
}

export async function deleteConfigOption(id: string, userId: string) {
  const existing = await getConfigOptionById(id)
  if (!existing) return null

  if (existing.isSystem) {
    throw new Error('Cannot delete system option')
  }

  const [deleted] = await db.delete(configOptions).where(eq(configOptions.id, id)).returning()

  // Log deletion
  await logConfigChange('config_options', id, 'delete', existing, null, userId)

  return deleted
}

// ============== Settings ==============

export async function listConfigSettings(options?: { companyId?: string; isPublic?: boolean }) {
  const conditions = []

  if (options?.companyId) {
    conditions.push(eq(configSettings.companyId, options.companyId))
  }

  if (options?.isPublic !== undefined) {
    conditions.push(eq(configSettings.isPublic, options.isPublic))
  }

  return db.query.configSettings.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [asc(configSettings.key)],
  })
}

export async function getConfigSetting(key: string, companyId?: string) {
  return db.query.configSettings.findFirst({
    where: and(
      eq(configSettings.key, key),
      companyId ? eq(configSettings.companyId, companyId) : isNull(configSettings.companyId)
    ),
  })
}

export async function setConfigSetting(
  key: string,
  value: string,
  options: {
    valueType?: 'string' | 'number' | 'boolean' | 'json'
    description?: string
    isPublic?: boolean
    companyId?: string
  },
  userId: string
) {
  const existing = await getConfigSetting(key, options.companyId)

  if (existing) {
    const [updated] = await db
      .update(configSettings)
      .set({
        value,
        valueType: options.valueType,
        description: options.description,
        isPublic: options.isPublic,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(configSettings.id, existing.id))
      .returning()

    await logConfigChange('config_settings', existing.id, 'update', existing, updated, userId)
    return updated
  } else {
    const [created] = await db
      .insert(configSettings)
      .values({
        key,
        value,
        valueType: options.valueType ?? 'string',
        description: options.description,
        isPublic: options.isPublic ?? false,
        companyId: options.companyId,
        updatedBy: userId,
      })
      .returning()

    await logConfigChange('config_settings', created.id, 'create', null, created, userId)
    return created
  }
}

// ============== Audit Log ==============

async function logConfigChange(
  tableName: string,
  recordId: string,
  action: string,
  oldValues: unknown | null,
  newValues: unknown | null,
  userId: string,
  ipAddress?: string
) {
  await db.insert(configAuditLog).values({
    tableName,
    recordId,
    action,
    oldValues: oldValues as any,
    newValues: newValues as any,
    changedBy: userId,
    ipAddress,
  })
}

export async function getConfigAuditLog(options?: {
  tableName?: string
  recordId?: string
  page?: number
  pageSize?: number
}) {
  const { page = 1, pageSize = 50, tableName, recordId } = options ?? {}
  const offset = (page - 1) * pageSize

  const conditions = []
  if (tableName) conditions.push(eq(configAuditLog.tableName, tableName))
  if (recordId) conditions.push(eq(configAuditLog.recordId, recordId))

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(configAuditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  const data = await db.query.configAuditLog.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    limit: pageSize,
    offset,
    orderBy: (log, { desc }) => [desc(log.changedAt)],
  })

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  }
}
```

**Acceptance Criteria:**
- [ ] List/get categories
- [ ] List/get/create/update/delete options
- [ ] Protect system options
- [ ] List/get/set settings
- [ ] Automatic audit logging
- [ ] Get audit log with filters

---

### Task 8: Organization API Routes

**File:** `src/app/api/[[...route]]/routes/organization.routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requirePermission } from '@/lib/api/middleware/auth'
import {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchOptions,
  getBranchCategories,
} from '@/features/organization/queries/branch.queries'
import {
  listAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  getAreaOptions,
} from '@/features/organization/queries/area.queries'
import {
  assignBranchesToArea,
  removeBranchFromArea,
  setPrimaryBranch,
} from '@/features/organization/queries/area-branch.queries'
import {
  addBranchContact,
  updateBranchContact,
  deleteBranchContact,
  setPrimaryContact,
} from '@/features/organization/queries/branch-contact.queries'
import { successResponse, errorResponse } from '@/lib/api/response'

const app = new Hono()

// Apply auth to all routes
app.use('*', requireAuth())

// ============== Branches ==============

// List branches
app.get(
  '/branches',
  requirePermission('branches:read'),
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(25),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      search: z.string().optional(),
      areaId: z.string().uuid().optional(),
      category: z.string().optional(),
      isActive: z.coerce.boolean().optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid('query')
    const result = await listBranches({
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: {
        search: query.search,
        areaId: query.areaId,
        category: query.category,
        isActive: query.isActive,
      },
    })
    return c.json(successResponse(result.data, { ...result, data: undefined }))
  }
)

// Get branch options (for dropdowns)
app.get('/branches/options', requirePermission('branches:read'), async (c) => {
  const options = await getBranchOptions()
  return c.json(successResponse(options))
})

// Get branch categories
app.get('/branches/categories', requirePermission('branches:read'), async (c) => {
  const categories = await getBranchCategories()
  return c.json(successResponse(categories))
})

// Get single branch
app.get(
  '/branches/:id',
  requirePermission('branches:read'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const branch = await getBranchById(id)
    if (!branch) return c.json(errorResponse('BRANCH_NOT_FOUND', 'Branch not found'), 404)
    return c.json(successResponse(branch))
  }
)

// Create branch
app.post(
  '/branches',
  requirePermission('branches:manage'),
  zValidator(
    'json',
    z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      location: z.string().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
      contacts: z
        .array(
          z.object({
            type: z.enum(['phone', 'email', 'mobile', 'fax']),
            label: z.string().optional(),
            value: z.string().min(1),
            isPrimary: z.boolean().optional(),
          })
        )
        .optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid('json')
    const branch = await createBranch(data)
    return c.json(successResponse(branch), 201)
  }
)

// Update branch
app.patch(
  '/branches/:id',
  requirePermission('branches:manage'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator(
    'json',
    z.object({
      code: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      location: z.string().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const branch = await updateBranch(id, data)
    if (!branch) return c.json(errorResponse('BRANCH_NOT_FOUND', 'Branch not found'), 404)
    return c.json(successResponse(branch))
  }
)

// Delete branch
app.delete(
  '/branches/:id',
  requirePermission('branches:manage'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const branch = await deleteBranch(id)
    if (!branch) return c.json(errorResponse('BRANCH_NOT_FOUND', 'Branch not found'), 404)
    return c.json(successResponse({ deleted: true }))
  }
)

// ============== Branch Contacts ==============

// Add contact
app.post(
  '/branches/:branchId/contacts',
  requirePermission('branches:manage'),
  zValidator('param', z.object({ branchId: z.string().uuid() })),
  zValidator(
    'json',
    z.object({
      type: z.enum(['phone', 'email', 'mobile', 'fax']),
      label: z.string().optional(),
      value: z.string().min(1),
      isPrimary: z.boolean().optional(),
    })
  ),
  async (c) => {
    const { branchId } = c.req.valid('param')
    const data = c.req.valid('json')
    const contact = await addBranchContact({ branchId, ...data })
    return c.json(successResponse(contact), 201)
  }
)

// Update contact
app.patch(
  '/branches/:branchId/contacts/:contactId',
  requirePermission('branches:manage'),
  zValidator('param', z.object({ branchId: z.string().uuid(), contactId: z.string().uuid() })),
  zValidator(
    'json',
    z.object({
      type: z.enum(['phone', 'email', 'mobile', 'fax']).optional(),
      label: z.string().optional(),
      value: z.string().min(1).optional(),
      isPrimary: z.boolean().optional(),
    })
  ),
  async (c) => {
    const { contactId } = c.req.valid('param')
    const data = c.req.valid('json')
    const contact = await updateBranchContact(contactId, data)
    if (!contact) return c.json(errorResponse('CONTACT_NOT_FOUND', 'Contact not found'), 404)
    return c.json(successResponse(contact))
  }
)

// Delete contact
app.delete(
  '/branches/:branchId/contacts/:contactId',
  requirePermission('branches:manage'),
  zValidator('param', z.object({ branchId: z.string().uuid(), contactId: z.string().uuid() })),
  async (c) => {
    const { contactId } = c.req.valid('param')
    const deleted = await deleteBranchContact(contactId)
    if (!deleted) return c.json(errorResponse('CONTACT_NOT_FOUND', 'Contact not found'), 404)
    return c.json(successResponse({ deleted: true }))
  }
)

// ============== Areas ==============

// List areas
app.get(
  '/areas',
  requirePermission('areas:read'),
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(25),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      search: z.string().optional(),
      companyId: z.string().uuid().optional(),
      isActive: z.coerce.boolean().optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid('query')
    const result = await listAreas({
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: {
        search: query.search,
        companyId: query.companyId,
        isActive: query.isActive,
      },
    })
    return c.json(successResponse(result.data, { ...result, data: undefined }))
  }
)

// Get area options
app.get('/areas/options', requirePermission('areas:read'), async (c) => {
  const companyId = c.req.query('companyId')
  const options = await getAreaOptions({ companyId })
  return c.json(successResponse(options))
})

// Get single area
app.get(
  '/areas/:id',
  requirePermission('areas:read'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const area = await getAreaById(id)
    if (!area) return c.json(errorResponse('AREA_NOT_FOUND', 'Area not found'), 404)
    return c.json(successResponse(area))
  }
)

// Create area
app.post(
  '/areas',
  requirePermission('areas:manage'),
  zValidator(
    'json',
    z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      companyId: z.string().uuid(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid('json')
    const area = await createArea(data)
    return c.json(successResponse(area), 201)
  }
)

// Update area
app.patch(
  '/areas/:id',
  requirePermission('areas:manage'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator(
    'json',
    z.object({
      code: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      companyId: z.string().uuid().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const area = await updateArea(id, data)
    if (!area) return c.json(errorResponse('AREA_NOT_FOUND', 'Area not found'), 404)
    return c.json(successResponse(area))
  }
)

// Delete area
app.delete(
  '/areas/:id',
  requirePermission('areas:manage'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const area = await deleteArea(id)
    if (!area) return c.json(errorResponse('AREA_NOT_FOUND', 'Area not found'), 404)
    return c.json(successResponse({ deleted: true }))
  }
)

// ============== Area-Branch Assignments ==============

// Assign branches to area
app.post(
  '/areas/:areaId/branches',
  requirePermission('areas:manage'),
  zValidator('param', z.object({ areaId: z.string().uuid() })),
  zValidator(
    'json',
    z.object({
      branchIds: z.array(z.string().uuid()).min(1),
      replaceExisting: z.boolean().optional(),
    })
  ),
  async (c) => {
    const { areaId } = c.req.valid('param')
    const { branchIds, replaceExisting } = c.req.valid('json')
    const result = await assignBranchesToArea(areaId, branchIds, { replaceExisting })
    return c.json(successResponse(result))
  }
)

// Remove branch from area
app.delete(
  '/areas/:areaId/branches/:branchId',
  requirePermission('areas:manage'),
  zValidator('param', z.object({ areaId: z.string().uuid(), branchId: z.string().uuid() })),
  async (c) => {
    const { areaId, branchId } = c.req.valid('param')
    const deleted = await removeBranchFromArea(areaId, branchId)
    if (!deleted) return c.json(errorResponse('ASSIGNMENT_NOT_FOUND', 'Assignment not found'), 404)
    return c.json(successResponse({ deleted: true }))
  }
)

// Set primary branch
app.post(
  '/areas/:areaId/branches/:branchId/primary',
  requirePermission('areas:manage'),
  zValidator('param', z.object({ areaId: z.string().uuid(), branchId: z.string().uuid() })),
  async (c) => {
    const { areaId, branchId } = c.req.valid('param')
    const result = await setPrimaryBranch(areaId, branchId)
    return c.json(successResponse(result))
  }
)

export default app
```

**Acceptance Criteria:**
- [ ] Branch CRUD endpoints
- [ ] Branch contact endpoints
- [ ] Area CRUD endpoints
- [ ] Area-branch assignment endpoints
- [ ] Proper permission checks
- [ ] Input validation

---

### Task 9: Admin Config API Routes

**File:** `src/app/api/[[...route]]/routes/admin.routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requirePermission } from '@/lib/api/middleware/auth'
import {
  listConfigCategories,
  getCategoryByCode,
  listConfigOptions,
  getConfigOptionById,
  createConfigOption,
  updateConfigOption,
  deleteConfigOption,
  listConfigSettings,
  getConfigSetting,
  setConfigSetting,
  getConfigAuditLog,
} from '@/features/admin/queries/config.queries'
import { successResponse, errorResponse } from '@/lib/api/response'

const app = new Hono()

app.use('*', requireAuth())

// ============== Categories ==============

app.get('/config/categories', requirePermission('config:read'), async (c) => {
  const categories = await listConfigCategories()
  return c.json(successResponse(categories))
})

app.get(
  '/config/categories/:code',
  requirePermission('config:read'),
  zValidator('param', z.object({ code: z.string() })),
  async (c) => {
    const { code } = c.req.valid('param')
    const category = await getCategoryByCode(code)
    if (!category) return c.json(errorResponse('CATEGORY_NOT_FOUND', 'Category not found'), 404)
    return c.json(successResponse(category))
  }
)

// ============== Options ==============

app.get(
  '/config/options',
  requirePermission('config:read'),
  zValidator(
    'query',
    z.object({
      categoryCode: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      companyId: z.string().uuid().optional(),
      parentId: z.string().uuid().optional(),
      isActive: z.coerce.boolean().optional(),
    })
  ),
  async (c) => {
    const filters = c.req.valid('query')
    const options = await listConfigOptions(filters)
    return c.json(successResponse(options))
  }
)

app.get(
  '/config/options/:id',
  requirePermission('config:read'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const option = await getConfigOptionById(id)
    if (!option) return c.json(errorResponse('OPTION_NOT_FOUND', 'Option not found'), 404)
    return c.json(successResponse(option))
  }
)

app.post(
  '/config/options',
  requirePermission('config:manage'),
  zValidator(
    'json',
    z.object({
      categoryId: z.string().uuid(),
      code: z.string().min(1).max(100),
      label: z.string().min(1).max(255),
      value: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      parentOptionId: z.string().uuid().optional(),
      companyId: z.string().uuid().optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid('json')
    const userId = c.get('userId')
    const option = await createConfigOption(data, userId)
    return c.json(successResponse(option), 201)
  }
)

app.patch(
  '/config/options/:id',
  requirePermission('config:manage'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator(
    'json',
    z.object({
      code: z.string().min(1).max(100).optional(),
      label: z.string().min(1).max(255).optional(),
      value: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      parentOptionId: z.string().uuid().optional(),
      companyId: z.string().uuid().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const userId = c.get('userId')

    try {
      const option = await updateConfigOption(id, data, userId)
      if (!option) return c.json(errorResponse('OPTION_NOT_FOUND', 'Option not found'), 404)
      return c.json(successResponse(option))
    } catch (error) {
      if (error instanceof Error && error.message.includes('system option')) {
        return c.json(errorResponse('SYSTEM_OPTION', error.message), 403)
      }
      throw error
    }
  }
)

app.delete(
  '/config/options/:id',
  requirePermission('config:manage'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const userId = c.get('userId')

    try {
      const deleted = await deleteConfigOption(id, userId)
      if (!deleted) return c.json(errorResponse('OPTION_NOT_FOUND', 'Option not found'), 404)
      return c.json(successResponse({ deleted: true }))
    } catch (error) {
      if (error instanceof Error && error.message.includes('system option')) {
        return c.json(errorResponse('SYSTEM_OPTION', error.message), 403)
      }
      throw error
    }
  }
)

// ============== Settings ==============

app.get(
  '/config/settings',
  requirePermission('config:read'),
  zValidator(
    'query',
    z.object({
      companyId: z.string().uuid().optional(),
      isPublic: z.coerce.boolean().optional(),
    })
  ),
  async (c) => {
    const filters = c.req.valid('query')
    const settings = await listConfigSettings(filters)
    return c.json(successResponse(settings))
  }
)

app.get(
  '/config/settings/:key',
  requirePermission('config:read'),
  zValidator('param', z.object({ key: z.string() })),
  zValidator('query', z.object({ companyId: z.string().uuid().optional() })),
  async (c) => {
    const { key } = c.req.valid('param')
    const { companyId } = c.req.valid('query')
    const setting = await getConfigSetting(key, companyId)
    if (!setting) return c.json(errorResponse('SETTING_NOT_FOUND', 'Setting not found'), 404)
    return c.json(successResponse(setting))
  }
)

app.put(
  '/config/settings/:key',
  requirePermission('config:manage'),
  zValidator('param', z.object({ key: z.string() })),
  zValidator(
    'json',
    z.object({
      value: z.string(),
      valueType: z.enum(['string', 'number', 'boolean', 'json']).optional(),
      description: z.string().optional(),
      isPublic: z.boolean().optional(),
      companyId: z.string().uuid().optional(),
    })
  ),
  async (c) => {
    const { key } = c.req.valid('param')
    const data = c.req.valid('json')
    const userId = c.get('userId')

    const setting = await setConfigSetting(key, data.value, data, userId)
    return c.json(successResponse(setting))
  }
)

// ============== Audit Log ==============

app.get(
  '/config/audit-log',
  requirePermission('config:manage'),
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(50),
      tableName: z.string().optional(),
      recordId: z.string().uuid().optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid('query')
    const result = await getConfigAuditLog(query)
    return c.json(successResponse(result.data, { ...result, data: undefined }))
  }
)

export default app
```

**Acceptance Criteria:**
- [ ] Category list/get endpoints
- [ ] Option CRUD with system protection
- [ ] Settings get/set endpoints
- [ ] Audit log endpoint
- [ ] All changes logged

---

### Task 10: Wire Up Organization Routes

**File:** `src/app/api/[[...route]]/route.ts`

Update main API route to include organization and admin routes:

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
// ... existing imports
import organizationRoutes from './routes/organization.routes'
import adminRoutes from './routes/admin.routes'

const app = new Hono().basePath('/api')

// ... existing middleware

// Mount routes
app.route('/organization', organizationRoutes)
app.route('/admin', adminRoutes)

// ... rest of routes

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

**Acceptance Criteria:**
- [ ] Organization routes mounted
- [ ] Admin routes mounted
- [ ] All HTTP methods exported

---

### Task 11: Branch Management UI

**File:** `src/app/(dashboard)/admin/branches/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit, Trash, MapPin, Phone } from 'lucide-react'
import { api } from '@/lib/api/client'
import { BranchForm } from './_components/branch-form'
import { BranchContactsDialog } from './_components/branch-contacts-dialog'
import { usePermissions } from '@/features/auth/hooks/use-permissions'
import { PermissionGate } from '@/components/shared/permission-gate'

export default function BranchesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [contactsBranch, setContactsBranch] = useState<any>(null)

  const queryClient = useQueryClient()
  const { can } = usePermissions()

  // Fetch branches
  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches', { page, search, areaId: selectedAreaId, category: selectedCategory }],
    queryFn: () =>
      api.get('/organization/branches', {
        params: { page, pageSize: 25, search, areaId: selectedAreaId, category: selectedCategory },
      }),
  })

  // Fetch areas for filter
  const { data: areasData } = useQuery({
    queryKey: ['areas-options'],
    queryFn: () => api.get('/organization/areas/options'),
  })

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['branch-categories'],
    queryFn: () => api.get('/organization/branches/categories'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organization/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })

  const columns = [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          {row.original.location && <MapPin className="h-3 w-3 text-muted-foreground" />}
          <span className="truncate max-w-[200px]">{row.original.location || '-'}</span>
        </div>
      ),
    },
    { accessorKey: 'category', header: 'Category' },
    {
      accessorKey: 'areaBranches',
      header: 'Areas',
      cell: ({ row }: any) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.areaBranches?.slice(0, 2).map((ab: any) => (
            <Badge key={ab.area.id} variant="secondary" className="text-xs">
              {ab.area.name}
            </Badge>
          ))}
          {row.original.areaBranches?.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{row.original.areaBranches.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'contacts',
      header: 'Contacts',
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setContactsBranch(row.original)}
        >
          <Phone className="h-4 w-4 mr-1" />
          {row.original.contacts?.length || 0}
        </Button>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <PermissionGate permission="branches:manage">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingBranch(row.original)
                setIsFormOpen(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('Delete this branch?')) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Branch Management</h1>
        <PermissionGate permission="branches:manage">
          <Button onClick={() => { setEditingBranch(null); setIsFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Areas</SelectItem>
            {areasData?.data?.map((area: any) => (
              <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categoriesData?.data?.map((cat: string) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={branchesData?.data || []}
        isLoading={isLoading}
        pagination={{
          page,
          pageSize: 25,
          total: branchesData?.meta?.total || 0,
          onPageChange: setPage,
        }}
      />

      {/* Branch Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <BranchForm
            branch={editingBranch}
            onSuccess={() => {
              setIsFormOpen(false)
              queryClient.invalidateQueries({ queryKey: ['branches'] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Contacts Dialog */}
      {contactsBranch && (
        <BranchContactsDialog
          branch={contactsBranch}
          open={!!contactsBranch}
          onClose={() => setContactsBranch(null)}
        />
      )}
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] List branches with pagination
- [ ] Search and filter controls
- [ ] Add/edit branch dialog
- [ ] Delete with confirmation
- [ ] View/manage contacts
- [ ] Permission-gated actions

---

### Task 12: Area Management UI

**File:** `src/app/(dashboard)/admin/areas/page.tsx`

Similar structure to branches but for areas:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit, Trash, Building2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { AreaForm } from './_components/area-form'
import { AreaBranchesDialog } from './_components/area-branches-dialog'
import { usePermissions } from '@/features/auth/hooks/use-permissions'
import { PermissionGate } from '@/components/shared/permission-gate'

export default function AreasPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<any>(null)
  const [branchesArea, setBranchesArea] = useState<any>(null)

  const queryClient = useQueryClient()

  // Fetch areas
  const { data: areasData, isLoading } = useQuery({
    queryKey: ['areas', { page, search, companyId: selectedCompanyId }],
    queryFn: () =>
      api.get('/organization/areas', {
        params: { page, pageSize: 25, search, companyId: selectedCompanyId },
      }),
  })

  // Fetch companies for filter
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/lookups/companies'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organization/areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
  })

  const columns = [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.company?.name || '-'}</Badge>
      ),
    },
    {
      accessorKey: 'branchCount',
      header: 'Branches',
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBranchesArea(row.original)}
        >
          <Building2 className="h-4 w-4 mr-1" />
          {row.original.branchCount || 0}
        </Button>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <PermissionGate permission="areas:manage">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingArea(row.original)
                setIsFormOpen(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('Delete this area?')) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Area Management</h1>
        <PermissionGate permission="areas:manage">
          <Button onClick={() => { setEditingArea(null); setIsFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search areas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Companies</SelectItem>
            {companiesData?.data?.map((company: any) => (
              <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={areasData?.data || []}
        isLoading={isLoading}
        pagination={{
          page,
          pageSize: 25,
          total: areasData?.meta?.total || 0,
          onPageChange: setPage,
        }}
      />

      {/* Area Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Edit Area' : 'Add Area'}</DialogTitle>
          </DialogHeader>
          <AreaForm
            area={editingArea}
            onSuccess={() => {
              setIsFormOpen(false)
              queryClient.invalidateQueries({ queryKey: ['areas'] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Branch Assignment Dialog */}
      {branchesArea && (
        <AreaBranchesDialog
          area={branchesArea}
          open={!!branchesArea}
          onClose={() => setBranchesArea(null)}
        />
      )}
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] List areas with pagination
- [ ] Search and filter by company
- [ ] Add/edit area dialog
- [ ] Delete with confirmation
- [ ] View/manage branch assignments
- [ ] Permission-gated actions

---

### Task 13: Config Management UI

**File:** `src/app/(dashboard)/admin/config/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash, Settings2, List, History } from 'lucide-react'
import { api } from '@/lib/api/client'
import { ConfigOptionForm } from './_components/config-option-form'
import { ConfigSettingForm } from './_components/config-setting-form'
import { ConfigAuditLog } from './_components/config-audit-log'
import { PermissionGate } from '@/components/shared/permission-gate'

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('options')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isOptionFormOpen, setIsOptionFormOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<any>(null)
  const [isSettingFormOpen, setIsSettingFormOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<any>(null)

  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['config-categories'],
    queryFn: () => api.get('/admin/config/categories'),
  })

  // Fetch options for selected category
  const { data: optionsData, isLoading: optionsLoading } = useQuery({
    queryKey: ['config-options', selectedCategory],
    queryFn: () => api.get('/admin/config/options', { params: { categoryCode: selectedCategory } }),
    enabled: !!selectedCategory,
  })

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['config-settings'],
    queryFn: () => api.get('/admin/config/settings'),
  })

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/config/options/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-options'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Configuration</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="options">
            <List className="h-4 w-4 mr-2" />
            Config Options
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Config Options Tab */}
        <TabsContent value="options" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 flex-wrap">
              {categoriesData?.data?.map((cat: any) => (
                <Button
                  key={cat.code}
                  variant={selectedCategory === cat.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.code)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            {selectedCategory && (
              <PermissionGate permission="config:manage">
                <Button onClick={() => { setEditingOption(null); setIsOptionFormOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </PermissionGate>
            )}
          </div>

          {selectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {categoriesData?.data?.find((c: any) => c.code === selectedCategory)?.name}
                </CardTitle>
                <CardDescription>
                  Manage dropdown options and templates for this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div>Loading...</div>
                ) : (
                  <div className="space-y-2">
                    {optionsData?.data?.map((option: any) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{option.label}</span>
                          <Badge variant="outline">{option.code}</Badge>
                          {option.isSystem && <Badge variant="secondary">System</Badge>}
                          {option.isDefault && <Badge>Default</Badge>}
                          {!option.isActive && <Badge variant="destructive">Inactive</Badge>}
                        </div>
                        <div className="flex gap-2">
                          <PermissionGate permission="config:manage">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingOption(option)
                                setIsOptionFormOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!option.isSystem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Delete this option?')) {
                                    deleteOptionMutation.mutate(option.id)
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </PermissionGate>
                        </div>
                      </div>
                    ))}
                    {optionsData?.data?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No options in this category
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedCategory && (
            <div className="text-center py-12 text-muted-foreground">
              Select a category to view and manage options
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Key-value configuration settings</CardDescription>
              </div>
              <PermissionGate permission="config:manage">
                <Button onClick={() => { setEditingSetting(null); setIsSettingFormOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Setting
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-2">
                  {settingsData?.data?.map((setting: any) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{setting.key}</span>
                          <Badge variant="outline">{setting.valueType}</Badge>
                          {setting.isPublic && <Badge variant="secondary">Public</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {setting.description || 'No description'}
                        </div>
                        <div className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {setting.value?.substring(0, 50)}{setting.value?.length > 50 ? '...' : ''}
                        </div>
                      </div>
                      <PermissionGate permission="config:manage">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSetting(setting)
                            setIsSettingFormOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <ConfigAuditLog />
        </TabsContent>
      </Tabs>

      {/* Option Form Dialog */}
      {isOptionFormOpen && (
        <ConfigOptionForm
          option={editingOption}
          categoryCode={selectedCategory}
          open={isOptionFormOpen}
          onClose={() => {
            setIsOptionFormOpen(false)
            setEditingOption(null)
          }}
          onSuccess={() => {
            setIsOptionFormOpen(false)
            setEditingOption(null)
            queryClient.invalidateQueries({ queryKey: ['config-options'] })
          }}
        />
      )}

      {/* Setting Form Dialog */}
      {isSettingFormOpen && (
        <ConfigSettingForm
          setting={editingSetting}
          open={isSettingFormOpen}
          onClose={() => {
            setIsSettingFormOpen(false)
            setEditingSetting(null)
          }}
          onSuccess={() => {
            setIsSettingFormOpen(false)
            setEditingSetting(null)
            queryClient.invalidateQueries({ queryKey: ['config-settings'] })
          }}
        />
      )}
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Tab-based layout (Options, Settings, Audit)
- [ ] Category selector for options
- [ ] List/add/edit/delete options
- [ ] System option protection
- [ ] List/add/edit settings
- [ ] View audit log

---

## Dependencies

### NPM Packages
No new packages required - uses existing Hono, Drizzle, TanStack Query, shadcn/ui.

### Database Tables
All tables defined in design document Section 2.2 (Organization) and Section 2.6 (Admin Configuration).

### Permissions Required
- `branches:read` - View branches
- `branches:manage` - Create/update/delete branches
- `areas:read` - View areas
- `areas:manage` - Create/update/delete areas
- `config:read` - View configuration
- `config:manage` - Modify configuration

---

## Testing Checklist

- [ ] Branch CRUD operations
- [ ] Branch contact management
- [ ] Area CRUD operations
- [ ] Area-branch assignments
- [ ] Config category listing
- [ ] Config option CRUD with system protection
- [ ] Config setting get/set
- [ ] Audit log recording
- [ ] Permission checks on all endpoints
- [ ] UI form validation
- [ ] Soft delete behavior
- [ ] Filter and search functionality

---

## Notes

1. **Soft Delete** - Branches and areas use soft delete (deleted_at) to preserve referential integrity with clients
2. **System Options** - Config options marked as `is_system` cannot have their code/label modified or be deleted
3. **Audit Trail** - All config changes are logged to `config_audit_log`
4. **Company Scoping** - Areas are scoped to companies; config options can be company-specific or global
