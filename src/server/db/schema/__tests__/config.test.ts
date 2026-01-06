import { describe, it, expect } from 'vitest'
import * as config from '../config'

describe('Config Schema', () => {
  describe('Config Categories Table', () => {
    it('should export config_categories table', () => {
      expect(config.configCategories).toBeDefined()
      expect(config.configCategories._.name).toBe('config_categories')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(config.configCategories._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('code')
      expect(columns).toContain('name')
      expect(columns).toContain('description')
      expect(columns).toContain('isActive')
      expect(columns).toContain('sortOrder')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should export config_categories relations', () => {
      expect(config.configCategoriesRelations).toBeDefined()
    })
  })

  describe('Config Options Table', () => {
    it('should export config_options table', () => {
      expect(config.configOptions).toBeDefined()
      expect(config.configOptions._.name).toBe('config_options')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(config.configOptions._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('categoryId')
      expect(columns).toContain('code')
      expect(columns).toContain('label')
      expect(columns).toContain('value')
      expect(columns).toContain('metadata')
      expect(columns).toContain('isActive')
      expect(columns).toContain('isDefault')
      expect(columns).toContain('isSystem')
      expect(columns).toContain('sortOrder')
      expect(columns).toContain('parentOptionId')
      expect(columns).toContain('companyId')
      expect(columns).toContain('createdBy')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should export config_options relations', () => {
      expect(config.configOptionsRelations).toBeDefined()
    })
  })

  describe('Config Settings Table', () => {
    it('should export config_settings table', () => {
      expect(config.configSettings).toBeDefined()
      expect(config.configSettings._.name).toBe('config_settings')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(config.configSettings._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('key')
      expect(columns).toContain('value')
      expect(columns).toContain('valueType')
      expect(columns).toContain('description')
      expect(columns).toContain('isPublic')
      expect(columns).toContain('companyId')
      expect(columns).toContain('updatedBy')
      expect(columns).toContain('updatedAt')
    })
  })

  describe('Config Audit Log Table', () => {
    it('should export config_audit_log table', () => {
      expect(config.configAuditLog).toBeDefined()
      expect(config.configAuditLog._.name).toBe('config_audit_log')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(config.configAuditLog._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('tableName')
      expect(columns).toContain('recordId')
      expect(columns).toContain('action')
      expect(columns).toContain('oldValues')
      expect(columns).toContain('newValues')
      expect(columns).toContain('changedBy')
      expect(columns).toContain('ipAddress')
      expect(columns).toContain('createdAt')
    })
  })

  describe('Activity Logs Table', () => {
    it('should export activity_logs table', () => {
      expect(config.activityLogs).toBeDefined()
      expect(config.activityLogs._.name).toBe('activity_logs')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(config.activityLogs._.columns)
      expect(columns).toContain('id')
      expect(columns).toContain('userId')
      expect(columns).toContain('action')
      expect(columns).toContain('resource')
      expect(columns).toContain('resourceId')
      expect(columns).toContain('details')
      expect(columns).toContain('ipAddress')
      expect(columns).toContain('userAgent')
      expect(columns).toContain('durationMs')
      expect(columns).toContain('createdAt')
    })

    it('should export activity_logs relations', () => {
      expect(config.activityLogsRelations).toBeDefined()
    })
  })

  describe('Type Exports', () => {
    it('should export ConfigCategory type', () => {
      expect(config.ConfigCategory).toBeDefined()
    })

    it('should export NewConfigCategory type', () => {
      expect(config.NewConfigCategory).toBeDefined()
    })

    it('should export ConfigOption type', () => {
      expect(config.ConfigOption).toBeDefined()
    })

    it('should export NewConfigOption type', () => {
      expect(config.NewConfigOption).toBeDefined()
    })

    it('should export ConfigSetting type', () => {
      expect(config.ConfigSetting).toBeDefined()
    })

    it('should export NewConfigSetting type', () => {
      expect(config.NewConfigSetting).toBeDefined()
    })

    it('should export ConfigAuditLogEntry type', () => {
      expect(config.ConfigAuditLogEntry).toBeDefined()
    })

    it('should export ActivityLog type', () => {
      expect(config.ActivityLog).toBeDefined()
    })

    it('should export NewActivityLog type', () => {
      expect(config.NewActivityLog).toBeDefined()
    })
  })
})
