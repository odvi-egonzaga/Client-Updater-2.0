'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useExportJobs, useCreateExport } from '@/features/reports/hooks/use-exports'
import { Download, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function ExportsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'clients',
    format: 'csv',
    name: '',
    description: '',
  })

  const { data, isLoading, error, refetch } = useExportJobs({
    page,
    pageSize: 25,
    status: statusFilter as any,
  })

  const createExport = useCreateExport()

  const handleCreateExport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createExport.mutateAsync(formData)
      setIsDialogOpen(false)
      setFormData({
        type: 'clients',
        format: 'csv',
        name: '',
        description: '',
      })
      refetch()
    } catch (error) {
      console.error('Failed to create export:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pending</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(`/api/reports/exports/${exportId}/download`)
      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }
      const result = await response.json()
      window.open(result.data.downloadUrl, '_blank')
    } catch (error) {
      console.error('Failed to download export:', error)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Export Management</h1>
          <p className="text-muted-foreground">
            Create and manage data exports.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Export
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Export</DialogTitle>
              <DialogDescription>
                Configure and create a new data export job.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExport}>
              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="export-type" className="text-sm font-medium">
                    Export Type
                  </label>
                  <Select
                    id="export-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1"
                  >
                    <option value="clients">Clients</option>
                    <option value="client_status">Client Status</option>
                    <option value="fcash_summary">FCASH Summary</option>
                    <option value="pcni_summary">PCNI Summary</option>
                    <option value="branch_performance">Branch Performance</option>
                    <option value="user_activity">User Activity</option>
                  </Select>
                </div>

                <div>
                  <label htmlFor="export-format" className="text-sm font-medium">
                    Format
                  </label>
                  <Select
                    id="export-format"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="mt-1"
                  >
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel (XLSX)</option>
                  </Select>
                </div>

                <div>
                  <label htmlFor="export-name" className="text-sm font-medium">
                    Export Name
                  </label>
                  <Input
                    id="export-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter export name"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="export-description" className="text-sm font-medium">
                    Description (Optional)
                  </label>
                  <Input
                    id="export-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createExport.isPending}>
                  {createExport.isPending ? 'Creating...' : 'Create Export'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="status-filter" className="text-sm font-medium">
                Status Filter
              </label>
              <Select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="mt-1"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Failed to load exports</p>
            </div>
            <p className="mt-2 text-sm text-destructive/80">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Export Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Export Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Loading exports...
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Export Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Format
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((exportJob) => (
                    <tr key={exportJob.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{exportJob.name}</p>
                          {exportJob.description && (
                            <p className="text-sm text-muted-foreground">
                              {exportJob.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">
                        {exportJob.type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm uppercase">
                        {exportJob.format}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(exportJob.status)}
                          {getStatusBadge(exportJob.status)}
                        </div>
                        {exportJob.errorMessage && (
                          <p className="mt-1 text-sm text-destructive">
                            {exportJob.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(exportJob.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exportJob.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(exportJob.id)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No exports found
            </div>
          )}

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * data.meta.pageSize) + 1} to{' '}
                {Math.min(page * data.meta.pageSize, data.meta.total)} of {data.meta.total} exports
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page === data.meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
