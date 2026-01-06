import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { StatusPieChart } from '../status-pie-chart'

describe('StatusPieChart', () => {
  const mockData = [
    { status: 'PENDING', count: 10, percentage: 20 },
    { status: 'TO_FOLLOW', count: 15, percentage: 30 },
    { status: 'DONE', count: 25, percentage: 50 },
  ]

  it('renders pie chart with data', () => {
    render(<StatusPieChart data={mockData} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('To Follow')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('displays percentage labels for slices', () => {
    render(<StatusPieChart data={mockData} />)
    
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows no data message when data is empty', () => {
    render(<StatusPieChart data={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders legend with status names', () => {
    render(<StatusPieChart data={mockData} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('To Follow')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})
