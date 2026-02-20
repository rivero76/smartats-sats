/**
 * centralizedLogger.ts
 * --------------------------------------------------------
 * Centralized logging utility for SATS (Smart ATS)
 * - Logs to Supabase centralized endpoint
 * - Optionally logs to local file when running on Node.js
 * - Browser-safe (no "path" or "fs" usage in frontend)
 *
 * Author: Ricardo Rivero
 * Created: 2025-11-12
 * --------------------------------------------------------
 * SDLC-Compliant: follows modular logging architecture
 * with runtime detection and error resilience.
 */

import { supabase } from '@/integrations/supabase/client'

export type LogLevel = 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE'

interface LogOptions {
  script_name: string
  user_id?: string
  session_id?: string
  request_id?: string
  metadata?: any
}

/**
 * Dynamic import guard for Node-only local logging.
 * Prevents Vite bundling errors when running in browser.
 */
let writeLocalLog:
  | ((level: string, message: string, metadata?: any, script?: string) => Promise<void>)
  | null = null

if (typeof window === 'undefined') {
  // Running in Node (e.g., local FastAPI backend, Docker, etc.)
  // Wrapped in async IIFE to avoid top-level await (incompatible with browser build targets)
  ;(async () => {
    const { writeLocalLog: nodeLogger } = await import('./localLogger')
    writeLocalLog = nodeLogger
  })()
}

class CentralizedLogger {
  private readonly projectId = 'nkgscksbgmzhizohobhg'
  private readonly baseUrl = `https://${this.projectId}.functions.supabase.co/functions/v1/centralized-logging`

  /**
   * Core log function.
   * - Always attempts Supabase logging (with fallback token)
   * - In Node.js, also writes to local file.
   */
  async log(level: LogLevel, message: string, options: LogOptions): Promise<void> {
    // Attempt to log locally first (non-blocking)
    if (writeLocalLog) {
      writeLocalLog(level, message, options.metadata, options.script_name)
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken =
        session?.access_token ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZ3Nja3NiZ216aGl6b2hvYmhnIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTc0Nzk4NDcsImV4cCI6MjA3MzA1NTg0N30.KQl_psbpASttYH5FbqwUe1_xSF60_PPUPhidmF_pQD0'

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          script_name: options.script_name,
          log_level: level,
          message,
          metadata: options.metadata,
          user_id: options.user_id,
          session_id: options.session_id,
          request_id: options.request_id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[CentralizedLogger] Supabase log failed: ${response.status} ${errorText}`)
        if (writeLocalLog) {
          writeLocalLog(
            'ERROR',
            `Supabase log failed: ${errorText}`,
            options.metadata,
            options.script_name
          )
        }
      }
    } catch (error: any) {
      console.error('[CentralizedLogger] Logging exception:', error)
      if (writeLocalLog) {
        writeLocalLog(
          'ERROR',
          `Supabase logging exception: ${error.message}`,
          options.metadata,
          options.script_name
        )
      }
    }
  }

  // Log-level helpers for structured usage
  error(message: string, options: LogOptions): Promise<void> {
    return this.log('ERROR', message, options)
  }

  info(message: string, options: LogOptions): Promise<void> {
    return this.log('INFO', message, options)
  }

  debug(message: string, options: LogOptions): Promise<void> {
    return this.log('DEBUG', message, options)
  }

  trace(message: string, options: LogOptions): Promise<void> {
    return this.log('TRACE', message, options)
  }
}

/**
 * Singleton instance of the centralized logger.
 * Use this directly for system-wide logging.
 */
export const centralizedLogger = new CentralizedLogger()

/**
 * Creates a logger scoped to a specific script or component.
 * Example:
 *   const log = createScriptLogger('resume-uploader');
 *   log.info('File uploaded successfully', { filename });
 */
export function createScriptLogger(
  scriptName: string,
  options?: { userId?: string; sessionId?: string }
) {
  return {
    error: (message: string, metadata?: any) =>
      centralizedLogger.error(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata,
      }),

    info: (message: string, metadata?: any) =>
      centralizedLogger.info(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata,
      }),

    debug: (message: string, metadata?: any) =>
      centralizedLogger.debug(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata,
      }),

    trace: (message: string, metadata?: any) =>
      centralizedLogger.trace(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata,
      }),

    warn: (message: string, metadata?: any) =>
      centralizedLogger.info(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata,
      }),
  }
}
