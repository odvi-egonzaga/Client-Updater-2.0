import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchOptions,
  getBranchCategories,
} from '@/server/db/queries/branches'
import { hasPermission } from '@/lib/permissions'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const branchRoutes = new Hono()

// Validation schemas
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().optional(),
  areaId: z.string().optional(),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

const createBranchSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  location: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  contacts: z
    .array(
      z.object({
        type: z.string().min(1).max(50),
        label: z.string().max(100).optional(),
        value: z.string().min(1).max(500),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
})

const updateBranchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const optionsQuerySchema = z.object({
  areaId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

/**
 * GET /api/organization/branches
 * List branches with pagination, search, filters
 */
branchRoutes.get(
  '/',
  rateLimitMiddleware('read'),
  zValidator('query', listQuerySchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { page, pageSize, search, areaId, category, isActive } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'branches', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have branches:read permission', {
          action: 'list_branches',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view branches',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // If user has no access, return empty result
      if (branchFilter.scope === 'none') {
        return c.json({
          success: true,
          data: [],
          meta: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        })
      }

      // List branches
      const result = await listBranches({
        page,
        pageSize,
        search,
        category,
        isActive,
      })

      // Filter by territory if user has territory access
      let filteredData = result.data
      if (branchFilter.scope === 'territory') {
        filteredData = result.data.filter((branch) =>
          branchFilter.branchIds.includes(branch.id)
        )
      }

      // Recalculate pagination after filtering
      const total = filteredData.length
      const totalPages = Math.ceil(total / pageSize)
      const startIndex = (page - 1) * pageSize
      const paginatedData = filteredData.slice(startIndex, startIndex + pageSize)

      logger.info('Retrieved branches list', {
        action: 'list_branches',
        userId,
        orgId,
        page,
        pageSize,
        total: filteredData.length,
        filters: { search, category, isActive },
      })

      return c.json({
        success: true,
        data: paginatedData,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve branches list', error as Error, {
        action: 'list_branches',
        userId,
        orgId,
        page,
        pageSize,
        filters: { search, category, isActive },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve branches',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/organization/branches/options
 * Get branches for dropdowns
 */
branchRoutes.get(
  '/options',
  rateLimitMiddleware('read'),
  zValidator('query', optionsQuerySchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { areaId, isActive } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'branches', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have branches:read permission', {
          action: 'get_branch_options',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view branches',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // If user has no access, return empty result
      if (branchFilter.scope === 'none') {
        return c.json({
          success: true,
          data: [],
        })
      }

      // Get branch options
      let options = await getBranchOptions({ areaId, isActive })

      // Filter by territory if user has territory access
      if (branchFilter.scope === 'territory') {
        options = options.filter((branch) => branchFilter.branchIds.includes(branch.id))
      }

      logger.info('Retrieved branch options', {
        action: 'get_branch_options',
        userId,
        orgId,
        count: options.length,
        filters: { areaId, isActive },
      })

      return c.json({
        success: true,
        data: options,
      })
    } catch (error) {
      logger.error('Failed to retrieve branch options', error as Error, {
        action: 'get_branch_options',
        userId,
        orgId,
        filters: { areaId, isActive },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve branch options',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/organization/branches/categories
 * Get distinct categories
 */
branchRoutes.get('/categories', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'branches', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have branches:read permission', {
        action: 'get_branch_categories',
        userId,
        orgId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view branches',
          },
        },
        403
      )
    }

    const categories = await getBranchCategories()

    logger.info('Retrieved branch categories', {
      action: 'get_branch_categories',
      userId,
      orgId,
      count: categories.length,
    })

    return c.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    logger.error('Failed to retrieve branch categories', error as Error, {
      action: 'get_branch_categories',
      userId,
      orgId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve branch categories',
        },
      },
      500
    )
  }
})

/**
 * GET /api/organization/branches/:id
 * Get branch by ID
 */
branchRoutes.get('/:id', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string
  const id = c.req.param('id')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'branches', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have branches:read permission', {
        action: 'get_branch_by_id',
        userId,
        orgId,
        branchId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view branches',
          },
        },
        403
      )
    }

    // Get user's branch filter for territory access
    const branchFilter = await getUserBranchFilter(userId, orgId)

    // If user has no access, return 403
    if (branchFilter.scope === 'none') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this branch',
          },
        },
        403
      )
    }

    const branch = await getBranchById(id)

    if (!branch) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Branch not found',
          },
        },
        404
      )
    }

    // Check if user has access to this branch
    if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(branch.id)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this branch',
          },
        },
        403
      )
    }

    logger.info('Retrieved branch by ID', {
      action: 'get_branch_by_id',
      userId,
      orgId,
      branchId: id,
    })

    return c.json({
      success: true,
      data: branch,
    })
  } catch (error) {
    logger.error('Failed to retrieve branch by ID', error as Error, {
      action: 'get_branch_by_id',
      userId,
      orgId,
      branchId: id,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve branch',
        },
      },
      500
    )
  }
})

/**
 * POST /api/organization/branches
 * Create branch
 */
branchRoutes.post(
  '/',
  rateLimitMiddleware('write'),
  zValidator('json', createBranchSchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const data = c.req.valid('json')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have branches:manage permission', {
          action: 'create_branch',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to create branches',
            },
          },
          403
        )
      }

      const branch = await createBranch(data)

      logger.info('Created branch', {
        action: 'create_branch',
        userId,
        orgId,
        branchId: branch.id,
        code: branch.code,
      })

      return c.json(
        {
          success: true,
          data: branch,
        },
        201
      )
    } catch (error) {
      logger.error('Failed to create branch', error as Error, {
        action: 'create_branch',
        userId,
        orgId,
        code: data.code,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('already exists') ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create branch',
          },
        },
        error instanceof Error && error.message.includes('already exists') ? 400 : 500
      )
    }
  }
)

/**
 * PATCH /api/organization/branches/:id
 * Update branch
 */
branchRoutes.patch(
  '/:id',
  rateLimitMiddleware('write'),
  zValidator('json', updateBranchSchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const id = c.req.param('id')
    const data = c.req.valid('json')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have branches:manage permission', {
          action: 'update_branch',
          userId,
          orgId,
          branchId: id,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to update branches',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // If user has no access, return 403
      if (branchFilter.scope === 'none') {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this branch',
            },
          },
          403
        )
      }

      // Check if user has access to this branch
      if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(id)) {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this branch',
            },
          },
          403
        )
      }

      const branch = await updateBranch(id, data)

      logger.info('Updated branch', {
        action: 'update_branch',
        userId,
        orgId,
        branchId: id,
      })

      return c.json({
        success: true,
        data: branch,
      })
    } catch (error) {
      logger.error('Failed to update branch', error as Error, {
        action: 'update_branch',
        userId,
        orgId,
        branchId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update branch',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * DELETE /api/organization/branches/:id
 * Delete branch (soft delete)
 */
branchRoutes.delete('/:id', rateLimitMiddleware('write'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string
  const id = c.req.param('id')

  try {
    // Check permission
    const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
    if (!hasManagePermission) {
      logger.warn('User does not have branches:manage permission', {
        action: 'delete_branch',
        userId,
        orgId,
        branchId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete branches',
          },
        },
        403
      )
    }

    // Get user's branch filter for territory access
    const branchFilter = await getUserBranchFilter(userId, orgId)

    // If user has no access, return 403
    if (branchFilter.scope === 'none') {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this branch',
          },
        },
        403
      )
    }

    // Check if user has access to this branch
    if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(id)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this branch',
          },
        },
        403
      )
    }

    await deleteBranch(id)

    logger.info('Deleted branch', {
      action: 'delete_branch',
      userId,
      orgId,
      branchId: id,
    })

    return c.json({
      success: true,
      data: null,
    })
  } catch (error) {
    logger.error('Failed to delete branch', error as Error, {
      action: 'delete_branch',
      userId,
      orgId,
      branchId: id,
    })

    return c.json(
      {
        success: false,
        error: {
          code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete branch',
        },
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    )
  }
})
