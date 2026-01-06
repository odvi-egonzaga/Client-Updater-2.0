import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AreasPage from '../page'
import { useAreasStore } from '@/features/areas/stores/areas-store'

// Mock the store
vi.mock('@/features/areas/stores/areas-store')

describe('AreasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page with title and description', () => {
    // Mock the store to return empty areas
    vi.mocked(useAreasStore).mockReturnValue({
      areas: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<AreasPage />)

    expect(screen.getByText('Areas')).toBeInTheDocument()
    expect(screen.getByText('Manage and view all area information.')).toBeInTheDocument()
  })

  it('renders the Add Area button', () => {
    vi.mocked(useAreasStore).mockReturnValue({
      areas: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<AreasPage />)

    const addButton = screen.getByText('Add Area')
    expect(addButton).toBeInTheDocument()
  })

  it('renders AreaFilters component', () => {
    vi.mocked(useAreasStore).mockReturnValue({
      areas: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<AreasPage />)

    expect(screen.getByPlaceholderText('Search by code or name...')).toBeInTheDocument()
  })

  it('renders AreaTable component', () => {
    vi.mocked(useAreasStore).mockReturnValue({
      areas: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<AreasPage />)

    expect(screen.getByText('No areas found')).toBeInTheDocument()
  })
})
