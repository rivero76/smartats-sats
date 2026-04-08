/**
 * UPDATE LOG
 * 2026-04-08 | P30 S6 — New hook. Queries sats_user_skills for the most recent LinkedIn
 *   import date. Parses the date from the `notes` column pattern
 *   "[imported from LinkedIn {ISO date}]", falls back to row created_at.
 *   Returns { daysSinceImport, isStale, isLoading } where isStale = true when > 30 days.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

// ─── Pure helper (exported for unit tests) ────────────────────────────────────

const IMPORT_DATE_PATTERN = /\[imported from LinkedIn ([^\]]+)\]/

/**
 * Extracts the import date from a sats_user_skills `notes` column value.
 * Returns null if the pattern is not found or the extracted string is not a valid date.
 */
export function parseLinkedinImportDate(notes: string): Date | null {
  if (!notes) return null
  const match = IMPORT_DATE_PATTERN.exec(notes)
  if (!match) return null
  const candidate = new Date(match[1])
  return isNaN(candidate.getTime()) ? null : candidate
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseLinkedinImportAgeResult {
  /** Days since the most recent LinkedIn import, or null if no import exists. */
  daysSinceImport: number | null
  /** True when daysSinceImport > 30. */
  isStale: boolean
  isLoading: boolean
}

/**
 * Returns the age (in days) of the user's most recent LinkedIn import and whether
 * it is considered stale (> 30 days old). Used to prompt re-import on Settings and
 * Profile Fit pages.
 */
export function useLinkedinImportAge(): UseLinkedinImportAgeResult {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['linkedin-import-age', user?.id],
    queryFn: async (): Promise<number | null> => {
      if (!user) return null

      const { data: rows, error } = await supabase
        .from('sats_user_skills')
        .select('notes, created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50) // scan recent rows for the pattern

      if (error) throw error
      if (!rows || rows.length === 0) return null

      // Find the most recent row that has a LinkedIn import note
      for (const row of rows) {
        const notes = row.notes ? String(row.notes) : ''
        if (!notes.includes('imported from LinkedIn')) continue

        // Try parsing from notes first, fall back to created_at
        const fromNotes = parseLinkedinImportDate(notes)
        const importDate = fromNotes ?? new Date(row.created_at)
        const days = Math.floor((Date.now() - importDate.getTime()) / 86_400_000)
        return days
      }

      return null
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  const daysSinceImport = data ?? null

  return {
    daysSinceImport,
    isStale: daysSinceImport !== null && daysSinceImport > 30,
    isLoading,
  }
}
