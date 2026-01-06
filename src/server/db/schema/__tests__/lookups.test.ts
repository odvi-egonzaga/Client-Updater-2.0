import { describe, it, expect } from 'vitest'
import * as lookups from '../lookups'

describe('Lookup Tables Schema', () => {
  it('should export companies table', () => {
    expect(lookups.companies).toBeDefined()
    expect(lookups.companies._.name).toBe('companies')
  })

  it('should export pension_types table', () => {
    expect(lookups.pensionTypes).toBeDefined()
    expect(lookups.pensionTypes._.name).toBe('pension_types')
  })

  it('should export status_types table', () => {
    expect(lookups.statusTypes).toBeDefined()
    expect(lookups.statusTypes._.name).toBe('status_types')
  })

  it('should export status_reasons table', () => {
    expect(lookups.statusReasons).toBeDefined()
    expect(lookups.statusReasons._.name).toBe('status_reasons')
  })

  it('should have common lookup columns', () => {
    // Check companies has standard columns
    const columns = Object.keys(lookups.companies._.columns)
    expect(columns).toContain('id')
    expect(columns).toContain('code')
    expect(columns).toContain('name')
    expect(columns).toContain('isActive')
    expect(columns).toContain('sortOrder')
  })
})





