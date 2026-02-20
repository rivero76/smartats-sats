/**
 * UPDATE LOG
 * 2026-02-20 23:22:57 | P1: Added request validation, payload size limits, and structured metadata normalization.
 * 2026-02-20 23:29:40 | P3: Added metadata/message truncation controls for oversized logging payloads.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_LEVELS = ['ERROR', 'INFO', 'DEBUG', 'TRACE'] as const
const MAX_SCRIPT_NAME_LENGTH = 120
const MAX_MESSAGE_ACCEPT_LENGTH = 50_000
const MAX_MESSAGE_STORE_LENGTH = 5000
const MAX_METADATA_BYTES = 16 * 1024

interface LogRequest {
  script_name: string
  log_level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE'
  message: string
  metadata?: Record<string, unknown>
  user_id?: string
  session_id?: string
  request_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const logRequest: LogRequest = await req.json()

    const validationError = validateLogRequest(logRequest)
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const normalizedMetadata = normalizeStructuredMetadata(logRequest)
    const boundedMetadata = enforceMetadataBudget(normalizedMetadata)
    const boundedMessage = truncateMessage(logRequest.message)

    // Check if logging is enabled for this script
    const { data: logSettings, error: settingsError } = await supabase
      .from('log_settings')
      .select('logging_enabled, debug_enabled, trace_enabled, log_level')
      .eq('script_name', logRequest.script_name)
      .single()

    if (settingsError) {
      console.error('Failed to fetch log settings:', settingsError)
      // If no settings found, default to disabled
      return new Response(
        JSON.stringify({ success: true, message: 'Logging disabled for script' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if logging is enabled and meets level requirements
    const shouldLog = checkLogLevel(logSettings, logRequest.log_level)

    if (!shouldLog) {
      return new Response(JSON.stringify({ success: true, message: 'Log level disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert log entry
    const { error: insertError } = await supabase.from('log_entries').insert({
      script_name: logRequest.script_name,
      log_level: logRequest.log_level,
      message: boundedMessage,
      metadata: boundedMetadata,
      user_id: logRequest.user_id,
      session_id: logRequest.session_id,
      request_id:
        logRequest.request_id ||
        (typeof boundedMetadata.request_id === 'string' ? boundedMetadata.request_id : null),
      timestamp: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Failed to insert log entry:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to insert log entry' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Log entry created' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Centralized logging error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process log request',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function checkLogLevel(
  settings: {
    logging_enabled: boolean
    debug_enabled: boolean
    trace_enabled: boolean
    log_level: string
  },
  requestLevel: string
): boolean {
  // Check if general logging is enabled
  if (!settings.logging_enabled) {
    return false
  }

  // Check specific toggles
  if (requestLevel === 'DEBUG' && !settings.debug_enabled) {
    return false
  }

  if (requestLevel === 'TRACE' && !settings.trace_enabled) {
    return false
  }

  // Check log level hierarchy
  const levelHierarchy = ['OFF', 'ERROR', 'INFO', 'DEBUG', 'TRACE']
  const settingsLevelIndex = levelHierarchy.indexOf(settings.log_level)
  const requestLevelIndex = levelHierarchy.indexOf(requestLevel)

  // If settings is OFF, don't log anything
  if (settingsLevelIndex === 0) {
    return false
  }

  // Only log if request level is at or above settings level
  return requestLevelIndex <= settingsLevelIndex && requestLevelIndex > 0
}

function validateLogRequest(logRequest: Partial<LogRequest>): string | null {
  if (!logRequest.script_name || !logRequest.log_level || !logRequest.message) {
    return 'Missing required fields: script_name, log_level, message'
  }

  if (logRequest.script_name.length > MAX_SCRIPT_NAME_LENGTH) {
    return `script_name exceeds max length (${MAX_SCRIPT_NAME_LENGTH})`
  }

  if (!ALLOWED_LEVELS.includes(logRequest.log_level)) {
    return `Invalid log_level. Allowed values: ${ALLOWED_LEVELS.join(', ')}`
  }

  if (logRequest.message.length > MAX_MESSAGE_ACCEPT_LENGTH) {
    return `message exceeds max accepted length (${MAX_MESSAGE_ACCEPT_LENGTH})`
  }

  if (logRequest.metadata && typeof logRequest.metadata !== 'object') {
    return 'metadata must be an object'
  }

  return null
}

function normalizeStructuredMetadata(logRequest: LogRequest): Record<string, unknown> {
  const metadata = logRequest.metadata && typeof logRequest.metadata === 'object' ? logRequest.metadata : {}
  const outcomeFromLevel = logRequest.log_level === 'ERROR' ? 'failure' : 'info'

  return {
    event_name:
      typeof metadata.event_name === 'string' && metadata.event_name.length > 0
        ? metadata.event_name
        : `${logRequest.script_name}.${String(logRequest.log_level).toLowerCase()}`,
    component:
      typeof metadata.component === 'string' && metadata.component.length > 0
        ? metadata.component
        : logRequest.script_name,
    operation:
      typeof metadata.operation === 'string' && metadata.operation.length > 0
        ? metadata.operation
        : 'log',
    outcome:
      metadata.outcome === 'success' ||
      metadata.outcome === 'failure' ||
      metadata.outcome === 'start' ||
      metadata.outcome === 'info'
        ? metadata.outcome
        : outcomeFromLevel,
    duration_ms:
      typeof metadata.duration_ms === 'number' && Number.isFinite(metadata.duration_ms)
        ? metadata.duration_ms
        : null,
    request_id:
      typeof metadata.request_id === 'string'
        ? metadata.request_id
        : logRequest.request_id || null,
    session_id:
      typeof metadata.session_id === 'string'
        ? metadata.session_id
        : logRequest.session_id || null,
    user_id:
      typeof metadata.user_id === 'string' ? metadata.user_id : logRequest.user_id || null,
    details: metadata.details && typeof metadata.details === 'object' ? metadata.details : metadata,
    timestamp: typeof metadata.timestamp === 'string' ? metadata.timestamp : new Date().toISOString(),
  }
}

function truncateMessage(message: string): string {
  if (message.length <= MAX_MESSAGE_STORE_LENGTH) {
    return message
  }
  return `${message.slice(0, MAX_MESSAGE_STORE_LENGTH)}...[truncated:${message.length - MAX_MESSAGE_STORE_LENGTH} chars]`
}

function getPayloadBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

function truncateUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated:depth]'
  if (typeof value === 'string') return value.length > 1024 ? `${value.slice(0, 1024)}...[truncated]` : value
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => truncateUnknown(item, depth + 1))
  if (typeof value !== 'object' || value === null) return value

  const entries = Object.entries(value as Record<string, unknown>).slice(0, 60)
  const reduced: Record<string, unknown> = {}
  for (const [key, entry] of entries) {
    reduced[key] = truncateUnknown(entry, depth + 1)
  }
  return reduced
}

function enforceMetadataBudget(metadata: Record<string, unknown>): Record<string, unknown> {
  if (getPayloadBytes(metadata) <= MAX_METADATA_BYTES) return metadata

  const truncated = truncateUnknown(metadata)
  if (typeof truncated === 'object' && truncated !== null && getPayloadBytes(truncated) <= MAX_METADATA_BYTES) {
    return truncated as Record<string, unknown>
  }

  return {
    event_name: 'logging.metadata_truncated',
    component: 'centralized-logging',
    operation: 'enforce_budget',
    outcome: 'info',
    details: {
      reason: 'metadata_budget_exceeded',
      max_bytes: MAX_METADATA_BYTES,
    },
    timestamp: new Date().toISOString(),
  }
}
