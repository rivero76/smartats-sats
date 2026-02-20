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
 *
 * UPDATE LOG
 * 2026-02-20 23:19:37 | P1: Added structured logging schema normalization for frontend log events.
 * 2026-02-20 23:29:40 | P3: Added client-side sampling, throttling, payload truncation, and retry/backoff for log delivery.
 * 2026-02-21 00:15:00 | Hardened script logger to promote metadata.request_id to top-level request_id.
 * 2026-02-21 03:15:00 | SDLC P3 reliability parameterization: moved logging limits/sampling/retry settings to environment-driven config.
 */

import { supabase } from '@/integrations/supabase/client'

export type LogLevel = 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE'

export interface StructuredLogEvent {
  event_name: string
  component: string
  operation: string
  outcome: 'success' | 'failure' | 'start' | 'info'
  duration_ms?: number
  request_id?: string
  session_id?: string
  user_id?: string
  timestamp?: string
  [key: string]: unknown
}

interface LogOptions {
  script_name: string
  user_id?: string
  session_id?: string
  request_id?: string
  metadata?: unknown
}

function getEnvNumber(name: string, fallback: number): number {
  const raw = import.meta.env[name]
  if (!raw || typeof raw !== 'string') return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getEnvInt(name: string, fallback: number): number {
  const parsed = Math.floor(getEnvNumber(name, fallback))
  return Number.isFinite(parsed) ? parsed : fallback
}

function getEnvBackoff(name: string, fallback: number[]): number[] {
  const raw = import.meta.env[name]
  if (!raw || typeof raw !== 'string') return fallback
  const values = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 0)
  return values.length > 0 ? values : fallback
}

const REDACTED_VALUE = '[REDACTED]'
const MAX_METADATA_BYTES = Math.max(1024, getEnvInt('VITE_LOG_MAX_METADATA_BYTES', 12 * 1024))
const RATE_LIMIT_WINDOW_MS = Math.max(1000, getEnvInt('VITE_LOG_RATE_LIMIT_WINDOW_MS', 60_000))
const DEBUG_MAX_PER_WINDOW = Math.max(1, getEnvInt('VITE_LOG_DEBUG_MAX_PER_WINDOW', 120))
const TRACE_MAX_PER_WINDOW = Math.max(1, getEnvInt('VITE_LOG_TRACE_MAX_PER_WINDOW', 60))

const DEBUG_SAMPLE_RATE = Math.max(0, Math.min(1, getEnvNumber('VITE_LOG_SAMPLE_DEBUG_RATE', 1)))
const TRACE_SAMPLE_RATE = Math.max(0, Math.min(1, getEnvNumber('VITE_LOG_SAMPLE_TRACE_RATE', 0.35)))

const LOG_RETRY_MAX_ATTEMPTS = Math.max(1, getEnvInt('VITE_LOG_RETRY_MAX_ATTEMPTS', 3))
const LOG_RETRY_BACKOFF_MS = getEnvBackoff('VITE_LOG_RETRY_BACKOFF_MS', [200, 600, 1200])

const encoder = new TextEncoder()
const rateWindow = new Map<string, { count: number; windowStart: number }>()

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
    'event_name',
    'component',
    'operation',
    'outcome',
    'duration_ms',
    'request_id',
    'details',
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
    'event_name',
    'component',
    'operation',
    'outcome',
    'duration_ms',
    'request_id',
    'details',
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
    'event_name',
    'component',
    'operation',
    'outcome',
    'duration_ms',
    'request_id',
    'details',
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
    'event_name',
    'component',
    'operation',
    'outcome',
    'duration_ms',
    'request_id',
    'details',
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
  const redacted = redactSensitiveMetadata(allowlisted)
  return enforceMetadataBudget(redacted)
}

function getPayloadBytes(value: unknown): number {
  try {
    return encoder.encode(JSON.stringify(value)).length
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

function truncateString(value: string, maxChars = 1024): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}...[truncated:${value.length - maxChars} chars]`
}

function truncateUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated:depth]'
  if (typeof value === 'string') return truncateString(value)
  if (Array.isArray(value))
    return value.slice(0, 50).map((entry) => truncateUnknown(entry, depth + 1))
  if (!isPlainObject(value)) return value

  const entries = Object.entries(value).slice(0, 80)
  const truncated: Record<string, unknown> = {}
  for (const [key, entry] of entries) {
    truncated[key] = truncateUnknown(entry, depth + 1)
  }

  if (Object.keys(value).length > entries.length) {
    truncated.__truncated_keys = Object.keys(value).length - entries.length
  }

  return truncated
}

function enforceMetadataBudget(metadata: unknown): unknown {
  const initialBytes = getPayloadBytes(metadata)
  if (initialBytes <= MAX_METADATA_BYTES) return metadata

  const truncated = truncateUnknown(metadata)
  const truncatedBytes = getPayloadBytes(truncated)
  if (truncatedBytes <= MAX_METADATA_BYTES) return truncated

  return {
    event_name: 'logging.metadata_truncated',
    component: 'centralizedLogger',
    operation: 'metadata_truncate',
    outcome: 'info',
    details: {
      reason: 'metadata_budget_exceeded',
      max_bytes: MAX_METADATA_BYTES,
      original_bytes: initialBytes,
      truncated_bytes: truncatedBytes,
    },
  }
}

function shouldSample(level: LogLevel): boolean {
  if (level === 'DEBUG') return Math.random() <= Math.max(0, Math.min(1, DEBUG_SAMPLE_RATE))
  if (level === 'TRACE') return Math.random() <= Math.max(0, Math.min(1, TRACE_SAMPLE_RATE))
  return true
}

function isRateLimited(scriptName: string, level: LogLevel): boolean {
  if (level !== 'DEBUG' && level !== 'TRACE') return false

  const key = `${scriptName}:${level}`
  const now = Date.now()
  const maxPerWindow = level === 'TRACE' ? TRACE_MAX_PER_WINDOW : DEBUG_MAX_PER_WINDOW
  const current = rateWindow.get(key)

  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateWindow.set(key, { count: 1, windowStart: now })
    return false
  }

  if (current.count >= maxPerWindow) {
    return true
  }

  current.count += 1
  return false
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function createLogEvent(event: StructuredLogEvent): StructuredLogEvent {
  return {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  }
}

function normalizeStructuredMetadata(
  scriptName: string,
  level: LogLevel,
  message: string,
  options: LogOptions
): StructuredLogEvent {
  const incoming = options.metadata

  if (isPlainObject(incoming)) {
    const asRecord = incoming as Record<string, unknown>
    const details = isPlainObject(asRecord.details) ? asRecord.details : undefined

    return createLogEvent({
      event_name:
        typeof asRecord.event_name === 'string' && asRecord.event_name.length > 0
          ? asRecord.event_name
          : `${scriptName}.${level.toLowerCase()}`,
      component:
        typeof asRecord.component === 'string' && asRecord.component.length > 0
          ? asRecord.component
          : scriptName,
      operation:
        typeof asRecord.operation === 'string' && asRecord.operation.length > 0
          ? asRecord.operation
          : 'log',
      outcome:
        asRecord.outcome === 'success' ||
        asRecord.outcome === 'failure' ||
        asRecord.outcome === 'start' ||
        asRecord.outcome === 'info'
          ? asRecord.outcome
          : level === 'ERROR'
            ? 'failure'
            : 'info',
      duration_ms:
        typeof asRecord.duration_ms === 'number' && Number.isFinite(asRecord.duration_ms)
          ? asRecord.duration_ms
          : undefined,
      request_id:
        typeof asRecord.request_id === 'string'
          ? asRecord.request_id
          : options.request_id || undefined,
      session_id:
        typeof asRecord.session_id === 'string'
          ? asRecord.session_id
          : options.session_id || undefined,
      user_id:
        typeof asRecord.user_id === 'string' ? asRecord.user_id : options.user_id || undefined,
      details:
        details ||
        Object.fromEntries(
          Object.entries(asRecord).filter(
            ([key]) =>
              ![
                'event_name',
                'component',
                'operation',
                'outcome',
                'duration_ms',
                'request_id',
                'session_id',
                'user_id',
                'timestamp',
              ].includes(key)
          )
        ),
      message,
    })
  }

  return createLogEvent({
    event_name: `${scriptName}.${level.toLowerCase()}`,
    component: scriptName,
    operation: 'log',
    outcome: level === 'ERROR' ? 'failure' : 'info',
    request_id: options.request_id,
    session_id: options.session_id,
    user_id: options.user_id,
    details: incoming !== undefined ? { value: incoming } : {},
    message,
  })
}

function extractRequestId(metadata: unknown): string | undefined {
  if (!isPlainObject(metadata)) return undefined
  const candidate = metadata.request_id
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined
}

/**
 * Dynamic import guard for Node-only local logging.
 * Prevents Vite bundling errors when running in browser.
 */
let writeLocalLog:
  | ((level: string, message: string, metadata?: unknown, script?: string) => Promise<void>)
  | null = null

if (typeof window === 'undefined') {
  // Running in Node (e.g., local FastAPI backend, Docker, etc.)
  // Wrapped in async IIFE to avoid top-level await (incompatible with browser build targets)
  ;(async () => {
    const { writeLocalLog: nodeLogger } = await import('./localLogger')
    writeLocalLog = nodeLogger
  })()
}

function resolveCentralizedLoggingEndpoint(): string | null {
  const explicitFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined
  if (explicitFunctionsUrl && explicitFunctionsUrl.length > 0) {
    return `${explicitFunctionsUrl.replace(/\/$/, '')}/functions/v1/centralized-logging`
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (supabaseUrl && supabaseUrl.includes('.supabase.co')) {
    return `${supabaseUrl.replace('.supabase.co', '.functions.supabase.co')}/functions/v1/centralized-logging`
  }

  return null
}

class CentralizedLogger {
  private readonly baseUrl = resolveCentralizedLoggingEndpoint()

  private async sendWithRetry(
    accessToken: string,
    payload: Record<string, unknown>,
    scriptName: string
  ): Promise<Response | null> {
    if (!this.baseUrl) {
      console.warn(
        '[CentralizedLogger] Missing VITE_SUPABASE_URL or VITE_SUPABASE_FUNCTIONS_URL; skipping remote log write.'
      )
      return null
    }

    const maxAttempts = LOG_RETRY_MAX_ATTEMPTS
    const backoffMs = LOG_RETRY_BACKOFF_MS
    let lastResponse: Response | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        })

        lastResponse = response
        if (response.ok) {
          return response
        }

        const retryable = response.status >= 500 || response.status === 429
        if (!retryable || attempt === maxAttempts) {
          return response
        }

        await sleep(backoffMs[attempt - 1] ?? backoffMs[backoffMs.length - 1] ?? 1200)
      } catch (error) {
        if (attempt === maxAttempts) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`[CentralizedLogger] Failed after retries (${scriptName}): ${message}`)
          return lastResponse
        }
        await sleep(backoffMs[attempt - 1] ?? backoffMs[backoffMs.length - 1] ?? 1200)
      }
    }

    return lastResponse
  }

  /**
   * Core log function.
   * - Always attempts Supabase logging (when session token exists)
   * - In Node.js, also writes to local file.
   */
  async log(level: LogLevel, message: string, options: LogOptions): Promise<void> {
    if (!shouldSample(level)) return
    if (isRateLimited(options.script_name, level)) return

    const structuredMetadata = normalizeStructuredMetadata(
      options.script_name,
      level,
      message,
      options
    )
    const safeMetadata = sanitizeMetadata(options.script_name, structuredMetadata)

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

      const payload = {
        script_name: options.script_name,
        log_level: level,
        message,
        metadata: safeMetadata,
        user_id: options.user_id,
        session_id: options.session_id,
        request_id: options.request_id,
      }

      const response = await this.sendWithRetry(accessToken, payload, options.script_name)

      if (!response || !response.ok) {
        const status = response?.status ?? 0
        const errorText = response ? await response.text() : 'No response after retries'
        console.error(`[CentralizedLogger] Supabase log failed: ${status} ${errorText}`)
        if (writeLocalLog) {
          writeLocalLog(
            'ERROR',
            `Supabase log failed: ${errorText}`,
            safeMetadata,
            options.script_name
          )
        }
      }
    } catch (error: unknown) {
      console.error('[CentralizedLogger] Logging exception:', error)
      if (writeLocalLog) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        writeLocalLog(
          'ERROR',
          `Supabase logging exception: ${errorMessage}`,
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
    error: (message: string, metadata?: unknown) =>
      centralizedLogger.error(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        request_id: extractRequestId(metadata),
        metadata,
      }),

    info: (message: string, metadata?: unknown) =>
      centralizedLogger.info(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        request_id: extractRequestId(metadata),
        metadata,
      }),

    debug: (message: string, metadata?: unknown) =>
      centralizedLogger.debug(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        request_id: extractRequestId(metadata),
        metadata,
      }),

    trace: (message: string, metadata?: unknown) =>
      centralizedLogger.trace(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        request_id: extractRequestId(metadata),
        metadata,
      }),

    warn: (message: string, metadata?: unknown) =>
      centralizedLogger.info(message, {
        script_name: scriptName,
        user_id: options?.userId,
        session_id: options?.sessionId,
        request_id: extractRequestId(metadata),
        metadata,
      }),
  }
}
