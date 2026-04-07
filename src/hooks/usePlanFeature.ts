/**
 * UPDATE LOG
 * 2026-04-02 00:00:00 | Gap 3 — Feature gating hook. Returns the current user's plan
 * 2026-04-05 21:30:00 | P26 S4-2 — Add 'gap_analysis' PlanFeatureKey (Pro+).
 *   and a hasFeature() utility for gating UI capabilities by tier.
 * 2026-04-07 00:00:00 | P28 S3 — Add 'profile_fit' (Pro+) and
 *   'profile_fit_reconciliation' (Max+) feature keys.
 *   Currently defaults to 'free' for all users — real subscription lookup
 *   will be wired in when P22 (Billing Infrastructure) ships.
 *   Hook interface is stable; callers do not need to change when P22 adds real data.
 * 2026-04-07 12:00:00 | Story 4 — Wire plan_override from profiles table and
 *   live feature flags from sats_feature_flags via useFeatureFlags().
 *   Falls back to hardcoded PLAN_FEATURES if flags not loaded or errored.
 * 2026-04-07 18:30:00 | ATSDebugModal redesign — add 'ats_score_breakdown' PlanFeatureKey (Pro+).
 */

// ---------------------------------------------------------------------------
// Feature key registry — every gated capability gets a key here.
// When adding a new gated feature, add its key and update PLAN_FEATURES below.
// ---------------------------------------------------------------------------

export type PlanFeatureKey =
  | 'skill_reclassify' // "Explain" re-classification flow in SkillClassificationReview (Pro+)
  | 'skill_reclassify_all' // "Re-classify all" in SkillProfileManager (Pro+)
  | 'proactive_matching' // Proactive job discovery (/opportunities) (Pro+)
  | 'linkedin_import' // LinkedIn profile import (Pro+)
  | 'cv_optimisation' // CV Optimisation second-pass score (Pro+)
  | 'ai_roadmap' // AI upskilling roadmaps (Pro+)
  | 'ats_analysis_unlimited' // Unlimited ATS analyses (Pro+; Free is limited to 5/mo)
  | 'gap_analysis' // Gap Analysis engine — market frequency vs. profile (Pro+)
  | 'profile_fit' // Profile Fit Analyzer — fit score + gap breakdown (Pro+)
  | 'profile_fit_reconciliation' // Profile vs resume conflict detection (Max+)
  | 'ats_score_breakdown' // ATS score sub-dimension breakdown (Pro+)
  | 'byok' // Bring your own API key (Max+)
  | 'model_selection' // Custom model selection (Max+)

export type PlanTier = 'free' | 'pro' | 'max' | 'enterprise'

// ---------------------------------------------------------------------------
// Capability map — which tiers unlock each feature.
// Order matters: listed tiers all have access; unlisted tiers do not.
// This is the hardcoded fallback used when the DB flags are not yet loaded.
// ---------------------------------------------------------------------------

export const PLAN_FEATURES: Record<PlanFeatureKey, PlanTier[]> = {
  skill_reclassify: ['pro', 'max', 'enterprise'],
  skill_reclassify_all: ['pro', 'max', 'enterprise'],
  proactive_matching: ['pro', 'max', 'enterprise'],
  linkedin_import: ['pro', 'max', 'enterprise'],
  cv_optimisation: ['pro', 'max', 'enterprise'],
  ai_roadmap: ['pro', 'max', 'enterprise'],
  ats_analysis_unlimited: ['pro', 'max', 'enterprise'],
  gap_analysis: ['pro', 'max', 'enterprise'],
  profile_fit: ['pro', 'max', 'enterprise'],
  profile_fit_reconciliation: ['max', 'enterprise'],
  ats_score_breakdown: ['pro', 'max', 'enterprise'],
  byok: ['max', 'enterprise'],
  model_selection: ['max', 'enterprise'],
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

export interface UsePlanFeatureResult {
  /** The user's current effective plan tier. */
  plan: PlanTier
  /** True while the subscription or flags are being fetched. */
  isLoading: boolean
  /**
   * Returns true if the user's plan includes the given feature.
   * Always returns false while isLoading is true to avoid premature access.
   */
  hasFeature: (key: PlanFeatureKey) => boolean
}

/**
 * Returns the current user's effective plan tier and a hasFeature() utility for
 * gating UI capabilities.
 *
 * Plan resolution order:
 *   1. profiles.plan_override (admin-set, per-user elevation)
 *   2. 'free' (default until P22 Billing ships)
 *
 * Feature flag resolution:
 *   1. sats_feature_flags table (live, admin-editable)
 *   2. Falls back to hardcoded PLAN_FEATURES if flags not loaded or errored.
 */
export function usePlanFeature(): UsePlanFeatureResult {
  const { user } = useAuth()

  // Fetch the user's plan_override from their profile row
  const { data: profileRow, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-plan-override', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_override')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch live feature flags
  const { flagMap, isLoading: flagsLoading, isError: flagsError } = useFeatureFlags()

  // Resolve effective plan tier
  const plan: PlanTier = (profileRow?.plan_override as PlanTier | null | undefined) ?? 'free'

  const isLoading = profileLoading || flagsLoading

  const hasFeature = (key: PlanFeatureKey): boolean => {
    if (isLoading) return false

    // Use live DB flags if loaded without error
    if (!flagsError && flagMap.size > 0) {
      const allowedTiers = flagMap.get(key)
      return allowedTiers ? allowedTiers.has(plan) : false
    }

    // Fallback: hardcoded PLAN_FEATURES
    const allowedTiers = PLAN_FEATURES[key]
    return allowedTiers.includes(plan)
  }

  return { plan, isLoading, hasFeature }
}
