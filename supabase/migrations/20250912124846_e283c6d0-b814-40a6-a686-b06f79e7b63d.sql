-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create SATS_companies table (lookup table)
CREATE TABLE IF NOT EXISTS public.SATS_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SATS_locations table (lookup table)
CREATE TABLE IF NOT EXISTS public.SATS_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT,
  state TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SATS_skills table (shared skill dictionary)
CREATE TABLE IF NOT EXISTS public.SATS_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SATS_resumes table (user-owned)
CREATE TABLE IF NOT EXISTS public.SATS_resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SATS_job_descriptions table (user-owned)
CREATE TABLE IF NOT EXISTS public.SATS_job_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  pasted_text TEXT,
  company_id UUID REFERENCES public.SATS_companies(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.SATS_locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SATS_analyses table (user-owned)
CREATE TABLE IF NOT EXISTS public.SATS_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.SATS_resumes(id) ON DELETE CASCADE,
  jd_id UUID NOT NULL REFERENCES public.SATS_job_descriptions(id) ON DELETE CASCADE,
  ats_score INTEGER,
  status TEXT NOT NULL DEFAULT 'initial' CHECK (status IN ('initial', 'enriched', 'complete')),
  enriched_by_user BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SATS_job_skills table (junction table)
CREATE TABLE IF NOT EXISTS public.SATS_job_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.SATS_job_descriptions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.SATS_skills(id) ON DELETE CASCADE,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, skill_id)
);

-- Create SATS_user_skills table (user-owned)
CREATE TABLE IF NOT EXISTS public.SATS_user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.SATS_skills(id) ON DELETE CASCADE,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_of_experience INTEGER CHECK (years_of_experience >= 0),
  last_used_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Create SATS_skill_experiences table (user-owned)
CREATE TABLE IF NOT EXISTS public.SATS_skill_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.SATS_analyses(id) ON DELETE SET NULL,
  skill_id UUID NOT NULL REFERENCES public.SATS_skills(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.SATS_companies(id) ON DELETE SET NULL,
  job_title TEXT,
  keywords TEXT[],
  description TEXT,
  added_manually BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sats_resumes_user_id ON public.SATS_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_sats_job_descriptions_user_id ON public.SATS_job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sats_analyses_user_id ON public.SATS_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_sats_analyses_resume_id ON public.SATS_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_sats_analyses_jd_id ON public.SATS_analyses(jd_id);
CREATE INDEX IF NOT EXISTS idx_sats_user_skills_user_id ON public.SATS_user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_sats_skill_experiences_user_id ON public.SATS_skill_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_sats_job_skills_job_id ON public.SATS_job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_sats_job_skills_skill_id ON public.SATS_job_skills(skill_id);

-- Enable Row Level Security on user-owned tables
ALTER TABLE public.SATS_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_skill_experiences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for SATS_resumes
DROP POLICY IF EXISTS "Users can access their own resumes" ON public.SATS_resumes;
CREATE POLICY "Users can access their own resumes"
  ON public.SATS_resumes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for SATS_job_descriptions
DROP POLICY IF EXISTS "Users can access their own job descriptions" ON public.SATS_job_descriptions;
CREATE POLICY "Users can access their own job descriptions"
  ON public.SATS_job_descriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for SATS_analyses
DROP POLICY IF EXISTS "Users can access their own analyses" ON public.SATS_analyses;
CREATE POLICY "Users can access their own analyses"
  ON public.SATS_analyses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for SATS_user_skills
DROP POLICY IF EXISTS "Users can access their own skills" ON public.SATS_user_skills;
CREATE POLICY "Users can access their own skills"
  ON public.SATS_user_skills
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for SATS_skill_experiences
DROP POLICY IF EXISTS "Users can access their own skill experiences" ON public.SATS_skill_experiences;
CREATE POLICY "Users can access their own skill experiences"
  ON public.SATS_skill_experiences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at triggers for all tables
DROP TRIGGER IF EXISTS update_sats_companies_updated_at ON public.SATS_companies;
CREATE TRIGGER update_sats_companies_updated_at
  BEFORE UPDATE ON public.SATS_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_locations_updated_at ON public.SATS_locations;
CREATE TRIGGER update_sats_locations_updated_at
  BEFORE UPDATE ON public.SATS_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_skills_updated_at ON public.SATS_skills;
CREATE TRIGGER update_sats_skills_updated_at
  BEFORE UPDATE ON public.SATS_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_resumes_updated_at ON public.SATS_resumes;
CREATE TRIGGER update_sats_resumes_updated_at
  BEFORE UPDATE ON public.SATS_resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_job_descriptions_updated_at ON public.SATS_job_descriptions;
CREATE TRIGGER update_sats_job_descriptions_updated_at
  BEFORE UPDATE ON public.SATS_job_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_analyses_updated_at ON public.SATS_analyses;
CREATE TRIGGER update_sats_analyses_updated_at
  BEFORE UPDATE ON public.SATS_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_user_skills_updated_at ON public.SATS_user_skills;
CREATE TRIGGER update_sats_user_skills_updated_at
  BEFORE UPDATE ON public.SATS_user_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sats_skill_experiences_updated_at ON public.SATS_skill_experiences;
CREATE TRIGGER update_sats_skill_experiences_updated_at
  BEFORE UPDATE ON public.SATS_skill_experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
