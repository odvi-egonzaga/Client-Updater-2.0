import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { PensionTypeChart } from '../pension-type-chart'

describe('PensionTypeChart', () => {
  const mockData = [
    {
      pensionType: 'Retirement',
      totalClients: 50,
      statusCounts: {
        PENDING: 10,
        TO_FOLLOW: 15,
        DONE: 25,
      },
    },
    {
      pensionType: 'Death',
      totalClients: 30,
      statusCounts: {
        PENDING: 5,
        TO_FOLLOW: 10,
        DONE: 15,
      },
    },
  ]

  it('renders bar chart with pension types', () => {
    render(<PensionTypeChart data={mockData} />)
    
    expect(screen.getByText('Retirement')).toBeInTheDocument()
    expect(screen.getByText('Death')).toBeInTheDocument()
  })

  it('displays stacked bars for status breakdown', () => {
    render(<PensionTypeChart data={mockData} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('To Follow')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('shows no data message when data is empty', () => {
    render(<PensionTypeChart data={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders legend with status names', () => {
    render(<PensionTypeChart data={mockData} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('To Follow')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})
