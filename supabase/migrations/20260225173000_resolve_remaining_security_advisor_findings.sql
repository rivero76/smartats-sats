-- Resolve remaining Supabase Security Advisor findings:
-- 1) rls_policy_always_true on sats_companies/sats_locations INSERT policies
-- 2) rls_enabled_no_policy on sats_runtime_settings/sats_staged_jobs

BEGIN;

-- ---------------------------------------------------------------------------
-- Tighten permissive INSERT policies (remove WITH CHECK true)
-- ---------------------------------------------------------------------------
ALTER POLICY "Users can insert companies for their job descriptions"
  ON public.sats_companies
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND length(btrim(name)) > 0
  );

ALTER POLICY "Users can insert locations for their job descriptions"
  ON public.sats_locations
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      nullif(btrim(coalesce(city, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(state, '')), '') IS NOT NULL
      OR nullif(btrim(coalesce(country, '')), '') IS NOT NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Add explicit policies for RLS-enabled tables with no policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage runtime settings" ON public.sats_runtime_settings;
CREATE POLICY "Admins can manage runtime settings"
  ON public.sats_runtime_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage staged jobs" ON public.sats_staged_jobs;
CREATE POLICY "Admins can manage staged jobs"
  ON public.sats_staged_jobs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMIT;
