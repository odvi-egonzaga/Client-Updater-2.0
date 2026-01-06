interface LogMeta {
  requestId?: string
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  duration_ms?: number
  [key: string]: unknown
}

interface LogEntry extends LogMeta {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  error?: {
    name: string
    message: string
    stack?: string
  }
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

export const logger = {
  debug: (message: string, meta?: LogMeta): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }))
    }
  },

  info: (message: string, meta?: LogMeta): void => {
    console.log(formatLog({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }))
  },

  warn: (message: string, meta?: LogMeta): void => {
    console.warn(formatLog({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }))
  },

  error: (message: string, error: Error, meta?: LogMeta): void => {
    console.error(formatLog({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...meta,
    }))
  },
}

export type { LogMeta, LogEntry }







