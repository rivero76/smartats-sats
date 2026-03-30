-- UPDATE LOG
-- 2026-03-30 10:00:00 | P25 S1 — sats_skill_profiles + sats_skill_decay_config tables with RLS,
--                       audit triggers, and seeded decay rules. Foundation for P25 Skill Profile Engine.
-- 2026-03-30 10:01:00 | Fix: replaced public.has_role('admin') (single-arg, unknown type) with inline
--                       sats_user_roles subquery. has_role() signature is (uuid, app_role) — wrong arity.

-- -----------------------------------------------------------------------
-- sats_skill_decay_config — configurable decay rules per skill category
-- Admin-readable by all users; writes restricted to service role / admin.
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_skill_decay_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT        NOT NULL UNIQUE,
  decay_rate_pct  NUMERIC     NOT NULL DEFAULT 0,   -- % weight reduction per year past grace_years
  grace_years     INTEGER     NOT NULL DEFAULT 0,   -- years before decay kicks in
  floor_weight    NUMERIC     NOT NULL DEFAULT 0.0, -- minimum weight; 0 = can decay to zero
  no_decay        BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the six canonical decay rules
INSERT INTO public.sats_skill_decay_config
  (category, decay_rate_pct, grace_years, floor_weight, no_decay)
VALUES
  ('technical',    8,   3, 0.15, false),
  ('soft',         0,   0, 1.0,  true),
  ('leadership',   0,   0, 1.0,  true),
  ('domain',       5,   3, 0.20, false),
  ('certification',100, 3, 0.0,  false),
  ('methodology',  0,   0, 1.0,  true)
ON CONFLICT (category) DO NOTHING;

-- updated_at trigger
CREATE TRIGGER trg_audit_sats_skill_decay_config
  BEFORE INSERT OR UPDATE ON public.sats_skill_decay_config
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- RLS: all authenticated users can read; only admins can write
ALTER TABLE public.sats_skill_decay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read decay config"
  ON public.sats_skill_decay_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert decay config"
  ON public.sats_skill_decay_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sats_user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update decay config"
  ON public.sats_skill_decay_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sats_user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sats_user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete decay config"
  ON public.sats_skill_decay_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sats_user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------------------------------
-- sats_skill_profiles — per-user skill classifications with decay metadata
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_skill_profiles (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name                      TEXT        NOT NULL,
  category                        TEXT        NOT NULL
                                  CHECK (category IN ('technical','soft','leadership','domain','certification','methodology')),
  depth                           TEXT        NOT NULL
                                  CHECK (depth IN ('awareness','practitioner','expert','trainer')),
  ai_last_used_year               INTEGER,
  user_confirmed_last_used_year   INTEGER,    -- user override; takes precedence over ai_last_used_year
  transferable_to                 TEXT[]      NOT NULL DEFAULT '{}',
  career_chapter                  TEXT,       -- AI-inferred label, e.g. "Technical Foundation"
  user_context                    TEXT,       -- plain-language explanation provided by user
  source_experience_ids           UUID[]      NOT NULL DEFAULT '{}',
  ai_classification_version       TEXT,       -- prompt version used — enables re-classification tracking
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft uniqueness: one row per user+skill_name (upserted on re-ingestion)
  CONSTRAINT uq_sats_skill_profiles_user_skill UNIQUE (user_id, skill_name)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_sats_skill_profiles_user_id
  ON public.sats_skill_profiles (user_id);

-- Index for chapter grouping queries
CREATE INDEX IF NOT EXISTS idx_sats_skill_profiles_user_chapter
  ON public.sats_skill_profiles (user_id, career_chapter);

-- updated_at trigger
CREATE TRIGGER trg_audit_sats_skill_profiles
  BEFORE INSERT OR UPDATE ON public.sats_skill_profiles
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- RLS: owner-only
ALTER TABLE public.sats_skill_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own skill profiles"
  ON public.sats_skill_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill profiles"
  ON public.sats_skill_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill profiles"
  ON public.sats_skill_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skill profiles"
  ON public.sats_skill_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
