import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BranchesPage from '../page'
import { useBranchesStore } from '@/features/branches/stores/branches-store'

// Mock the store
vi.mock('@/features/branches/stores/branches-store')

describe('BranchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page with title and description', () => {
    // Mock the store to return empty branches
    vi.mocked(useBranchesStore).mockReturnValue({
      branches: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<BranchesPage />)

    expect(screen.getByText('Branches')).toBeInTheDocument()
    expect(screen.getByText('Manage and view all branch information.')).toBeInTheDocument()
  })

  it('renders the Add Branch button', () => {
    vi.mocked(useBranchesStore).mockReturnValue({
      branches: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<BranchesPage />)

    const addButton = screen.getByText('Add Branch')
    expect(addButton).toBeInTheDocument()
  })

  it('renders BranchFilters component', () => {
    vi.mocked(useBranchesStore).mockReturnValue({
      branches: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<BranchesPage />)

    expect(screen.getByPlaceholderText('Search by code, name, or location...')).toBeInTheDocument()
  })

  it('renders BranchTable component', () => {
    vi.mocked(useBranchesStore).mockReturnValue({
      branches: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })

    render(<BranchesPage />)

    expect(screen.getByText('No branches found')).toBeInTheDocument()
  })
})
