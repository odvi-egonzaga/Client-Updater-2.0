import { Hono } from 'hono'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const usersRoutes = new Hono()

usersRoutes.get('/', async (c) => {
  const start = performance.now()

  try {
    const { data: allUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, image_url, clerk_org_id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully retrieved users',
      data: {
        users: allUsers,
        count: allUsers.length,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to retrieve users',
      },
      500
    )
  }
})

usersRoutes.get('/:id', async (c) => {
  const start = performance.now()
  const id = c.req.param('id')

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, image_url, clerk_org_id, created_at, updated_at')
      .eq('id', id)
      .limit(1)

    if (error) throw error

    if (!user || user.length === 0) {
      return c.json(
        {
          status: 'error',
          responseTimeMs: Math.round(performance.now() - start),
          error: 'User not found',
        },
        404
      )
    }

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully retrieved user',
      data: { user: user[0] },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to retrieve user',
      },
      500
    )
  }
})
