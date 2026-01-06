'use client'

import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClientsStore } from '../stores/clients-store'

// Sample branch data - in production, this would come from an API or store
const BRANCHES = [
  { id: 'all', code: 'all', name: 'All Branches' },
  { id: '1', code: 'MNLA01', name: 'MNLA01' },
  { id: '2', code: 'MNLA02', name: 'MNLA02' },
  { id: '3', code: 'MNLA03', name: 'MNLA03' },
  { id: '4', code: 'MNLA04', name: 'MNLA04' },
  { id: '5', code: 'MNLA05', name: 'MNLA05' },
]

// Client status options
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'to-follow', label: 'To Follow' },
  { value: 'called', label: 'Called' },
  { value: 'visited', label: 'Visited' },
  { value: 'updated', label: 'Updated' },
  { value: 'done', label: 'Done' },
]

export function ClientFilters() {
  const { filters, setFilters, clearFilters } = useClientsStore()

  // Type assertion to access new filter properties
  const typedFilters = filters as any

  const handleSearchChange = (value: string) => {
    setFilters({ search: value })
  }

  const handleBranchChange = (value: string) => {
    if (value === 'all') {
      setFilters({ branchId: undefined } as any)
    } else {
      setFilters({ branchId: value } as any)
    }
  }

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setFilters({ status: undefined } as any)
    } else {
      setFilters({ status: value } as any)
    }
  }

  const handleClearFilters = () => {
    clearFilters()
  }

  const hasActiveFilters =
    typedFilters.search ||
    typedFilters.branchId ||
    typedFilters.status

  return (
    <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Branch Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="branch-filter" className="text-sm font-medium">
          Branch:
        </label>
        <select
          id="branch-filter"
          value={typedFilters.branchId || 'all'}
          onChange={(e) => handleBranchChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {BRANCHES.map((branch) => (
            <option key={branch.id} value={branch.code === 'all' ? 'all' : branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium">
          Status:
        </label>
        <select
          id="status-filter"
          value={typedFilters.status || 'all'}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search"
          value={typedFilters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="gap-1"
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  )
}
