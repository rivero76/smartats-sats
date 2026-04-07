-- UPDATE LOG
-- 2026-04-08 00:00:00 | Fix soft_delete_user, cancel_account_deletion, reactivate_soft_deleted_user
--   to reference sats_account_deletion_logs (renamed from account_deletion_logs in p21,
--   migration 20260327150000_p21_tier1_rename_tables.sql). Functions were never patched
--   after the rename, causing DELETE ACCOUNT to fail with
--   'relation "account_deletion_logs" does not exist'.

-- soft_delete_user: fix INSERT table name + tighten auth.uid() guard for service role safety
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
  -- auth.uid() is NULL when called from the edge function with service role key.
  -- NULL != uuid evaluates to NULL in PL/pgSQL, which is treated as false — so service
  -- role calls proceed safely. Explicit IS NOT NULL guard makes the intent clear.
  IF auth.uid() IS NOT NULL AND auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only delete your own account';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Account is already scheduled for deletion';
  END IF;

  UPDATE public.profiles
    SET deleted_at = deletion_date,
        deletion_requested_at = deletion_date,
        deletion_scheduled_for = scheduled_permanent_deletion
    WHERE user_id = target_user_id;

  UPDATE public.sats_users_public
    SET deleted_at = deletion_date,
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

  INSERT INTO public.sats_account_deletion_logs (
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
        'profiles', 'sats_users_public', 'ats_jobs', 'ats_resumes',
        'ats_runs', 'sats_analyses', 'sats_job_descriptions', 'sats_resumes',
        'sats_skill_experiences', 'sats_user_skills', 'work_experiences', 'enriched_experiences'
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

-- cancel_account_deletion: fix INSERT table name + tighten auth.uid() guard
CREATE OR REPLACE FUNCTION public.cancel_account_deletion(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only cancel deletion of your own account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Account is not scheduled for deletion';
  END IF;

  UPDATE public.profiles
    SET deleted_at = NULL, deletion_requested_at = NULL, deletion_scheduled_for = NULL
    WHERE user_id = target_user_id;
  UPDATE public.sats_users_public
    SET deleted_at = NULL, deletion_requested_at = NULL, deletion_scheduled_for = NULL
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
    SET deleted_at = NULL, deleted_reason = NULL
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL;

  INSERT INTO public.sats_account_deletion_logs (
    user_id,
    action,
    data_deleted
  ) VALUES (
    target_user_id,
    'cancelled',
    jsonb_build_object('cancellation_date', now(), 'scope_restored', 'all_user_scoped_tables')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Account deletion cancelled successfully');
END;
$$;

-- reactivate_soft_deleted_user: fix INSERT table name + tighten auth.uid() guard
CREATE OR REPLACE FUNCTION public.reactivate_soft_deleted_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != target_user_id THEN
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
    SET deleted_at = NULL,
        deletion_requested_at = NULL,
        deletion_scheduled_for = NULL,
        updated_at = now()
    WHERE user_id = target_user_id;

  UPDATE public.sats_users_public
    SET deleted_at = NULL,
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
    SET deleted_at = NULL, deleted_reason = NULL
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL;

  INSERT INTO public.sats_account_deletion_logs (
    user_id,
    action,
    data_deleted
  ) VALUES (
    target_user_id,
    'reactivated',
    jsonb_build_object('reactivation_date', now(), 'method', 'manual_function')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Account reactivated successfully');
END;
$$;
