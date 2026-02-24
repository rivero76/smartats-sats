-- P8 Enterprise Readiness: RLS tenant-isolation hardening bundle
-- 2026-02-24 23:50:00
--
-- Scope:
-- 1) Tighten role scope from public -> authenticated on tenant/admin policies.
-- 2) Add explicit WITH CHECK clauses on UPDATE/ALL write paths.
-- 3) Remove overlapping/conflicting document_extractions policies and re-create strict owner policies.
-- 4) Lock down account_deletion_logs insert policy to owner-only writes.

BEGIN;

-- ---------------------------------------------------------------------------
-- account_deletion_logs: prevent arbitrary writes by public role
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert deletion logs" ON public.account_deletion_logs;
DROP POLICY IF EXISTS "Admins can view deletion logs" ON public.account_deletion_logs;

CREATE POLICY "Users can insert own deletion logs"
  ON public.account_deletion_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view deletion logs"
  ON public.account_deletion_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- document_extractions: replace overlapping legacy + resume-ownership policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "extraction_insert" ON public.document_extractions;
DROP POLICY IF EXISTS "extraction_select" ON public.document_extractions;
DROP POLICY IF EXISTS "extraction_update" ON public.document_extractions;

DROP POLICY IF EXISTS "Users can create extractions for their own resumes" ON public.document_extractions;
DROP POLICY IF EXISTS "Users can view extractions for their own resumes" ON public.document_extractions;
DROP POLICY IF EXISTS "Users can update extractions for their own resumes" ON public.document_extractions;
DROP POLICY IF EXISTS "Users can delete extractions for their own resumes" ON public.document_extractions;

CREATE POLICY "Users can create extractions for own resumes"
  ON public.document_extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.sats_resumes r
      WHERE r.id = document_extractions.resume_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view extractions for own resumes"
  ON public.document_extractions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.sats_resumes r
      WHERE r.id = document_extractions.resume_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update extractions for own resumes"
  ON public.document_extractions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.sats_resumes r
      WHERE r.id = document_extractions.resume_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.sats_resumes r
      WHERE r.id = document_extractions.resume_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete extractions for own resumes"
  ON public.document_extractions
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.sats_resumes r
      WHERE r.id = document_extractions.resume_id
        AND r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Explicit WITH CHECK hardening for update/all owner policies
-- ---------------------------------------------------------------------------
ALTER POLICY "ats_derivatives_owner"
  ON public.ats_derivatives
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ats_resumes r
      WHERE r.id = ats_derivatives.resume_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ats_resumes r
      WHERE r.id = ats_derivatives.resume_id
        AND r.user_id = auth.uid()
    )
  );

ALTER POLICY "ats_findings_owner"
  ON public.ats_findings
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ats_runs r
      WHERE r.id = ats_findings.run_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ats_runs r
      WHERE r.id = ats_findings.run_id
        AND r.user_id = auth.uid()
    )
  );

ALTER POLICY "job_docs_owner"
  ON public.ats_job_documents
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ats_jobs j
      WHERE j.id = ats_job_documents.job_id
        AND j.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ats_jobs j
      WHERE j.id = ats_job_documents.job_id
        AND j.user_id = auth.uid()
    )
  );

ALTER POLICY "ats_jobs_owner"
  ON public.ats_jobs
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "ats_resumes_owner"
  ON public.ats_resumes
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "ats_runs_owner"
  ON public.ats_runs
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "ats_scores_owner"
  ON public.ats_scores
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ats_runs r
      WHERE r.id = ats_scores.run_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ats_runs r
      WHERE r.id = ats_scores.run_id
        AND r.user_id = auth.uid()
    )
  );

ALTER POLICY "Users can update active enriched experiences"
  ON public.enriched_experiences
  TO authenticated
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can create enriched experiences"
  ON public.enriched_experiences
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can access their enriched experiences"
  ON public.enriched_experiences
  TO authenticated
  USING (auth.uid() = user_id);

ALTER POLICY "Users can access their own analyses"
  ON public.sats_analyses
  TO authenticated
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can access their own job descriptions"
  ON public.sats_job_descriptions
  TO authenticated
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can access their own resumes"
  ON public.sats_resumes
  TO authenticated
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "resume_insert"
  ON public.sats_resumes
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER POLICY "resume_select"
  ON public.sats_resumes
  TO authenticated
  USING (user_id = auth.uid());

ALTER POLICY "resume_update"
  ON public.sats_resumes
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER POLICY "Users can access their own skill experiences"
  ON public.sats_skill_experiences
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can access their own notifications"
  ON public.sats_user_notifications
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can access their own skills"
  ON public.sats_user_skills
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can view their own record"
  ON public.sats_users_public
  TO authenticated
  USING (auth.uid() = auth_user_id);

ALTER POLICY "Users can update their own record"
  ON public.sats_users_public
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

ALTER POLICY "Admins can view all users"
  ON public.sats_users_public
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER POLICY "Users can delete their own work experiences"
  ON public.work_experiences
  TO authenticated
  USING (auth.uid() = user_id);

ALTER POLICY "Users can create their own work experiences"
  ON public.work_experiences
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can view their own work experiences"
  ON public.work_experiences
  TO authenticated
  USING (auth.uid() = user_id);

ALTER POLICY "Users can update their own work experiences"
  ON public.work_experiences
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Admin policy role hygiene: public -> authenticated
-- ---------------------------------------------------------------------------
ALTER POLICY "Admins can view deletion logs"
  ON public.account_deletion_logs
  TO authenticated;

ALTER POLICY "Admins can manage cleanup policies"
  ON public.log_cleanup_policies
  TO authenticated;

ALTER POLICY "Admins can view all log entries"
  ON public.log_entries
  TO authenticated;

ALTER POLICY "Admins can manage log settings"
  ON public.log_settings
  TO authenticated;

ALTER POLICY "Admins can view log settings audit"
  ON public.log_settings_audit
  TO authenticated;

COMMIT;
