import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as userQueries from '../users'
import { users, permissions, userPermissions, userAreas, userBranches, userSessions } from '../../schema/users'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

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

describe('User Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllUsers', () => {
    it('should return paginated users with default parameters', async () => {
      const mockUsers = [
        { id: '1', email: 'test@example.com', isActive: true },
        { id: '2', email: 'test2@example.com', isActive: true },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockUsers)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      const result = await userQueries.getAllUsers(db, 1, 25)

      expect(result).toEqual(mockUsers)
      expect(mockLimit).toHaveBeenCalledWith(25)
      expect(mockOffset).toHaveBeenCalledWith(0)
    })

    it('should apply isActive filter when provided', async () => {
      const mockUsers = [{ id: '1', email: 'test@example.com', isActive: true }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockUsers)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await userQueries.getAllUsers(db, 1, 25, { isActive: true })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply search filter when provided', async () => {
      const mockUsers = [{ id: '1', email: 'test@example.com', isActive: true }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockUsers)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await userQueries.getAllUsers(db, 1, 25, { search: 'test' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should limit pageSize to maximum of 100', async () => {
      const mockUsers = []

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockUsers)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await userQueries.getAllUsers(db, 1, 200)

      expect(mockLimit).toHaveBeenCalledWith(100)
    })
  })

  describe('getUserWithPermissions', () => {
    it('should return user with permissions, areas, and branches', async () => {
      const mockUser = {
        user: { id: '1', email: 'test@example.com' },
        permission: { code: 'users.read' },
        permissionScope: 'all',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockLeftJoin = vi.fn().mockReturnThis()
      const mockLeftJoin2 = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockUser])

      const mockQuery = {
        from: mockFrom,
        leftJoin: mockLeftJoin,
      }

      mockLeftJoin.mockReturnValue({
        leftJoin: mockLeftJoin2,
        where: mockWhere,
        limit: mockLimit,
      })

      vi.mocked(db.select).mockReturnValue(mockQuery)

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue([{ area: { name: 'Area 1' } }])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
      })

      const mockFrom3 = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockResolvedValue([{ branch: { name: 'Branch 1' } }])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere3,
      })

      const result = await userQueries.getUserWithPermissions(db, '1')

      expect(result).toBeDefined()
      expect(result).toHaveProperty('user')
    })
  })

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        firstName: 'John',
        lastName: 'Doe',
      }
      const mockInsertedUser = { id: '1', ...userData }

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockInsertedUser])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await userQueries.createUser(db, userData as any)

      expect(result).toEqual(mockInsertedUser)
      expect(mockValues).toHaveBeenCalledWith(userData)
    })
  })

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const updateData = { firstName: 'Updated' }
      const mockUpdatedUser = { id: '1', firstName: 'Updated' }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.updateUser(db, '1', updateData)

      expect(result).toEqual(mockUpdatedUser)
    })
  })

  describe('deactivateUser', () => {
    it('should soft delete user by setting deletedAt', async () => {
      const mockUpdatedUser = { id: '1', deletedAt: new Date() }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.deactivateUser(db, '1')

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) })
      )
    })
  })

  describe('activateUser', () => {
    it('should restore user by clearing deletedAt', async () => {
      const mockUpdatedUser = { id: '1', deletedAt: null }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.activateUser(db, '1')

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null })
      )
    })
  })

  describe('toggleUserStatus', () => {
    it('should toggle user active status', async () => {
      const mockUpdatedUser = { id: '1', isActive: false }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.toggleUserStatus(db, '1', false)

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      )
    })
  })

  describe('getUserBranches', () => {
    it('should return user branches', async () => {
      const mockBranches = [
        { branch: { id: '1' } },
        { branch: { id: '2' } },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockResolved = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      mockWhere.mockReturnValue(mockResolved)

      const result = await userQueries.getUserBranches(db, '1')

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getUserAreas', () => {
    it('should return user areas', async () => {
      const mockAreas = [
        { area: { id: '1', name: 'Area 1' } },
        { area: { id: '2', name: 'Area 2' } },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const result = await userQueries.getUserAreas(db, '1')

      expect(result).toEqual(mockAreas)
    })
  })

  describe('recordUserLogin', () => {
    it('should record successful login', async () => {
      const mockUpdatedUser = {
        id: '1',
        lastLoginAt: new Date(),
        loginCount: 1,
        failedLoginCount: 0,
      }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.recordUserLogin(db, '1', '127.0.0.1', 'Mozilla')

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
          loginCount: expect.anything(),
          failedLoginCount: 0,
        })
      )
    })
  })

  describe('recordFailedLogin', () => {
    it('should record failed login', async () => {
      const mockUpdatedUser = { id: '1', failedLoginCount: 1 }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.recordFailedLogin(db, '1', '127.0.0.1')

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginCount: expect.anything(),
        })
      )
    })
  })

  describe('lockUser', () => {
    it('should lock user account for specified duration', async () => {
      const mockUpdatedUser = { id: '1', lockedUntil: new Date() }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.lockUser(db, '1', 30)

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedUntil: expect.any(Date),
        })
      )
    })
  })

  describe('unlockUser', () => {
    it('should unlock user account', async () => {
      const mockUpdatedUser = { id: '1', lockedUntil: null, failedLoginCount: 0 }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedUser])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await userQueries.unlockUser(db, '1')

      expect(result).toEqual(mockUpdatedUser)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedUntil: null,
          failedLoginCount: 0,
        })
      )
    })
  })
})
