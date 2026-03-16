-- UPDATE LOG
-- 2026-03-17 12:00:00 | P16 Story 1: create sats_resume_personas table with RLS and index

CREATE TABLE public.sats_resume_personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_resume_id    UUID REFERENCES public.sats_resumes(id) ON DELETE SET NULL,
  persona_name        TEXT NOT NULL,
  target_role_family  TEXT NOT NULL,
  custom_summary      TEXT,
  skill_weights       JSONB DEFAULT '{}',
  keyword_highlights  TEXT[] DEFAULT '{}',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

ALTER TABLE public.sats_resume_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own personas"
  ON public.sats_resume_personas FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX ON public.sats_resume_personas (user_id, is_active);
