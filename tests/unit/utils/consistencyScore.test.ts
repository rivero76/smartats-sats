/**
 * UPDATE LOG
 * 2026-04-08 | P30 S5 — Unit tests for computeConsistencyScore utility.
 */
import { describe, expect, it } from 'vitest'
import { computeConsistencyScore } from '@/lib/consistency-score'
import type { ReconciliationConflict } from '@/hooks/useProfileFit'

function conflict(severity: ReconciliationConflict['severity']): ReconciliationConflict {
  return { field: 'job_title', linkedin_value: 'A', resume_value: 'B', severity }
}

describe('computeConsistencyScore', () => {
  it('returns 100 for empty conflicts array', () => {
    expect(computeConsistencyScore([])).toBe(100)
  })

  it('returns 75 for one HIGH conflict', () => {
    expect(computeConsistencyScore([conflict('HIGH')])).toBe(75)
  })

  it('returns 88 for one MEDIUM conflict', () => {
    expect(computeConsistencyScore([conflict('MEDIUM')])).toBe(88)
  })

  it('returns 95 for one LOW conflict', () => {
    expect(computeConsistencyScore([conflict('LOW')])).toBe(95)
  })

  it('returns 50 for two HIGH conflicts', () => {
    expect(computeConsistencyScore([conflict('HIGH'), conflict('HIGH')])).toBe(50)
  })

  it('floors at 0 when penalties exceed 100', () => {
    const manyHigh = Array.from({ length: 5 }, () => conflict('HIGH'))
    expect(computeConsistencyScore(manyHigh)).toBe(0)
  })

  it('returns 58 for mixed HIGH + MEDIUM + LOW', () => {
    // 100 - 25 - 12 - 5 = 58
    expect(computeConsistencyScore([conflict('HIGH'), conflict('MEDIUM'), conflict('LOW')])).toBe(
      58
    )
  })
})
