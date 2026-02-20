DO $$
DECLARE
    need_enriched_table BOOLEAN := FALSE;
    need_log_setting    BOOLEAN := FALSE;
BEGIN
    SELECT NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'enriched_experiences'
    ) INTO need_enriched_table;

    IF need_enriched_table THEN
        RAISE NOTICE 'Table public.enriched_experiences is missing -> creating now.';
        EXECUTE $$
            CREATE TABLE IF NOT EXISTS public.enriched_experiences (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              analysis_id UUID REFERENCES public.sats_analyses(id) ON DELETE SET NULL,
              resume_id UUID NOT NULL REFERENCES public.sats_resumes(id) ON DELETE CASCADE,
              jd_id UUID REFERENCES public.sats_job_descriptions(id) ON DELETE SET NULL,
              skill_name TEXT NOT NULL,
              skill_type TEXT NOT NULL CHECK (skill_type IN ('explicit','inferred')),
              suggestion TEXT NOT NULL,
              user_action TEXT NOT NULL DEFAULT 'pending'
                CHECK (user_action IN ('pending','accepted','edited','rejected')),
              confidence_score NUMERIC,
              explanation TEXT,
              source JSONB DEFAULT '{}'::jsonb,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              approved_at TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS idx_enriched_experiences_user_id ON public.enriched_experiences(user_id);
            CREATE INDEX IF NOT EXISTS idx_enriched_experiences_resume_id ON public.enriched_experiences(resume_id);
            CREATE INDEX IF NOT EXISTS idx_enriched_experiences_jd_id ON public.enriched_experiences(jd_id);
            CREATE INDEX IF NOT EXISTS idx_enriched_experiences_analysis_id ON public.enriched_experiences(analysis_id);
            CREATE TRIGGER IF NOT EXISTS update_enriched_experiences_updated_at
              BEFORE UPDATE ON public.enriched_experiences
              FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
            ALTER TABLE public.enriched_experiences ENABLE ROW LEVEL SECURITY;
            CREATE POLICY IF NOT EXISTS "Users manage their enriched experiences"
              ON public.enriched_experiences
              FOR ALL USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
        $$;
    ELSE
        RAISE NOTICE 'Table public.enriched_experiences already exists.';
    END IF;

    SELECT NOT EXISTS (
        SELECT 1
        FROM public.log_settings
        WHERE script_name = 'enrich-experiences'
    ) INTO need_log_setting;

    IF need_log_setting THEN
        RAISE NOTICE 'Inserting log_settings row for enrich-experiences.';
        INSERT INTO public.log_settings
          (script_name, description, logging_enabled, debug_enabled, trace_enabled, log_level)
        VALUES
          ('enrich-experiences',
           'Experience enrichment edge function',
           TRUE, TRUE, FALSE, 'TRACE')
        ON CONFLICT (script_name) DO NOTHING;
    ELSE
        RAISE NOTICE 'log_settings already contains enrich-experiences.';
    END IF;
END$$;

SELECT 'enriched_experiences exists' AS check_name,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'enriched_experiences'
       ) AS status
UNION ALL
SELECT 'log_settings entry (enrich-experiences)',
       EXISTS (
         SELECT 1 FROM public.log_settings WHERE script_name = 'enrich-experiences'
       );
