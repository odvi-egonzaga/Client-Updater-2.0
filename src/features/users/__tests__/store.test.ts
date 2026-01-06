import { describe, it, expect, beforeEach } from 'vitest'
import { useUsersStore } from '../stores/users-store'

describe('useUsersStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUsersStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have initial state with empty users array', () => {
      const state = useUsersStore.getState()
      expect(state.users).toEqual([])
    })

    it('should have initial state with null selectedUser', () => {
      const state = useUsersStore.getState()
      expect(state.selectedUser).toBeNull()
    })

    it('should have initial state with empty filters', () => {
      const state = useUsersStore.getState()
      expect(state.filters).toEqual({})
    })

    it('should have initial pagination state', () => {
      const state = useUsersStore.getState()
      expect(state.pagination).toEqual({
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
      })
    })

    it('should have initial loading state as false', () => {
      const state = useUsersStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('should have initial error state as null', () => {
      const state = useUsersStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('setUsers action', () => {
    it('should set users array', () => {
      const { setUsers } = useUsersStore.getState()
      const users = [
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

      setUsers(users)

      const state = useUsersStore.getState()
      expect(state.users).toEqual(users)
      expect(state.users).toHaveLength(1)
    })

    it('should replace existing users', () => {
      const { setUsers } = useUsersStore.getState()

      // Set initial users
      setUsers([
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
      ])

      // Replace with new users
      const newUsers = [
        {
          id: '2',
          clerkId: 'clerk_2',
          email: 'user2@example.com',
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
        },
      ]

      setUsers(newUsers)

      const state = useUsersStore.getState()
      expect(state.users).toEqual(newUsers)
      expect(state.users).toHaveLength(1)
      expect(state.users[0]?.id).toBe('2')
    })
  })

  describe('setSelectedUser action', () => {
    it('should set selectedUser', () => {
      const { setSelectedUser } = useUsersStore.getState()
      const user = {
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

      setSelectedUser(user)

      const state = useUsersStore.getState()
      expect(state.selectedUser).toEqual(user)
    })

    it('should set selectedUser to null', () => {
      const { setSelectedUser } = useUsersStore.getState()

      // First set a user
      setSelectedUser({
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
      })

      // Then set to null
      setSelectedUser(null)

      const state = useUsersStore.getState()
      expect(state.selectedUser).toBeNull()
    })
  })

  describe('setFilters action', () => {
    it('should set filters', () => {
      const { setFilters } = useUsersStore.getState()
      const filters = {
        isActive: true,
        search: 'john',
      }

      setFilters(filters)

      const state = useUsersStore.getState()
      expect(state.filters).toEqual(filters)
    })

    it('should merge filters with existing filters', () => {
      const { setFilters } = useUsersStore.getState()

      // Set initial filters
      setFilters({ isActive: true })

      // Add search filter
      setFilters({ search: 'john' })

      const state = useUsersStore.getState()
      expect(state.filters).toEqual({
        isActive: true,
        search: 'john',
      })
    })

    it('should reset page to 1 when filters change', () => {
      const { setFilters, setPagination } = useUsersStore.getState()

      // Set page to 5
      setPagination({ page: 5 })

      // Change filters
      setFilters({ isActive: true })

      const state = useUsersStore.getState()
      expect(state.pagination.page).toBe(1)
    })
  })

  describe('setPagination action', () => {
    it('should set pagination', () => {
      const { setPagination } = useUsersStore.getState()
      const pagination = {
        page: 2,
        pageSize: 50,
        total: 100,
        totalPages: 2,
      }

      setPagination(pagination)

      const state = useUsersStore.getState()
      expect(state.pagination).toEqual(pagination)
    })

    it('should merge pagination with existing pagination', () => {
      const { setPagination } = useUsersStore.getState()

      // Set initial pagination
      setPagination({ page: 2, pageSize: 50 })

      // Update total and totalPages
      setPagination({ total: 100, totalPages: 2 })

      const state = useUsersStore.getState()
      expect(state.pagination).toEqual({
        page: 2,
        pageSize: 50,
        total: 100,
        totalPages: 2,
      })
    })
  })

  describe('setLoading action', () => {
    it('should set loading to true', () => {
      const { setLoading } = useUsersStore.getState()
      setLoading(true)

      const state = useUsersStore.getState()
      expect(state.isLoading).toBe(true)
    })

    it('should set loading to false', () => {
      const { setLoading } = useUsersStore.getState()
      setLoading(true)
      setLoading(false)

      const state = useUsersStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setError action', () => {
    it('should set error message', () => {
      const { setError } = useUsersStore.getState()
      const errorMessage = 'Failed to fetch users'
      setError(errorMessage)

      const state = useUsersStore.getState()
      expect(state.error).toBe(errorMessage)
    })

    it('should set error to null', () => {
      const { setError } = useUsersStore.getState()
      setError('Error message')
      setError(null)

      const state = useUsersStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('reset action', () => {
    it('should reset all state to initial values', () => {
      const store = useUsersStore.getState()

      // Set various state values
      store.setUsers([
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
      ])
      store.setSelectedUser({
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
      })
      store.setFilters({ isActive: true })
      store.setPagination({ page: 5 })
      store.setLoading(true)
      store.setError('Error message')

      // Reset state
      store.reset()

      const state = useUsersStore.getState()
      expect(state.users).toEqual([])
      expect(state.selectedUser).toBeNull()
      expect(state.filters).toEqual({})
      expect(state.pagination).toEqual({
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
      })
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('state consistency', () => {
    it('should maintain state consistency across multiple store accesses', () => {
      const state1 = useUsersStore.getState()
      const state2 = useUsersStore.getState()

      expect(state1.users).toBe(state2.users)
      expect(state1.selectedUser).toBe(state2.selectedUser)
      expect(state1.filters).toBe(state2.filters)
      expect(state1.pagination).toBe(state2.pagination)
      expect(state1.isLoading).toBe(state2.isLoading)
      expect(state1.error).toBe(state2.error)
    })
  })
})
