-- Enable RLS on remaining SATS tables
ALTER TABLE public.SATS_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SATS_job_skills ENABLE ROW LEVEL SECURITY;

-- Create policies for lookup tables (accessible to all authenticated users)
CREATE POLICY "Authenticated users can view companies"
  ON public.SATS_companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view locations"
  ON public.SATS_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view skills"
  ON public.SATS_skills
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for SATS_job_skills (users can only access skills for their own job descriptions)
CREATE POLICY "Users can view job skills for their own jobs"
  ON public.SATS_job_skills
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.SATS_job_descriptions jd
    WHERE jd.id = job_id AND jd.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert job skills for their own jobs"
  ON public.SATS_job_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.SATS_job_descriptions jd
    WHERE jd.id = job_id AND jd.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete job skills for their own jobs"
  ON public.SATS_job_skills
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.SATS_job_descriptions jd
    WHERE jd.id = job_id AND jd.user_id = auth.uid()
  ));