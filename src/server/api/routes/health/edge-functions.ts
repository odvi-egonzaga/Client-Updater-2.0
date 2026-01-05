import { Hono } from 'hono'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { env } from '@/config/env'

export const edgeFunctionsHealthRoutes = new Hono()

edgeFunctionsHealthRoutes.get('/ping', async (c) => {
  const start = performance.now()

  try {
    // Invoke the 'health-check' edge function
    const { data, error } = await supabaseAdmin.functions.invoke('health-check', {
      body: { message: 'ping' },
    })

    if (error) {
      // Return detailed error information
      const errorDetails = error as any
      return c.json({
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        message: 'Edge Function invocation failed',
        data: {
          error: error.message,
          context: errorDetails.context || 'No context available',
          hint: 'Ensure the function is deployed: "supabase functions deploy health-check"'
        }
      })
    }

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully invoked edge function',
      data,
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to ping edge function',
      },
      500
    )
  }
})

edgeFunctionsHealthRoutes.get('/auth', async (c) => {
  const start = performance.now()

  try {
    // Verify that we can create a valid auth header and invoke the function
    const authHeader = c.req.header('authorization')

    // If no auth header is provided to the health check endpoint, we can't test the downstream auth
    if (!authHeader) {
      return c.json({
        status: 'warning', // Changed from error to warning/skipped if user isn't logged in
        responseTimeMs: Math.round(performance.now() - start),
        message: 'No auth header provided - skipping auth propagation check',
        data: {
          skipped: true,
          reason: 'Client request did not include Authorization header',
        },
      })
    }

    const { data, error } = await supabaseAdmin.functions.invoke('health-check', {
      body: { message: 'auth-check' },
      headers: {
        // We send the auth header in a custom header to verify it can be passed through
        // We avoid overriding 'Authorization' to prevent Supabase Gateway from rejecting
        // the request if the Clerk token hasn't been configured in Supabase yet.
        'x-test-auth': authHeader,
      },
    })

    if (error) {
      // If we get an error from the function, it might be due to auth validation failure
      // or the function crashing. We want to expose the error message.
      const errorDetails = error as any
      throw new Error(`Edge function invocation failed: ${error.message || 'Unknown error'}`)
    }

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully verified auth header with edge function',
      data,
    })
  } catch (error) {
    // Check if the error is due to a 401/403 from the function itself (which would come as an error response data if handled,
    // or thrown if using invoke with certain options, but here likely a re-throw)
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to test auth header',
        data: {
           details: error instanceof Error ? error.stack : undefined
        }
      },
      500
    )
  }
})
