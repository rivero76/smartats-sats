/**
 * UPDATE LOG
 * 2026-04-07 11:30:00 | Story 3 — New hook: queries sats_feature_flags table and
 *   returns a Map<PlanFeatureKey, Set<PlanTier>> for dynamic feature gating.
 *   Used by usePlanFeature as the live source of truth (falls back to PLAN_FEATURES).
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { PlanFeatureKey, PlanTier } from '@/hooks/usePlanFeature'

export const FEATURE_FLAGS_QUERY_KEY = ['sats-feature-flags'] as const

interface FeatureFlagRow {
  feature_key: string
  plan_tier: string
  is_enabled: boolean
}

export interface UseFeatureFlagsResult {
  flagMap: Map<PlanFeatureKey, Set<PlanTier>>
  isLoading: boolean
  isError: boolean
}

/**
 * Fetches the sats_feature_flags table and builds a Map from feature key to the
 * set of plan tiers for which it is enabled.
 *
 * staleTime: 5 minutes — flags change rarely and are safe to cache.
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: async (): Promise<FeatureFlagRow[]> => {
      const { data, error } = await supabase
        .from('sats_feature_flags')
        .select('feature_key, plan_tier, is_enabled')
        .eq('is_enabled', true)

      if (error) throw error
      return (data ?? []) as FeatureFlagRow[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const flagMap = new Map<PlanFeatureKey, Set<PlanTier>>()
  if (data) {
    for (const row of data) {
      const key = row.feature_key as PlanFeatureKey
      const tier = row.plan_tier as PlanTier
      if (!flagMap.has(key)) {
        flagMap.set(key, new Set<PlanTier>())
      }
      flagMap.get(key)!.add(tier)
    }
  }

  return { flagMap, isLoading, isError }
}
