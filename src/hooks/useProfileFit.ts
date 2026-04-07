/**
 * UPDATE LOG
 * 2026-04-07 00:00:00 | P28 S3 — useProfileFit hook. TanStack Query hook for
 *   Profile Fit Analyzer feature. Exposes useProfileFitHistory (query) and
 *   useRunProfileFit (mutation). Tier gating enforced before edge function call.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { usePlanFeature } from '@/hooks/usePlanFeature'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileFitGapItem {
  signal_value: string
  signal_type: string
  priority_tier: 'critical' | 'important' | 'nice_to_have'
  candidate_status: 'missing' | 'in_progress' | 'held'
  recommended_action: string
  estimated_weeks_to_close: number | null
  frequency_pct?: number
}

export interface ReconciliationConflict {
  field: string
  linkedin_value: string
  resume_value: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface ProfileFitReport {
  id: string
  user_id: string
  target_role_family_id: string
  target_market_code: string
  fit_score: number
  score_rationale: string | null
  gap_items: ProfileFitGapItem[]
  reconciliation_conflicts: ReconciliationConflict[] | null
  model_used: string | null
  cost_estimate_usd: number | null
  created_at: string
}

export interface RunProfileFitParams {
  targetRoleFamilyId: string
  targetMarketCode: string
  resumeId?: string
}

export interface RunProfileFitResponse {
  report_id: string
  fit_score: number
  score_rationale: string
  gap_items: ProfileFitGapItem[]
  reconciliation_conflicts: ReconciliationConflict[] | null
  duration_ms: number
}

export class PlanGateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanGateError'
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches all Profile Fit reports for the current user, ordered newest first.
 */
export const useProfileFitHistory = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile-fit-history', user?.id],
    queryFn: async (): Promise<ProfileFitReport[]> => {
      if (!user) return []

      const { data, error } = await supabase
        .from('sats_profile_fit_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as ProfileFitReport[]
    },
    enabled: !!user,
  })
}

/**
 * Mutation that triggers a new profile fit analysis via the analyze-profile-fit
 * edge function. Throws PlanGateError before the network call if the user's plan
 * does not include 'profile_fit'. Invalidates profile-fit-history on success.
 */
export const useRunProfileFit = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { hasFeature } = usePlanFeature()

  return useMutation({
    mutationFn: async (params: RunProfileFitParams): Promise<RunProfileFitResponse> => {
      if (!hasFeature('profile_fit')) {
        throw new PlanGateError('Profile Fit Analyzer requires a Pro plan or above.')
      }

      if (!user) throw new Error('Not authenticated')

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('No active session')

      const supabaseUrl = (supabase as any).supabaseUrl as string
      const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')

      const response = await fetch(`${functionsUrl}/functions/v1/analyze-profile-fit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_role_family_id: params.targetRoleFamilyId,
          target_market_code: params.targetMarketCode,
          resume_id: params.resumeId,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        if (payload.error === 'no_market_signals') {
          throw new Error('no_market_signals')
        }
        throw new Error(payload.error || `Profile fit analysis failed (${response.status})`)
      }

      return payload.data as RunProfileFitResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-fit-history', user?.id] })
      toast({
        title: 'Profile fit analysis complete',
        description: 'Your fit score has been updated.',
      })
    },
    onError: (error: Error) => {
      if (error instanceof PlanGateError) {
        toast({
          variant: 'destructive',
          title: 'Pro plan required',
          description: error.message,
        })
        return
      }
      const isNoData = error.message === 'no_market_signals'
      toast({
        variant: 'destructive',
        title: isNoData ? 'No market data yet' : 'Analysis failed',
        description: isNoData
          ? 'Connect your job alert emails in Settings to start ingesting real job postings.'
          : error.message,
      })
    },
  })
}
