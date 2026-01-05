import { describe, it, expect } from 'vitest'
import * as org from '../organization'

describe('Organization Schema', () => {
  it('should export areas table', () => {
    expect(org.areas).toBeDefined()
    expect(org.areas._.name).toBe('areas')
  })

  it('should export branches table', () => {
    expect(org.branches).toBeDefined()
    expect(org.branches._.name).toBe('branches')
  })

  it('should export area_branches junction table', () => {
    expect(org.areaBranches).toBeDefined()
    expect(org.areaBranches._.name).toBe('area_branches')
  })

  it('should export branch_contacts table', () => {
    expect(org.branchContacts).toBeDefined()
    expect(org.branchContacts._.name).toBe('branch_contacts')
  })
})



