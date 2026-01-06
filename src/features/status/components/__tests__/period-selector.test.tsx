import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { PeriodSelector } from '../period-selector'
import type { PeriodFilter } from '../../types'

// Mock the useAvailableYears hook
vi.mock('../../hooks/use-status', () => ({
  useAvailableYears: () => [2023, 2024, 2025],
}))

describe('PeriodSelector', () => {
  const defaultProps = {
    periodType: 'monthly' as const,
    value: {
      periodType: 'monthly',
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
    } as PeriodFilter,
    onChange: vi.fn(),
  }

  it('renders period type toggle', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Quarterly')).toBeInTheDocument()
  })

  it('renders year selector', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    const yearLabel = screen.getByLabelText(/year/i)
    expect(yearLabel).toBeInTheDocument()
  })

  it('renders month selector for monthly period type', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    const monthLabel = screen.getByLabelText(/month/i)
    expect(monthLabel).toBeInTheDocument()
  })

  it('renders quarter selector for quarterly period type', () => {
    render(<PeriodSelector {...defaultProps} periodType="quarterly" />)
    
    const quarterLabel = screen.getByLabelText(/quarter/i)
    expect(quarterLabel).toBeInTheDocument()
  })

  it('displays selected period', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    expect(screen.getByText('Selected Period')).toBeInTheDocument()
    expect(screen.getByText('January 2024')).toBeInTheDocument()
  })

  it('calls onChange when period type is changed', () => {
    const onChange = vi.fn()
    render(<PeriodSelector {...defaultProps} onChange={onChange} />)
    
    const quarterlyButton = screen.getByText('Quarterly')
    fireEvent.click(quarterlyButton)
    
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onChange when year is changed', () => {
    const onChange = vi.fn()
    render(<PeriodSelector {...defaultProps} onChange={onChange} />)
    
    const yearSelect = screen.getByLabelText(/year/i)
    fireEvent.change(yearSelect, { target: { value: '2025' } })
    
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        periodYear: 2025,
      })
    )
  })

  it('calls onChange when month is changed', () => {
    const onChange = vi.fn()
    render(<PeriodSelector {...defaultProps} onChange={onChange} />)
    
    const monthSelect = screen.getByLabelText(/month/i)
    fireEvent.change(monthSelect, { target: { value: '2' } })
    
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        periodMonth: 2,
        periodQuarter: null,
      })
    )
  })

  it('calls onChange when quarter is changed', () => {
    const onChange = vi.fn()
    render(<PeriodSelector {...defaultProps} periodType="quarterly" onChange={onChange} />)
    
    const quarterSelect = screen.getByLabelText(/quarter/i)
    fireEvent.change(quarterSelect, { target: { value: '2' } })
    
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        periodMonth: null,
        periodQuarter: 2,
      })
    )
  })

  it('disables all controls when disabled', () => {
    render(<PeriodSelector {...defaultProps} disabled={true} />)
    
    const monthlyButton = screen.getByText('Monthly')
    const quarterlyButton = screen.getByText('Quarterly')
    const yearSelect = screen.getByLabelText(/year/i)
    const monthSelect = screen.getByLabelText(/month/i)
    
    expect(monthlyButton).toBeDisabled()
    expect(quarterlyButton).toBeDisabled()
    expect(yearSelect).toBeDisabled()
    expect(monthSelect).toBeDisabled()
  })

  it('renders available years from hook', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    const yearSelect = screen.getByLabelText(/year/i)
    expect(yearSelect).toContainHTML('2023')
    expect(yearSelect).toContainHTML('2024')
    expect(yearSelect).toContainHTML('2025')
  })

  it('displays correct period label for monthly', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    expect(screen.getByText('January 2024')).toBeInTheDocument()
  })

  it('displays correct period label for quarterly', () => {
    render(
      <PeriodSelector
        {...defaultProps}
        periodType="quarterly"
        value={{
          periodType: 'quarterly',
          periodYear: 2024,
          periodMonth: null,
          periodQuarter: 1,
        }}
      />
    )
    
    expect(screen.getByText('Q1 (Jan-Mar) 2024')).toBeInTheDocument()
  })

  it('highlights active period type', () => {
    render(<PeriodSelector {...defaultProps} />)
    
    const monthlyButton = screen.getByText('Monthly')
    const quarterlyButton = screen.getByText('Quarterly')
    
    expect(monthlyButton).toHaveClass('bg-primary')
    expect(quarterlyButton).not.toHaveClass('bg-primary')
  })
})
