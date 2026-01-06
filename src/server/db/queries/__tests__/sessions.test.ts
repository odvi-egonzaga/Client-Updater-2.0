import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as sessionQueries from '../sessions'
import { userSessions } from '../../schema/users'
import { eq, and, lt, isNull } from 'drizzle-orm'

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

describe('Session Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a new session', async () => {
      const sessionData = {
        userId: '1',
        sessionToken: 'token-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
        expiresAt: new Date(Date.now() + 3600000),
      }
      const mockSession = { id: 'session-1', ...sessionData }

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockSession])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await sessionQueries.createSession(
        db,
        sessionData.userId,
        sessionData.sessionToken,
        sessionData.ipAddress,
        sessionData.userAgent,
        sessionData.expiresAt
      )

      expect(result).toEqual(mockSession)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sessionData.userId,
          sessionToken: sessionData.sessionToken,
        })
      )
    })
  })

  describe('getSessionByToken', () => {
    it('should return session by token', async () => {
      const mockSession = {
        id: 'session-1',
        userId: '1',
        sessionToken: 'token-123',
        expiresAt: new Date(Date.now() + 3600000),
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockSession])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await sessionQueries.getSessionByToken(db, 'token-123')

      expect(result).toEqual(mockSession)
      expect(mockWhere).toHaveBeenCalled()
    })

    it('should return null for non-existent token', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await sessionQueries.getSessionByToken(db, 'non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getUserSessions', () => {
    it('should return all user sessions', async () => {
      const mockSessions = [
        { id: 'session-1', userId: '1', sessionToken: 'token-1' },
        { id: 'session-2', userId: '1', sessionToken: 'token-2' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockSessions)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await sessionQueries.getUserSessions(db, '1')

      expect(result).toEqual(mockSessions)
      expect(mockWhere).toHaveBeenCalled()
    })
  })

  describe('revokeSession', () => {
    it('should revoke a single session', async () => {
      const mockUpdatedSession = {
        id: 'session-1',
        revokedAt: new Date(),
        revokedReason: 'User logged out',
      }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedSession])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await sessionQueries.revokeSession(db, 'session-1', 'User logged out')

      expect(result).toEqual(mockUpdatedSession)
      expect(mockSet).toHaveBeenCalledWith({
        revokedAt: expect.any(Date),
        revokedReason: 'User logged out',
      })
    })
  })

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      const mockUpdatedSessions = [
        { id: 'session-1', revokedAt: new Date() },
        { id: 'session-2', revokedAt: new Date() },
      ]

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue(mockUpdatedSessions)

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await sessionQueries.revokeAllUserSessions(db, '1', 'Password changed')

      expect(result).toEqual(mockUpdatedSessions)
      expect(mockSet).toHaveBeenCalledWith({
        revokedAt: expect.any(Date),
        revokedReason: 'Password changed',
      })
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', async () => {
      const mockDeletedSessions = [
        { id: 'session-1', expiresAt: new Date('2020-01-01') },
        { id: 'session-2', expiresAt: new Date('2020-01-01') },
      ]

      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue(mockDeletedSessions)

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await sessionQueries.cleanupExpiredSessions(db)

      expect(result).toEqual(mockDeletedSessions)
      expect(mockWhere).toHaveBeenCalled()
    })
  })
})
