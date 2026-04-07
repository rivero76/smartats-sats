-- UPDATE LOG
-- 2026-04-05 18:00:00 | P26 S5-1 — Add source_gap_snapshot_id column to
--   sats_learning_roadmaps. Allows a roadmap to be traceable back to the gap
--   snapshot that triggered its generation, alongside the existing
--   source_ats_analysis_id path. Nullable; null = user-initiated or ATS-driven.

ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS source_gap_snapshot_id UUID
    REFERENCES public.sats_gap_snapshots(id) ON DELETE SET NULL;

-- Index for reverse lookup: which roadmaps were generated from a given snapshot
CREATE INDEX IF NOT EXISTS roadmaps_gap_snapshot_idx
  ON public.sats_learning_roadmaps (source_gap_snapshot_id)
  WHERE source_gap_snapshot_id IS NOT NULL;

-- Verification:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'sats_learning_roadmaps'
-- AND column_name = 'source_gap_snapshot_id';
-- Expected: 1 row
