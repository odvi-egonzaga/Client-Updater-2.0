import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should export logger with standard methods', async () => {
    const { logger } = await import('../index')
    expect(logger.info).toBeDefined()
    expect(logger.error).toBeDefined()
    expect(logger.warn).toBeDefined()
    expect(logger.debug).toBeDefined()
  })

  it('should log info messages as JSON', async () => {
    const { logger } = await import('../index')
    logger.info('test message', { userId: '123' })

    expect(console.log).toHaveBeenCalled()
    const logged = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('info')
    expect(logged.message).toBe('test message')
    expect(logged.userId).toBe('123')
  })

  it('should log errors with stack trace', async () => {
    const { logger } = await import('../index')
    const error = new Error('test error')
    logger.error('operation failed', error, { requestId: 'req-1' })

    expect(console.error).toHaveBeenCalled()
    const logged = JSON.parse((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.error.message).toBe('test error')
    expect(logged.requestId).toBe('req-1')
  })
})






