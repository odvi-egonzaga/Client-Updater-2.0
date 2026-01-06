'use client'

import { ChevronLeft, ChevronRight, Building2, Edit, Trash2 } from 'lucide-react'
import type { Area } from '../types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useAreasStore } from '../stores/areas-store'
import { useDeleteArea } from '../hooks/use-areas'

interface AreaTableProps {
  areas?: Area[]
  isLoading?: boolean
  error?: string | null
  onEdit?: (area: Area) => void
  onViewBranches?: (area: Area) => void
}

export function AreaTable({
  areas,
  isLoading,
  error,
  onEdit,
  onViewBranches,
}: AreaTableProps) {
  const { pagination, setPagination } = useAreasStore()
  const deleteMutation = useDeleteArea()

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ page: newPage })
    }
  }

  const handleDelete = (area: Area) => {
    if (confirm(`Are you sure you want to delete area "${area.name}"?`)) {
      deleteMutation.mutate(area.id)
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

  if (!areas || areas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No areas found</p>
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
                <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Company</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Branches</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr
                  key={area.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{area.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{area.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {area.companyId ? (
                      <Badge variant="outline">{area.companyId}</Badge>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {area.branchesCount ?? area.branches?.length ?? 0}
                      </span>
                      {onViewBranches && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewBranches(area)}
                          title="View branches"
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={area.isActive ? 'default' : 'secondary'}>
                      {area.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(area)}
                          title="Edit area"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(area)}
                        title="Delete area"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
              {pagination.total} areas
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
