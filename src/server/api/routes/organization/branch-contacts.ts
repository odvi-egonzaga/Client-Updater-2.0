import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  getContactsForBranch,
  addBranchContact,
  updateBranchContact,
  deleteBranchContact,
  setPrimaryContact,
} from '@/server/db/queries/branch-contacts'
import { hasPermission } from '@/lib/permissions'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const branchContactRoutes = new Hono()

// Validation schemas
const createContactSchema = z.object({
  type: z.string().min(1).max(50),
  label: z.string().max(100).optional(),
  value: z.string().min(1).max(500),
  isPrimary: z.boolean().optional(),
})

const updateContactSchema = z.object({
  type: z.string().min(1).max(50).optional(),
  label: z.string().max(100).optional(),
  value: z.string().min(1).max(500).optional(),
  isPrimary: z.boolean().optional(),
})

/**
 * GET /api/organization/branches/:branchId/contacts
 * Get contacts for branch
 */
branchContactRoutes.get('/:branchId/contacts', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string
  const branchId = c.req.param('branchId')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'branches', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have branches:read permission', {
        action: 'get_contacts_for_branch',
        userId,
        orgId,
        branchId,
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

    // Check if user has access to this branch
    if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(branchId)) {
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

    const contacts = await getContactsForBranch(branchId)

    logger.info('Retrieved contacts for branch', {
      action: 'get_contacts_for_branch',
      userId,
      orgId,
      branchId,
      count: contacts.length,
    })

    return c.json({
      success: true,
      data: contacts,
    })
  } catch (error) {
    logger.error('Failed to retrieve contacts for branch', error as Error, {
      action: 'get_contacts_for_branch',
      userId,
      orgId,
      branchId,
    })

    return c.json(
      {
        success: false,
        error: {
          code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve contacts',
        },
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    )
  }
})

/**
 * POST /api/organization/branches/:branchId/contacts
 * Add contact
 */
branchContactRoutes.post(
  '/:branchId/contacts',
  rateLimitMiddleware('write'),
  zValidator('json', createContactSchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const branchId = c.req.param('branchId')
    const data = c.req.valid('json')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have branches:manage permission', {
          action: 'add_branch_contact',
          userId,
          orgId,
          branchId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage branches',
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
      if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(branchId)) {
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

      const contact = await addBranchContact({
        branchId,
        ...data,
      })

      logger.info('Added branch contact', {
        action: 'add_branch_contact',
        userId,
        orgId,
        branchId,
        contactId: contact.id,
      })

      return c.json(
        {
          success: true,
          data: contact,
        },
        201
      )
    } catch (error) {
      logger.error('Failed to add branch contact', error as Error, {
        action: 'add_branch_contact',
        userId,
        orgId,
        branchId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to add contact',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * PATCH /api/organization/branches/:branchId/contacts/:contactId
 * Update contact
 */
branchContactRoutes.patch(
  '/:branchId/contacts/:contactId',
  rateLimitMiddleware('write'),
  zValidator('json', updateContactSchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const branchId = c.req.param('branchId')
    const contactId = c.req.param('contactId')
    const data = c.req.valid('json')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have branches:manage permission', {
          action: 'update_branch_contact',
          userId,
          orgId,
          branchId,
          contactId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage branches',
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
      if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(branchId)) {
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

      const contact = await updateBranchContact(contactId, data)

      logger.info('Updated branch contact', {
        action: 'update_branch_contact',
        userId,
        orgId,
        branchId,
        contactId,
      })

      return c.json({
        success: true,
        data: contact,
      })
    } catch (error) {
      logger.error('Failed to update branch contact', error as Error, {
        action: 'update_branch_contact',
        userId,
        orgId,
        branchId,
        contactId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update contact',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * DELETE /api/organization/branches/:branchId/contacts/:contactId
 * Delete contact
 */
branchContactRoutes.delete(
  '/:branchId/contacts/:contactId',
  rateLimitMiddleware('write'),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const branchId = c.req.param('branchId')
    const contactId = c.req.param('contactId')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have branches:manage permission', {
          action: 'delete_branch_contact',
          userId,
          orgId,
          branchId,
          contactId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage branches',
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
      if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(branchId)) {
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

      await deleteBranchContact(contactId)

      logger.info('Deleted branch contact', {
        action: 'delete_branch_contact',
        userId,
        orgId,
        branchId,
        contactId,
      })

      return c.json({
        success: true,
        data: null,
      })
    } catch (error) {
      logger.error('Failed to delete branch contact', error as Error, {
        action: 'delete_branch_contact',
        userId,
        orgId,
        branchId,
        contactId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to delete contact',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * POST /api/organization/branches/:branchId/contacts/:contactId/primary
 * Set primary contact
 */
branchContactRoutes.post(
  '/:branchId/contacts/:contactId/primary',
  rateLimitMiddleware('write'),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const branchId = c.req.param('branchId')
    const contactId = c.req.param('contactId')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'branches', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have branches:manage permission', {
          action: 'set_primary_contact',
          userId,
          orgId,
          branchId,
          contactId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to manage branches',
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
      if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(branchId)) {
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

      await setPrimaryContact({
        branchId,
        contactId,
      })

      logger.info('Set primary contact', {
        action: 'set_primary_contact',
        userId,
        orgId,
        branchId,
        contactId,
      })

      return c.json({
        success: true,
        data: null,
      })
    } catch (error) {
      logger.error('Failed to set primary contact', error as Error, {
        action: 'set_primary_contact',
        userId,
        orgId,
        branchId,
        contactId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to set primary contact',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)
