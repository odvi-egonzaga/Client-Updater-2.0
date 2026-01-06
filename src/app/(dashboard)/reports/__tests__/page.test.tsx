import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import ReportsPage from '../page'

// Mock the hooks
vi.mock('@/features/reports/hooks/use-reports', () => ({
  useStatusSummary: vi.fn(() => ({
    data: {
      totalClients: 100,
      statusCounts: {
        PENDING: 20,
        TO_FOLLOW: 30,
        DONE: 50,
      },
      statusPercentages: {
        PENDING: 20,
        TO_FOLLOW: 30,
        DONE: 50,
      },
      paymentCount: 10,
      terminalCount: 5,
    },
    isLoading: false,
    error: null,
  })),
  usePensionTypeSummary: vi.fn(() => ({
    data: [
      {
        pensionType: 'Retirement',
        totalClients: 50,
        statusCounts: {
          PENDING: 10,
          TO_FOLLOW: 15,
          DONE: 25,
        },
      },
    ],
    isLoading: false,
  })),
  useBranchPerformanceSummary: vi.fn(() => ({
    data: [
      {
        branchId: '1',
        branchName: 'Main Branch',
        branchCode: 'MB001',
        areaName: 'Metro Manila',
        totalClients: 100,
        completedCount: 50,
        inProgressCount: 30,
        pendingCount: 20,
        completionRate: 50,
      },
    ],
    isLoading: false,
  })),
  useStatusTrends: vi.fn(() => ({
    data: [
      { date: '2024-01-01', status: 'PENDING', count: 10 },
      { date: '2024-01-01', status: 'DONE', count: 5 },
    ],
    isLoading: false,
  })),
}))

// Mock PeriodSelector component
vi.mock('@/features/status/components/period-selector', () => ({
  PeriodSelector: ({ value, onChange }: any) => (
    <div data-testid="period-selector">
      <button onClick={() => onChange({ ...value, periodYear: 2025 })}>
        Change Year
      </button>
    </div>
  ),
}))

describe('ReportsPage', () => {
  it('renders page title and description', () => {
    render(<ReportsPage />)
    
    expect(screen.getByText('Reports Dashboard')).toBeInTheDocument()
    expect(screen.getByText('View and analyze client status reports and performance metrics.')).toBeInTheDocument()
  })

  it('renders summary cards', () => {
    render(<ReportsPage />)
    
    expect(screen.getByText('Total Clients')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('displays correct summary metrics', () => {
    render(<ReportsPage />)
    
    expect(screen.getByText('100')).toBeInTheDocument() // Total Clients
    expect(screen.getByText('50')).toBeInTheDocument() // Completed
    expect(screen.getByText('30')).toBeInTheDocument() // In Progress
    expect(screen.getByText('20')).toBeInTheDocument() // Pending
  })

  it('renders chart sections', () => {
    render(<ReportsPage />)
    
    expect(screen.getByText('Status Distribution')).toBeInTheDocument()
    expect(screen.getByText('Pension Type Breakdown')).toBeInTheDocument()
    expect(screen.getByText('30-Day Trends')).toBeInTheDocument()
    expect(screen.getByText('Branch Performance')).toBeInTheDocument()
  })

  it('renders company selector', () => {
    render(<ReportsPage />)
    
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByText('Select Company')).toBeInTheDocument()
  })

  it('renders period selector', () => {
    render(<ReportsPage />)
    
    expect(screen.getByTestId('period-selector')).toBeInTheDocument()
  })

  it('allows changing company', () => {
    render(<ReportsPage />)
    
    const companySelect = screen.getByLabelText(/company/i)
    fireEvent.change(companySelect, { target: { value: 'fcash' } })
    
    expect(companySelect).toHaveValue('fcash')
  })
})
