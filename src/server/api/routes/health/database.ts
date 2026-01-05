import { Hono } from 'hono'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const databaseHealthRoutes = new Hono()

const TEST_KEY = 'health-check-test'

databaseHealthRoutes.post('/write', async (c) => {
  const start = performance.now()

  try {
    // Delete any existing test row first
    await supabaseAdmin.from('health_check_tests').delete().eq('test_key', TEST_KEY)

    // Insert a new test row
    const { data: result, error } = await supabaseAdmin
      .from('health_check_tests')
      .insert({
        test_key: TEST_KEY,
        test_value: `test-${Date.now()}`,
      })
      .select()

    if (error) throw error

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully wrote test row to database',
      data: {
        id: result?.[0]?.id,
        testKey: result?.[0]?.test_key,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to write to database',
      },
      500
    )
  }
})

databaseHealthRoutes.get('/read', async (c) => {
  const start = performance.now()

  try {
    const { data: result, error } = await supabaseAdmin
      .from('health_check_tests')
      .select('*')
      .eq('test_key', TEST_KEY)
      .limit(1)

    if (error) throw error

    if (!result || result.length === 0) {
      return c.json({
        status: 'healthy',
        responseTimeMs: Math.round(performance.now() - start),
        message: 'Database connection successful, but no test row found',
        data: { found: false },
      })
    }

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully read test row from database',
      data: {
        found: true,
        id: result[0]?.id,
        testKey: result[0]?.test_key,
        createdAt: result[0]?.created_at,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to read from database',
      },
      500
    )
  }
})

databaseHealthRoutes.delete('/delete', async (c) => {
  const start = performance.now()

  try {
    // Check if row exists first
    const { data: result, error: readError } = await supabaseAdmin
      .from('health_check_tests')
      .select('*')
      .eq('test_key', TEST_KEY)
      .limit(1)

    if (readError) throw readError

    if (!result || result.length === 0) {
      return c.json({
        status: 'healthy',
        responseTimeMs: Math.round(performance.now() - start),
        message: 'Database connection successful, but no test row to delete',
        data: { deleted: false },
      })
    }

    // Delete the row
    const { error: deleteError } = await supabaseAdmin
      .from('health_check_tests')
      .delete()
      .eq('test_key', TEST_KEY)

    if (deleteError) throw deleteError

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully deleted test row from database',
      data: {
        deleted: true,
        id: result[0]?.id,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to delete from database',
      },
      500
    )
  }
})

