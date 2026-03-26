-- UPDATE LOG
-- 2026-03-28 05:00:00 | P21 Stage 4 — i18n: sats_locales (BCP 47, 6 seeded) + sats_translations.
--                       Adds preferred_locale and timezone to profiles (legacy table).
--                       Depends on: 20260328040000_p21_s4_multi_currency.sql

-- -----------------------------------------------------------------------
-- sats_locales — BCP 47 supported locale catalogue
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_locales (
  code        TEXT  PRIMARY KEY,   -- BCP 47 e.g. 'en-US', 'pt-BR', 'fr-FR'
  name        TEXT  NOT NULL,
  native_name TEXT  NOT NULL,
  direction   TEXT  NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr','rtl')),
  is_active   BOOL  NOT NULL DEFAULT true
);

INSERT INTO public.sats_locales (code, name, native_name) VALUES
  ('en-US', 'English (US)',        'English'),
  ('pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)'),
  ('es-419','Spanish (LATAM)',     'Español (Latinoamérica)'),
  ('fr-FR', 'French',              'Français'),
  ('de-DE', 'German',              'Deutsch'),
  ('ja-JP', 'Japanese',            '日本語')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------
-- User locale + timezone preferences (profiles is a legacy table)
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'en-US'
    REFERENCES public.sats_locales(code);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- -----------------------------------------------------------------------
-- sats_translations — translatable content for system strings, emails, UI labels
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_translations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace   TEXT        NOT NULL,   -- 'email' | 'ui' | 'notifications' | 'skill_names'
  key         TEXT        NOT NULL,   -- 'welcome_subject' | 'analysis_complete' etc.
  locale      TEXT        NOT NULL REFERENCES public.sats_locales(code),
  value       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (namespace, key, locale)
);

CREATE INDEX IF NOT EXISTS idx_sats_translations_lookup
  ON public.sats_translations (namespace, key, locale);

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_locales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read locales"
  ON public.sats_locales FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read translations"
  ON public.sats_translations FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT COUNT(*) FROM public.sats_locales;
-- Expected: 6
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name IN ('preferred_locale','timezone')
-- ORDER BY column_name;
-- Expected: 2 rows

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
