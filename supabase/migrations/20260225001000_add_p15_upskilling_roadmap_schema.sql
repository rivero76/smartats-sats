-- P15 Story 1: Database Schema & State Management for Upskilling Roadmaps
-- 2026-02-25 00:10:00

CREATE TABLE IF NOT EXISTS public.sats_learning_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  source_ats_analysis_id UUID REFERENCES public.sats_analyses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sats_roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.sats_learning_roadmaps(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('course', 'project', 'interview_prep')),
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL CHECK (order_index > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sats_roadmap_milestones_roadmap_order_unique UNIQUE (roadmap_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_sats_learning_roadmaps_user_status_created_at
  ON public.sats_learning_roadmaps(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_learning_roadmaps_source_analysis
  ON public.sats_learning_roadmaps(source_ats_analysis_id);

CREATE INDEX IF NOT EXISTS idx_sats_roadmap_milestones_roadmap_order
  ON public.sats_roadmap_milestones(roadmap_id, order_index);

CREATE INDEX IF NOT EXISTS idx_sats_roadmap_milestones_roadmap_completed
  ON public.sats_roadmap_milestones(roadmap_id, is_completed);

DROP TRIGGER IF EXISTS sats_update_sats_learning_roadmaps_updated_at ON public.sats_learning_roadmaps;
CREATE TRIGGER sats_update_sats_learning_roadmaps_updated_at
  BEFORE UPDATE ON public.sats_learning_roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION public.sats_update_updated_at_column();

DROP TRIGGER IF EXISTS sats_update_sats_roadmap_milestones_updated_at ON public.sats_roadmap_milestones;
CREATE TRIGGER sats_update_sats_roadmap_milestones_updated_at
  BEFORE UPDATE ON public.sats_roadmap_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.sats_update_updated_at_column();

ALTER TABLE public.sats_learning_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_roadmap_milestones ENABLE ROW LEVEL SECURITY;

-- Roadmaps: owner-only CRUD
CREATE POLICY "Users can view their own learning roadmaps"
  ON public.sats_learning_roadmaps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning roadmaps"
  ON public.sats_learning_roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning roadmaps"
  ON public.sats_learning_roadmaps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning roadmaps"
  ON public.sats_learning_roadmaps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Milestones: access controlled via parent roadmap ownership
CREATE POLICY "Users can view milestones for their own roadmaps"
  ON public.sats_roadmap_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sats_learning_roadmaps lr
      WHERE lr.id = sats_roadmap_milestones.roadmap_id
        AND lr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create milestones for their own roadmaps"
  ON public.sats_roadmap_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sats_learning_roadmaps lr
      WHERE lr.id = sats_roadmap_milestones.roadmap_id
        AND lr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones for their own roadmaps"
  ON public.sats_roadmap_milestones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sats_learning_roadmaps lr
      WHERE lr.id = sats_roadmap_milestones.roadmap_id
        AND lr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sats_learning_roadmaps lr
      WHERE lr.id = sats_roadmap_milestones.roadmap_id
        AND lr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones for their own roadmaps"
  ON public.sats_roadmap_milestones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sats_learning_roadmaps lr
      WHERE lr.id = sats_roadmap_milestones.roadmap_id
        AND lr.user_id = auth.uid()
    )
  );
