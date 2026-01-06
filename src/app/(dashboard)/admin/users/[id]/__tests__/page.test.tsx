import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserDetailPage from '../page'

// Mock hooks
vi.mock('@/features/users/hooks/use-users', () => ({
  useUser: vi.fn(() => ({
    data: {
      data: {
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
        permissions: [],
        areas: [],
        branches: [],
      },
    },
    isLoading: false,
    error: null,
  })),
  useUserPermissions: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
  useUserTerritories: vi.fn(() => ({
    data: { data: { areas: [], branches: [] } },
    isLoading: false,
  })),
  useUserSessions: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useRevokeSession: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useRevokeAllSessions: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

// Mock components
vi.mock('@/features/users/components/user-detail', () => ({
  UserDetail: vi.fn(({ user }) => (
    <div data-testid="user-detail">
      {user?.email}
    </div>
  )),
}))

vi.mock('@/features/users/components/permission-editor', () => ({
  PermissionEditor: vi.fn(() => (
    <div data-testid="permission-editor">Permission Editor</div>
  )),
}))

vi.mock('@/features/users/components/territory-editor', () => ({
  TerritoryEditor: vi.fn(() => (
    <div data-testid="territory-editor">Territory Editor</div>
  )),
}))

describe('UserDetailPage', () => {
  it('renders breadcrumb navigation', () => {
    render(<UserDetailPage params={{ id: '1' }} />)
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('renders page header', () => {
    render(<UserDetailPage params={{ id: '1' }} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders tabs', () => {
    render(<UserDetailPage params={{ id: '1' }} />)
    
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Permissions')).toBeInTheDocument()
    expect(screen.getByText('Territories')).toBeInTheDocument()
    expect(screen.getByText('Sessions')).toBeInTheDocument()
  })

  it('renders overview tab by default', () => {
    render(<UserDetailPage params={{ id: '1' }} />)
    
    expect(screen.getByTestId('user-detail')).toBeInTheDocument()
  })

  it('shows active status badge', () => {
    render(<UserDetailPage params={{ id: '1' }} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows edit button', () => {
    render(<UserDetailPage params={{ id: '1' }} />)
    
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })
})
