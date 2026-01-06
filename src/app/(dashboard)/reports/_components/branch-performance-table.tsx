'use client'

import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface BranchPerformanceTableProps {
  data: Array<{
    branchId: string
    branchName: string
    branchCode: string
    areaName: string
    totalClients: number
    completedCount: number
    inProgressCount: number
    pendingCount: number
    completionRate: number
  }>
}

type SortField = 'branchName' | 'branchCode' | 'areaName' | 'totalClients' | 'completionRate'
type SortDirection = 'asc' | 'desc'

export function BranchPerformanceTable({ data }: BranchPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('completionRate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 60) return 'bg-yellow-500'
    if (rate >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Branch Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('branchName')}
                >
                  <div className="flex items-center">
                    Branch Name
                    <SortIcon field="branchName" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('branchCode')}
                >
                  <div className="flex items-center">
                    Code
                    <SortIcon field="branchCode" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('areaName')}
                >
                  <div className="flex items-center">
                    Area
                    <SortIcon field="areaName" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('totalClients')}
                >
                  <div className="flex items-center justify-end">
                    Total
                    <SortIcon field="totalClients" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort('completionRate')}
                >
                  <div className="flex items-center justify-end">
                    Completion
                    <SortIcon field="completionRate" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((branch) => (
                <tr key={branch.branchId} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{branch.branchName}</td>
                  <td className="px-4 py-3 text-sm">{branch.branchCode}</td>
                  <td className="px-4 py-3 text-sm">{branch.areaName}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{branch.totalClients}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Done: {branch.completedCount}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        In Progress: {branch.inProgressCount}
                      </Badge>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        Pending: {branch.pendingCount}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-2 rounded-full transition-all', getCompletionRateColor(branch.completionRate))}
                          style={{ width: `${branch.completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {branch.completionRate.toFixed(1)}%
                      </span>
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
