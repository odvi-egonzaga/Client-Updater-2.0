import { supabaseAdmin } from '@/lib/supabase/admin'
import { env } from '@/config/env'
import type {
  EdgeFunctionHealthResult,
  EdgeFunctionCheckConfig,
} from './types'
import { EdgeFunctionHealthError } from './types'
import { logger } from './logger'

/**
 * Ping an Edge Function to verify connectivity
 *
 * @param config - Edge function check configuration
 * @returns Promise<EdgeFunctionHealthResult>
 *
 * @throws EdgeFunctionHealthError if invocation fails
 */
export async function pingEdgeFunction(
  config: EdgeFunctionCheckConfig
): Promise<EdgeFunctionHealthResult> {
  const start = performance.now()
  const functionName = config.functionName || 'health-check'

  logger.info(`Pinging edge function: ${functionName}`)

  try {
    const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
      body: { message: 'ping' },
    })

    if (error) {
      const errorDetails = error as { context?: string; message?: string }
      throw new EdgeFunctionHealthError(
        `Edge function invocation failed: ${error.message || 'Unknown error'}`,
        functionName,
        undefined,
        error
      )
    }

    const responseTimeMs = Math.round(performance.now() - start)

    logger.success(`Edge function ping successful: ${functionName} (${responseTimeMs}ms)`)

    return {
      type: 'edge-function',
      status: 'healthy',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      functionName,
      endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      details: { data },
    }
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - start)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`Edge function ping failed: ${functionName}`, { error: errorMessage })

    if (error instanceof EdgeFunctionHealthError) {
      return {
        type: 'edge-function',
        status: 'error',
        responseTimeMs,
        timestamp: new Date().toISOString(),
        functionName,
        endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
        error: errorMessage,
        details: { originalError: error.originalError },
      }
    }

    return {
      type: 'edge-function',
      status: 'error',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      functionName,
      endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      error: errorMessage,
    }
  }
}

/**
 * Validate JWT authentication with Edge Function
 *
 * @param config - Edge function check configuration with auth token
 * @returns Promise<EdgeFunctionHealthResult>
 *
 * @throws EdgeFunctionHealthError if auth validation fails
 */
export async function validateEdgeFunctionAuth(
  config: EdgeFunctionCheckConfig
): Promise<EdgeFunctionHealthResult> {
  const start = performance.now()
  const functionName = config.functionName || 'health-check'
  const authToken = config.authToken

  logger.info(`Validating auth for edge function: ${functionName}`)

  // If no auth token provided, return warning status
  if (!authToken) {
    const responseTimeMs = Math.round(performance.now() - start)

    logger.warn(`No auth token provided for edge function: ${functionName}`)

    return {
      type: 'edge-function',
      status: 'warning',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      functionName,
      endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      authValidated: false,
      error: 'No auth token provided - skipping auth validation',
      details: { skipped: true, reason: 'No Authorization header provided' },
    }
  }

  try {
    const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
      body: { message: 'auth-check' },
      headers: {
        // Send auth in custom header to avoid Supabase Gateway interference
        'x-test-auth': authToken,
      },
    })

    if (error) {
      throw new EdgeFunctionHealthError(
        `Auth validation failed: ${error.message || 'Unknown error'}`,
        functionName,
        undefined,
        error
      )
    }

    const responseTimeMs = Math.round(performance.now() - start)

    logger.success(`Auth validation successful for edge function: ${functionName} (${responseTimeMs}ms)`)

    return {
      type: 'edge-function',
      status: 'healthy',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      functionName,
      endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      authValidated: true,
      details: { data },
    }
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - start)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`Auth validation failed for edge function: ${functionName}`, { error: errorMessage })

    if (error instanceof EdgeFunctionHealthError) {
      return {
        type: 'edge-function',
        status: 'error',
        responseTimeMs,
        timestamp: new Date().toISOString(),
        functionName,
        endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
        authValidated: false,
        error: errorMessage,
        details: { originalError: error.originalError },
      }
    }

    return {
      type: 'edge-function',
      status: 'error',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      functionName,
      endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      authValidated: false,
      error: errorMessage,
    }
  }
}

/**
 * Run all Edge Function health checks
 *
 * @param configs - Array of edge function check configurations
 * @returns Promise<EdgeFunctionHealthResult[]>
 */
export async function runEdgeFunctionHealthChecks(
  configs: EdgeFunctionCheckConfig[] = []
): Promise<EdgeFunctionHealthResult[]> {
  const defaultConfigs: EdgeFunctionCheckConfig[] = [
    { functionName: 'health-check', validateAuth: false },
  ]

  const checksToRun = configs.length > 0 ? configs : defaultConfigs

  logger.info(`Running ${checksToRun.length} edge function health checks`)

  const results = await Promise.allSettled(
    checksToRun.map(async (config) => {
      const pingResult = await pingEdgeFunction(config)

      if (config.validateAuth) {
        const authResult = await validateEdgeFunctionAuth(config)
        return [pingResult, authResult]
      }

      return [pingResult]
    })
  )

  const flattenedResults: EdgeFunctionHealthResult[] = []
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      flattenedResults.push(...result.value)
    } else {
      // Handle rejected promises
      logger.error('Edge function check promise rejected', { error: result.reason })
    }
  })

  return flattenedResults
}
