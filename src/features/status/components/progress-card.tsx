'use client'

import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProgressCardProps {
  title: string
  progress: number
  completedCount: number
  totalCount: number
  color: 'teal' | 'blue'
}

// Color variants for progress bar
const COLOR_VARIANTS: Record<string, string> = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
}

export function ProgressCard({
  title,
  progress,
  completedCount,
  totalCount,
  color,
}: ProgressCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <BarChart3 className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="h-3 w-full rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              COLOR_VARIANTS[color]
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Progress Text */}
        <p className="text-sm text-muted-foreground">
          {progress}% Done ({completedCount}/{totalCount})
        </p>
      </CardContent>
    </Card>
  )
}
