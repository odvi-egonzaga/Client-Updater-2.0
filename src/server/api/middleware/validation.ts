import type { Context, Next } from 'hono'
import { z } from 'zod'
import type { ZodSchema } from 'zod'

/**
 * Custom validation middleware that returns valid JSON
 */
export function validateRequest<T extends ZodSchema<any, any, any>>(
  target: 'query' | 'json' | 'form' | 'param',
  schema: T
) {
  return async (c: Context, next: Next) => {
    try {
      let data: unknown

      if (target === 'query') {
        const result = schema.safeParse(c.req.query())
        if (!result.success) {
          return c.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: result.error.issues,
              },
            },
            400
          )
        }
        data = result.data
        // Set validated data for downstream use
        ;(c as any).set(`validated_${target}`, data)
      } else if (target === 'json') {
        const result = schema.safeParse(await c.req.json())
        if (!result.success) {
          return c.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: result.error.issues,
              },
            },
            400
          )
        }
        data = result.data
        ;(c as any).set(`validated_${target}`, data)
      } else if (target === 'param') {
        const param = c.req.param()
        const result = schema.safeParse(param)
        if (!result.success) {
          return c.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: result.error.issues,
              },
            },
            400
          )
        }
        data = result.data
        ;(c as any).set(`validated_${target}`, data)
      } else if (target === 'form') {
        const formData = await c.req.formData()
        const result = schema.safeParse(formData)
        if (!result.success) {
          return c.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: result.error.issues,
              },
            },
            400
          )
        }
        data = result.data
        ;(c as any).set(`validated_${target}`, data)
      }

      await next()
    } catch (error) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Failed to parse request data',
            details: error instanceof Error ? error.message : String(error),
          },
        },
        400
      )
    }
  }
}
