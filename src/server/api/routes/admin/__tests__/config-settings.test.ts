import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { configSettingRoutes } from '../config-settings'
import { listConfigSettings, getConfigSetting, setConfigSetting } from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db/queries/config', () => ({
  listConfigSettings: vi.fn(),
  getConfigSetting: vi.fn(),
  setConfigSetting: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Config Setting Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/config/settings', () => {
    it('should return settings with permission', async () => {
      const mockSettings = [
        {
          id: '1',
          key: 'max_upload_size',
          value: '10485760',
          valueType: 'number',
          description: 'Maximum file upload size in bytes',
          isPublic: true,
          companyId: null,
          updatedBy: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listConfigSettings).mockResolvedValue(mockSettings)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSettings)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'config', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should filter by companyId', async () => {
      const mockSettings = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listConfigSettings).mockResolvedValue(mockSettings)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings?companyId=company1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(listConfigSettings).toHaveBeenCalledWith({
        companyId: 'company1',
        isPublic: undefined,
      })
    })
  })

  describe('GET /api/admin/config/settings/:key', () => {
    it('should return setting by key with permission', async () => {
      const mockSetting = {
        id: '1',
        key: 'max_upload_size',
        value: '10485760',
        valueType: 'number',
        description: 'Maximum file upload size in bytes',
        isPublic: true,
        companyId: null,
        updatedBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigSetting).mockResolvedValue(mockSetting)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings/max_upload_size')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSetting)
      expect(getConfigSetting).toHaveBeenCalledWith('max_upload_size')
    })

    it('should return 404 when setting not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigSetting).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings/nonexistent')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings/max_upload_size')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PUT /api/admin/config/settings/:key', () => {
    it('should create new setting with permission', async () => {
      const mockSetting = {
        id: '1',
        key: 'new_setting',
        value: 'setting_value',
        valueType: 'string',
        description: 'New setting description',
        isPublic: false,
        companyId: null,
        updatedBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigSetting).mockResolvedValue(null)
      vi.mocked(setConfigSetting).mockResolvedValue(mockSetting)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings/new_setting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 'setting_value',
          valueType: 'string',
          description: 'New setting description',
          isPublic: false,
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSetting)
      expect(setConfigSetting).toHaveBeenCalledWith({
        key: 'new_setting',
        value: 'setting_value',
        valueType: 'string',
        description: 'New setting description',
        isPublic: false,
        updatedBy: 'user1',
      })
    })

    it('should update existing setting with permission', async () => {
      const mockExisting = {
        id: '1',
        key: 'existing_setting',
        value: 'old_value',
        valueType: 'string',
        description: 'Old description',
        isPublic: false,
        companyId: null,
        updatedBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockSetting = {
        id: '1',
        key: 'existing_setting',
        value: 'new_value',
        valueType: 'string',
        description: 'New description',
        isPublic: false,
        companyId: null,
        updatedBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigSetting).mockResolvedValue(mockExisting)
      vi.mocked(setConfigSetting).mockResolvedValue(mockSetting)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings/existing_setting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 'new_value',
          description: 'New description',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSetting)
      expect(setConfigSetting).toHaveBeenCalledWith({
        key: 'existing_setting',
        value: 'new_value',
        description: 'New description',
        updatedBy: 'user1',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configSettingRoutes)

      const response = await app.request('/settings/test_setting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 'test_value',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
