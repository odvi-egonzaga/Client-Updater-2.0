// Health checks query hook placeholder
'use client'

import { useQuery } from '@tanstack/react-query'

export function useHealthChecks() {
  return useQuery({
    queryKey: ['health-checks'],
    queryFn: async () => {
      const response = await fetch('/api/health/all')
      if (!response.ok) throw new Error('Failed to fetch health checks')
      return response.json()
    },
    enabled: false,
  })
}
