import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import UsersPage from '../page'

// Mock the useUsers hook
vi.mock('@/features/users/hooks/use-users', () => ({
  useUsers: vi.fn(() => ({
    data: {
      data: [
        {
          id: '1',
          clerkId: 'clerk-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: null,
          clerkOrgId: 'org-1',
          isActive: true,
          mustChangePassword: false,
          passwordChangedAt: null,
          lastLoginAt: new Date('2024-01-01'),
          loginCount: 5,
          failedLoginCount: 0,
          lockedUntil: null,
          deletedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
      meta: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
  })),
}))

// Mock the UserTable component
vi.mock('@/features/users/components/user-table', () => ({
  UserTable: vi.fn(({ users, isLoading, error }) => (
    <div data-testid="user-table">
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      {users && <div data-testid="users-count">{users.length}</div>}
    </div>
  )),
}))

describe('UsersPage', () => {
  it('renders page header', () => {
    render(<UsersPage />)
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Manage user accounts, permissions, and territories.')).toBeInTheDocument()
  })

  it('renders add user button', () => {
    render(<UsersPage />)
    
    const addButton = screen.getByText('Add User')
    expect(addButton).toBeInTheDocument()
    expect(addButton.closest('a')).toHaveAttribute('href', '/admin/users/new')
  })

  it('renders user table', () => {
    render(<UsersPage />)
    
    expect(screen.getByTestId('user-table')).toBeInTheDocument()
    expect(screen.getByTestId('users-count')).toHaveTextContent('1')
  })
})
