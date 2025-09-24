-- Fix Critical Security Issue: Admin Role Privilege Escalation
-- Remove the dangerous policy that allows any user to create admin roles
DROP POLICY IF EXISTS "Allow first admin creation when none exist" ON public.user_roles;

-- Create a more secure policy for first admin creation that requires no existing admins
CREATE POLICY "Allow first admin creation only when no admins exist"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin'::app_role 
  AND auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role
  )
);

-- Fix Business Data Exposure: Restrict companies access
-- Companies should only be visible to users who have job descriptions using them
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.sats_companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.sats_companies;

CREATE POLICY "Users can view companies they use in job descriptions"
ON public.sats_companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sats_job_descriptions jd
    WHERE jd.company_id = sats_companies.id 
    AND jd.user_id = auth.uid()
    AND jd.deleted_at IS NULL
  )
);

CREATE POLICY "Users can insert companies for their job descriptions"
ON public.sats_companies
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow creation, but access will be restricted by SELECT policy

-- Fix Business Data Exposure: Restrict locations access
-- Locations should only be visible to users who have job descriptions using them
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.sats_locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.sats_locations;

CREATE POLICY "Users can view locations they use in job descriptions"
ON public.sats_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sats_job_descriptions jd
    WHERE jd.location_id = sats_locations.id 
    AND jd.user_id = auth.uid()
    AND jd.deleted_at IS NULL
  )
);

CREATE POLICY "Users can insert locations for their job descriptions"
ON public.sats_locations
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow creation, but access will be restricted by SELECT policy

-- Fix Business Data Exposure: Restrict skills access
-- Skills should only be visible to users who have interactions with them
DROP POLICY IF EXISTS "Authenticated users can view skills" ON public.sats_skills;

CREATE POLICY "Users can view skills they interact with"
ON public.sats_skills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sats_user_skills us
    WHERE us.skill_id = sats_skills.id 
    AND us.user_id = auth.uid()
    AND us.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.sats_job_skills js
    JOIN public.sats_job_descriptions jd ON jd.id = js.job_id
    WHERE js.skill_id = sats_skills.id 
    AND jd.user_id = auth.uid()
    AND jd.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.sats_skill_experiences se
    WHERE se.skill_id = sats_skills.id 
    AND se.user_id = auth.uid()
    AND se.deleted_at IS NULL
  )
);

-- Add logging for security events
INSERT INTO public.error_logs (
  error_source,
  error_type, 
  error_message,
  error_details
) VALUES (
  'security_update',
  'rls_policy_update',
  'Critical security policies updated',
  jsonb_build_object(
    'updated_tables', ARRAY['user_roles', 'sats_companies', 'sats_locations', 'sats_skills'],
    'fixes_applied', ARRAY['admin_privilege_escalation', 'business_data_exposure'],
    'timestamp', now()
  )
);