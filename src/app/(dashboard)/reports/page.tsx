'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PeriodSelector } from '@/features/status/components/period-selector'
import { StatusPieChart } from './_components/status-pie-chart'
import { PensionTypeChart } from './_components/pension-type-chart'
import { TrendsChart } from './_components/trends-chart'
import { BranchPerformanceTable } from './_components/branch-performance-table'
import {
  useStatusSummary,
  usePensionTypeSummary,
  useBranchPerformanceSummary,
  useStatusTrends,
} from '@/features/reports/hooks/use-reports'
import { Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { PeriodFilter } from '@/features/status/types'

export default function ReportsPage() {
  const [companyId, setCompanyId] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>({
    periodType: 'monthly',
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
    periodQuarter: null,
  })

  // Fetch dashboard data
  const { data: statusSummary, isLoading: statusLoading, error: statusError } = useStatusSummary({
    companyId,
    periodYear: period.periodYear,
    periodMonth: period.periodMonth ?? undefined,
    periodQuarter: period.periodQuarter ?? undefined,
  })

  const { data: pensionTypeSummary, isLoading: pensionLoading } = usePensionTypeSummary({
    companyId,
    periodYear: period.periodYear,
    periodMonth: period.periodMonth ?? undefined,
    periodQuarter: period.periodQuarter ?? undefined,
  })

  const { data: branchPerformance, isLoading: branchLoading } = useBranchPerformanceSummary({
    companyId,
    periodYear: period.periodYear,
    periodMonth: period.periodMonth ?? undefined,
    periodQuarter: period.periodQuarter ?? undefined,
  })

  const { data: trends, isLoading: trendsLoading } = useStatusTrends({
    companyId,
    periodYear: period.periodYear,
    periodMonth: period.periodMonth ?? undefined,
    periodQuarter: period.periodQuarter ?? undefined,
    days: 30,
  })

  const isLoading = statusLoading || pensionLoading || branchLoading || trendsLoading
  const error = statusError

  // Transform status summary data for pie chart
  const statusPieData = statusSummary
    ? Object.entries(statusSummary.statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: statusSummary.statusPercentages[status] || 0,
      }))
    : []

  // Calculate summary metrics
  const totalClients = statusSummary?.totalClients || 0
  const completedCount = statusSummary?.statusCounts['DONE'] || 0
  const inProgressCount =
    (statusSummary?.statusCounts['TO_FOLLOW'] || 0) +
    (statusSummary?.statusCounts['CALLED'] || 0) +
    (statusSummary?.statusCounts['VISITED'] || 0) +
    (statusSummary?.statusCounts['UPDATED'] || 0)
  const pendingCount = statusSummary?.statusCounts['PENDING'] || 0

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Reports Dashboard</h1>
        <p className="text-muted-foreground">
          View and analyze client status reports and performance metrics.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-[300px_1fr]">
        <PeriodSelector
          periodType={period.periodType}
          value={period}
          onChange={setPeriod}
          disabled={isLoading}
        />
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="company" className="text-sm font-medium">
                  Company
                </label>
                <Select
                  id="company"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={isLoading}
                  className="mt-1"
                >
                  <option value="">Select Company</option>
                  <option value="fcash">FCASH</option>
                  <option value="pcni">PCNI</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Failed to load reports</p>
            </div>
            <p className="mt-2 text-sm text-destructive/80">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">All clients in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalClients > 0 ? ((completedCount / totalClients) * 100).toFixed(1) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalClients > 0 ? ((inProgressCount / totalClients) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalClients > 0 ? ((pendingCount / totalClients) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <StatusPieChart data={statusPieData} />
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                {isLoading ? 'Loading...' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pension Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Pension Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pensionTypeSummary && pensionTypeSummary.length > 0 ? (
              <PensionTypeChart data={pensionTypeSummary} />
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                {pensionLoading ? 'Loading...' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>30-Day Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {trends && trends.length > 0 ? (
            <TrendsChart data={trends} />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              {trendsLoading ? 'Loading...' : 'No data available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Performance Table */}
      <BranchPerformanceTable data={branchPerformance || []} />
    </div>
  )
}
