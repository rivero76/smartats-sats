-- Updated: 2026-03-01 00:00:00 - P13 Story 3: Add INSERT RLS policy on sats_skills for authenticated users

-- Allow authenticated users to insert new skill records during LinkedIn import
-- and other profile-building flows.
CREATE POLICY "Authenticated users can create skills"
  ON public.sats_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
