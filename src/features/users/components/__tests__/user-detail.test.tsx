import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserDetail } from '../user-detail'
import type { UserWithDetails } from '../../types'

describe('UserDetail', () => {
  const mockUser: UserWithDetails = {
    id: '1',
    clerkId: 'clerk-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    imageUrl: 'https://example.com/avatar.jpg',
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
    permissions: [
      {
        userId: '1',
        permissionId: 'perm-1',
        permission: {
          id: 'perm-1',
          code: 'users.read',
          resource: 'users',
          action: 'read',
          description: 'Read users',
          createdAt: new Date('2024-01-01'),
        },
        companyId: 'comp-1',
        company: { id: 'comp-1', name: 'Company 1' },
        scope: 'all',
        grantedAt: new Date('2024-01-01'),
      },
    ],
    areas: [
      {
        userId: '1',
        areaId: 'area-1',
        area: {
          id: 'area-1',
          code: 'AREA-1',
          name: 'Area 1',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'Company 1' },
          deletedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        grantedAt: new Date('2024-01-01'),
      },
    ],
    branches: [
      {
        userId: '1',
        branchId: 'branch-1',
        branch: {
          id: 'branch-1',
          code: 'BRANCH-1',
          name: 'Branch 1',
          location: 'Location 1',
          category: 'Category 1',
          deletedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        grantedAt: new Date('2024-01-01'),
      },
    ],
  }

  it('renders loading state', () => {
    render(<UserDetail user={null} isLoading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<UserDetail user={null} error="Failed to load user" />)
    expect(screen.getByText('Failed to load user')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<UserDetail user={null} />)
    expect(screen.getByText('User not found')).toBeInTheDocument()
  })

  it('renders user details', () => {
    render(<UserDetail user={mockUser} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders user avatar', () => {
    render(<UserDetail user={mockUser} />)
    const avatar = screen.getByAltText('John Doe')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('renders user stats', () => {
    render(<UserDetail user={mockUser} />)
    
    expect(screen.getByText(/Total Logins/)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/Failed Attempts/)).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders permissions section', () => {
    render(<UserDetail user={mockUser} />)
    
    expect(screen.getByText('Permissions')).toBeInTheDocument()
    expect(screen.getByText('users')).toBeInTheDocument()
    expect(screen.getByText('read')).toBeInTheDocument()
  })

  it('renders territories section', () => {
    render(<UserDetail user={mockUser} />)
    
    expect(screen.getByText('Territories')).toBeInTheDocument()
    expect(screen.getByText('Area 1')).toBeInTheDocument()
    expect(screen.getByText('Branch 1')).toBeInTheDocument()
  })

  it('renders must change password badge', () => {
    const userWithPasswordChange = {
      ...mockUser,
      mustChangePassword: true,
    }
    render(<UserDetail user={userWithPasswordChange} />)
    
    expect(screen.getByText('Must Change Password')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<UserDetail user={mockUser} onEdit={onEdit} />)
    
    const editButton = screen.getByText('Edit User')
    editButton.click()
    
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('renders user initials when no image', () => {
    const userWithoutImage = {
      ...mockUser,
      imageUrl: null,
    }
    render(<UserDetail user={userWithoutImage} />)
    
    expect(screen.getByText('J')).toBeInTheDocument()
  })
})
