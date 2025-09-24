-- Complete SATS renaming: Only update triggers that don't already have SATS prefix

-- Skip document_extractions (already has sats_update_document_extractions_updated_at)

-- Update remaining SATS table triggers only if they exist with old names
DROP TRIGGER IF EXISTS update_sats_analyses_updated_at ON public.sats_analyses;
DROP TRIGGER IF EXISTS sats_update_sats_analyses_updated_at ON public.sats_analyses;
CREATE TRIGGER sats_update_sats_analyses_updated_at
  BEFORE UPDATE ON public.sats_analyses
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_companies_updated_at ON public.sats_companies;
DROP TRIGGER IF EXISTS sats_update_sats_companies_updated_at ON public.sats_companies;
CREATE TRIGGER sats_update_sats_companies_updated_at
  BEFORE UPDATE ON public.sats_companies
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_job_descriptions_updated_at ON public.sats_job_descriptions;
DROP TRIGGER IF EXISTS sats_update_sats_job_descriptions_updated_at ON public.sats_job_descriptions;
CREATE TRIGGER sats_update_sats_job_descriptions_updated_at
  BEFORE UPDATE ON public.sats_job_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_locations_updated_at ON public.sats_locations;
DROP TRIGGER IF EXISTS sats_update_sats_locations_updated_at ON public.sats_locations;
CREATE TRIGGER sats_update_sats_locations_updated_at
  BEFORE UPDATE ON public.sats_locations
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_resumes_updated_at ON public.sats_resumes;
DROP TRIGGER IF EXISTS sats_update_sats_resumes_updated_at ON public.sats_resumes;
CREATE TRIGGER sats_update_sats_resumes_updated_at
  BEFORE UPDATE ON public.sats_resumes
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_skill_experiences_updated_at ON public.sats_skill_experiences;
DROP TRIGGER IF EXISTS sats_update_sats_skill_experiences_updated_at ON public.sats_skill_experiences;
CREATE TRIGGER sats_update_sats_skill_experiences_updated_at
  BEFORE UPDATE ON public.sats_skill_experiences
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_user_skills_updated_at ON public.sats_user_skills;
DROP TRIGGER IF EXISTS sats_update_sats_user_skills_updated_at ON public.sats_user_skills;
CREATE TRIGGER sats_update_sats_user_skills_updated_at
  BEFORE UPDATE ON public.sats_user_skills
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_experiences_updated_at ON public.work_experiences;
DROP TRIGGER IF EXISTS sats_update_work_experiences_updated_at ON public.work_experiences;
CREATE TRIGGER sats_update_work_experiences_updated_at
  BEFORE UPDATE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_updated_at_column();