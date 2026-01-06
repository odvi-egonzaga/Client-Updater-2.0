import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ActivityPage from '../page'

// Mock fetch function
global.fetch = vi.fn()

describe('ActivityPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders activity log page', async () => {
    // Mock successful response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            userId: 'user-1',
            userName: 'John Doe',
            action: 'client:update',
            resource: 'clients',
            resourceId: 'client-1',
            details: null,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            durationMs: 100,
            statusCode: 200,
            errorMessage: null,
            createdAt: new Date('2024-01-15T10:30:00Z'),
          },
        ],
        meta: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument()
      expect(screen.getByText('Track all user actions and system events')).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    // Mock pending response
    ;(global.fetch as any).mockImplementationOnce(() => new Promise(() => {}))

    renderWithQueryClient(<ActivityPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays error state', async () => {
    // Mock error response
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'))

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load activity logs/i)).toBeInTheDocument()
    })
  })

  it('displays activity logs', async () => {
    // Mock successful response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            userId: 'user-1',
            userName: 'John Doe',
            action: 'client:update',
            resource: 'clients',
            resourceId: 'client-1',
            details: null,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            durationMs: 100,
            statusCode: 200,
            errorMessage: null,
            createdAt: new Date('2024-01-15T10:30:00Z'),
          },
        ],
        meta: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('client:update')).toBeInTheDocument()
      expect(screen.getByText('clients')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('100ms')).toBeInTheDocument()
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
    })
  })

  it('filters by action category', async () => {
    // Mock successful response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      const actionFilter = screen.getByLabelText('Action:')
      expect(actionFilter).toBeInTheDocument()

      fireEvent.change(actionFilter, { target: { value: 'Client' } })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('actionCategory=Client')
      )
    })
  })

  it('filters by resource type', async () => {
    // Mock successful response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      const resourceFilter = screen.getByLabelText('Resource:')
      expect(resourceFilter).toBeInTheDocument()

      fireEvent.change(resourceFilter, { target: { value: 'Clients' } })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('resource=clients')
      )
    })
  })

  it('searches activity logs', async () => {
    // Mock successful response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search activity...')
      expect(searchInput).toBeInTheDocument()

      fireEvent.change(searchInput, { target: { value: 'client:update' } })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=client%3Aupdate')
      )
    })
  })

  it('displays empty state', async () => {
    // Mock successful response with empty data
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText('No activity logs found')).toBeInTheDocument()
    })
  })

  it('paginates activity logs', async () => {
    // Mock successful response with multiple pages
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 50,
          totalPages: 2,
        },
      }),
    })

    renderWithQueryClient(<ActivityPage />)

    await waitFor(() => {
      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeInTheDocument()

      fireEvent.click(nextButton)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      )
    })
  })
})
