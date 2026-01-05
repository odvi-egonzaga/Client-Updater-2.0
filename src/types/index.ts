// Global type definitions placeholder

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  clerkOrgId?: string
  createdAt: Date
  updatedAt: Date
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'pending' | 'unconfigured'
