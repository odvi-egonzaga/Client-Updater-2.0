import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { BranchPerformanceTable } from '../branch-performance-table'

describe('BranchPerformanceTable', () => {
  const mockData = [
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
    {
      branchId: '2',
      branchName: 'North Branch',
      branchCode: 'NB002',
      areaName: 'North Luzon',
      totalClients: 80,
      completedCount: 60,
      inProgressCount: 15,
      pendingCount: 5,
      completionRate: 75,
    },
  ]

  it('renders table with branch data', () => {
    render(<BranchPerformanceTable data={mockData} />)
    
    expect(screen.getByText('Main Branch')).toBeInTheDocument()
    expect(screen.getByText('North Branch')).toBeInTheDocument()
    expect(screen.getByText('MB001')).toBeInTheDocument()
    expect(screen.getByText('NB002')).toBeInTheDocument()
  })

  it('displays status counts for each branch', () => {
    render(<BranchPerformanceTable data={mockData} />)
    
    expect(screen.getByText('Done: 50')).toBeInTheDocument()
    expect(screen.getByText('In Progress: 30')).toBeInTheDocument()
    expect(screen.getByText('Pending: 20')).toBeInTheDocument()
  })

  it('shows completion rate with progress bar', () => {
    render(<BranchPerformanceTable data={mockData} />)
    
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
  })

  it('sorts data by branch name when clicking column header', () => {
    render(<BranchPerformanceTable data={mockData} />)
    
    const branchNameHeader = screen.getByText('Branch Name')
    fireEvent.click(branchNameHeader)
    
    // After sorting, the first row should be Main Branch (alphabetically first)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Main Branch')
  })

  it('sorts data by completion rate when clicking column header', () => {
    render(<BranchPerformanceTable data={mockData} />)
    
    const completionHeader = screen.getByText('Completion')
    fireEvent.click(completionHeader)
    
    // After sorting descending, the first row should be North Branch (75% > 50%)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('North Branch')
  })

  it('shows no data message when data is empty', () => {
    render(<BranchPerformanceTable data={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders area information for each branch', () => {
    render(<BranchPerformanceTable data={mockData} />)
    
    expect(screen.getByText('Metro Manila')).toBeInTheDocument()
    expect(screen.getByText('North Luzon')).toBeInTheDocument()
  })
})
