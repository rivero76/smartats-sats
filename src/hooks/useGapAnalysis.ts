/**
 * UPDATE LOG
 * 2026-04-05 21:30:00 | P26 S4-2 — TanStack Query hook for gap analysis.
 *   useLatestGapSnapshot: reads the most recent gap snapshot + items for a
 *   given (role_family_id, market_code). useRefreshGapMatrix: mutation that
 *   calls the generate-gap-matrix edge function and invalidates the snapshot
 *   query on success.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GapSnapshot {
  id: string
  user_id: string
  role_family_id: string
  market_code: string
  snapshot_date: string
  overall_gap_score: number
  critical_gap_count: number
  important_gap_count: number
  nice_to_have_gap_count: number
  market_signals_window_end: string | null
  created_at: string
}

export interface GapItem {
  id: string
  snapshot_id: string
  signal_type: string
  signal_value: string
  frequency_pct: number
  priority_tier: 'critical' | 'important' | 'nice_to_have'
  candidate_status: 'missing' | 'in_progress' | 'held'
  recommended_action: string | null
  estimated_weeks_to_close: number | null
  resume_language_template: string | null
  created_at: string
}

export interface GapAnalysisResult {
  snapshot: GapSnapshot | null
  items: GapItem[]
}

export interface RefreshGapMatrixResponse {
  snapshot_id: string
  critical_gap_count: number
  important_gap_count: number
  nice_to_have_gap_count: number
  overall_gap_score: number
  market_signals_date: string
  duration_ms: number
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useLatestGapSnapshot = (roleFamilyId: string | null, marketCode: string | null) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['gap-analysis', user?.id, roleFamilyId, marketCode],
    queryFn: async (): Promise<GapAnalysisResult> => {
      if (!user || !roleFamilyId || !marketCode) {
        return { snapshot: null, items: [] }
      }

      // Fetch the latest snapshot for this user/role/market
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('sats_gap_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('role_family_id', roleFamilyId)
        .eq('market_code', marketCode)
        .is('deleted_at', null)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (snapshotError) throw snapshotError
      if (!snapshotData) return { snapshot: null, items: [] }

      const snapshot = snapshotData as unknown as GapSnapshot

      // Fetch all items for this snapshot
      const { data: itemsData, error: itemsError } = await supabase
        .from('sats_gap_items')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .eq('user_id', user.id)
        .order('frequency_pct', { ascending: false })

      if (itemsError) throw itemsError

      return {
        snapshot,
        items: (itemsData ?? []) as unknown as GapItem[],
      }
    },
    enabled: !!user && !!roleFamilyId && !!marketCode,
  })
}

export const useRefreshGapMatrix = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      roleFamilyId,
      marketCode,
    }: {
      roleFamilyId: string
      marketCode: string
    }): Promise<RefreshGapMatrixResponse> => {
      if (!user) throw new Error('Not authenticated')

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('No active session')

      const supabaseUrl = (supabase as any).supabaseUrl as string
      const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')

      const response = await fetch(`${functionsUrl}/functions/v1/generate-gap-matrix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role_family_id: roleFamilyId, market_code: marketCode }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Gap matrix generation failed (${response.status})`)
      }

      return payload.data as RefreshGapMatrixResponse
    },
    onSuccess: (data, variables) => {
      // Invalidate the snapshot query so the page refetches updated data
      queryClient.invalidateQueries({
        queryKey: ['gap-analysis', user?.id, variables.roleFamilyId, variables.marketCode],
      })
      toast({
        title: 'Gap analysis refreshed',
        description: `Found ${data.critical_gap_count} critical and ${data.important_gap_count} important gaps.`,
      })
    },
    onError: (error: Error) => {
      const isNoData = error.message.includes('No market signals')
      toast({
        variant: 'destructive',
        title: isNoData ? 'No market data yet' : 'Gap analysis failed',
        description: isNoData
          ? 'Connect your job alert emails in Settings to start ingesting real job postings.'
          : error.message,
      })
    },
  })
}
