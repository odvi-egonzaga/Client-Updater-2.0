'use client'

import { SyncStatus } from '@/features/clients/components/sync-status'

export default function SyncPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Sync Status</h1>
        <p className="text-muted-foreground">
          Monitor and trigger data synchronization jobs.
        </p>
      </div>

      <SyncStatus />
    </div>
  )
}
