import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import ExportsPage from '../page'

// Mock the hooks
vi.mock('@/features/reports/hooks/use-exports', () => ({
  useExportJobs: vi.fn(() => ({
    data: {
      data: [
        {
          id: '1',
          type: 'clients',
          format: 'csv',
          name: 'Test Export 1',
          description: 'Test description',
          status: 'completed',
          filePath: '/exports/test1.csv',
          fileName: 'test1.csv',
          fileSize: 1024,
          errorMessage: null,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-01-02T00:00:00Z',
        },
        {
          id: '2',
          type: 'client_status',
          format: 'xlsx',
          name: 'Test Export 2',
          description: null,
          status: 'processing',
          filePath: null,
          fileName: null,
          fileSize: null,
          errorMessage: null,
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          expiresAt: null,
        },
      ],
      meta: {
        page: 1,
        pageSize: 25,
        total: 2,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useCreateExport: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: '3', status: 'pending' }),
    isPending: false,
  })),
}))

// Mock window.open
global.open = vi.fn()

describe('ExportsPage', () => {
  it('renders page title and description', () => {
    render(<ExportsPage />)
    
    expect(screen.getByText('Export Management')).toBeInTheDocument()
    expect(screen.getByText('Create and manage data exports.')).toBeInTheDocument()
  })

  it('renders new export button', () => {
    render(<ExportsPage />)
    
    expect(screen.getByText('New Export')).toBeInTheDocument()
  })

  it('renders export jobs table', () => {
    render(<ExportsPage />)
    
    expect(screen.getByText('Export Jobs')).toBeInTheDocument()
    expect(screen.getByText('Export Name')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Format')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('displays export job data', () => {
    render(<ExportsPage />)
    
    expect(screen.getByText('Test Export 1')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('clients')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('client_status')).toBeInTheDocument()
    expect(screen.getByText('XLSX')).toBeInTheDocument()
  })

  it('shows status badges for each export', () => {
    render(<ExportsPage />)
    
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('shows download button for completed exports', () => {
    render(<ExportsPage />)
    
    const downloadButtons = screen.getAllByText('Download')
    expect(downloadButtons.length).toBeGreaterThan(0)
  })

  it('opens create export dialog when clicking new export button', async () => {
    render(<ExportsPage />)
    
    const newExportButton = screen.getByText('New Export')
    fireEvent.click(newExportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Create New Export')).toBeInTheDocument()
      expect(screen.getByText('Configure and create a new data export job.')).toBeInTheDocument()
    })
  })

  it('renders export type selector in dialog', async () => {
    render(<ExportsPage />)
    
    const newExportButton = screen.getByText('New Export')
    fireEvent.click(newExportButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/export type/i)).toBeInTheDocument()
    })
  })

  it('renders format selector in dialog', async () => {
    render(<ExportsPage />)
    
    const newExportButton = screen.getByText('New Export')
    fireEvent.click(newExportButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/format/i)).toBeInTheDocument()
    })
  })

  it('renders status filter', () => {
    render(<ExportsPage />)
    
    expect(screen.getByLabelText(/status filter/i)).toBeInTheDocument()
    expect(screen.getByText('All Statuses')).toBeInTheDocument()
  })

  it('allows filtering by status', () => {
    render(<ExportsPage />)
    
    const statusFilter = screen.getByLabelText(/status filter/i)
    fireEvent.change(statusFilter, { target: { value: 'completed' } })
    
    expect(statusFilter).toHaveValue('completed')
  })
})
