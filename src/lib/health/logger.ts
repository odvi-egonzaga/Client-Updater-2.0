/**
 * Health check logger for detailed operational logging
 */
export const logger = {
  /**
   * Log informational message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[HealthCheck INFO] ${message}`, meta ? JSON.stringify(meta) : '')
  },

  /**
   * Log successful operation
   */
  success(message: string, meta?: Record<string, unknown>): void {
    console.log(`[HealthCheck SUCCESS] ${message}`, meta ? JSON.stringify(meta) : '')
  },

  /**
   * Log warning
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[HealthCheck WARN] ${message}`, meta ? JSON.stringify(meta) : '')
  },

  /**
   * Log error
   */
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[HealthCheck ERROR] ${message}`, meta ? JSON.stringify(meta) : '')
  },

  /**
   * Log debug information (only in development)
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[HealthCheck DEBUG] ${message}`, meta ? JSON.stringify(meta) : '')
    }
  },
}
