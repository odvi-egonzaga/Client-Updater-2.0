// Health check dashboard page placeholder
import { HealthDashboard } from '@/features/health-check'

export default function HealthPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Health Check Dashboard</h1>
        <p className="text-muted-foreground">
          Verify all services are connected and working correctly.
        </p>
      </div>
      <HealthDashboard />
    </div>
  )
}
