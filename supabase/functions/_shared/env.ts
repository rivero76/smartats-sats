/**
 * UPDATE LOG
 * 2026-03-01 00:00:00 | P16 Story 0: Extract shared env-parsing utilities from all four LLM edge functions
 */

/**
 * Read an environment variable and parse it as a finite number.
 * Returns `fallback` if the variable is unset or not a valid finite number.
 */
export function getEnvNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Read an environment variable and parse it as a boolean.
 * Accepts: true/false, 1/0, yes/no, y/n, on/off (case-insensitive).
 * Returns `fallback` if unset or unrecognised.
 */
export function getEnvBoolean(name: string, fallback: boolean): boolean {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}
