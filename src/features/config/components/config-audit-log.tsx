'use client'

import { Clock, User } from 'lucide-react'
import type { ConfigAuditLogEntry } from '../types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface ConfigAuditLogProps {
  auditLog?: ConfigAuditLogEntry[]
  isLoading?: boolean
  error?: string | null
}

export function ConfigAuditLog({
  auditLog,
  isLoading,
  error,
}: ConfigAuditLogProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'default'
      case 'update':
        return 'secondary'
      case 'delete':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="size-8" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!auditLog || auditLog.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No audit log entries found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Table</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Record ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Changed By</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Changes</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(entry.changedAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="outline">{entry.tableName}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {entry.recordId || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={getActionBadgeVariant(entry.action)}>
                      {entry.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{entry.changedBy || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="space-y-1">
                      {entry.oldValue !== null && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">Old:</span>
                          <span className="font-mono text-xs">
                            {typeof entry.oldValue === 'object' 
                              ? JSON.stringify(entry.oldValue, null, 2)
                              : String(entry.oldValue)}
                          </span>
                        </div>
                      )}
                      {entry.newValue !== null && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">New:</span>
                          <span className="font-mono text-xs">
                            {typeof entry.newValue === 'object' 
                              ? JSON.stringify(entry.newValue, null, 2)
                              : String(entry.newValue)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
