/**
 * Branch queries for Phase 5 Organization & Admin
 */

import { db } from '../index'
import { branches, branchContacts, areaBranches, areas } from '../schema/organization'
import { eq, and, isNull, desc, sql, or, like, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface BranchWithRelations {
  id: string
  code: string
  name: string
  location: string | null
  category: string | null
  isActive: boolean
  sortOrder: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  contacts: BranchContact[]
  areas: Area[]
}

export interface BranchOption {
  id: string
  code: string
  name: string
  location: string | null
}

export interface CreateBranchInput {
  code: string
  name: string
  location?: string
  category?: string
  contacts?: CreateBranchContactInput[]
}

export interface UpdateBranchInput {
  name?: string
  location?: string
  category?: string
  isActive?: boolean
  sortOrder?: number
}

export interface CreateBranchContactInput {
  type: string
  label?: string
  value: string
  isPrimary?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// Re-export types from schema
export type Branch = typeof branches.$inferSelect
export type BranchContact = typeof branchContacts.$inferSelect
export type Area = typeof areas.$inferSelect

/**
 * List branches with pagination, search, area filter, category filter, active status filter
 */
export async function listBranches(params: {
  page?: number
  pageSize?: number
  search?: string
  areaId?: string
  category?: string
  isActive?: boolean
}): Promise<PaginatedResult<BranchWithRelations>> {
  const page = params.page || 1
  const pageSize = Math.min(params.pageSize || 25, 100)
  const offset = (page - 1) * pageSize

  try {
    // Build conditions
    const conditions = [isNull(branches.deletedAt)]

    if (params.search) {
      const searchTerm = `%${params.search}%`
      conditions.push(
        or(
          like(branches.code, searchTerm),
          like(branches.name, searchTerm),
          like(branches.location || '', searchTerm)
        )
      )
    }

    if (params.category) {
      conditions.push(eq(branches.category, params.category))
    }

    if (params.isActive !== undefined) {
      conditions.push(eq(branches.isActive, params.isActive))
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(${branches.id})`.as('count') })
      .from(branches)
      .where(and(...conditions))

    const total = countResult[0]?.count || 0

    // Get branches with contacts and areas
    const branchData = await db
      .select()
      .from(branches)
      .where(and(...conditions))
      .orderBy(desc(branches.createdAt))
      .limit(pageSize)
      .offset(offset)

    // Get contacts for all branches
    const branchIds = branchData.map((b) => b.id)
    const contacts = branchIds.length > 0
      ? await db
          .select()
          .from(branchContacts)
          .where(inArray(branchContacts.branchId, branchIds))
      : []

    // Get areas for all branches
    const areaAssignments = branchIds.length > 0
      ? await db
          .select({
            branchId: areaBranches.branchId,
            area: areas,
          })
          .from(areaBranches)
          .innerJoin(areas, eq(areaBranches.areaId, areas.id))
          .where(inArray(areaBranches.branchId, branchIds))
      : []

    // Build result with relations
    const data: BranchWithRelations[] = branchData.map((branch) => ({
      ...branch,
      contacts: contacts.filter((c) => c.branchId === branch.id),
      areas: areaAssignments
        .filter((a) => a.branchId === branch.id)
        .map((a) => a.area),
    }))

    logger.info('Retrieved branches', {
      action: 'list_branches',
      count: data.length,
      page,
      pageSize,
      total,
    })

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    logger.error('Failed to retrieve branches', error as Error, {
      action: 'list_branches',
      params,
    })
    throw error
  }
}

/**
 * Get branch by ID with contacts and area assignments
 */
export async function getBranchById(id: string): Promise<BranchWithRelations | null> {
  try {
    const branchResult = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, id), isNull(branches.deletedAt)))
      .limit(1)

    if (!branchResult[0]) {
      return null
    }

    const branch = branchResult[0]

    // Get contacts
    const contacts = await db
      .select()
      .from(branchContacts)
      .where(eq(branchContacts.branchId, id))

    // Get areas
    const areaAssignments = await db
      .select({
        area: areas,
      })
      .from(areaBranches)
      .innerJoin(areas, eq(areaBranches.areaId, areas.id))
      .where(eq(areaBranches.branchId, id))

    const result: BranchWithRelations = {
      ...branch,
      contacts,
      areas: areaAssignments.map((a) => a.area),
    }

    logger.info('Retrieved branch by ID', {
      action: 'get_branch_by_id',
      branchId: id,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve branch by ID', error as Error, {
      action: 'get_branch_by_id',
      branchId: id,
    })
    throw error
  }
}

/**
 * Get branch by code
 */
export async function getBranchByCode(code: string): Promise<Branch | null> {
  try {
    const result = await db
      .select()
      .from(branches)
      .where(and(eq(branches.code, code), isNull(branches.deletedAt)))
      .limit(1)

    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to retrieve branch by code', error as Error, {
      action: 'get_branch_by_code',
      code,
    })
    throw error
  }
}

/**
 * Create branch with optional contacts array
 */
export async function createBranch(data: CreateBranchInput): Promise<Branch> {
  try {
    // Check if branch code already exists
    const existing = await getBranchByCode(data.code)
    if (existing) {
      throw new Error(`Branch with code "${data.code}" already exists`)
    }

    // Create branch
    const result = await db.insert(branches).values({
      code: data.code,
      name: data.name,
      location: data.location || null,
      category: data.category || null,
    }).returning()

    const branch = result[0]

    // Create contacts if provided
    if (data.contacts && data.contacts.length > 0) {
      for (const contact of data.contacts) {
        // Handle primary contact - clear existing primary of same type
        if (contact.isPrimary) {
          await db
            .update(branchContacts)
            .set({ isPrimary: false })
            .where(
              and(
                eq(branchContacts.branchId, branch.id),
                eq(branchContacts.type, contact.type)
              )
            )
        }

        await db.insert(branchContacts).values({
          branchId: branch.id,
          type: contact.type,
          label: contact.label || null,
          value: contact.value,
          isPrimary: contact.isPrimary || false,
        })
      }
    }

    logger.info('Created branch', {
      action: 'create_branch',
      branchId: branch.id,
      code: branch.code,
    })

    return branch
  } catch (error) {
    logger.error('Failed to create branch', error as Error, {
      action: 'create_branch',
      code: data.code,
    })
    throw error
  }
}

/**
 * Update branch (partial updates)
 */
export async function updateBranch(id: string, data: UpdateBranchInput): Promise<Branch> {
  try {
    // Check if branch exists
    const existing = await getBranchById(id)
    if (!existing) {
      throw new Error(`Branch with ID "${id}" not found`)
    }

    // Update branch
    const result = await db
      .update(branches)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))
      .returning()

    const branch = result[0]

    logger.info('Updated branch', {
      action: 'update_branch',
      branchId: id,
    })

    return branch
  } catch (error) {
    logger.error('Failed to update branch', error as Error, {
      action: 'update_branch',
      branchId: id,
    })
    throw error
  }
}

/**
 * Delete branch (soft delete)
 */
export async function deleteBranch(id: string): Promise<void> {
  try {
    // Check if branch exists
    const existing = await getBranchById(id)
    if (!existing) {
      throw new Error(`Branch with ID "${id}" not found`)
    }

    // Soft delete branch
    await db
      .update(branches)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))

    logger.info('Deleted branch', {
      action: 'delete_branch',
      branchId: id,
    })
  } catch (error) {
    logger.error('Failed to delete branch', error as Error, {
      action: 'delete_branch',
      branchId: id,
    })
    throw error
  }
}

/**
 * Get minimal data for dropdowns
 */
export async function getBranchOptions(params?: {
  areaId?: string
  isActive?: boolean
}): Promise<BranchOption[]> {
  try {
    const conditions = [isNull(branches.deletedAt)]

    if (params?.isActive !== undefined) {
      conditions.push(eq(branches.isActive, params.isActive))
    }

    let query = db
      .select({
        id: branches.id,
        code: branches.code,
        name: branches.name,
        location: branches.location,
      })
      .from(branches)
      .where(and(...conditions))
      .orderBy(branches.sortOrder, branches.name)

    // Filter by area if provided
    if (params?.areaId) {
      query = query
        .innerJoin(areaBranches, eq(branches.id, areaBranches.branchId))
        .where(and(...conditions, eq(areaBranches.areaId, params.areaId)))
    }

    const result = await query

    logger.info('Retrieved branch options', {
      action: 'get_branch_options',
      count: result.length,
      params,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve branch options', error as Error, {
      action: 'get_branch_options',
      params,
    })
    throw error
  }
}

/**
 * Get distinct categories for filters
 */
export async function getBranchCategories(): Promise<string[]> {
  try {
    const result = await db
      .selectDistinct({ category: branches.category })
      .from(branches)
      .where(and(isNotNull(branches.category), isNull(branches.deletedAt)))
      .orderBy(branches.category)

    const categories = result
      .map((r) => r.category)
      .filter((c): c is string => c !== null)

    logger.info('Retrieved branch categories', {
      action: 'get_branch_categories',
      count: categories.length,
    })

    return categories
  } catch (error) {
    logger.error('Failed to retrieve branch categories', error as Error, {
      action: 'get_branch_categories',
    })
    throw error
  }
}

// Helper function for isNotNull
function isNotNull(column: any) {
  return sql`${column} is not null`
}
