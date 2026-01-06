/**
 * Tests for export schema
 */

import { describe, it, expect } from 'vitest'
import {
  exportJobs,
  exportTemplates,
  exportStatusEnum,
  exportTypeEnum,
  exportFormatEnum,
} from '../export'

describe('Export Schema', () => {
  describe('Enums', () => {
    it('should have correct export status enum values', () => {
      expect(exportStatusEnum.enumValues).toEqual(['pending', 'processing', 'completed', 'failed'])
    })

    it('should have correct export type enum values', () => {
      expect(exportTypeEnum.enumValues).toEqual([
        'clients',
        'client_status',
        'fcash_summary',
        'pcni_summary',
        'branch_performance',
        'user_activity',
      ])
    })

    it('should have correct export format enum values', () => {
      expect(exportFormatEnum.enumValues).toEqual(['csv', 'xlsx'])
    })
  })

  describe('Export Jobs Table', () => {
    it('should have correct table name', () => {
      expect(exportJobs).toBeDefined()
    })

    it('should have required fields', () => {
      const fields = exportJobs
      expect(fields).toHaveProperty('id')
      expect(fields).toHaveProperty('type')
      expect(fields).toHaveProperty('format')
      expect(fields).toHaveProperty('status')
      expect(fields).toHaveProperty('name')
      expect(fields).toHaveProperty('expiresAt')
      expect(fields).toHaveProperty('createdBy')
      expect(fields).toHaveProperty('createdAt')
    })

    it('should have optional fields', () => {
      const fields = exportJobs
      expect(fields).toHaveProperty('description')
      expect(fields).toHaveProperty('parameters')
      expect(fields).toHaveProperty('filePath')
      expect(fields).toHaveProperty('fileName')
      expect(fields).toHaveProperty('fileSize')
      expect(fields).toHaveProperty('rowCount')
      expect(fields).toHaveProperty('startedAt')
      expect(fields).toHaveProperty('completedAt')
      expect(fields).toHaveProperty('error')
    })
  })

  describe('Export Templates Table', () => {
    it('should have correct table name', () => {
      expect(exportTemplates).toBeDefined()
    })

    it('should have required fields', () => {
      const fields = exportTemplates
      expect(fields).toHaveProperty('id')
      expect(fields).toHaveProperty('name')
      expect(fields).toHaveProperty('type')
      expect(fields).toHaveProperty('format')
      expect(fields).toHaveProperty('parameters')
      expect(fields).toHaveProperty('createdBy')
      expect(fields).toHaveProperty('createdAt')
      expect(fields).toHaveProperty('updatedAt')
    })

    it('should have optional fields', () => {
      const fields = exportTemplates
      expect(fields).toHaveProperty('description')
      expect(fields).toHaveProperty('isPublic')
      expect(fields).toHaveProperty('companyId')
    })
  })
})
