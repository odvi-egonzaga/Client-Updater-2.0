import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/server/db'
import { createUser, updateUser, toggleUserStatus } from '@/server/db/queries/users'
import { logger } from '@/lib/logger'

export const userMutationRoutes = new Hono()

// Validation schema for creating a user
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),
  clerkUserId: z.string().min(1),
  clerkOrgId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

// Validation schema for updating a user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().optional(),
  clerkOrgId: z.string().optional(),
})

// Validation schema for toggling user status
const toggleStatusSchema = z.object({
  isActive: z.boolean(),
})

/**
 * POST /api/users
 * Create a new user
 */
userMutationRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const start = performance.now()
  const userData = c.req.valid('json')

  try {
    const user = await createUser(db, {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info('Created new user', {
      action: 'create_user',
      userId: user.id,
      email: user.email,
    })

    return c.json({
      success: true,
      data: user,
    })
  } catch (error) {
    logger.error('Failed to create user', error as Error, {
      action: 'create_user',
      email: userData.email,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create user',
        },
      },
      500
    )
  }
})

/**
 * PATCH /api/users/:id
 * Update user fields
 */
userMutationRoutes.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')
  const updates = c.req.valid('json')

  try {
    const user = await updateUser(db, userId, updates)

    if (!user) {
      logger.warn('User not found for update', {
        action: 'update_user',
        userId,
      })

      return c.json(
        {
          success: false,
          error: {
            message: 'User not found',
          },
        },
        404
      )
    }

    logger.info('Updated user', {
      action: 'update_user',
      userId,
    })

    return c.json({
      success: true,
      data: user,
    })
  } catch (error) {
    logger.error('Failed to update user', error as Error, {
      action: 'update_user',
      userId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update user',
        },
      },
      500
    )
  }
})

/**
 * PATCH /api/users/:id/status
 * Toggle user active status
 */
userMutationRoutes.patch('/:id/status', zValidator('json', toggleStatusSchema), async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')
  const { isActive } = c.req.valid('json')

  try {
    const user = await toggleUserStatus(db, userId, isActive)

    if (!user) {
      logger.warn('User not found for status toggle', {
        action: 'toggle_user_status',
        userId,
      })

      return c.json(
        {
          success: false,
          error: {
            message: 'User not found',
          },
        },
        404
      )
    }

    logger.info('Toggled user status', {
      action: 'toggle_user_status',
      userId,
      isActive,
    })

    return c.json({
      success: true,
      data: user,
    })
  } catch (error) {
    logger.error('Failed to toggle user status', error as Error, {
      action: 'toggle_user_status',
      userId,
      isActive,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to toggle user status',
        },
      },
      500
    )
  }
})
