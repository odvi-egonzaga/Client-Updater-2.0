import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker'

describe('CircuitBreaker', () => {
  let circuit: CircuitBreaker

  beforeEach(() => {
    circuit = new CircuitBreaker('test', {
      failureThreshold: 3,
      cooldownMs: 1000,
      successThreshold: 2,
    })
  })

  it('should execute function when circuit is closed', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await circuit.execute(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalled()
  })

  it('should open circuit after failure threshold', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    // Fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuit.execute(fn)).rejects.toThrow('fail')
    }

    // Next call should fail with CircuitOpenError
    await expect(circuit.execute(fn)).rejects.toBeInstanceOf(CircuitOpenError)
  })

  it('should reset failures on success', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('fail'))
    const successFn = vi.fn().mockResolvedValue('success')

    // Fail twice
    await expect(circuit.execute(failFn)).rejects.toThrow()
    await expect(circuit.execute(failFn)).rejects.toThrow()

    // Success should reset
    await circuit.execute(successFn)

    // Can fail twice more without opening
    await expect(circuit.execute(failFn)).rejects.toThrow()
    await expect(circuit.execute(failFn)).rejects.toThrow()

    // Still not open
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await circuit.execute(fn)
    expect(result).toBe('ok')
  })

  it('should expose circuit state', () => {
    expect(circuit.getState()).toBe('closed')
  })
})






