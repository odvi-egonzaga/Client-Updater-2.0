import { Hono } from 'hono'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { env } from '@/config/env'

export const awsS3HealthRoutes = new Hono()

awsS3HealthRoutes.get('/connect', async (c) => {
  const start = performance.now()

  try {
    // Check if credentials are configured
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_ACCESS_SECRET_KEY || !env.AWS_REGION) {
      return c.json({
        status: 'warning',
        responseTimeMs: Math.round(performance.now() - start),
        message: 'AWS S3 credentials not configured - skipping connection check',
        data: {
          skipped: true,
          reason: 'Missing AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET_KEY, or AWS_REGION',
        },
      })
    }

    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_ACCESS_SECRET_KEY,
      },
    })

    // Try to list buckets to verify connectivity and credentials
    const command = new ListBucketsCommand({})
    const response = await s3Client.send(command)

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully connected to AWS S3',
      data: {
        region: env.AWS_REGION,
        bucketCount: response.Buckets?.length ?? 0,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to connect to AWS S3',
        data: {
          details: error instanceof Error ? error.stack : undefined,
        },
      },
      500
    )
  }
})

