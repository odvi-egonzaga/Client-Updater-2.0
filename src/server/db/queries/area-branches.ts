/**
 * Area-Branch assignment queries for Phase 5 Organization & Admin
 */

import { db } from '../index'
import { areas, branches, areaBranches } from '../schema/organization'
import { eq, and, isNull, inArray, not } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface AssignBranchesToAreaParams {
  areaId: string
  branchIds: string[]
  replaceExisting?: boolean
}

export interface RemoveBranchFromAreaParams {
  areaId: string
  branchId: string
}

export interface SetPrimaryBranchParams {
  areaId: string
  branchId: string
}

// Re-export types from schema
export type Area = typeof areas.$inferSelect
export type Branch = typeof branches.$inferSelect
export type AreaBranch = typeof areaBranches.$inferSelect

/**
 * Get all branches for an area
 */
export async function getBranchesForArea(areaId: string): Promise<Branch[]> {
  try {
    // Verify area exists
    const area = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, areaId), isNull(areas.deletedAt)))
      .limit(1)

    if (!area[0]) {
      throw new Error(`Area with ID "${areaId}" not found`)
    }

    // Get branches for this area
    const assignments = await db
      .select({
        branch: branches,
        isPrimary: areaBranches.isPrimary,
        assignedAt: areaBranches.assignedAt,
      })
      .from(areaBranches)
      .innerJoin(branches, eq(areaBranches.branchId, branches.id))
      .where(and(eq(areaBranches.areaId, areaId), isNull(branches.deletedAt)))

    const result = assignments.map((a) => a.branch)

    logger.info('Retrieved branches for area', {
      action: 'get_branches_for_area',
      areaId,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve branches for area', error as Error, {
      action: 'get_branches_for_area',
      areaId,
    })
    throw error
  }
}

/**
 * Get all areas for a branch
 */
export async function getAreasForBranch(branchId: string): Promise<Area[]> {
  try {
    // Verify branch exists
    const branch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), isNull(branches.deletedAt)))
      .limit(1)

    if (!branch[0]) {
      throw new Error(`Branch with ID "${branchId}" not found`)
    }

    // Get areas for this branch
    const assignments = await db
      .select({
        area: areas,
        isPrimary: areaBranches.isPrimary,
        assignedAt: areaBranches.assignedAt,
      })
      .from(areaBranches)
      .innerJoin(areas, eq(areaBranches.areaId, areas.id))
      .where(and(eq(areaBranches.branchId, branchId), isNull(areas.deletedAt)))

    const result = assignments.map((a) => a.area)

    logger.info('Retrieved areas for branch', {
      action: 'get_areas_for_branch',
      branchId,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve areas for branch', error as Error, {
      action: 'get_areas_for_branch',
      branchId,
    })
    throw error
  }
}

/**
 * Bulk assign branches to area with replaceExisting option
 */
export async function assignBranchesToArea(params: AssignBranchesToAreaParams): Promise<AreaBranch[]> {
  const { areaId, branchIds, replaceExisting = false } = params

  try {
    // Verify area exists
    const area = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, areaId), isNull(areas.deletedAt)))
      .limit(1)

    if (!area[0]) {
      throw new Error(`Area with ID "${areaId}" not found`)
    }

    // Verify all branches exist
    const branchesData = await db
      .select()
      .from(branches)
      .where(and(inArray(branches.id, branchIds), isNull(branches.deletedAt)))

    if (branchesData.length !== branchIds.length) {
      throw new Error('One or more branches not found or deleted')
    }

    // If replaceExisting, remove all existing assignments
    if (replaceExisting) {
      await db
        .delete(areaBranches)
        .where(eq(areaBranches.areaId, areaId))
    }

    // Create assignments
    const assignments: AreaBranch[] = []
    for (const branchId of branchIds) {
      // Check if assignment already exists
      const existing = await db
        .select()
        .from(areaBranches)
        .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))
        .limit(1)

      if (existing[0]) {
        assignments.push(existing[0])
        continue
      }

      const result = await db.insert(areaBranches).values({
        areaId,
        branchId,
        isPrimary: false, // Default to false, can be set separately
      }).returning()

      assignments.push(result[0])
    }

    logger.info('Assigned branches to area', {
      action: 'assign_branches_to_area',
      areaId,
      branchIds,
      count: assignments.length,
      replaceExisting,
    })

    return assignments
  } catch (error) {
    logger.error('Failed to assign branches to area', error as Error, {
      action: 'assign_branches_to_area',
      params,
    })
    throw error
  }
}

/**
 * Remove single assignment
 */
export async function removeBranchFromArea(params: RemoveBranchFromAreaParams): Promise<void> {
  const { areaId, branchId } = params

  try {
    // Verify assignment exists
    const existing = await db
      .select()
      .from(areaBranches)
      .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))
      .limit(1)

    if (!existing[0]) {
      throw new Error(`Assignment not found for area "${areaId}" and branch "${branchId}"`)
    }

    // Remove assignment
    await db
      .delete(areaBranches)
      .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))

    logger.info('Removed branch from area', {
      action: 'remove_branch_from_area',
      areaId,
      branchId,
    })
  } catch (error) {
    logger.error('Failed to remove branch from area', error as Error, {
      action: 'remove_branch_from_area',
      params,
    })
    throw error
  }
}

/**
 * Set primary branch for area
 */
export async function setPrimaryBranch(params: SetPrimaryBranchParams): Promise<void> {
  const { areaId, branchId } = params

  try {
    // Verify area exists
    const area = await db
      .select()
      .from(areas)
      .where(and(eq(areas.id, areaId), isNull(areas.deletedAt)))
      .limit(1)

    if (!area[0]) {
      throw new Error(`Area with ID "${areaId}" not found`)
    }

    // Verify branch exists and is assigned to area
    const assignment = await db
      .select()
      .from(areaBranches)
      .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))
      .limit(1)

    if (!assignment[0]) {
      throw new Error(`Branch "${branchId}" is not assigned to area "${areaId}"`)
    }

    // Clear all primary flags for this area
    await db
      .update(areaBranches)
      .set({ isPrimary: false })
      .where(eq(areaBranches.areaId, areaId))

    // Set new primary
    await db
      .update(areaBranches)
      .set({ isPrimary: true })
      .where(and(eq(areaBranches.areaId, areaId), eq(areaBranches.branchId, branchId)))

    logger.info('Set primary branch for area', {
      action: 'set_primary_branch',
      areaId,
      branchId,
    })
  } catch (error) {
    logger.error('Failed to set primary branch for area', error as Error, {
      action: 'set_primary_branch',
      params,
    })
    throw error
  }
}

/**
 * Get branches not in any area
 */
export async function getUnassignedBranches(companyId?: string): Promise<Branch[]> {
  try {
    // Get all active branches
    const conditions = [isNull(branches.deletedAt)]

    const allBranches = await db
      .select()
      .from(branches)
      .where(and(...conditions))

    // Get all assigned branch IDs
    const assignedBranches = await db
      .selectDistinct({ branchId: areaBranches.branchId })
      .from(areaBranches)

    const assignedBranchIds = new Set(assignedBranches.map((a) => a.branchId))

    // Filter out assigned branches
    let result = allBranches.filter((b) => !assignedBranchIds.has(b.id))

    // Filter by company if provided (need to join with areas)
    if (companyId) {
      const branchIdsInCompany = await db
        .selectDistinct({ branchId: areaBranches.branchId })
        .from(areaBranches)
        .innerJoin(areas, eq(areaBranches.areaId, areas.id))
        .where(eq(areas.companyId, companyId))

      const branchIdsInCompanySet = new Set(branchIdsInCompany.map((b) => b.branchId))
      result = result.filter((b) => branchIdsInCompanySet.has(b.id))
    }

    logger.info('Retrieved unassigned branches', {
      action: 'get_unassigned_branches',
      count: result.length,
      companyId,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve unassigned branches', error as Error, {
      action: 'get_unassigned_branches',
      companyId,
    })
    throw error
  }
}
