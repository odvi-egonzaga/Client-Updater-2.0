export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitOpenError'
  }
}

interface CircuitState {
  status: 'closed' | 'open' | 'half-open'
  failures: number
  successes: number
  lastFailure: number | null
  lastCheck: number
}

interface CircuitBreakerConfig {
  failureThreshold: number
  cooldownMs: number
  successThreshold: number
}

export class CircuitBreaker {
  private state: CircuitState = {
    status: 'closed',
    failures: 0,
    successes: 0,
    lastFailure: null,
    lastCheck: Date.now(),
  }

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (Date.now() - this.state.lastCheck > this.config.cooldownMs) {
        this.state.status = 'half-open'
        this.state.successes = 0
      } else {
        throw new CircuitOpenError(`Circuit ${this.name} is open`)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    if (this.state.status === 'half-open') {
      this.state.successes++
      if (this.state.successes >= this.config.successThreshold) {
        this.state.status = 'closed'
        this.state.failures = 0
      }
    } else {
      this.state.failures = 0
    }
  }

  private onFailure(): void {
    this.state.failures++
    this.state.lastFailure = Date.now()
    this.state.lastCheck = Date.now()

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.status = 'open'
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state.status
  }

  getFailures(): number {
    return this.state.failures
  }
}






