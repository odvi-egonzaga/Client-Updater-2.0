import { Hono } from 'hono'
import { db } from '@/server/db'
import { getUserSessions, revokeSession, revokeAllUserSessions } from '@/server/db/queries/sessions'
import { logger } from '@/lib/logger'

export const userSessionsRoutes = new Hono()

/**
 * GET /api/users/:id/sessions
 * Get user's active sessions
 */
userSessionsRoutes.get('/:id/sessions', async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')

  try {
    const sessions = await getUserSessions(db, userId)

    logger.info('Retrieved user sessions', {
      action: 'get_user_sessions',
      userId,
      count: sessions.length,
    })

    return c.json({
      success: true,
      data: sessions,
    })
  } catch (error) {
    logger.error('Failed to retrieve user sessions', error as Error, {
      action: 'get_user_sessions',
      userId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve user sessions',
        },
      },
      500
    )
  }
})

/**
 * DELETE /api/users/:id/sessions/:sessionId
 * Revoke a single session
 */
userSessionsRoutes.delete('/:id/sessions/:sessionId', async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')
  const sessionId = c.req.param('sessionId')

  try {
    const session = await revokeSession(db, sessionId, 'Session revoked by admin')

    if (!session) {
      logger.warn('Session not found for revocation', {
        action: 'revoke_session',
        userId,
        sessionId,
      })

      return c.json(
        {
          success: false,
          error: {
            message: 'Session not found',
          },
        },
        404
      )
    }

    logger.info('Revoked user session', {
      action: 'revoke_session',
      userId,
      sessionId,
    })

    return c.json({
      success: true,
      data: session,
    })
  } catch (error) {
    logger.error('Failed to revoke session', error as Error, {
      action: 'revoke_session',
      userId,
      sessionId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to revoke session',
        },
      },
      500
    )
  }
})

/**
 * POST /api/users/:id/sessions/revoke-all
 * Revoke all user sessions
 */
userSessionsRoutes.post('/:id/sessions/revoke-all', async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')

  try {
    const sessions = await revokeAllUserSessions(db, userId, 'All sessions revoked by admin')

    logger.info('Revoked all user sessions', {
      action: 'revoke_all_user_sessions',
      userId,
      count: sessions.length,
    })

    return c.json({
      success: true,
      data: sessions,
    })
  } catch (error) {
    logger.error('Failed to revoke all user sessions', error as Error, {
      action: 'revoke_all_user_sessions',
      userId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to revoke all user sessions',
        },
      },
      500
    )
  }
})
