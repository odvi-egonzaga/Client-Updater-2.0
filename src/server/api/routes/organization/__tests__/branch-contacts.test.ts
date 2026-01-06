import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { branchContactRoutes } from '../branch-contacts'
import {
  getContactsForBranch,
  addBranchContact,
  updateBranchContact,
  deleteBranchContact,
  setPrimaryContact,
} from '@/server/db/queries/branch-contacts'
import { hasPermission } from '@/lib/permissions'
import { getUserBranchFilter } from '@/lib/territories/filter'

// Mock database and query functions
vi.mock('@/server/db/queries/branch-contacts', () => ({
  getContactsForBranch: vi.fn(),
  addBranchContact: vi.fn(),
  updateBranchContact: vi.fn(),
  deleteBranchContact: vi.fn(),
  setPrimaryContact: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

vi.mock('@/lib/territories/filter', () => ({
  getUserBranchFilter: vi.fn(),
}))

describe('Branch Contact Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/organization/branches/:branchId/contacts', () => {
    it('should return contacts for branch with permission', async () => {
      const mockContacts = [
        {
          id: '1',
          branchId: 'branch1',
          type: 'email',
          label: 'Work Email',
          value: 'test@example.com',
          isPrimary: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getContactsForBranch).mockResolvedValue(mockContacts)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockContacts)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'branches', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 when branch not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getContactsForBranch).mockRejectedValue(new Error('Branch not found'))

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/organization/branches/:branchId/contacts', () => {
    it('should add contact with permission', async () => {
      const mockContact = {
        id: '1',
        branchId: 'branch1',
        type: 'email',
        label: 'Work Email',
        value: 'test@example.com',
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(addBranchContact).mockResolvedValue(mockContact)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          label: 'Work Email',
          value: 'test@example.com',
          isPrimary: true,
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockContact)
      expect(addBranchContact).toHaveBeenCalledWith({
        branchId: 'branch1',
        type: 'email',
        label: 'Work Email',
        value: 'test@example.com',
        isPrimary: true,
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          value: 'test@example.com',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PATCH /api/organization/branches/:branchId/contacts/:contactId', () => {
    it('should update contact with permission', async () => {
      const mockContact = {
        id: '1',
        branchId: 'branch1',
        type: 'email',
        label: 'Updated Email',
        value: 'updated@example.com',
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(updateBranchContact).mockResolvedValue(mockContact)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated Email',
          value: 'updated@example.com',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockContact)
      expect(updateBranchContact).toHaveBeenCalledWith('1', {
        label: 'Updated Email',
        value: 'updated@example.com',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated Email',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/organization/branches/:branchId/contacts/:contactId', () => {
    it('should delete contact with permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(deleteBranchContact).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
      expect(deleteBranchContact).toHaveBeenCalledWith('1')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('POST /api/organization/branches/:branchId/contacts/:contactId/primary', () => {
    it('should set primary contact with permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(setPrimaryContact).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts/1/primary', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
      expect(setPrimaryContact).toHaveBeenCalledWith({
        branchId: 'branch1',
        contactId: '1',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchContactRoutes)

      const response = await app.request('/branch1/contacts/1/primary', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
