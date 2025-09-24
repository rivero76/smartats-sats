-- Step 1: Remove duplicate triggers that are causing conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_sats_auth_user_created ON auth.users;

-- Step 2: Create new SATS-prefixed functions
CREATE OR REPLACE FUNCTION public.sats_update_document_extractions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sats_update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Step 3: Recreate auth trigger with proper SATS naming and ensure only one exists
DROP TRIGGER IF EXISTS on_auth_user_sats_signup ON auth.users;

CREATE TRIGGER sats_on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sats_user_signup();

-- Step 4: Update SATS-specific triggers to use new SATS functions
DROP TRIGGER IF EXISTS update_document_extractions_updated_at ON public.document_extractions;
CREATE TRIGGER sats_update_document_extractions_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_document_extractions_updated_at();

DROP TRIGGER IF EXISTS update_sats_analyses_updated_at ON public.sats_analyses;
CREATE TRIGGER sats_update_sats_analyses_updated_at
  BEFORE UPDATE ON public.sats_analyses
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_companies_updated_at ON public.sats_companies;
CREATE TRIGGER sats_update_sats_companies_updated_at
  BEFORE UPDATE ON public.sats_companies
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_job_descriptions_updated_at ON public.sats_job_descriptions;
CREATE TRIGGER sats_update_sats_job_descriptions_updated_at
  BEFORE UPDATE ON public.sats_job_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_locations_updated_at ON public.sats_locations;
CREATE TRIGGER sats_update_sats_locations_updated_at
  BEFORE UPDATE ON public.sats_locations
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_resumes_updated_at ON public.sats_resumes;
CREATE TRIGGER sats_update_sats_resumes_updated_at
  BEFORE UPDATE ON public.sats_resumes
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_skill_experiences_updated_at ON public.sats_skill_experiences;
CREATE TRIGGER sats_update_sats_skill_experiences_updated_at
  BEFORE UPDATE ON public.sats_skill_experiences
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_user_skills_updated_at ON public.sats_user_skills;  
CREATE TRIGGER sats_update_sats_user_skills_updated_at
  BEFORE UPDATE ON public.sats_user_skills
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_experiences_updated_at ON public.work_experiences;
CREATE TRIGGER sats_update_work_experiences_updated_at
  BEFORE UPDATE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

-- Step 5: Update sats_users_public trigger to use new SATS function
DROP TRIGGER IF EXISTS update_sats_users_public_updated_at ON public.sats_users_public;
CREATE TRIGGER sats_update_sats_users_public_updated_at
  BEFORE UPDATE ON public.sats_users_public
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

-- Step 6: Make handle_sats_user_signup more robust against duplicates
CREATE OR REPLACE FUNCTION public.handle_sats_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.sats_users_public (
    auth_user_id,
    name,
    role
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    'user'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;