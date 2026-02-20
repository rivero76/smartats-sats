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

const REDACTED_VALUE = '[REDACTED]'

// P0 guardrail: explicit allowlists for high-risk scripts.
// Scripts not listed here will retain all metadata keys but still pass through sensitive-value redaction.
const SCRIPT_ALLOWED_METADATA_KEYS: Record<string, string[]> = {
  'authentication-frontend': [
    'event',
    'action',
    'user_id',
    'session_id',
    'error_code',
    'error_message',
    'timestamp',
    'is_retry',
    'success',
    'auth_event',
    'has_session',
    'session_expires_at',
  ],
  'authentication-session': [
    'event',
    'action',
    'user_id',
    'session_id',
    'error_code',
    'error_message',
    'timestamp',
    'is_retry',
    'success',
    'auth_event',
    'has_session',
    'session_expires_at',
  ],
  'authentication-ui': [
    'event',
    'action',
    'form_type',
    'validation_errors',
    'toast_type',
    'context',
    'message',
    'timestamp',
  ],
  'ats-analysis-direct': [
    'analysis_id',
    'resume_id',
    'jd_id',
    'status',
    'model_used',
    'processing_time_ms',
    'prompt_characters',
    'cost_estimate_usd',
    'token_usage',
    'error_type',
    'safe_message',
    'timestamp',
  ],
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return (
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.includes('apikey') ||
    normalized.includes('api_key') ||
    normalized.includes('authorization') ||
    normalized === 'email' ||
    normalized === 'url' ||
    normalized === 'file_url' ||
    normalized.includes('prompt') ||
    normalized.includes('raw_llm_response') ||
    normalized.includes('pasted_text')
  )
}

function redactSensitiveMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveMetadata(item))
  }

  if (!isPlainObject(value)) {
    return value
  }

  const redacted: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedactKey(key)) {
      redacted[key] = REDACTED_VALUE
      continue
    }
    redacted[key] = redactSensitiveMetadata(entry)
  }

  return redacted
}

function applyScriptAllowlist(scriptName: string, metadata: unknown): unknown {
  if (!isPlainObject(metadata)) return metadata

  const allowedKeys = SCRIPT_ALLOWED_METADATA_KEYS[scriptName]
  if (!allowedKeys) {
    return metadata
  }

  const filtered: Record<string, unknown> = {}
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      filtered[key] = metadata[key]
    }
  }

  return filtered
}

function sanitizeMetadata(scriptName: string, metadata: unknown): unknown {
  const allowlisted = applyScriptAllowlist(scriptName, metadata)
  return redactSensitiveMetadata(allowlisted)
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
    const safeMetadata = sanitizeMetadata(options.script_name, options.metadata)

    // Attempt to log locally first (non-blocking)
    if (writeLocalLog) {
      writeLocalLog(level, message, safeMetadata, options.script_name)
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        console.warn('[CentralizedLogger] No session token available; skipping remote log write.')
        return
      }

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
          metadata: safeMetadata,
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
            safeMetadata,
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
          safeMetadata,
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
