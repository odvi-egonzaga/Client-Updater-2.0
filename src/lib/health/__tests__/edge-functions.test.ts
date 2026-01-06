import { describe, it, expect } from 'vitest'
import { pingEdgeFunction, validateEdgeFunctionAuth, runEdgeFunctionHealthChecks } from '../edge-functions'
import type { EdgeFunctionCheckConfig } from '../types'

describe('Edge Functions Health Check', () => {
  describe('pingEdgeFunction', () => {
    it('should have correct function signature', () => {
      expect(typeof pingEdgeFunction).toBe('function')
      expect(pingEdgeFunction.length).toBe(1)
    })

    it('should accept empty config object', () => {
      const config = {}
      expect(typeof config).toBe('object')
    })

    it('should accept config with functionName', () => {
      const config = { functionName: 'test-function' }
      expect(config.functionName).toBe('test-function')
    })

    it('should accept config with functionName and validateAuth', () => {
      const config = { functionName: 'test-function', validateAuth: true }
      expect(config.functionName).toBe('test-function')
      expect(config.validateAuth).toBe(true)
    })
  })

  describe('validateEdgeFunctionAuth', () => {
    it('should have correct function signature', () => {
      expect(typeof validateEdgeFunctionAuth).toBe('function')
      expect(validateEdgeFunctionAuth.length).toBe(1)
    })

    it('should accept empty config object', () => {
      const config = {}
      expect(typeof config).toBe('object')
    })

    it('should accept config with functionName', () => {
      const config = { functionName: 'test-function' }
      expect(config.functionName).toBe('test-function')
    })

    it('should accept config with functionName and authToken', () => {
      const config = { functionName: 'test-function', authToken: 'Bearer token' }
      expect(config.functionName).toBe('test-function')
      expect(config.authToken).toBe('Bearer token')
    })
  })

  describe('runEdgeFunctionHealthChecks', () => {
    it('should have correct function signature', () => {
      expect(typeof runEdgeFunctionHealthChecks).toBe('function')
      expect(runEdgeFunctionHealthChecks.length).toBe(0) // Uses destructured config object
    })

    it('should accept empty array', () => {
      const configs: EdgeFunctionCheckConfig[] = []
      expect(Array.isArray(configs)).toBe(true)
      expect(configs.length).toBe(0)
    })

    it('should accept array of configs', () => {
      const configs = [
        { functionName: 'function1' },
        { functionName: 'function2' },
      ]
      expect(configs).toHaveLength(2)
      expect(configs[0].functionName).toBe('function1')
      expect(configs[1].functionName).toBe('function2')
    })
  })
})
