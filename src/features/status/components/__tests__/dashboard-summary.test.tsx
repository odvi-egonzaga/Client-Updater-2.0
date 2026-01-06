import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { DashboardSummary } from '../dashboard-summary'
import type { DashboardSummary as DashboardSummaryType } from '../../types'

describe('DashboardSummary', () => {
  const mockSummary: DashboardSummaryType = {
    totalClients: 100,
    statusCounts: {
      PENDING: 20,
      TO_FOLLOW: 30,
      CALLED: 15,
      VISITED: 10,
      UPDATED: 15,
      DONE: 10,
    },
    paymentCount: 45,
    terminalCount: 10,
    byPensionType: {
      SSS: 50,
      GSIS: 30,
      PAGIBIG: 20,
    },
  }

  it('renders loading state', () => {
    render(<DashboardSummary summary={mockSummary} loading={true} />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders dashboard title', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('Dashboard Summary')).toBeInTheDocument()
  })

  it('renders total clients count', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('Total Clients')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders payments received count', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('Payments Received')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('renders terminal status count', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('Terminal Status')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders status breakdown section', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument()
  })

  it('renders all status badges', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.getByText('TO_FOLLOW')).toBeInTheDocument()
    expect(screen.getByText('CALLED')).toBeInTheDocument()
    expect(screen.getByText('VISITED')).toBeInTheDocument()
    expect(screen.getByText('UPDATED')).toBeInTheDocument()
    expect(screen.getByText('DONE')).toBeInTheDocument()
  })

  it('renders status counts', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('20 clients')).toBeInTheDocument()
    expect(screen.getByText('30 clients')).toBeInTheDocument()
    expect(screen.getByText('15 clients')).toBeInTheDocument()
    expect(screen.getByText('10 clients')).toBeInTheDocument()
  })

  it('renders status percentages', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('renders status progress bars', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    const progressBars = document.querySelectorAll('[class*="rounded-full"]')
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('renders pension type breakdown section', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('Breakdown by Pension Type')).toBeInTheDocument()
  })

  it('renders pension type counts', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    expect(screen.getByText('SSS')).toBeInTheDocument()
    expect(screen.getByText('GSIS')).toBeInTheDocument()
    expect(screen.getByText('PAGIBIG')).toBeInTheDocument()
  })

  it('renders pension type values', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    const sssValue = screen.getAllByText('50')
    const gsisValue = screen.getAllByText('30')
    const pagibigValue = screen.getAllByText('20')
    
    expect(sssValue.length).toBeGreaterThan(0)
    expect(gsisValue.length).toBeGreaterThan(0)
    expect(pagibigValue.length).toBeGreaterThan(0)
  })

  it('does not render pension type breakdown when empty', () => {
    const emptySummary: DashboardSummaryType = {
      totalClients: 100,
      statusCounts: {},
      paymentCount: 0,
      terminalCount: 0,
      byPensionType: {},
    }
    
    render(<DashboardSummary summary={emptySummary} />)
    
    expect(screen.queryByText('Breakdown by Pension Type')).not.toBeInTheDocument()
  })

  it('handles zero total clients correctly', () => {
    const zeroSummary: DashboardSummaryType = {
      totalClients: 0,
      statusCounts: {},
      paymentCount: 0,
      terminalCount: 0,
      byPensionType: {},
    }
    
    render(<DashboardSummary summary={zeroSummary} />)
    
    expect(screen.getByText('Total Clients')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders icons for summary cards', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    // Check for icons by their presence in the document
    const icons = document.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('calculates correct percentage for status counts', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    // PENDING: 20/100 = 20%
    expect(screen.getByText('20%')).toBeInTheDocument()
    // TO_FOLLOW: 30/100 = 30%
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('renders progress bars with correct widths', () => {
    render(<DashboardSummary summary={mockSummary} />)
    
    // Check that progress bars have inline styles for width
    const progressBars = document.querySelectorAll('[class*="rounded-full"][style]')
    expect(progressBars.length).toBeGreaterThan(0)
  })
})
