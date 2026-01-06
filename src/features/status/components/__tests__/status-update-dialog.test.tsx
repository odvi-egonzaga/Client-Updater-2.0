import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { StatusUpdateDialog } from '../status-update-dialog'
import type { ClientPeriodStatus, PeriodType } from '../../types'

describe('StatusUpdateDialog', () => {
  const mockClientStatus: ClientPeriodStatus = {
    id: '1',
    clientId: 'client-1',
    periodType: 'monthly',
    periodYear: 2024,
    periodMonth: 1,
    periodQuarter: null,
    status: {
      id: '1',
      name: 'Pending',
      code: 'PENDING',
      requiresRemarks: false,
      isTerminal: false,
      workflowOrder: 1,
    },
    reason: null,
    remarks: null,
    hasPayment: false,
    updateCount: 0,
    isTerminal: false,
    updatedBy: { id: 'user-1', name: 'Test User' },
    updatedAt: '2024-01-01T00:00:00Z',
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    clientId: 'client-1',
    currentStatus: mockClientStatus,
    companyId: 'company-1',
    periodType: 'monthly' as PeriodType,
  }

  it('renders dialog when open is true', () => {
    render(<StatusUpdateDialog {...defaultProps} />)
    
    expect(screen.getByText('Update Client Status')).toBeInTheDocument()
  })

  it('does not render dialog when open is false', () => {
    render(<StatusUpdateDialog {...defaultProps} open={false} />)
    
    expect(screen.queryByText('Update Client Status')).not.toBeInTheDocument()
  })

  it('renders StatusUpdateForm inside dialog', () => {
    render(<StatusUpdateDialog {...defaultProps} />)
    
    expect(screen.getByText('Update Status')).toBeInTheDocument()
  })

  it('calls onClose when dialog is closed', () => {
    const onClose = vi.fn()
    render(<StatusUpdateDialog {...defaultProps} onClose={onClose} />)
    
    // Click overlay to close
    const overlay = document.querySelector('[data-state="open"] > div:first-child')
    if (overlay) {
      fireEvent.click(overlay)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<StatusUpdateDialog {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('displays current status when provided', () => {
    render(<StatusUpdateDialog {...defaultProps} />)
    
    expect(screen.getByText('Current Status')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders without current status when not provided', () => {
    render(<StatusUpdateDialog {...defaultProps} currentStatus={undefined} />)
    
    expect(screen.queryByText('Current Status')).not.toBeInTheDocument()
  })

  it('renders status dropdown', () => {
    render(<StatusUpdateDialog {...defaultProps} />)
    
    const statusLabel = screen.getByLabelText(/status/i)
    expect(statusLabel).toBeInTheDocument()
  })

  it('renders payment toggle', () => {
    render(<StatusUpdateDialog {...defaultProps} />)
    
    const paymentToggle = screen.getByLabelText(/payment received/i)
    expect(paymentToggle).toBeInTheDocument()
  })

  it('renders update status button', () => {
    render(<StatusUpdateDialog {...defaultProps} />)
    
    expect(screen.getByText('Update Status')).toBeInTheDocument()
  })
})
