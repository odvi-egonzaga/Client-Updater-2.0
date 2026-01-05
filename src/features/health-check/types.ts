// Health check types placeholder
export type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'pending' | 'unconfigured'

export interface ServiceCheck {
  name: string
  endpoint: string
  status: HealthStatus
  responseTimeMs?: number
  error?: string
}

export interface ServiceHealth {
  name: string
  icon: string
  status: HealthStatus
  responseTimeMs: number
  checks: ServiceCheck[]
}
