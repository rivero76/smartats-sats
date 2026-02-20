-- Add soft delete and audit columns to user-related tables
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP WITH TIME ZONE;
  END IF;

  IF to_regclass('public.sats_users_public') IS NOT NULL THEN
    ALTER TABLE public.sats_users_public
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

-- Create account deletion audit log table
CREATE TABLE IF NOT EXISTS public.account_deletion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'requested', 'confirmed', 'cancelled', 'completed'
  ip_address INET,
  user_agent TEXT,
  deletion_reason TEXT,
  data_deleted JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.account_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log (admin access only)
DROP POLICY IF EXISTS "Admins can view deletion logs" ON public.account_deletion_logs;
CREATE POLICY "Admins can view deletion logs" 
ON public.account_deletion_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.sats_users_public me
    WHERE me.auth_user_id = auth.uid()
      AND me.role = 'admin'
  )
);

DROP POLICY IF EXISTS "System can insert deletion logs" ON public.account_deletion_logs;
CREATE POLICY "System can insert deletion logs" 
ON public.account_deletion_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to soft delete user and related data
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
  affected_tables JSONB := '{}';
BEGIN
  -- Verify the caller is the target user (security check)
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only delete your own account';
  END IF;

  -- Check if already soft deleted
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Account is already scheduled for deletion';
  END IF;

  -- Soft delete profiles
  UPDATE public.profiles 
  SET 
    deleted_at = deletion_date,
    deletion_requested_at = deletion_date,
    deletion_scheduled_for = scheduled_permanent_deletion
  WHERE user_id = target_user_id;

  -- Soft delete sats_users_public
  UPDATE public.sats_users_public 
  SET 
    deleted_at = deletion_date,
    deletion_requested_at = deletion_date,
    deletion_scheduled_for = scheduled_permanent_deletion
  WHERE auth_user_id = target_user_id;

  -- Soft delete user-owned data
  UPDATE public.ats_jobs SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.ats_resumes SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.ats_runs SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_analyses SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_job_descriptions SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_resumes SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_skill_experiences SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.sats_user_skills SET deleted_at = deletion_date WHERE user_id = target_user_id;
  UPDATE public.work_experiences SET deleted_at = deletion_date WHERE user_id = target_user_id;

  -- Add soft delete columns to tables that don't have them
  -- (This will be handled by the ALTER TABLE statements above)

  -- Log the deletion request
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
      'scheduled_permanent_deletion', scheduled_permanent_deletion
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

-- Create function to cancel account deletion (recovery)
CREATE OR REPLACE FUNCTION public.cancel_account_deletion(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the target user (security check)
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Can only cancel deletion of your own account';
  END IF;

  -- Check if account is scheduled for deletion
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Account is not scheduled for deletion';
  END IF;

  -- Restore profiles
  UPDATE public.profiles 
  SET 
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL
  WHERE user_id = target_user_id;

  -- Restore sats_users_public
  UPDATE public.sats_users_public 
  SET 
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL
  WHERE auth_user_id = target_user_id;

  -- Restore user-owned data
  UPDATE public.ats_jobs SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.ats_resumes SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.ats_runs SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_analyses SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_job_descriptions SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_resumes SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_skill_experiences SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.sats_user_skills SET deleted_at = NULL WHERE user_id = target_user_id;
  UPDATE public.work_experiences SET deleted_at = NULL WHERE user_id = target_user_id;

  -- Log the cancellation
  INSERT INTO public.account_deletion_logs (
    user_id,
    action,
    data_deleted
  ) VALUES (
    target_user_id,
    'cancelled',
    jsonb_build_object('cancellation_date', now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deletion cancelled successfully'
  );
END;
$$;

-- Add soft delete columns to tables that need them
DO $$
BEGIN
  IF to_regclass('public.ats_jobs') IS NOT NULL THEN
    ALTER TABLE public.ats_jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.ats_resumes') IS NOT NULL THEN
    ALTER TABLE public.ats_resumes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.ats_runs') IS NOT NULL THEN
    ALTER TABLE public.ats_runs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.sats_analyses') IS NOT NULL THEN
    ALTER TABLE public.sats_analyses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.sats_job_descriptions') IS NOT NULL THEN
    ALTER TABLE public.sats_job_descriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.sats_resumes') IS NOT NULL THEN
    ALTER TABLE public.sats_resumes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.sats_skill_experiences') IS NOT NULL THEN
    ALTER TABLE public.sats_skill_experiences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.sats_user_skills') IS NOT NULL THEN
    ALTER TABLE public.sats_user_skills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF to_regclass('public.work_experiences') IS NOT NULL THEN
    ALTER TABLE public.work_experiences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

-- Update RLS policies to respect soft-deleted status
-- Profiles table policies
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);
  END IF;
END;
$$;

-- Update other table policies to respect soft delete
DROP POLICY IF EXISTS "Users can access their own resumes" ON public.sats_resumes;
CREATE POLICY "Users can access their own resumes" 
ON public.sats_resumes 
FOR ALL 
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own job descriptions" ON public.sats_job_descriptions;
CREATE POLICY "Users can access their own job descriptions" 
ON public.sats_job_descriptions 
FOR ALL 
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own analyses" ON public.sats_analyses;
CREATE POLICY "Users can access their own analyses" 
ON public.sats_analyses 
FOR ALL 
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);
