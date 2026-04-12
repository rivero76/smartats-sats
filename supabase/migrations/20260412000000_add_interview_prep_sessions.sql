-- UPDATE LOG
-- 2026-04-12 00:00:00 | P-INTERVIEW S1 — Create sats_interview_prep_sessions table.
--   Stores per-user, per-analysis interview preparation sessions (company dossier,
--   role decoder, question bank with STAR scaffolds). Single-table MVP design;
--   pasted_text_hash + job_description_id indexes seeded for future two-table cache
--   migration (P-INTERVIEW S3) without requiring breaking schema changes.

CREATE TABLE IF NOT EXISTS sats_interview_prep_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id         UUID NOT NULL REFERENCES sats_analyses(id) ON DELETE CASCADE,
  job_description_id  UUID REFERENCES sats_job_descriptions(id) ON DELETE SET NULL,
  -- Future cache key: SHA-256 of normalised JD pasted_text (seeded for P-INTERVIEW S3)
  pasted_text_hash    TEXT,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Call 1 output: company website research
  company_dossier     JSONB,
  -- Call 2 output: JD role expectation decode
  role_decoder        JSONB,
  -- Call 3 output: question bank array (all categories)
  questions           JSONB,
  -- Full Vision: user-edited STAR answers (P-INTERVIEW S4)
  star_answers        JSONB,
  -- Full Vision: LinkedIn employee signal panel (P-INTERVIEW S5)
  employee_signals    JSONB,
  model_used          TEXT,
  cost_estimate_usd   NUMERIC(10, 6),
  -- 'success' | 'partial' (company scrape failed, JD-only mode) | 'failed'
  scrape_status       TEXT DEFAULT 'success',
  session_version     INTEGER NOT NULL DEFAULT 1,
  -- One active session per user+analysis; overwrite on regeneration
  UNIQUE (user_id, analysis_id)
);

-- Indexes for future two-table cache migration (P-INTERVIEW S3)
CREATE INDEX idx_interview_prep_job_description_id
  ON sats_interview_prep_sessions (job_description_id);

CREATE INDEX idx_interview_prep_pasted_text_hash
  ON sats_interview_prep_sessions (pasted_text_hash)
  WHERE pasted_text_hash IS NOT NULL;

CREATE INDEX idx_interview_prep_user_id
  ON sats_interview_prep_sessions (user_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE sats_interview_prep_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own sessions
CREATE POLICY "interview_prep_sessions_select_own"
  ON sats_interview_prep_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "interview_prep_sessions_insert_own"
  ON sats_interview_prep_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions (for regeneration / star_answers edits)
CREATE POLICY "interview_prep_sessions_update_own"
  ON sats_interview_prep_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "interview_prep_sessions_delete_own"
  ON sats_interview_prep_sessions
  FOR DELETE
  USING (auth.uid() = user_id);
