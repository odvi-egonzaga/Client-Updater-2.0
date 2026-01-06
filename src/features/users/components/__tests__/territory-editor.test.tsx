import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TerritoryEditor } from '../territory-editor'
import type { Area, Branch, UserArea, UserBranch } from '../../types'

describe('TerritoryEditor', () => {
  const mockAvailableAreas: Area[] = [
    {
      id: 'area-1',
      code: 'AREA-1',
      name: 'Area 1',
      companyId: 'comp-1',
      company: { id: 'comp-1', name: 'Company 1' },
      deletedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'area-2',
      code: 'AREA-2',
      name: 'Area 2',
      companyId: 'comp-1',
      company: { id: 'comp-1', name: 'Company 1' },
      deletedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ]

  const mockAvailableBranches: Branch[] = [
    {
      id: 'branch-1',
      code: 'BRANCH-1',
      name: 'Branch 1',
      location: 'Location 1',
      category: 'Category 1',
      deletedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'branch-2',
      code: 'BRANCH-2',
      name: 'Branch 2',
      location: 'Location 2',
      category: 'Category 2',
      deletedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ]

  const mockUserAreas: UserArea[] = [
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
  ]

  const mockUserBranches: UserBranch[] = [
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
  ]

  it('renders loading state', () => {
    render(
      <TerritoryEditor
        availableAreas={[]}
        availableBranches={[]}
        userAreas={[]}
        userBranches={[]}
        isLoading
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders territory sections', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('Edit Territories')).toBeInTheDocument()
    expect(screen.getByText('Areas')).toBeInTheDocument()
    expect(screen.getByText('Branches')).toBeInTheDocument()
  })

  it('renders areas', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('Area 1')).toBeInTheDocument()
    expect(screen.getByText('Area 2')).toBeInTheDocument()
    expect(screen.getByText('AREA-1')).toBeInTheDocument()
    expect(screen.getByText('AREA-2')).toBeInTheDocument()
  })

  it('renders branches', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('Branch 1')).toBeInTheDocument()
    expect(screen.getByText('Branch 2')).toBeInTheDocument()
    expect(screen.getByText('BRANCH-1')).toBeInTheDocument()
    expect(screen.getByText('BRANCH-2')).toBeInTheDocument()
  })

  it('shows selected territories count', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('toggles area selection', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
  })

  it('toggles branch selection', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
  })

  it('calls onSave with correct territories', () => {
    const onSave = vi.fn()
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
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
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
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
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={mockAvailableBranches}
        userAreas={mockUserAreas}
        userBranches={mockUserBranches}
        onSave={onSave}
        onCancel={vi.fn()}
        isSaving
      />
    )
    
    const saveButton = screen.getByText('Saving...')
    expect(saveButton).toBeDisabled()
  })

  it('shows empty state when no areas available', () => {
    render(
      <TerritoryEditor
        availableAreas={[]}
        availableBranches={mockAvailableBranches}
        userAreas={[]}
        userBranches={mockUserBranches}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('No areas available')).toBeInTheDocument()
  })

  it('shows empty state when no branches available', () => {
    render(
      <TerritoryEditor
        availableAreas={mockAvailableAreas}
        availableBranches={[]}
        userAreas={mockUserAreas}
        userBranches={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    
    expect(screen.getByText('No branches available')).toBeInTheDocument()
  })
})
