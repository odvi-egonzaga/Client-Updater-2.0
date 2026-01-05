// Validators placeholder
import { z } from 'zod'

export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'error', 'pending', 'unconfigured']),
  responseTimeMs: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
})
