import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  })),
}))

describe('Cache Service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('UPSTASH_REDIS_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_TOKEN', 'test-token')
  })

  it('should export cache functions', async () => {
    const { cache } = await import('../redis')
    expect(cache).toBeDefined()
    expect(cache.get).toBeDefined()
    expect(cache.set).toBeDefined()
    expect(cache.del).toBeDefined()
    expect(cache.delPattern).toBeDefined()
  })

  it('should export cache key builders', async () => {
    const { cacheKeys } = await import('../redis')
    expect(cacheKeys.lookups).toBe('lookups:all')
    expect(cacheKeys.userPermissions('user-1')).toBe('user:user-1:permissions')
    expect(cacheKeys.userBranches('user-1')).toBe('user:user-1:branches')
  })
})





