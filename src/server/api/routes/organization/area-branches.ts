import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  getBranchesForArea,
  assignBranchesToArea,
  removeBranchFromArea,
  setPrimaryBranch,
} from '@/server/db/queries/area-branches'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const areaBranchRoutes = new Hono()

// Validation schemas
const assignBranchesSchema = z.object({
  branchIds: z.array(z.string().uuid()).min(1),
  replaceExisting: z.boolean().optional().default(false),
})

/**
 * GET /api/organization/areas/:areaId/branches
 * Get branches for area
 */
areaBranchRoutes.get('/:areaId/branches', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string
  const areaId = c.req.param('areaId')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'areas', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have areas:read permission', {
        action: 'get_branches_for_area',
        userId,
        orgId,
        areaId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view areas',
          },
        },
        403
      )
    }

    const branches = await getBranchesForArea(areaId)

    logger.info('Retrieved branches for area', {
      action: 'get_branches_for_area',
      userId,
      orgId,
      areaId,
      count: branches.length,
    })

    return c.json({
      success: true,
      data: branches,
    })
  } catch (error) {
    logger.error('Failed to retrieve branches for area', error as Error, {
      action: 'get_branches_for_area',
      userId,
      orgId,
      areaId,
    })

    return c.json(
      {
        success: false,
        error: {
          code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve branches',
        },
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    )
  }
})

/**
 * POST /api/organization/areas/:areaId/branches
 * Assign branches to area
 */
areaBranchRoutes.post(
  '/:areaId/branches',
  rateLimitMiddleware('write'),
  zValidator('json', assignBranchesSchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const areaId = c.req.param('areaId')
    const { branchIds, replaceExisting } = c.req.valid('json')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'areas', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have areas:manage permission', {
          action: 'assign_branches_to_area',
          userId,
          orgId,
          areaId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage areas',
            },
          },
          403
        )
      }

      const assignments = await assignBranchesToArea({
        areaId,
        branchIds,
        replaceExisting,
      })

      logger.info('Assigned branches to area', {
        action: 'assign_branches_to_area',
        userId,
        orgId,
        areaId,
        branchIds,
        count: assignments.length,
        replaceExisting,
      })

      return c.json({
        success: true,
        data: assignments,
      })
    } catch (error) {
      logger.error('Failed to assign branches to area', error as Error, {
        action: 'assign_branches_to_area',
        userId,
        orgId,
        areaId,
        branchIds,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to assign branches',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * DELETE /api/organization/areas/:areaId/branches/:branchId
 * Remove branch from area
 */
areaBranchRoutes.delete(
  '/:areaId/branches/:branchId',
  rateLimitMiddleware('write'),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const areaId = c.req.param('areaId')
    const branchId = c.req.param('branchId')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'areas', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have areas:manage permission', {
          action: 'remove_branch_from_area',
          userId,
          orgId,
          areaId,
          branchId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage areas',
            },
          },
          403
        )
      }

      await removeBranchFromArea({
        areaId,
        branchId,
      })

      logger.info('Removed branch from area', {
        action: 'remove_branch_from_area',
        userId,
        orgId,
        areaId,
        branchId,
      })

      return c.json({
        success: true,
        data: null,
      })
    } catch (error) {
      logger.error('Failed to remove branch from area', error as Error, {
        action: 'remove_branch_from_area',
        userId,
        orgId,
        areaId,
        branchId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to remove branch',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * POST /api/organization/areas/:areaId/branches/:branchId/primary
 * Set primary branch
 */
areaBranchRoutes.post(
  '/:areaId/branches/:branchId/primary',
  rateLimitMiddleware('write'),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const areaId = c.req.param('areaId')
    const branchId = c.req.param('branchId')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'areas', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have areas:manage permission', {
          action: 'set_primary_branch',
          userId,
          orgId,
          areaId,
          branchId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage areas',
            },
          },
          403
        )
      }

      await setPrimaryBranch({
        areaId,
        branchId,
      })

      logger.info('Set primary branch for area', {
        action: 'set_primary_branch',
        userId,
        orgId,
        areaId,
        branchId,
      })

      return c.json({
        success: true,
        data: null,
      })
    } catch (error) {
      logger.error('Failed to set primary branch', error as Error, {
        action: 'set_primary_branch',
        userId,
        orgId,
        areaId,
        branchId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to set primary branch',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)
