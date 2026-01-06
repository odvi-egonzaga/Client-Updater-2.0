/**
 * Area queries for Phase 5 Organization & Admin
 */

import { db } from '../index'
import { areas, areaBranches, branches, companies } from '../schema/organization'
import { eq, and, isNull, desc, sql, or, like, inArray, count } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface AreaWithBranchCount {
  id: string
  code: string
  name: string
  companyId: string
  isActive: boolean
  sortOrder: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  _count: {
    branches: number
  }
}

export interface AreaWithRelations {
  id: string
  code: string
  name: string
  companyId: string
  isActive: boolean
  sortOrder: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  branches: Branch[]
}

export interface AreaOption {
  id: string
  code: string
  name: string
  companyId: string
}

export interface CreateAreaInput {
  code: string
  name: string
  companyId: string
}

export interface UpdateAreaInput {
  name?: string
  companyId?: string
  isActive?: boolean
  sortOrder?: number
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
export type Area = typeof areas.$inferSelect
export type Branch = typeof branches.$inferSelect

/**
 * List areas with pagination, search, company filter, active status filter, includes branch count
 */
export async function listAreas(params: {
  page?: number
  pageSize?: number
  search?: string
  companyId?: string
  isActive?: boolean
}): Promise<PaginatedResult<AreaWithBranchCount>> {
  const page = params.page || 1
  const pageSize = Math.min(params.pageSize || 25, 100)
  const offset = (page - 1) * pageSize

  try {
    // Build conditions
    const conditions = [isNull(areas.deletedAt)]

    if (params.search) {
      const searchTerm = `%${params.search}%`
      conditions.push(
        or(
          like(areas.code, searchTerm),
          like(areas.name, searchTerm)
        )
      )
    }

    if (params.companyId) {
      conditions.push(eq(areas.companyId, params.companyId))
    }

    if (params.isActive !== undefined) {
      conditions.push(eq(areas.isActive, params.isActive))
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(${areas.id})`.as('count') })
      .from(areas)
      .where(and(...conditions))

    const total = countResult[0]?.count || 0

    // Get areas with branch count
    const areaData = await db
      .select({
        id: areas.id,
        code: areas.code,
        name: areas.name,
        companyId: areas.companyId,
        isActive: areas.isActive,
        sortOrder: areas.sortOrder,
        deletedAt: areas.deletedAt,
        createdAt: areas.createdAt,
        updatedAt: areas.updatedAt,
        _count: {
          branches: sql<number>`count(${areaBranches.branchId})`.as('branches_count'),
        },
      })
      .from(areas)
      .leftJoin(areaBranches, eq(areas.id, areaBranches.areaId))
      .where(and(...conditions))
      .groupBy(areas.id)
      .orderBy(desc(areas.createdAt))
      .limit(pageSize)
      .offset(offset)

    const data: AreaWithBranchCount[] = areaData.map((area) => ({
      ...area,
      _count: {
        branches: Number(area._count.branches),
      },
    }))

    logger.info('Retrieved areas', {
      action: 'list_areas',
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
    logger.error('Failed to retrieve areas', error as Error, {
      action: 'list_areas',
      params,
    })
    throw error
  }
}

/**
 * Get area by ID with company and branches
 */
export async function getAreaById(id: string): Promise<AreaWithRelations | null> {
  try {
    const areaResult = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, id), isNull(areas.deletedAt)))
      .limit(1)

    if (!areaResult[0]) {
      return null
    }

    const area = areaResult[0]

    // Get branches for this area
    const branchAssignments = await db
      .select({
        branch: branches,
        isPrimary: areaBranches.isPrimary,
        assignedAt: areaBranches.assignedAt,
      })
      .from(areaBranches)
      .innerJoin(branches, eq(areaBranches.branchId, branches.id))
      .where(and(eq(areaBranches.areaId, id), isNull(branches.deletedAt)))

    const result: AreaWithRelations = {
      ...area,
      branches: branchAssignments.map((a) => a.branch),
    }

    logger.info('Retrieved area by ID', {
      action: 'get_area_by_id',
      areaId: id,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve area by ID', error as Error, {
      action: 'get_area_by_id',
      areaId: id,
    })
    throw error
  }
}

/**
 * Create area
 */
export async function createArea(data: CreateAreaInput): Promise<Area> {
  try {
    // Check if area code already exists
    const existing = await db
      .select()
      .from(areas)
      .where(eq(areas.code, data.code))
      .limit(1)

    if (existing[0]) {
      throw new Error(`Area with code "${data.code}" already exists`)
    }

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, data.companyId))
      .limit(1)

    if (!company[0]) {
      throw new Error(`Company with ID "${data.companyId}" not found`)
    }

    // Create area
    const result = await db.insert(areas).values({
      code: data.code,
      name: data.name,
      companyId: data.companyId,
    }).returning()

    const area = result[0]

    logger.info('Created area', {
      action: 'create_area',
      areaId: area.id,
      code: area.code,
    })

    return area
  } catch (error) {
    logger.error('Failed to create area', error as Error, {
      action: 'create_area',
      code: data.code,
    })
    throw error
  }
}

/**
 * Update area (partial updates)
 */
export async function updateArea(id: string, data: UpdateAreaInput): Promise<Area> {
  try {
    // Check if area exists
    const existing = await getAreaById(id)
    if (!existing) {
      throw new Error(`Area with ID "${id}" not found`)
    }

    // If updating companyId, verify it exists
    if (data.companyId) {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, data.companyId))
        .limit(1)

      if (!company[0]) {
        throw new Error(`Company with ID "${data.companyId}" not found`)
      }
    }

    // Update area
    const result = await db
      .update(areas)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(areas.id, id))
      .returning()

    const area = result[0]

    logger.info('Updated area', {
      action: 'update_area',
      areaId: id,
    })

    return area
  } catch (error) {
    logger.error('Failed to update area', error as Error, {
      action: 'update_area',
      areaId: id,
    })
    throw error
  }
}

/**
 * Delete area (soft delete)
 */
export async function deleteArea(id: string): Promise<void> {
  try {
    // Check if area exists
    const existing = await getAreaById(id)
    if (!existing) {
      throw new Error(`Area with ID "${id}" not found`)
    }

    // Soft delete area (areaBranches will be cascade deleted)
    await db
      .update(areas)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(areas.id, id))

    logger.info('Deleted area', {
      action: 'delete_area',
      areaId: id,
    })
  } catch (error) {
    logger.error('Failed to delete area', error as Error, {
      action: 'delete_area',
      areaId: id,
    })
    throw error
  }
}

/**
 * Get minimal data for dropdowns
 */
export async function getAreaOptions(params?: {
  companyId?: string
  isActive?: boolean
}): Promise<AreaOption[]> {
  try {
    const conditions = [isNull(areas.deletedAt)]

    if (params?.companyId) {
      conditions.push(eq(areas.companyId, params.companyId))
    }

    if (params?.isActive !== undefined) {
      conditions.push(eq(areas.isActive, params.isActive))
    }

    const result = await db
      .select({
        id: areas.id,
        code: areas.code,
        name: areas.name,
        companyId: areas.companyId,
      })
      .from(areas)
      .where(and(...conditions))
      .orderBy(areas.sortOrder, areas.name)

    logger.info('Retrieved area options', {
      action: 'get_area_options',
      count: result.length,
      params,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve area options', error as Error, {
      action: 'get_area_options',
      params,
    })
    throw error
  }
}
