-- UPDATE LOG
-- 2026-04-07 11:00:00 | Create sats_feature_flags table for admin-controlled per-feature,
--   per-tier enablement. Seeded from the PLAN_FEATURES map in usePlanFeature.ts.
--   RLS: all authenticated users can SELECT; admins can INSERT/UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS public.sats_feature_flags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT        NOT NULL,
  plan_tier   TEXT        NOT NULL
              CHECK (plan_tier IN ('free', 'pro', 'max', 'enterprise')),
  is_enabled  BOOL        NOT NULL DEFAULT true,
  updated_by  UUID        REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feature_key, plan_tier)
);

ALTER TABLE public.sats_feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read feature flags (needed by usePlanFeature hook)
CREATE POLICY "sats_feature_flags_authenticated_select"
  ON public.sats_feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert, update, and delete feature flags
CREATE POLICY "sats_feature_flags_admin_insert"
  ON public.sats_feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sats_feature_flags_admin_update"
  ON public.sats_feature_flags FOR UPDATE
  TO authenticated
  USING  (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sats_feature_flags_admin_delete"
  ON public.sats_feature_flags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed from PLAN_FEATURES map (only is_enabled = true combinations)
-- skill_reclassify: pro, max, enterprise
INSERT INTO public.sats_feature_flags (feature_key, plan_tier, is_enabled)
VALUES
  ('skill_reclassify',            'pro',        true),
  ('skill_reclassify',            'max',        true),
  ('skill_reclassify',            'enterprise', true),
  ('skill_reclassify_all',        'pro',        true),
  ('skill_reclassify_all',        'max',        true),
  ('skill_reclassify_all',        'enterprise', true),
  ('proactive_matching',          'pro',        true),
  ('proactive_matching',          'max',        true),
  ('proactive_matching',          'enterprise', true),
  ('linkedin_import',             'pro',        true),
  ('linkedin_import',             'max',        true),
  ('linkedin_import',             'enterprise', true),
  ('cv_optimisation',             'pro',        true),
  ('cv_optimisation',             'max',        true),
  ('cv_optimisation',             'enterprise', true),
  ('ai_roadmap',                  'pro',        true),
  ('ai_roadmap',                  'max',        true),
  ('ai_roadmap',                  'enterprise', true),
  ('ats_analysis_unlimited',      'pro',        true),
  ('ats_analysis_unlimited',      'max',        true),
  ('ats_analysis_unlimited',      'enterprise', true),
  ('gap_analysis',                'pro',        true),
  ('gap_analysis',                'max',        true),
  ('gap_analysis',                'enterprise', true),
  ('profile_fit',                 'pro',        true),
  ('profile_fit',                 'max',        true),
  ('profile_fit',                 'enterprise', true),
  ('profile_fit_reconciliation',  'max',        true),
  ('profile_fit_reconciliation',  'enterprise', true),
  ('byok',                        'max',        true),
  ('byok',                        'enterprise', true),
  ('model_selection',             'max',        true),
  ('model_selection',             'enterprise', true)
ON CONFLICT (feature_key, plan_tier) DO NOTHING;
