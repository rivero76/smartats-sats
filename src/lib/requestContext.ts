/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added shared request correlation and timing utilities.
 */

export function createRequestId(prefix = 'req'): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return `${prefix}-${randomPart}`
}

export function getDurationMs(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs)
}
