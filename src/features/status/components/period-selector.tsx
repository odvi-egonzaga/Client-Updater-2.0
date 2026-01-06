'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import type { PeriodType, PeriodFilter } from '../types'
import { useAvailableYears } from '../hooks/use-status'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PeriodSelectorProps {
  periodType: PeriodType
  value: PeriodFilter
  onChange: (period: PeriodFilter) => void
  disabled?: boolean
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' },
  { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' },
  { value: 4, label: 'Q4 (Oct-Dec)' },
]

export function PeriodSelector({
  periodType,
  value,
  onChange,
  disabled = false,
}: PeriodSelectorProps) {
  const availableYears = useAvailableYears()
  const [isOpen, setIsOpen] = useState(false)

  const handlePeriodTypeChange = (newPeriodType: PeriodType) => {
    const currentDate = new Date()
    const newPeriod: PeriodFilter = {
      periodType: newPeriodType,
      periodYear: value.periodYear,
      periodMonth: newPeriodType === 'monthly' ? currentDate.getMonth() + 1 : null,
      periodQuarter: newPeriodType === 'quarterly' ? Math.ceil((currentDate.getMonth() + 1) / 3) : null,
    }
    onChange(newPeriod)
  }

  const handleYearChange = (year: number) => {
    onChange({
      ...value,
      periodYear: year,
    })
  }

  const handleMonthChange = (month: number) => {
    onChange({
      ...value,
      periodMonth: month,
      periodQuarter: null,
    })
  }

  const handleQuarterChange = (quarter: number) => {
    onChange({
      ...value,
      periodMonth: null,
      periodQuarter: quarter,
    })
  }

  const getPeriodLabel = () => {
    if (periodType === 'monthly' && value.periodMonth) {
      const month = MONTHS.find((m) => m.value === value.periodMonth)
      return `${month?.label} ${value.periodYear}`
    }
    if (periodType === 'quarterly' && value.periodQuarter) {
      const quarter = QUARTERS.find((q) => q.value === value.periodQuarter)
      return `${quarter?.label} ${value.periodYear}`
    }
    return `${value.periodYear}`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Period Type Toggle */}
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <div className="flex rounded-md border p-1">
              <Button
                type="button"
                variant={periodType === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodTypeChange('monthly')}
                disabled={disabled}
                className="h-8"
              >
                Monthly
              </Button>
              <Button
                type="button"
                variant={periodType === 'quarterly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePeriodTypeChange('quarterly')}
                disabled={disabled}
                className="h-8"
              >
                Quarterly
              </Button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="space-y-2">
            <label htmlFor="year" className="text-sm font-medium">
              Year
            </label>
            <div className="relative">
              <select
                id="year"
                value={value.periodYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                disabled={disabled}
                className={cn(
                  'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Month Selector (Monthly only) */}
          {periodType === 'monthly' && (
            <div className="space-y-2">
              <label htmlFor="month" className="text-sm font-medium">
                Month
              </label>
              <div className="relative">
                <select
                  id="month"
                  value={value.periodMonth || ''}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  disabled={disabled}
                  className={cn(
                    'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Quarter Selector (Quarterly only) */}
          {periodType === 'quarterly' && (
            <div className="space-y-2">
              <label htmlFor="quarter" className="text-sm font-medium">
                Quarter
              </label>
              <div className="relative">
                <select
                  id="quarter"
                  value={value.periodQuarter || ''}
                  onChange={(e) => handleQuarterChange(Number(e.target.value))}
                  disabled={disabled}
                  className={cn(
                    'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {QUARTERS.map((quarter) => (
                    <option key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Current Selection Display */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Selected Period</p>
            <p className="text-base font-semibold">{getPeriodLabel()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
