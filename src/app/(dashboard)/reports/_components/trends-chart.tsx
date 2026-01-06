'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface TrendsChartProps {
  data: Array<{
    date: string
    status: string
    count: number
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

export function TrendsChart({ data }: TrendsChartProps) {
  // Transform data for line chart - pivot by status
  const dateMap = new Map<string, Record<string, number>>()

  data.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date })
    }
    const dateData = dateMap.get(item.date)!
    const label = STATUS_LABELS[item.status] || item.status
    dateData[label] = item.count
  })

  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Get all unique statuses
  const allStatuses = new Set<string>()
  data.forEach((item) => {
    allStatuses.add(STATUS_LABELS[item.status] || item.status)
  })

  const statuses = Array.from(allStatuses)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold">{format(new Date(label), 'MMM dd, yyyy')}</p>
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
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
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
          <Line
            key={status}
            type="monotone"
            dataKey={status}
            stroke={STATUS_COLORS[status.toUpperCase()] || '#9ca3af'}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
