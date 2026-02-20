// src/lib/devLogger.ts

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface DevLogEntry {
  time: string
  level: LogLevel
  message: string
  metadata?: unknown
}

const LOGGING_ENABLED = import.meta.env.VITE_LOGGING_ENABLED !== 'false'
const LOG_TO_CONSOLE = import.meta.env.VITE_LOG_TO_CONSOLE !== 'false'

export class DevLogger {
  private static maxEntries = 200

  private static store(level: LogLevel, message: string, metadata?: unknown) {
    const entry: DevLogEntry = {
      time: new Date().toISOString(),
      level,
      message,
      metadata,
    }
    try {
      const existing = JSON.parse(sessionStorage.getItem('devLogs') || '[]')
      existing.push(entry)
      sessionStorage.setItem('devLogs', JSON.stringify(existing.slice(-DevLogger.maxEntries)))
    } catch (error) {
      console.warn('[DevLogger] Failed to persist log entry', error)
    }
  }

  static log(level: LogLevel, message: string, metadata?: unknown) {
    if (!LOGGING_ENABLED && !LOG_TO_CONSOLE) return

    if (LOG_TO_CONSOLE) {
      const prefix = `[${new Date().toISOString()}] [${level}]`
      if (metadata) console.log(prefix, message, metadata)
      else console.log(prefix, message)
    }

    if (LOGGING_ENABLED && import.meta.env.DEV) {
      this.store(level, message, metadata)
    }
  }

  static info(message: string, metadata?: unknown) {
    this.log('INFO', message, metadata)
  }

  static warn(message: string, metadata?: unknown) {
    this.log('WARN', message, metadata)
  }

  static error(message: string, metadata?: unknown) {
    this.log('ERROR', message, metadata)
  }

  static debug(message: string, metadata?: unknown) {
    this.log('DEBUG', message, metadata)
  }
}
