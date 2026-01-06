'use client'

import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from 'recharts'

interface StatusPieChartProps {
  data: Array<{
    status: string
    count: number
    percentage: number
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

export function StatusPieChart({ data }: StatusPieChartProps) {
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    percentage: item.percentage,
    color: STATUS_COLORS[item.status] || '#9ca3af',
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Count: {data.value} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null // Don't show label for small slices

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    )
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
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={CustomLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          formatter={(value, entry: any) => (
            <span className="text-sm">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
