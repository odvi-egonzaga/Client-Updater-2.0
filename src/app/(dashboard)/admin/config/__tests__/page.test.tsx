import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConfigPage from '../page'
import { useConfigStore } from '@/features/config/stores/config-store'

// Mock the store
vi.mock('@/features/config/stores/config-store')

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page with title and description', () => {
    // Mock the store to return empty state
    vi.mocked(useConfigStore).mockReturnValue({
      activeTab: 'options',
      selectedCategoryId: null,
      isLoading: false,
      error: null,
    })

    render(<ConfigPage />)

    expect(screen.getByText('Configuration Management')).toBeInTheDocument()
    expect(screen.getByText('Manage configuration options, settings, and view audit logs.')).toBeInTheDocument()
  })

  it('renders the tabs', () => {
    vi.mocked(useConfigStore).mockReturnValue({
      activeTab: 'options',
      selectedCategoryId: null,
      isLoading: false,
      error: null,
    })

    render(<ConfigPage />)

    expect(screen.getByText('Config Options')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
  })

  it('renders the category selector when options tab is active', () => {
    vi.mocked(useConfigStore).mockReturnValue({
      activeTab: 'options',
      selectedCategoryId: null,
      isLoading: false,
      error: null,
    })

    render(<ConfigPage />)

    expect(screen.getByText('All Categories')).toBeInTheDocument()
  })

  it('renders the loading state', async () => {
    vi.mocked(useConfigStore).mockReturnValue({
      activeTab: 'options',
      selectedCategoryId: null,
      isLoading: true,
      error: null,
    })

    render(<ConfigPage />)

    // Wait for loading state to be reflected in the UI
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeInTheDocument()
    })
  })

  it('renders the error state', () => {
    vi.mocked(useConfigStore).mockReturnValue({
      activeTab: 'options',
      selectedCategoryId: null,
      isLoading: false,
      error: 'Failed to load configuration',
    })

    render(<ConfigPage />)

    expect(screen.getByText('Failed to load configuration')).toBeInTheDocument()
  })
})
