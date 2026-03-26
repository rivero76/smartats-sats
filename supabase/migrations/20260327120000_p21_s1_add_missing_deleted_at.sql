-- UPDATE LOG
-- 2026-03-27 12:00:00 | P21 Stage 1 — Add deleted_at + deleted_by to sats_learning_roadmaps,
--                       sats_roadmap_milestones, and sats_user_notifications.
--                       These 3 tables had no soft-delete protection, blocking P20 S3 (time-bounded delete).
--                       Adds partial indexes for active-row query performance.
--                       Updates SELECT RLS policies on roadmaps and milestones to exclude soft-deleted rows.

-- -----------------------------------------------------------------------
-- Add soft-delete columns to 3 missing tables
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_roadmap_milestones
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_user_notifications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- -----------------------------------------------------------------------
-- Partial indexes — active-row queries stay fast
-- -----------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_roadmaps_active
  ON public.sats_learning_roadmaps (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_active
  ON public.sats_roadmap_milestones (roadmap_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON public.sats_user_notifications (user_id)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------
-- Update SELECT RLS policies to exclude soft-deleted rows
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own learning roadmaps"          ON public.sats_learning_roadmaps;
DROP POLICY IF EXISTS "Users can view their own active roadmaps"            ON public.sats_learning_roadmaps;

CREATE POLICY "Users can view their own active roadmaps"
  ON public.sats_learning_roadmaps FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view milestones for their roadmaps"        ON public.sats_roadmap_milestones;
DROP POLICY IF EXISTS "Users can view active milestones for their roadmaps" ON public.sats_roadmap_milestones;

CREATE POLICY "Users can view active milestones for their roadmaps"
  ON public.sats_roadmap_milestones FOR SELECT
  USING (
    deleted_at IS NULL
    AND roadmap_id IN (
      SELECT id FROM public.sats_learning_roadmaps
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'deleted_at'
--   AND table_name IN ('sats_learning_roadmaps','sats_roadmap_milestones','sats_user_notifications')
-- ORDER BY table_name;
-- Expected: 3 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
