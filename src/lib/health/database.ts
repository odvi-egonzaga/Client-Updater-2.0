import { db } from '@/server/db'
import { healthCheckTests } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { DatabaseHealthResult, DatabaseCheckConfig } from './types'
import { DatabaseHealthError } from './types'
import { logger } from './logger'

const DEFAULT_TEST_KEY = 'health-check-test'

/**
 * Write a test row to the database
 *
 * @param config - Database check configuration
 * @returns Promise<DatabaseHealthResult>
 *
 * @throws DatabaseHealthError if write operation fails
 */
export async function writeTestRow(
  config: DatabaseCheckConfig = {}
): Promise<DatabaseHealthResult> {
  const start = performance.now()
  const testKey = config.testKey || DEFAULT_TEST_KEY
  const testValue = config.testValue || `test-${Date.now()}`

  logger.info(`Writing test row to database: ${testKey}`)

  try {
    // Delete any existing test row first to ensure clean state
    await db.delete(healthCheckTests).where(eq(healthCheckTests.testKey, testKey))

    // Insert new test row
    const [result] = await db
      .insert(healthCheckTests)
      .values({
        testKey,
        testValue,
      })
      .returning()

    if (!result) {
      throw new DatabaseHealthError(
        'Insert returned no result',
        'write',
        'health_check_tests'
      )
    }

    const responseTimeMs = Math.round(performance.now() - start)

    logger.success(`Database write successful: ${testKey} (${responseTimeMs}ms)`)

    return {
      type: 'database',
      status: 'healthy',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      operation: 'write',
      table: 'health_check_tests',
      recordId: result.id,
      details: { testKey, testValue },
    }
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - start)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`Database write failed: ${testKey}`, { error: errorMessage })

    return {
      type: 'database',
      status: 'error',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      operation: 'write',
      table: 'health_check_tests',
      error: errorMessage,
    }
  }
}

/**
 * Read a test row from the database
 *
 * @param config - Database check configuration
 * @returns Promise<DatabaseHealthResult>
 *
 * @throws DatabaseHealthError if read operation fails
 */
export async function readTestRow(
  config: DatabaseCheckConfig = {}
): Promise<DatabaseHealthResult> {
  const start = performance.now()
  const testKey = config.testKey || DEFAULT_TEST_KEY

  logger.info(`Reading test row from database: ${testKey}`)

  try {
    const [result] = await db
      .select()
      .from(healthCheckTests)
      .where(eq(healthCheckTests.testKey, testKey))
      .limit(1)

    const responseTimeMs = Math.round(performance.now() - start)

    if (!result) {
      logger.warn(`No test row found in database: ${testKey}`)

      return {
        type: 'database',
        status: 'healthy',
        responseTimeMs,
        timestamp: new Date().toISOString(),
        operation: 'read',
        table: 'health_check_tests',
        details: { found: false, testKey },
      }
    }

    logger.success(`Database read successful: ${testKey} (${responseTimeMs}ms)`)

    return {
      type: 'database',
      status: 'healthy',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      operation: 'read',
      table: 'health_check_tests',
      recordId: result.id,
      details: {
        found: true,
        testKey,
        testValue: result.testValue,
        createdAt: result.createdAt,
      },
    }
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - start)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`Database read failed: ${testKey}`, { error: errorMessage })

    return {
      type: 'database',
      status: 'error',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      operation: 'read',
      table: 'health_check_tests',
      error: errorMessage,
    }
  }
}

/**
 * Delete a test row from the database
 *
 * @param config - Database check configuration
 * @returns Promise<DatabaseHealthResult>
 *
 * @throws DatabaseHealthError if delete operation fails
 */
export async function deleteTestRow(
  config: DatabaseCheckConfig = {}
): Promise<DatabaseHealthResult> {
  const start = performance.now()
  const testKey = config.testKey || DEFAULT_TEST_KEY

  logger.info(`Deleting test row from database: ${testKey}`)

  try {
    // Check if row exists first
    const [existing] = await db
      .select()
      .from(healthCheckTests)
      .where(eq(healthCheckTests.testKey, testKey))
      .limit(1)

    if (!existing) {
      const responseTimeMs = Math.round(performance.now() - start)

      logger.warn(`No test row to delete in database: ${testKey}`)

      return {
        type: 'database',
        status: 'healthy',
        responseTimeMs,
        timestamp: new Date().toISOString(),
        operation: 'delete',
        table: 'health_check_tests',
        details: { deleted: false, testKey },
      }
    }

    // Delete the row
    await db.delete(healthCheckTests).where(eq(healthCheckTests.testKey, testKey))

    const responseTimeMs = Math.round(performance.now() - start)

    logger.success(`Database delete successful: ${testKey} (${responseTimeMs}ms)`)

    return {
      type: 'database',
      status: 'healthy',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      operation: 'delete',
      table: 'health_check_tests',
      recordId: existing.id,
      details: { deleted: true, testKey },
    }
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - start)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(`Database delete failed: ${testKey}`, { error: errorMessage })

    return {
      type: 'database',
      status: 'error',
      responseTimeMs,
      timestamp: new Date().toISOString(),
      operation: 'delete',
      table: 'health_check_tests',
      error: errorMessage,
    }
  }
}

/**
 * Run full CRUD health check on database
 *
 * @param config - Database check configuration
 * @returns Promise<DatabaseHealthResult[]>
 */
export async function runDatabaseHealthChecks(
  config: DatabaseCheckConfig = {}
): Promise<DatabaseHealthResult[]> {
  logger.info('Running database health checks (CRUD)')

  const results: DatabaseHealthResult[] = []

  // Write test row
  const writeResult = await writeTestRow(config)
  results.push(writeResult)

  // Only proceed with read and delete if write succeeded
  if (writeResult.status === 'healthy') {
    // Read test row
    const readResult = await readTestRow(config)
    results.push(readResult)

    // Delete test row
    const deleteResult = await deleteTestRow(config)
    results.push(deleteResult)
  }

  return results
}
