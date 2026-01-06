import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('Health Check Logger', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console methods
    vi.restoreAllMocks()
  })

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test info message')
      expect(console.log).toHaveBeenCalledWith('[HealthCheck INFO] Test info message', '')
    })

    it('should log info message with metadata', () => {
      logger.info('Test info message', { key: 'value' })
      expect(console.log).toHaveBeenCalledWith(
        '[HealthCheck INFO] Test info message',
        JSON.stringify({ key: 'value' })
      )
    })
  })

  describe('success', () => {
    it('should log success message', () => {
      logger.success('Test success message')
      expect(console.log).toHaveBeenCalledWith('[HealthCheck SUCCESS] Test success message', '')
    })

    it('should log success message with metadata', () => {
      logger.success('Test success message', { key: 'value' })
      expect(console.log).toHaveBeenCalledWith(
        '[HealthCheck SUCCESS] Test success message',
        JSON.stringify({ key: 'value' })
      )
    })
  })

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Test warning message')
      expect(console.warn).toHaveBeenCalledWith('[HealthCheck WARN] Test warning message', '')
    })

    it('should log warning message with metadata', () => {
      logger.warn('Test warning message', { key: 'value' })
      expect(console.warn).toHaveBeenCalledWith(
        '[HealthCheck WARN] Test warning message',
        JSON.stringify({ key: 'value' })
      )
    })
  })

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Test error message')
      expect(console.error).toHaveBeenCalledWith('[HealthCheck ERROR] Test error message', '')
    })

    it('should log error message with metadata', () => {
      logger.error('Test error message', { key: 'value' })
      expect(console.error).toHaveBeenCalledWith(
        '[HealthCheck ERROR] Test error message',
        JSON.stringify({ key: 'value' })
      )
    })
  })

  describe('debug', () => {
    it('should not log debug message in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      logger.debug('Test debug message')
      expect(console.debug).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should log debug message in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.debug('Test debug message')
      expect(console.debug).toHaveBeenCalledWith('[HealthCheck DEBUG] Test debug message', '')

      process.env.NODE_ENV = originalEnv
    })

    it('should log debug message with metadata in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.debug('Test debug message', { key: 'value' })
      expect(console.debug).toHaveBeenCalledWith(
        '[HealthCheck DEBUG] Test debug message',
        JSON.stringify({ key: 'value' })
      )

      process.env.NODE_ENV = originalEnv
    })
  })
})
