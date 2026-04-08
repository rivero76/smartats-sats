/**
 * UPDATE LOG
 * 2026-04-08 | fix — Use profiles FK name for PostgREST join (was auth.users FK which PostgREST cannot traverse).
 * 2026-04-08 | P29 — TanStack Query hooks for the admin Upgrade Requests panel.
 *   useUpgradeRequests: fetches all requests joined with profiles (name + email).
 *   useApproveUpgradeRequest: calls sats_approve_upgrade_request() RPC (atomic).
 *   useDenyUpgradeRequest: direct UPDATE to sats_upgrade_requests.status = 'denied'.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpgradeRequestStatus = 'pending' | 'approved' | 'denied'

export interface UpgradeRequestRow {
  id: string
  user_id: string
  requested_tier: string
  current_tier: string
  status: UpgradeRequestStatus
  created_at: string
  updated_at: string
  full_name: string | null
  email: string | null
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const UPGRADE_REQUESTS_QUERY_KEY = ['admin-upgrade-requests'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchUpgradeRequests(): Promise<UpgradeRequestRow[]> {
  const { data, error } = await supabase
    .from('sats_upgrade_requests')
    .select(
      `
      id,
      user_id,
      requested_tier,
      current_tier,
      status,
      created_at,
      updated_at,
      profiles!sats_upgrade_requests_user_id_profiles_fkey (full_name, email)
    `
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    requested_tier: row.requested_tier,
    current_tier: row.current_tier,
    status: row.status as UpgradeRequestStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    full_name: row.profiles?.full_name ?? null,
    email: row.profiles?.email ?? null,
  }))
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useUpgradeRequests() {
  return useQuery({
    queryKey: UPGRADE_REQUESTS_QUERY_KEY,
    queryFn: fetchUpgradeRequests,
  })
}

export function useApproveUpgradeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('sats_approve_upgrade_request', {
        p_request_id: requestId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UPGRADE_REQUESTS_QUERY_KEY })
      // Also invalidate per-user plan data so the approved user sees the change
      queryClient.invalidateQueries({ queryKey: ['profile-plan-override'] })
      toast.success('Request approved. Plan tier updated.')
    },
    onError: (err: Error) => {
      console.error('Approve upgrade request error:', err)
      toast.error('Failed to approve request. Please try again.')
    },
  })
}

export function useDenyUpgradeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('sats_upgrade_requests')
        .update({ status: 'denied' })
        .eq('id', requestId)
        .eq('status', 'pending') // guard: only deny pending requests
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UPGRADE_REQUESTS_QUERY_KEY })
      toast.success('Request denied.')
    },
    onError: (err: Error) => {
      console.error('Deny upgrade request error:', err)
      toast.error('Failed to deny request. Please try again.')
    },
  })
}
