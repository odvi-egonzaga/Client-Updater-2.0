'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface ActivityLog {
  id: string
  userId: string
  userName?: string
  action: string
  resource: string | null
  resourceId: string | null
  details: any | null
  ipAddress: string | null
  userAgent: string | null
  durationMs: number | null
  statusCode: number | null
  errorMessage: string | null
  createdAt: Date
}

interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface ApiResponse<T> {
  data: T
  meta?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Action categories
const ACTION_CATEGORIES = {
  User: ['user:read', 'user:manage', 'user:create', 'user:update', 'user:delete'],
  Client: ['client:read', 'client:update', 'client:create', 'client:delete'],
  Status: ['status:read', 'status:update', 'status:history:read'],
  Config: ['config:read', 'config:manage', 'config:create', 'config:update', 'config:delete'],
  Export: ['export:read', 'export:create', 'export:download'],
  Sync: ['sync:read', 'sync:execute'],
}

// Resource types
const RESOURCE_TYPES = ['Clients', 'Status', 'Users', 'Config', 'Branches', 'Areas', 'Exports', 'Sync']

// Helper function to get action category
function getActionCategory(action: string): string | null {
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(action)) {
      return category
    }
  }
  return null
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Helper function to get status badge color
function getStatusBadgeColor(statusCode: number | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!statusCode) return 'outline'
  if (statusCode >= 200 && statusCode < 300) return 'default'
  if (statusCode >= 400 && statusCode < 500) return 'secondary'
  return 'destructive'
}

export default function ActivityPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [actionCategory, setActionCategory] = useState<string>('all')
  const [resourceType, setResourceType] = useState<string>('all')

  const { data, isLoading, error } = useQuery<ApiResponse<ActivityLog[]>>({
    queryKey: ['activity', page, pageSize, search, actionCategory, resourceType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      if (search) params.append('search', search)
      if (actionCategory !== 'all') params.append('actionCategory', actionCategory)
      if (resourceType !== 'all') params.append('resource', resourceType.toLowerCase())

      const response = await fetch(`/api/admin/activity?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs')
      }
      return response.json()
    },
  })

  const handlePageChange = (newPage: number) => {
    if (data && newPage >= 1 && newPage <= (data.meta?.totalPages || 1)) {
      setPage(newPage)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }

  const handleActionCategoryChange = (value: string) => {
    setActionCategory(value)
    setPage(1) // Reset to first page on filter change
  }

  const handleResourceTypeChange = (value: string) => {
    setResourceType(value)
    setPage(1) // Reset to first page on filter change
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner className="size-8" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-destructive">
              {error instanceof Error ? error.message : 'Failed to load activity logs'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const logs = data?.data || []
  const pagination = data?.meta || { page: 1, pageSize: 25, total: 0, totalPages: 0 }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Activity Log</h1>
        <p className="text-muted-foreground">
          Track all user actions and system events
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search activity..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <label htmlFor="action-filter" className="text-sm font-medium">
                  Action:
                </label>
                <select
                  id="action-filter"
                  value={actionCategory}
                  onChange={(e) => handleActionCategoryChange(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Actions</option>
                  {Object.keys(ACTION_CATEGORIES).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="resource-filter" className="text-sm font-medium">
                  Resource:
                </label>
                <select
                  id="resource-filter"
                  value={resourceType}
                  onChange={(e) => handleResourceTypeChange(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Resources</option>
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{formatRelativeTime(new Date(log.createdAt))}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.userName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{log.action}</div>
                        {getActionCategory(log.action) && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {getActionCategory(log.action)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.resource || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeColor(log.statusCode)}>
                          {log.statusCode || 'N/A'}
                        </Badge>
                        {log.errorMessage && (
                          <div className="mt-1 text-xs text-destructive">
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.durationMs ? `${log.durationMs}ms` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
