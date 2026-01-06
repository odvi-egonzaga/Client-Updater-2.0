import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as configQueries from '../config'
import {
  configCategories,
  configOptions,
  configSettings,
  configAuditLog,
} from '../../schema/config'
import { users } from '../../schema/users'
import { eq, and, desc, sql } from 'drizzle-orm'

// Mock database
vi.mock('../../index', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
  }
})

// Mock logger
vi.mock('@/lib/logger/index', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { db } from '../../index'

describe('Config Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============ Categories ============

  describe('listConfigCategories', () => {
    it('should return all config categories', async () => {
      const mockCategories = [
        { id: '1', code: 'CAT1', name: 'Category 1', description: 'Description 1', isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', code: 'CAT2', name: 'Category 2', description: 'Description 2', isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockCategories)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigCategories()

      expect(result).toHaveLength(2)
    })

    it('should filter by isActive when provided', async () => {
      const mockCategories = [
        { id: '1', code: 'CAT1', name: 'Category 1', description: 'Description 1', isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockCategories)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigCategories({ isActive: true })

      expect(result).toHaveLength(1)
    })
  })

  describe('getCategoryByCode', () => {
    it('should return category by code', async () => {
      const mockCategory = { id: '1', code: 'CAT1', name: 'Category 1', description: 'Description 1', isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockCategory])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await configQueries.getCategoryByCode('CAT1')

      expect(result).toEqual(mockCategory)
    })

    it('should return null if category not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await configQueries.getCategoryByCode('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ============ Options ============

  describe('listConfigOptions', () => {
    it('should return all config options', async () => {
      const mockOptions = [
        { id: '1', categoryId: 'cat1', code: 'OPT1', label: 'Option 1', value: 'value1', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', categoryId: 'cat1', code: 'OPT2', label: 'Option 2', value: 'value2', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockOptions)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigOptions({})

      expect(result).toHaveLength(2)
    })

    it('should filter by categoryId when provided', async () => {
      const mockOptions = [
        { id: '1', categoryId: 'cat1', code: 'OPT1', label: 'Option 1', value: 'value1', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockOptions)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigOptions({ categoryId: 'cat1' })

      expect(result).toHaveLength(1)
    })

    it('should filter by companyId when provided', async () => {
      const mockOptions = [
        { id: '1', categoryId: 'cat1', code: 'OPT1', label: 'Option 1', value: 'value1', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: 'comp1', createdBy: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockOptions)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigOptions({ companyId: 'comp1' })

      expect(result).toHaveLength(1)
    })

    it('should filter by isActive when provided', async () => {
      const mockOptions = [
        { id: '1', categoryId: 'cat1', code: 'OPT1', label: 'Option 1', value: 'value1', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockOptions)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigOptions({ isActive: true })

      expect(result).toHaveLength(1)
    })
  })

  describe('getConfigOptionById', () => {
    it('should return config option by ID', async () => {
      const mockOption = { id: '1', categoryId: 'cat1', code: 'OPT1', label: 'Option 1', value: 'value1', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockOption])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigOptionById('1')

      expect(result).toEqual(mockOption)
    })

    it('should return null if option not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigOptionById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createConfigOption', () => {
    it('should create new config option', async () => {
      const optionData = {
        categoryId: 'cat1',
        code: 'OPT1',
        label: 'Option 1',
        value: 'value1',
        createdBy: 'user1',
      }

      const mockOption = { id: '1', ...optionData, metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'cat1', code: 'CAT1', name: 'Category 1' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([{ id: 'user1', clerkId: 'clerk1', email: 'user@example.com' }])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockOption])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await configQueries.createConfigOption(optionData)

      expect(result).toEqual(mockOption)
    })

    it('should throw error if category not found', async () => {
      const optionData = {
        categoryId: 'nonexistent',
        code: 'OPT1',
        label: 'Option 1',
        createdBy: 'user1',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(configQueries.createConfigOption(optionData)).rejects.toThrow('Category with ID "nonexistent" not found')
    })

    it('should throw error if user not found', async () => {
      const optionData = {
        categoryId: 'cat1',
        code: 'OPT1',
        label: 'Option 1',
        createdBy: 'nonexistent',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'cat1', code: 'CAT1', name: 'Category 1' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      await expect(configQueries.createConfigOption(optionData)).rejects.toThrow('User with ID "nonexistent" not found')
    })
  })

  describe('updateConfigOption', () => {
    it('should update config option', async () => {
      const mockOption = { id: '1', categoryId: 'cat1', code: 'OPT1', label: 'Updated Option 1', value: 'value1', metadata: null, isActive: true, isDefault: false, isSystem: false, sortOrder: 0, parentOptionId: null, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() }
      const updateData = {
        label: 'Updated Option 1',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockOption])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockOption])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
        returning: mockReturning,
      })

      const result = await configQueries.updateConfigOption('1', updateData)

      expect(result.label).toBe('Updated Option 1')
    })

    it('should throw error if option not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(configQueries.updateConfigOption('nonexistent', { label: 'Updated' })).rejects.toThrow('Config option with ID "nonexistent" not found')
    })
  })

  // ============ Settings ============

  describe('listConfigSettings', () => {
    it('should return all config settings', async () => {
      const mockSettings = [
        { id: '1', key: 'setting1', value: 'value1', valueType: 'string', description: 'Description 1', isPublic: false, companyId: null, updatedBy: null, updatedAt: new Date() },
        { id: '2', key: 'setting2', value: 'value2', valueType: 'string', description: 'Description 2', isPublic: false, companyId: null, updatedBy: null, updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockSettings)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigSettings()

      expect(result).toHaveLength(2)
    })

    it('should filter by companyId when provided', async () => {
      const mockSettings = [
        { id: '1', key: 'setting1', value: 'value1', valueType: 'string', description: 'Description 1', isPublic: false, companyId: 'comp1', updatedBy: null, updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockSettings)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigSettings({ companyId: 'comp1' })

      expect(result).toHaveLength(1)
    })

    it('should filter by isPublic when provided', async () => {
      const mockSettings = [
        { id: '1', key: 'setting1', value: 'value1', valueType: 'string', description: 'Description 1', isPublic: true, companyId: null, updatedBy: null, updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockSettings)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await configQueries.listConfigSettings({ isPublic: true })

      expect(result).toHaveLength(1)
    })
  })

  describe('getConfigSetting', () => {
    it('should return config setting by key', async () => {
      const mockSetting = { id: '1', key: 'setting1', value: 'value1', valueType: 'string', description: 'Description 1', isPublic: false, companyId: null, updatedBy: null, updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockSetting])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigSetting('setting1')

      expect(result).toEqual(mockSetting)
    })

    it('should return null if setting not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigSetting('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('setConfigSetting', () => {
    it('should create new config setting', async () => {
      const settingData = {
        key: 'setting1',
        value: 'value1',
        updatedBy: 'user1',
      }

      const mockSetting = { id: '1', ...settingData, valueType: 'string', description: null, isPublic: false, companyId: null, updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'user1', clerkId: 'clerk1', email: 'user@example.com' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockSetting])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const mockFrom3 = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockReturnThis()
      const mockLimit3 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere3,
        limit: mockLimit3,
      })

      const mockValues2 = vi.fn().mockReturnThis()
      const mockReturning2 = vi.fn().mockResolvedValue([{ id: 'audit1', tableName: 'config_settings', recordId: '1', action: 'create', oldValues: null, newValues: JSON.stringify(mockSetting), changedBy: 'user1', ipAddress: null, createdAt: new Date() }])

      vi.mocked(db.insert).mockReturnValueOnce({
        values: mockValues2,
        returning: mockReturning2,
      })

      const result = await configQueries.setConfigSetting(settingData)

      expect(result).toEqual(mockSetting)
    })

    it('should update existing config setting', async () => {
      const settingData = {
        key: 'setting1',
        value: 'updated_value',
        updatedBy: 'user1',
      }

      const mockExisting = { id: '1', key: 'setting1', value: 'value1', valueType: 'string', description: 'Description 1', isPublic: false, companyId: null, updatedBy: null, updatedAt: new Date() }
      const mockUpdated = { id: '1', key: 'setting1', value: 'updated_value', valueType: 'string', description: 'Description 1', isPublic: false, companyId: null, updatedBy: 'user1', updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'user1', clerkId: 'clerk1', email: 'user@example.com' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([mockExisting])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdated])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere3,
        returning: mockReturning,
      })

      const mockFrom3 = vi.fn().mockReturnThis()
      const mockWhere4 = vi.fn().mockReturnThis()
      const mockLimit3 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere4,
        limit: mockLimit3,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning2 = vi.fn().mockResolvedValue([{ id: 'audit1', tableName: 'config_settings', recordId: '1', action: 'update', oldValues: JSON.stringify(mockExisting), newValues: JSON.stringify(mockUpdated), changedBy: 'user1', ipAddress: null, createdAt: new Date() }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning2,
      })

      const result = await configQueries.setConfigSetting(settingData)

      expect(result.value).toBe('updated_value')
    })

    it('should throw error if user not found', async () => {
      const settingData = {
        key: 'setting1',
        value: 'value1',
        updatedBy: 'nonexistent',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(configQueries.setConfigSetting(settingData)).rejects.toThrow('User with ID "nonexistent" not found')
    })
  })

  // ============ Audit Log ============

  describe('getConfigAuditLog', () => {
    it('should return config audit log', async () => {
      const mockAuditLog = [
        { id: '1', tableName: 'config_settings', recordId: '1', action: 'create', oldValues: null, newValues: '{"key":"setting1"}', changedBy: 'user1', ipAddress: null, createdAt: new Date() },
        { id: '2', tableName: 'config_settings', recordId: '1', action: 'update', oldValues: '{"key":"setting1"}', newValues: '{"key":"setting1_updated"}', changedBy: 'user1', ipAddress: null, createdAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockAuditLog)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigAuditLog({})

      expect(result).toHaveLength(2)
    })

    it('should filter by tableName when provided', async () => {
      const mockAuditLog = [
        { id: '1', tableName: 'config_settings', recordId: '1', action: 'create', oldValues: null, newValues: '{"key":"setting1"}', changedBy: 'user1', ipAddress: null, createdAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockAuditLog)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigAuditLog({ tableName: 'config_settings' })

      expect(result).toHaveLength(1)
    })

    it('should filter by recordId when provided', async () => {
      const mockAuditLog = [
        { id: '1', tableName: 'config_settings', recordId: '1', action: 'create', oldValues: null, newValues: '{"key":"setting1"}', changedBy: 'user1', ipAddress: null, createdAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockAuditLog)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigAuditLog({ recordId: '1' })

      expect(result).toHaveLength(1)
    })

    it('should limit results when limit is provided', async () => {
      const mockAuditLog = [
        { id: '1', tableName: 'config_settings', recordId: '1', action: 'create', oldValues: null, newValues: '{"key":"setting1"}', changedBy: 'user1', ipAddress: null, createdAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockAuditLog)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      const result = await configQueries.getConfigAuditLog({ limit: 1 })

      expect(result).toHaveLength(1)
    })
  })

  describe('logConfigChange', () => {
    it('should log config change', async () => {
      const logData = {
        tableName: 'config_settings',
        recordId: '1',
        action: 'create' as const,
        newValues: { key: 'setting1' },
        changedBy: 'user1',
      }

      const mockAuditEntry = { id: '1', ...logData, oldValues: null, newValues: JSON.stringify(logData.newValues), ipAddress: null, createdAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'user1', clerkId: 'clerk1', email: 'user@example.com' }])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockAuditEntry])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await configQueries.logConfigChange(logData)

      expect(result).toEqual(mockAuditEntry)
    })

    it('should throw error if user not found', async () => {
      const logData = {
        tableName: 'config_settings',
        recordId: '1',
        action: 'create' as const,
        newValues: { key: 'setting1' },
        changedBy: 'nonexistent',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(configQueries.logConfigChange(logData)).rejects.toThrow('User with ID "nonexistent" not found')
    })
  })
})
