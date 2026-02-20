-- Drop existing RLS policies for profiles table
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
  END IF;
END;
$$;

-- Create more secure RLS policies with explicit authentication checks
-- These policies ensure that:
-- 1. Users must be authenticated (auth.uid() IS NOT NULL)
-- 2. Users can only access their own data (auth.uid() = user_id)
-- 3. Soft-deleted profiles are not accessible
-- 4. No data leakage when authentication fails

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    CREATE POLICY "Authenticated users can view only their own active profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
      AND deleted_at IS NULL
    );

    CREATE POLICY "Authenticated users can create only their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
    );

    CREATE POLICY "Authenticated users can update only their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
      AND deleted_at IS NULL
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
    );

    CREATE POLICY "Authenticated users can delete only their own profile"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND auth.uid() = user_id
    );

    CREATE POLICY "Block all anonymous access to profiles"
    ON public.profiles
    FOR ALL
    TO anon
    USING (false);
  END IF;
END;
$$;

-- Create a security function to validate profile access
CREATE OR REPLACE FUNCTION public.validate_profile_access(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    auth.uid() IS NOT NULL 
    AND auth.uid() = target_user_id
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email_confirmed_at IS NOT NULL
    );
$$;

-- Log security access attempts for monitoring
CREATE OR REPLACE FUNCTION public.log_profile_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log suspicious access attempts (when auth fails)
  IF auth.uid() IS NULL OR auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    INSERT INTO public.error_logs (
      error_source,
      error_type,
      error_message,
      error_details,
      user_id
    ) VALUES (
      'security_audit',
      'unauthorized_profile_access_attempt',
      'Unauthorized attempt to access profile data',
      jsonb_build_object(
        'attempted_user_id', COALESCE(NEW.user_id, OLD.user_id),
        'auth_user_id', auth.uid(),
        'operation', TG_OP,
        'table_name', TG_TABLE_NAME,
        'timestamp', now()
      ),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to monitor profile access attempts
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS profile_access_security_log ON public.profiles;
    CREATE TRIGGER profile_access_security_log
      BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.log_profile_access_attempt();
  END IF;
END;
$$;
