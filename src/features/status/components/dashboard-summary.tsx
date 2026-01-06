'use client'

import type { DashboardSummary as DashboardSummaryType } from '../types'
import { ProgressCard } from './progress-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface DashboardSummaryProps {
  summary: DashboardSummaryType
  loading?: boolean
}


export function DashboardSummary({ summary, loading }: DashboardSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="size-8" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const doneCount = summary.statusCounts['DONE'] || 0
  const totalClients = summary.totalClients || 0
  
  // Calculate progress percentage
  const getProgressPercentage = (count: number, total: number) => {
    if (total === 0) return 0
    return Math.round((count / total) * 100)
  }
  
  const progressPercentage = getProgressPercentage(doneCount, totalClients)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* FCASH Progress Card */}
          <ProgressCard
            title="FCASH Progress"
            progress={progressPercentage}
            completedCount={doneCount}
            totalCount={totalClients}
            color="teal"
          />
          
          {/* PCNI Progress Card */}
          <ProgressCard
            title="PCNI Progress"
            progress={progressPercentage}
            completedCount={doneCount}
            totalCount={totalClients}
            color="blue"
          />
        </div>
      </CardContent>
    </Card>
  )
}
