import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ClientFilters } from '../client-filters'

// Mock the useClientsStore
vi.mock('../../stores/clients-store', () => ({
  useClientsStore: vi.fn((selector) => {
    const state = {
      filters: { search: '', isActive: undefined },
      setFilters: vi.fn(),
      clearFilters: vi.fn(),
    }
    return selector(state)
  }),
}))

describe('ClientFilters', () => {
  it('renders search input and status filter', () => {
    render(<ClientFilters />)

    expect(screen.getByPlaceholderText(/search by name, code, or pension/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status:/i)).toBeInTheDocument()
  })

  it('updates search filter on input change', () => {
    const { useClientsStore } = require('../../stores/clients-store')
    const setFilters = vi.fn()
    useClientsStore.mockImplementation((selector) => {
      const state = {
        filters: { search: '' },
        setFilters,
        clearFilters: vi.fn(),
      }
      return selector(state)
    })

    render(<ClientFilters />)

    const searchInput = screen.getByPlaceholderText(/search by name, code, or pension/i)
    fireEvent.change(searchInput, { target: { value: 'test search' } })

    expect(setFilters).toHaveBeenCalledWith({ search: 'test search' })
  })

  it('updates status filter on select change', () => {
    const { useClientsStore } = require('../../stores/clients-store')
    const setFilters = vi.fn()
    useClientsStore.mockImplementation((selector) => {
      const state = {
        filters: { isActive: undefined },
        setFilters,
        clearFilters: vi.fn(),
      }
      return selector(state)
    })

    render(<ClientFilters />)

    const statusSelect = screen.getByLabelText(/status:/i)
    fireEvent.change(statusSelect, { target: { value: 'active' } })

    expect(setFilters).toHaveBeenCalledWith({ isActive: true })
  })

  it('shows clear button when filters are active', () => {
    const { useClientsStore } = require('../../stores/clients-store')
    useClientsStore.mockImplementation((selector) => {
      const state = {
        filters: { search: 'test' },
        setFilters: vi.fn(),
        clearFilters: vi.fn(),
      }
      return selector(state)
    })

    render(<ClientFilters />)

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('calls clearFilters when clear button is clicked', () => {
    const { useClientsStore } = require('../../stores/clients-store')
    const clearFilters = vi.fn()
    useClientsStore.mockImplementation((selector) => {
      const state = {
        filters: { search: 'test' },
        setFilters: vi.fn(),
        clearFilters,
      }
      return selector(state)
    })

    render(<ClientFilters />)

    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    expect(clearFilters).toHaveBeenCalled()
  })
})
