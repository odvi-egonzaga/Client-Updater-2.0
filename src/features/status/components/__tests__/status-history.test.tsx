import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { StatusHistory } from '../status-history'
import type { StatusEvent } from '../../types'

// Mock the useClientStatusHistory hook
vi.mock('../../hooks/use-status', () => ({
  useClientStatusHistory: vi.fn(),
}))

describe('StatusHistory', () => {
  const mockHistory: StatusEvent[] = [
    {
      id: '1',
      eventSequence: 1,
      status: {
        id: '1',
        name: 'Pending',
        code: 'PENDING',
        requiresRemarks: false,
        isTerminal: false,
        workflowOrder: 1,
      },
      reason: {
        id: 'r1',
        name: 'New Client',
        code: 'NEW',
        statusId: '1',
        requiresRemarks: false,
      },
      remarks: 'Initial status',
      hasPayment: false,
      createdBy: { id: 'user-1', name: 'John Doe' },
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      eventSequence: 2,
      status: {
        id: '2',
        name: 'To Follow',
        code: 'TO_FOLLOW',
        requiresRemarks: false,
        isTerminal: false,
        workflowOrder: 2,
      },
      reason: {
        id: 'r3',
        name: 'No Answer',
        code: 'NO_ANSWER',
        statusId: '2',
        requiresRemarks: false,
      },
      remarks: 'Called but no answer',
      hasPayment: true,
      createdBy: { id: 'user-2', name: 'Jane Smith' },
      createdAt: '2024-01-02T14:30:00Z',
    },
  ]

  it('renders loading state', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders error state', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText(/failed to load status history/i)).toBeInTheDocument()
  })

  it('renders empty state when no history', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText(/no status history available/i)).toBeInTheDocument()
  })

  it('renders status history with events', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText('Status History')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('To Follow')).toBeInTheDocument()
  })

  it('renders status badges for each event', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.getByText('TO_FOLLOW')).toBeInTheDocument()
  })

  it('renders reason for each event', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText('New Client')).toBeInTheDocument()
    expect(screen.getByText('No Answer')).toBeInTheDocument()
  })

  it('renders remarks for each event', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText('Initial status')).toBeInTheDocument()
    expect(screen.getByText('Called but no answer')).toBeInTheDocument()
  })

  it('renders payment status for each event', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText('No Payment')).toBeInTheDocument()
    expect(screen.getByText('Payment Received')).toBeInTheDocument()
  })

  it('renders user who made the change', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('renders timestamp for each event', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    // Check that timestamps are rendered (format may vary)
    const timestamps = screen.getAllByText(/Jan/i)
    expect(timestamps.length).toBeGreaterThan(0)
  })

  it('renders with custom limit', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" limit={10} />)
    
    expect(screen.getByText('Status History')).toBeInTheDocument()
  })

  it('renders timeline with correct structure', () => {
    const { useClientStatusHistory } = require('../../hooks/use-status')
    useClientStatusHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      error: null,
    })

    render(<StatusHistory clientId="client-1" />)
    
    // Check for timeline dots
    const timelineDots = document.querySelectorAll('[class*="rounded-full"]')
    expect(timelineDots.length).toBeGreaterThan(0)
  })
})
