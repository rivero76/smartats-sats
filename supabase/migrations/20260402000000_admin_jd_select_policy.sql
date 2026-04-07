-- UPDATE LOG
-- 2026-04-02 00:00:00 | Gap 2 (Admin JD Observability) — Add admin SELECT policy on
--                       sats_job_descriptions so admin users can query all rows for
--                       cross-user observability. Uses has_role(auth.uid(), 'admin'::app_role)
--                       pattern consistent with account_deletion_logs, sats_runtime_settings,
--                       and sats_staged_jobs admin policies.

CREATE POLICY "Admins can read all job descriptions"
  ON public.sats_job_descriptions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename = 'sats_job_descriptions' ORDER BY policyname;
-- Expected: existing user-scoped SELECT policy PLUS this new admin-scoped one.
