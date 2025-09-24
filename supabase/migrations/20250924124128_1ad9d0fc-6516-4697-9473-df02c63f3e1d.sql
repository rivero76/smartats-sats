-- Create a more robust security fix for the profiles table
-- This migration addresses the security concern about potential unauthorized access

-- First, let's ensure we have clean policies by dropping all existing ones
DO $$ 
BEGIN
  -- Drop all existing policies on profiles table
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can view only their own active profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can create only their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can update only their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can delete only their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;
EXCEPTION
  WHEN OTHERS THEN
    -- Continue if policies don't exist
    NULL;
END $$;

-- Create secure RLS policies with explicit authentication checks
-- These policies address the security vulnerability by:
-- 1. Explicitly checking user authentication (auth.uid() IS NOT NULL)
-- 2. Ensuring users can only access their own data
-- 3. Blocking all anonymous access
-- 4. Preventing access to soft-deleted profiles

CREATE POLICY "Secure profile access - authenticated users only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND deleted_at IS NULL
);

CREATE POLICY "Secure profile creation - authenticated users only"
ON public.profiles  
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Secure profile updates - authenticated users only"
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

CREATE POLICY "Secure profile deletion - authenticated users only"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Explicitly block ALL access for anonymous users (not authenticated)
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Create security monitoring function
CREATE OR REPLACE FUNCTION public.log_profile_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log suspicious access attempts
  IF (auth.uid() IS NULL AND TG_OP != 'DELETE') OR 
     (auth.uid() IS NOT NULL AND auth.uid() != COALESCE(NEW.user_id, OLD.user_id)) THEN
    
    INSERT INTO public.error_logs (
      error_source,
      error_type,
      error_message,
      error_details
    ) VALUES (
      'security_audit',
      'profile_access_violation',
      'Potential unauthorized access to profile data detected',
      jsonb_build_object(
        'operation', TG_OP,
        'auth_user_id', auth.uid(),
        'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
        'timestamp', now(),
        'table_name', 'profiles'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS profiles_security_monitor ON public.profiles;

-- Create security monitoring trigger
CREATE TRIGGER profiles_security_monitor
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_security_event();