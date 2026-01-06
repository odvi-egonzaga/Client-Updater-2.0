'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Client } from '../types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useClientsStore } from '../stores/clients-store'

interface ClientTableProps {
  clients?: Client[]
  isLoading?: boolean
  error?: string | null
}

export function ClientTable({ clients, isLoading, error }: ClientTableProps) {
  const { pagination, setPagination } = useClientsStore()

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ page: newPage })
    }
  }

  // Helper function to get status badge styling
  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Called
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        Pending
      </Badge>
    )
  }

  // Helper function to truncate text
  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return 'N/A'
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength)}...`
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

  if (!clients || clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No clients found</p>
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
                <th className="w-12 px-4 py-3 text-center">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Client Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Pension Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Last Remarks</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{client.clientCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{client.fullName}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {client.pensionNumber || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(client.isActive)}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs">
                    <div className="truncate" title={client.contactNumber || 'N/A'}>
                      {truncateText(client.contactNumber)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} clients
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
  )
}
