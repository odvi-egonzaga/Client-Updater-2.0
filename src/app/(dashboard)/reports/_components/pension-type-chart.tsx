'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PensionTypeChartProps {
  data: Array<{
    pensionType: string
    totalClients: number
    statusCounts: Record<string, number>
  }>
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9ca3af',
  TO_FOLLOW: '#3b82f6',
  CALLED: '#f59e0b',
  VISITED: '#10b981',
  UPDATED: '#6366f1',
  DONE: '#10b981',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  TO_FOLLOW: 'To Follow',
  CALLED: 'Called',
  VISITED: 'Visited',
  UPDATED: 'Updated',
  DONE: 'Done',
}

export function PensionTypeChart({ data }: PensionTypeChartProps) {
  // Transform data for stacked bar chart
  const chartData = data.map((item) => {
    const transformed: any = {
      pensionType: item.pensionType,
    }

    Object.entries(item.statusCounts).forEach(([status, count]) => {
      transformed[STATUS_LABELS[status] || status] = count
    })

    return transformed
  })

  // Get all unique statuses from the data
  const allStatuses = new Set<string>()
  data.forEach((item) => {
    Object.keys(item.statusCounts).forEach((status) => {
      allStatuses.add(STATUS_LABELS[status] || status)
    })
  })

  const statuses = Array.from(allStatuses)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="pensionType"
          tick={{ fill: 'currentColor' }}
          className="text-sm"
        />
        <YAxis
          tick={{ fill: 'currentColor' }}
          className="text-sm"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-sm">{value}</span>}
        />
        {statuses.map((status) => (
          <Bar
            key={status}
            dataKey={status}
            stackId="a"
            fill={STATUS_COLORS[status.toUpperCase()] || '#9ca3af'}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
