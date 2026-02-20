-- Create manual reactivation function that can be called independently
CREATE OR REPLACE FUNCTION public.reactivate_soft_deleted_user(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profiles table not present; nothing to reactivate'
    );
  END IF;

  -- Verify the caller is the target user (security check)
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only reactivate your own account';
  END IF;

  -- Check if account is soft deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    -- Not soft deleted, return success anyway
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account is already active'
    );
  END IF;

  -- Reactivate profiles
  UPDATE public.profiles 
  SET 
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Reactivate sats_users_public
  IF to_regclass('public.sats_users_public') IS NOT NULL THEN
    UPDATE public.sats_users_public
    SET
      deleted_at = NULL,
      deletion_requested_at = NULL,
      deletion_scheduled_for = NULL,
      updated_at = now()
    WHERE auth_user_id = target_user_id;
  END IF;

  -- Reactivate all user-owned data
  IF to_regclass('public.ats_jobs') IS NOT NULL THEN
    UPDATE public.ats_jobs SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.ats_resumes') IS NOT NULL THEN
    UPDATE public.ats_resumes SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.ats_runs') IS NOT NULL THEN
    UPDATE public.ats_runs SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.sats_analyses') IS NOT NULL THEN
    UPDATE public.sats_analyses SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.sats_job_descriptions') IS NOT NULL THEN
    UPDATE public.sats_job_descriptions SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.sats_resumes') IS NOT NULL THEN
    UPDATE public.sats_resumes SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.sats_skill_experiences') IS NOT NULL THEN
    UPDATE public.sats_skill_experiences SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.sats_user_skills') IS NOT NULL THEN
    UPDATE public.sats_user_skills SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;
  IF to_regclass('public.work_experiences') IS NOT NULL THEN
    UPDATE public.work_experiences SET deleted_at = NULL WHERE user_id = target_user_id AND deleted_at IS NOT NULL;
  END IF;

  -- Log the reactivation
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
$function$;
