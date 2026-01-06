import { describe, it, expect } from 'vitest'
import * as org from '../organization'

describe('Organization Schema', () => {
  describe('Areas Table', () => {
    it('should export areas table', () => {
      expect(org.areas).toBeDefined()
      expect(org.areas._.name).toBe('areas')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(org.areas._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('code')
      expect(columns).toContain('name')
      expect(columns).toContain('companyId')
      expect(columns).toContain('isActive')
      expect(columns).toContain('sortOrder')
      expect(columns).toContain('deletedAt')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should export areas relations', () => {
      expect(org.areasRelations).toBeDefined()
    })
  })

  describe('Branches Table', () => {
    it('should export branches table', () => {
      expect(org.branches).toBeDefined()
      expect(org.branches._.name).toBe('branches')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(org.branches._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('code')
      expect(columns).toContain('name')
      expect(columns).toContain('location')
      expect(columns).toContain('category')
      expect(columns).toContain('isActive')
      expect(columns).toContain('sortOrder')
      expect(columns).toContain('deletedAt')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should export branches relations', () => {
      expect(org.branchesRelations).toBeDefined()
    })
  })

  describe('Area-Branches Junction Table', () => {
    it('should export area_branches junction table', () => {
      expect(org.areaBranches).toBeDefined()
      expect(org.areaBranches._.name).toBe('area_branches')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(org.areaBranches._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('areaId')
      expect(columns).toContain('branchId')
      expect(columns).toContain('isPrimary')
      expect(columns).toContain('assignedAt')
    })

    it('should export area_branches relations', () => {
      expect(org.areaBranchesRelations).toBeDefined()
    })
  })

  describe('Branch Contacts Table', () => {
    it('should export branch_contacts table', () => {
      expect(org.branchContacts).toBeDefined()
      expect(org.branchContacts._.name).toBe('branch_contacts')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(org.branchContacts._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('branchId')
      expect(columns).toContain('type')
      expect(columns).toContain('label')
      expect(columns).toContain('value')
      expect(columns).toContain('isPrimary')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should export branch_contacts relations', () => {
      expect(org.branchContactsRelations).toBeDefined()
    })
  })

  describe('Type Exports', () => {
    it('should export Area type', () => {
      expect(org.Area).toBeDefined()
    })

    it('should export NewArea type', () => {
      expect(org.NewArea).toBeDefined()
    })

    it('should export Branch type', () => {
      expect(org.Branch).toBeDefined()
    })

    it('should export NewBranch type', () => {
      expect(org.NewBranch).toBeDefined()
    })

    it('should export AreaBranch type', () => {
      expect(org.AreaBranch).toBeDefined()
    })

    it('should export BranchContact type', () => {
      expect(org.BranchContact).toBeDefined()
    })
  })
})







