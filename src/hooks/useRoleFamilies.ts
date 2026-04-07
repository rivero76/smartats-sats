/**
 * UPDATE LOG
 * 2026-04-05 20:30:00 | P26 S3-2 — TanStack Query hook for sats_role_families.
 *   Returns the curated role family list for the Career Goals Settings card and
 *   other downstream UI (e.g. Gap Matrix role selector). Public SELECT — no auth
 *   required; authenticated users inherit the same access via RLS.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface RoleFamily {
  id: string
  name: string
  description: string | null
  aliases: string[]
  market_codes: string[]
}

export const useRoleFamilies = () => {
  return useQuery({
    queryKey: ['role-families'],
    queryFn: async (): Promise<RoleFamily[]> => {
      const { data, error } = await supabase
        .from('sats_role_families')
        .select('id, name, description, aliases, market_codes')
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []) as RoleFamily[]
    },
    // Role families are static reference data — cache for 30 minutes
    staleTime: 30 * 60 * 1000,
  })
}
