import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PermissionEditor } from '../permission-editor'
import type { Permission, UserPermission } from '../../types'

describe('PermissionEditor', () => {
  const mockAvailablePermissions: Permission[] = [
    {
      id: 'perm-1',
      code: 'users.read',
      resource: 'users',
      action: 'read',
      description: 'Read users',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'perm-2',
      code: 'users.write',
      resource: 'users',
      action: 'write',
      description: 'Write users',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'perm-3',
      code: 'clients.read',
      resource: 'clients',
      action: 'read',
      description: 'Read clients',
      createdAt: new Date('2024-01-01'),
    },
  ]

  const mockUserPermissions: UserPermission[] = [
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
  ]

  it('renders loading state', () => {
    render(
      <PermissionEditor
        availablePermissions={[]}
        userPermissions={[]}
        isLoading
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders permission groups', () => {
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('Edit Permissions')).toBeInTheDocument()
    expect(screen.getByText('users')).toBeInTheDocument()
    expect(screen.getByText('clients')).toBeInTheDocument()
  })

  it('renders permissions within groups', () => {
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('read')).toBeInTheDocument()
    expect(screen.getByText('write')).toBeInTheDocument()
    expect(screen.getByText('Read users')).toBeInTheDocument()
    expect(screen.getByText('Write users')).toBeInTheDocument()
  })

  it('shows selected permissions count', () => {
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('toggles permission selection', () => {
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)
  })

  it('shows scope selector for selected permissions', () => {
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('Scope:')).toBeInTheDocument()
    expect(screen.getByDisplayValue('all')).toBeInTheDocument()
  })

  it('calls onSave with correct permissions', () => {
    const onSave = vi.fn()
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    )
    
    const saveButton = screen.getByText('Save Changes')
    saveButton.click()
    
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={vi.fn()}
        onCancel={onCancel}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    cancelButton.click()
    
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables save button when saving', () => {
    const onSave = vi.fn()
    render(
      <PermissionEditor
        availablePermissions={mockAvailablePermissions}
        userPermissions={mockUserPermissions}
        onSave={onSave}
        onCancel={vi.fn()}
        isSaving
      />
    )
    
    const saveButton = screen.getByText('Saving...')
    expect(saveButton).toBeDisabled()
  })
})
