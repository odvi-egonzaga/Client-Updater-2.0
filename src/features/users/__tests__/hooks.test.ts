import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useUsers,
  useUser,
  useUserPermissions,
  useUserTerritories,
  useUserSessions,
  useCreateUser,
  useUpdateUser,
  useToggleUserStatus,
  useSetUserPermissions,
  useSetUserTerritories,
  useRevokeSession,
  useRevokeAllSessions,
} from '../hooks/use-users'

// Mock fetch globally
global.fetch = vi.fn()

// Helper function to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// Import React for createElement
import React from 'react'

describe('useUsers hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch users successfully', async () => {
    const mockUsers = [
      {
        id: '1',
        clerkId: 'clerk_1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        imageUrl: null,
        clerkOrgId: null,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        lastLoginAt: null,
        loginCount: 0,
        failedLoginCount: 0,
        lockedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUsers,
        meta: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        },
      }),
    } as Response)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toEqual(mockUsers)
  })

  it('should handle fetch errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: 'Failed to fetch users',
        },
      }),
    } as Response)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useUser hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch a single user successfully', async () => {
    const mockUser = {
      id: '1',
      clerkId: 'clerk_1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: null,
      clerkOrgId: null,
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: null,
      lastLoginAt: null,
      loginCount: 0,
      failedLoginCount: 0,
      lockedUntil: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [],
      areas: [],
      branches: [],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUser,
      }),
    } as Response)

    const { result } = renderHook(() => useUser('1'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toEqual(mockUser)
  })

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useUser(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useUserPermissions hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch user permissions successfully', async () => {
    const mockPermissions = [
      {
        userId: '1',
        permissionId: '123',
        permission: {
          id: '123',
          code: 'users.read',
          resource: 'users',
          action: 'read',
          description: 'Read users',
          createdAt: new Date(),
        },
        companyId: '456',
        company: {
          id: '456',
          name: 'Test Company',
        },
        scope: 'all' as const,
        grantedAt: new Date(),
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPermissions,
      }),
    } as Response)

    const { result } = renderHook(() => useUserPermissions('1', '456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toEqual(mockPermissions)
  })

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useUserPermissions(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useUserTerritories hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch user territories successfully', async () => {
    const mockTerritories = {
      areas: [],
      branches: [],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTerritories,
      }),
    } as Response)

    const { result } = renderHook(() => useUserTerritories('1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toEqual(mockTerritories)
  })

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useUserTerritories(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useUserSessions hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch user sessions successfully', async () => {
    const mockSessions = [
      {
        id: '1',
        userId: '123',
        sessionToken: 'session_token_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        expiresAt: new Date(),
        revokedAt: null,
        revokedReason: null,
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSessions,
      }),
    } as Response)

    const { result } = renderHook(() => useUserSessions('1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toEqual(mockSessions)
  })

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useUserSessions(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateUser mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create user successfully', async () => {
    const mockUser = {
      id: '1',
      clerkId: 'clerk_1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: null,
      clerkOrgId: null,
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: null,
      lastLoginAt: null,
      loginCount: 0,
      failedLoginCount: 0,
      lockedUntil: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUser,
      }),
    } as Response)

    const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() })

    const input = {
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      clerkUserId: 'clerk_1',
    }

    await result.current.mutateAsync(input)

    expect(fetch).toHaveBeenCalledWith('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })
})

describe('useUpdateUser mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update user successfully', async () => {
    const mockUser = {
      id: '1',
      clerkId: 'clerk_1',
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      imageUrl: null,
      clerkOrgId: null,
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: null,
      lastLoginAt: null,
      loginCount: 0,
      failedLoginCount: 0,
      lockedUntil: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUser,
      }),
    } as Response)

    const { result } = renderHook(() => useUpdateUser('1'), { wrapper: createWrapper() })

    const input = {
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    }

    await result.current.mutateAsync(input)

    expect(fetch).toHaveBeenCalledWith('/api/users/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })
})

describe('useToggleUserStatus mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should toggle user status successfully', async () => {
    const mockUser = {
      id: '1',
      clerkId: 'clerk_1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: null,
      clerkOrgId: null,
      isActive: false,
      mustChangePassword: false,
      passwordChangedAt: null,
      lastLoginAt: null,
      loginCount: 0,
      failedLoginCount: 0,
      lockedUntil: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUser,
      }),
    } as Response)

    const { result } = renderHook(() => useToggleUserStatus('1'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({ isActive: false })

    expect(fetch).toHaveBeenCalledWith('/api/users/1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
  })
})

describe('useSetUserPermissions mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set user permissions successfully', async () => {
    const mockPermissions = [
      {
        userId: '1',
        permissionId: '123',
        permission: {
          id: '123',
          code: 'users.read',
          resource: 'users',
          action: 'read',
          description: 'Read users',
          createdAt: new Date(),
        },
        companyId: '456',
        company: {
          id: '456',
          name: 'Test Company',
        },
        scope: 'all' as const,
        grantedAt: new Date(),
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPermissions,
      }),
    } as Response)

    const { result } = renderHook(() => useSetUserPermissions('1'), {
      wrapper: createWrapper(),
    })

    const input = {
      permissions: [
        {
          permissionId: '123',
          companyId: '456',
          scope: 'all' as const,
        },
      ],
    }

    await result.current.mutateAsync(input)

    expect(fetch).toHaveBeenCalledWith('/api/users/1/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })
})

describe('useSetUserTerritories mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set user territories successfully', async () => {
    const mockTerritories = {
      areas: [],
      branches: [],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTerritories,
      }),
    } as Response)

    const { result } = renderHook(() => useSetUserTerritories('1'), {
      wrapper: createWrapper(),
    })

    const input = {
      areaIds: ['123', '456'],
      branchIds: ['789'],
    }

    await result.current.mutateAsync(input)

    expect(fetch).toHaveBeenCalledWith('/api/users/1/territories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })
})

describe('useRevokeSession mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should revoke session successfully', async () => {
    const mockSession = {
      id: '1',
      userId: '123',
      sessionToken: 'session_token_123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: new Date(),
      revokedReason: 'Session revoked by admin',
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSession,
      }),
    } as Response)

    const { result } = renderHook(() => useRevokeSession('123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('1')

    expect(fetch).toHaveBeenCalledWith('/api/users/123/sessions/1', {
      method: 'DELETE',
    })
  })
})

describe('useRevokeAllSessions mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should revoke all sessions successfully', async () => {
    const mockSessions = [
      {
        id: '1',
        userId: '123',
        sessionToken: 'session_token_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        expiresAt: new Date(),
        revokedAt: new Date(),
        revokedReason: 'All sessions revoked by admin',
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSessions,
      }),
    } as Response)

    const { result } = renderHook(() => useRevokeAllSessions('123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync()

    expect(fetch).toHaveBeenCalledWith('/api/users/123/sessions/revoke-all', {
      method: 'POST',
    })
  })
})
