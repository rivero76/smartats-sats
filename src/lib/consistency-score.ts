/**
 * UPDATE LOG
 * 2026-04-08 | P30 S5 — New utility. Computes a 0–100 Consistency Score from a
 *   ReconciliationConflict array. Penalty: HIGH=-25, MEDIUM=-12, LOW=-5. Floor at 0.
 *   100 = perfectly consistent (no conflicts).
 */

import type { ReconciliationConflict } from '@/hooks/useProfileFit'

const SEVERITY_PENALTY: Record<ReconciliationConflict['severity'], number> = {
  HIGH: 25,
  MEDIUM: 12,
  LOW: 5,
}

/**
 * Computes a 0–100 Consistency Score from a list of reconciliation conflicts.
 *
 * Scoring:
 *   - Start at 100
 *   - HIGH conflict:   -25 pts
 *   - MEDIUM conflict: -12 pts
 *   - LOW conflict:    -5 pts
 *   - Floor at 0
 */
export function computeConsistencyScore(conflicts: ReconciliationConflict[]): number {
  const penalty = conflicts.reduce((sum, c) => sum + (SEVERITY_PENALTY[c.severity] ?? 0), 0)
  return Math.max(0, 100 - penalty)
}
