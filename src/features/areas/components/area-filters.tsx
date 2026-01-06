'use client'

import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useAreasStore } from '../stores/areas-store'

export function AreaFilters() {
  const { filters, setFilters, clearFilters } = useAreasStore()

  const handleSearchChange = (value: string) => {
    setFilters({ search: value })
  }

  const handleCompanyFilterChange = (value: string) => {
    if (value === 'all') {
      setFilters({ companyId: undefined })
    } else {
      setFilters({ companyId: value })
    }
  }

  const handleStatusFilterChange = (value: string) => {
    if (value === 'all') {
      setFilters({ isActive: undefined })
    } else {
      setFilters({ isActive: value === 'active' })
    }
  }

  const handleClearFilters = () => {
    clearFilters()
  }

  const hasActiveFilters = filters.search || filters.companyId || filters.isActive !== undefined

  return (
    <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium">
            Status:
          </label>
          <select
            id="status-filter"
            value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
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
    </div>
  )
}
