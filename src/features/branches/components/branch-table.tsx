'use client'

import { ChevronLeft, ChevronRight, Phone, Edit, Trash2 } from 'lucide-react'
import type { Branch } from '../types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useBranchesStore } from '../stores/branches-store'
import { useDeleteBranch } from '../hooks/use-branches'

interface BranchTableProps {
  branches?: Branch[]
  isLoading?: boolean
  error?: string | null
  onEdit?: (branch: Branch) => void
  onViewContacts?: (branch: Branch) => void
}

export function BranchTable({
  branches,
  isLoading,
  error,
  onEdit,
  onViewContacts,
}: BranchTableProps) {
  const { pagination, setPagination } = useBranchesStore()
  const deleteMutation = useDeleteBranch()

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ page: newPage })
    }
  }

  const handleDelete = (branch: Branch) => {
    if (confirm(`Are you sure you want to delete branch "${branch.name}"?`)) {
      deleteMutation.mutate(branch.id)
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

  if (!branches || branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No branches found</p>
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
                <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Areas</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contacts</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr
                  key={branch.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{branch.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{branch.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {branch.location || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {branch.category ? (
                      <Badge variant="outline">{branch.category}</Badge>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {branch.areas && branch.areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {branch.areas.slice(0, 3).map((area) => (
                          <Badge key={area.id} variant="secondary">
                            {area.code}
                          </Badge>
                        ))}
                        {branch.areas.length > 3 && (
                          <Badge variant="secondary">
                            +{branch.areas.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {branch.contactsCount ?? branch.contacts?.length ?? 0}
                      </span>
                      {onViewContacts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewContacts(branch)}
                          title="View contacts"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(branch)}
                          title="Edit branch"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(branch)}
                        title="Delete branch"
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
              {pagination.total} branches
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
