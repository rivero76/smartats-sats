-- Create enriched_experiences table to capture user-approved resume enrichments
CREATE TABLE IF NOT EXISTS public.enriched_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.sats_analyses(id) ON DELETE SET NULL,
  resume_id UUID NOT NULL REFERENCES public.sats_resumes(id) ON DELETE CASCADE,
  jd_id UUID REFERENCES public.sats_job_descriptions(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('explicit', 'inferred')),
  suggestion TEXT NOT NULL,
  user_action TEXT NOT NULL DEFAULT 'pending' CHECK (user_action IN ('pending', 'accepted', 'edited', 'rejected')),
  confidence_score NUMERIC,
  explanation TEXT,
  source JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_enriched_experiences_user_id ON public.enriched_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_enriched_experiences_resume_id ON public.enriched_experiences(resume_id);
CREATE INDEX IF NOT EXISTS idx_enriched_experiences_jd_id ON public.enriched_experiences(jd_id);
CREATE INDEX IF NOT EXISTS idx_enriched_experiences_analysis_id ON public.enriched_experiences(analysis_id);

CREATE TRIGGER update_enriched_experiences_updated_at
  BEFORE UPDATE ON public.enriched_experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.enriched_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their enriched experiences"
  ON public.enriched_experiences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
