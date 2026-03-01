/**
 * UPDATE LOG
 * 2026-03-01 00:00:00 | P16 Story 0: Extract shared CORS helpers from all LLM edge functions
 */

const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:8080'

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') || DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
)

/**
 * Returns true if the origin is permitted by the ALLOWED_ORIGINS env var.
 * A null origin (non-browser or same-origin) is always allowed.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true
  return ALLOWED_ORIGINS.has('*') || ALLOWED_ORIGINS.has(origin)
}

/**
 * Returns the CORS response headers for the given request origin.
 * The `Access-Control-Allow-Origin` header echoes the origin if it is
 * permitted, or 'null' if it is not.
 */
export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.has('*')
    ? '*'
    : origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'null'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}
