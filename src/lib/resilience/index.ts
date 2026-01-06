import { env } from '@/config/env'
import { CircuitBreaker } from './circuit-breaker'

export { CircuitBreaker, CircuitOpenError } from './circuit-breaker'

// Pre-configured circuit breakers for external services
export const circuits = {
  snowflake: new CircuitBreaker('snowflake', {
    failureThreshold: env.CIRCUIT_SNOWFLAKE_THRESHOLD,
    cooldownMs: env.CIRCUIT_SNOWFLAKE_COOLDOWN_MS,
    successThreshold: 3,
  }),
  nextbank: new CircuitBreaker('nextbank', {
    failureThreshold: env.CIRCUIT_NEXTBANK_THRESHOLD,
    cooldownMs: env.CIRCUIT_NEXTBANK_COOLDOWN_MS,
    successThreshold: 2,
  }),
}






