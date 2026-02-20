-- P5: Enriched experience lifecycle + account deletion scope alignment
-- 2026-02-21 00:54:21

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
  ADD COLUMN IF NOT EXISTS edited_by_user BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_enriched_experiences_deleted_at
  ON public.enriched_experiences(deleted_at);

DROP POLICY IF EXISTS "Users manage their enriched experiences" ON public.enriched_experiences;

CREATE POLICY "Users can access active enriched experiences"
  ON public.enriched_experiences
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create enriched experiences"
  ON public.enriched_experiences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update active enriched experiences"
  ON public.enriched_experiences
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.soft_delete_user(
  target_user_id UUID,
  deletion_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deletion_date TIMESTAMP WITH TIME ZONE := now();
  scheduled_permanent_deletion TIMESTAMP WITH TIME ZONE := deletion_date + interval '30 days';
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only delete your own account';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Account is already scheduled for deletion';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = deletion_date,
    deletion_requested_at = deletion_date,
    deletion_scheduled_for = scheduled_permanent_deletion
  WHERE user_id = target_user_id;

  UPDATE public.sats_users_public
  SET
    deleted_at = deletion_date,
    deletion_requested_at = deletion_date,
    deletion_scheduled_for = scheduled_permanent_deletion
  WHERE auth_user_id = target_user_id;

  UPDATE public.ats_jobs SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.ats_resumes SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.ats_runs SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_analyses SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_job_descriptions SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_resumes SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_skill_experiences SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_user_skills SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.work_experiences SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.enriched_experiences
    SET deleted_at = deletion_date,
        deleted_reason = COALESCE(deletion_reason, 'account_scheduled_for_deletion')
  WHERE user_id = target_user_id AND deleted_at IS NULL;

  INSERT INTO public.account_deletion_logs (
    user_id,
    action,
    deletion_reason,
    data_deleted
  ) VALUES (
    target_user_id,
    'requested',
    deletion_reason,
    jsonb_build_object(
      'deletion_date', deletion_date,
      'scheduled_permanent_deletion', scheduled_permanent_deletion,
      'scope', jsonb_build_array(
        'profiles',
        'sats_users_public',
        'ats_jobs',
        'ats_resumes',
        'ats_runs',
        'sats_analyses',
        'sats_job_descriptions',
        'sats_resumes',
        'sats_skill_experiences',
        'sats_user_skills',
        'work_experiences',
        'enriched_experiences'
      )
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deletion_date', deletion_date,
    'permanent_deletion_date', scheduled_permanent_deletion,
    'message', 'Account scheduled for deletion in 30 days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only cancel deletion of your own account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Account is not scheduled for deletion';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL
  WHERE user_id = target_user_id;

  UPDATE public.sats_users_public
  SET
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL
  WHERE auth_user_id = target_user_id;

  UPDATE public.ats_jobs SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.ats_resumes SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.ats_runs SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_analyses SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_job_descriptions SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_resumes SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_skill_experiences SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_user_skills SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.work_experiences SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.enriched_experiences
    SET deleted_at = NULL,
        deleted_reason = NULL
  WHERE user_id = target_user_id AND deleted_at IS NOT NULL;

  INSERT INTO public.account_deletion_logs (
    user_id,
    action,
    data_deleted
  ) VALUES (
    target_user_id,
    'cancelled',
    jsonb_build_object('cancellation_date', now(), 'scope_restored', 'all_user_scoped_tables')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deletion cancelled successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_soft_deleted_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only reactivate your own account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account is already active'
    );
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.sats_users_public
  SET
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    updated_at = now()
  WHERE auth_user_id = target_user_id;

  UPDATE public.ats_jobs SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.ats_resumes SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.ats_runs SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_analyses SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_job_descriptions SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_resumes SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_skill_experiences SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.sats_user_skills SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.work_experiences SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  UPDATE public.enriched_experiences
    SET deleted_at = NULL,
        deleted_reason = NULL
  WHERE user_id = target_user_id AND deleted_at IS NOT NULL;

  INSERT INTO public.account_deletion_logs (
    user_id,
    action,
    data_deleted
  ) VALUES (
    target_user_id,
    'reactivated',
    jsonb_build_object('reactivation_date', now(), 'method', 'manual_function')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account reactivated successfully'
  );
END;
$$;
