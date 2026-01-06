import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { TrendsChart } from '../trends-chart'

describe('TrendsChart', () => {
  const mockData = [
    { date: '2024-01-01', status: 'PENDING', count: 10 },
    { date: '2024-01-01', status: 'DONE', count: 5 },
    { date: '2024-01-02', status: 'PENDING', count: 8 },
    { date: '2024-01-02', status: 'DONE', count: 7 },
  ]

  it('renders line chart with trends data', () => {
    render(<TrendsChart data={mockData} />)
    
    // Check if chart is rendered (Recharts doesn't expose elements easily, so we check for no error state)
    expect(screen.queryByText('No data available')).not.toBeInTheDocument()
  })

  it('shows no data message when data is empty', () => {
    render(<TrendsChart data={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders legend with status names', () => {
    render(<TrendsChart data={mockData} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})
