/**
 * UPDATE LOG
 * 2026-04-08 | P30 S6 — Unit tests for parseLinkedinImportDate helper.
 */
import { describe, expect, it } from 'vitest'
import { parseLinkedinImportDate } from '@/hooks/useLinkedinImportAge'

describe('parseLinkedinImportDate', () => {
  it('extracts a valid ISO date from a notes string', () => {
    const notes = 'React skills [imported from LinkedIn 2026-01-15T10:30:00.000Z]'
    const result = parseLinkedinImportDate(notes)
    expect(result).toBeInstanceOf(Date)
    expect(result!.toISOString()).toBe('2026-01-15T10:30:00.000Z')
  })

  it('returns null when the pattern is not present', () => {
    const notes = 'Manually added skill'
    expect(parseLinkedinImportDate(notes)).toBeNull()
  })

  it('returns null for an invalid date inside the pattern', () => {
    const notes = '[imported from LinkedIn not-a-date]'
    expect(parseLinkedinImportDate(notes)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseLinkedinImportDate('')).toBeNull()
  })
})
