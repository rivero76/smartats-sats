/**
 * UPDATE LOG
 * 2026-04-02 00:00:00 | Gap 3 — Feature gating hook. Returns the current user's plan
 * 2026-04-05 21:30:00 | P26 S4-2 — Add 'gap_analysis' PlanFeatureKey (Pro+).
 *   and a hasFeature() utility for gating UI capabilities by tier.
 *   Currently defaults to 'free' for all users — real subscription lookup
 *   will be wired in when P22 (Billing Infrastructure) ships.
 *   Hook interface is stable; callers do not need to change when P22 adds real data.
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
  | 'byok' // Bring your own API key (Max+)
  | 'model_selection' // Custom model selection (Max+)

export type PlanTier = 'free' | 'pro' | 'max' | 'enterprise'

// ---------------------------------------------------------------------------
// Capability map — which tiers unlock each feature.
// Order matters: listed tiers all have access; unlisted tiers do not.
// ---------------------------------------------------------------------------

const PLAN_FEATURES: Record<PlanFeatureKey, PlanTier[]> = {
  skill_reclassify: ['pro', 'max', 'enterprise'],
  skill_reclassify_all: ['pro', 'max', 'enterprise'],
  proactive_matching: ['pro', 'max', 'enterprise'],
  linkedin_import: ['pro', 'max', 'enterprise'],
  cv_optimisation: ['pro', 'max', 'enterprise'],
  ai_roadmap: ['pro', 'max', 'enterprise'],
  ats_analysis_unlimited: ['pro', 'max', 'enterprise'],
  gap_analysis: ['pro', 'max', 'enterprise'],
  byok: ['max', 'enterprise'],
  model_selection: ['max', 'enterprise'],
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UsePlanFeatureResult {
  /** The user's current plan tier. */
  plan: PlanTier
  /** True while the subscription is being fetched (false once P22 ships). */
  isLoading: boolean
  /**
   * Returns true if the user's plan includes the given feature.
   * Always returns false while isLoading is true to avoid premature access.
   */
  hasFeature: (key: PlanFeatureKey) => boolean
}

/**
 * Returns the current user's plan tier and a hasFeature() utility for
 * gating UI capabilities.
 *
 * TODO (P22): Replace the hardcoded 'free' default with a real subscription
 * query against sats_subscriptions / sats_tenants.plan_id once billing ships.
 * The hook's return shape and hasFeature() interface must not change.
 */
export function usePlanFeature(): UsePlanFeatureResult {
  // P22 TODO: query the user's real subscription plan here.
  // Until then, all users are on the free tier.
  const plan: PlanTier = 'free'
  const isLoading = false

  const hasFeature = (key: PlanFeatureKey): boolean => {
    if (isLoading) return false
    const allowedTiers = PLAN_FEATURES[key]
    return allowedTiers.includes(plan)
  }

  return { plan, isLoading, hasFeature }
}
