/**
 * UPDATE LOG
 * 2026-04-08 | P30 S1+S7 — New hook. Calls the linkedin-profile-ingest edge function,
 *   chains into usePrepareLinkedinImport for deduplication against existing user data,
 *   maps scraper error codes to user-friendly messages, and surfaces the profile About
 *   text for display in the HITL review modal.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { usePrepareLinkedinImport } from '@/hooks/useLinkedinImportPreparation'
import type { LinkedinImportMergeResult } from '@/utils/linkedin-import-merge'

// ─── Error mapping ────────────────────────────────────────────────────────────

function mapErrorToMessage(code: string, status: number): string {
  if (
    code === 'MISSING_PLAYWRIGHT_ENV' ||
    code === 'CONFIG_ERROR' ||
    code === 'MISSING_OPENAI_API_KEY' ||
    code === 'MISSING_SUPABASE_ENV'
  ) {
    return 'LinkedIn import is temporarily unavailable. Please try again later.'
  }
  if (code === 'VERIFICATION_REQUIRED') {
    return 'LinkedIn requires manual verification. Try logging in to LinkedIn in a browser, then retry.'
  }
  if (status === 429 || code === 'RATE_LIMITED') {
    return 'LinkedIn is rate-limiting requests. Please try again in a few minutes.'
  }
  if (status === 400 || code === 'INVALID_URL' || code === 'PLAYWRIGHT_BAD_RESPONSE') {
    return 'Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/yourname).'
  }
  return 'LinkedIn import failed. Please try again.'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScrapeResult {
  mergeResult: LinkedinImportMergeResult
  importDate: string
  about: string | null
}

export interface UseLinkedinScrapeResult {
  scrape: (linkedinUrl: string) => void
  isPending: boolean
  error: string | null
  mergeResult: LinkedinImportMergeResult | null
  importDate: string | null
  about: string | null
  reset: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Triggers a full LinkedIn profile scrape → HITL review preparation flow.
 *
 * 1. Calls `linkedin-profile-ingest` edge function with the given URL.
 * 2. Chains the normalized preview into `usePrepareLinkedinImport` for
 *    deduplication against the user's existing skill data.
 * 3. Returns the merge result, import date, and About text for display
 *    in `ProfileImportReviewModal`.
 *
 * Error codes from the edge function are mapped to user-friendly messages.
 */
export function useLinkedinScrape(): UseLinkedinScrapeResult {
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)

  const prepareMutation = usePrepareLinkedinImport()

  const { mutate: runScrape, isPending: isScraping } = useMutation({
    mutationFn: async (linkedinUrl: string): Promise<ScrapeResult> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const supabaseUrl = (supabase as any).supabaseUrl as string
      const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')

      const response = await fetch(`${functionsUrl}/functions/v1/linkedin-profile-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ linkedin_url: linkedinUrl }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        const code: string = payload.code ?? ''
        throw new Error(mapErrorToMessage(code, response.status))
      }

      // Use the import_date stamped by the LLM normalization step
      const importDate: string =
        payload.normalized_preview?.normalized_skills?.[0]?.import_date ?? new Date().toISOString()

      // Deduplicate against existing user skills/experiences
      const mergeResult = await prepareMutation.mutateAsync({
        preview: payload.normalized_preview,
        importDate,
      })

      return {
        mergeResult,
        importDate,
        about: typeof payload.about === 'string' ? payload.about : null,
      }
    },
    onSuccess: (data) => {
      setScrapeError(null)
      setResult(data)
    },
    onError: (error: Error) => {
      setScrapeError(error.message)
    },
  })

  const scrape = (linkedinUrl: string) => {
    setScrapeError(null)
    runScrape(linkedinUrl)
  }

  const reset = () => {
    setResult(null)
    setScrapeError(null)
  }

  return {
    scrape,
    isPending: isScraping || prepareMutation.isPending,
    error: scrapeError,
    mergeResult: result?.mergeResult ?? null,
    importDate: result?.importDate ?? null,
    about: result?.about ?? null,
    reset,
  }
}
