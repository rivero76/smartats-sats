-- P14 Story 2: Async ATS scorer pipeline (queued staged jobs -> per-user analyses)

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS proactive_staged_job_id uuid
  REFERENCES public.sats_staged_jobs(id) ON DELETE SET NULL;

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS proactive_staged_job_id uuid
  REFERENCES public.sats_staged_jobs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_job_descriptions_user_staged_job_unique
  ON public.sats_job_descriptions (user_id, proactive_staged_job_id)
  WHERE proactive_staged_job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_analyses_user_staged_job_unique
  ON public.sats_analyses (user_id, proactive_staged_job_id)
  WHERE proactive_staged_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sats_analyses_proactive_staged_job
  ON public.sats_analyses (proactive_staged_job_id)
  WHERE proactive_staged_job_id IS NOT NULL;

INSERT INTO public.log_settings (
  script_name,
  description,
  logging_enabled,
  debug_enabled,
  trace_enabled,
  log_level
)
VALUES (
  'async-ats-scorer',
  'P14 scheduled worker that scores staged market jobs against user baselines',
  true,
  false,
  false,
  'INFO'
)
ON CONFLICT (script_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO public.sats_runtime_settings (key, value, description)
VALUES (
  'async_ats_scorer_url',
  'https://nkgscksbgmzhizohobhg.functions.supabase.co/async-ats-scorer',
  'Endpoint used by pg_cron invoker to trigger async-ats-scorer function'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.invoke_async_ats_scorer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scorer_url text;
BEGIN
  SELECT s.value INTO scorer_url
  FROM public.sats_runtime_settings s
  WHERE s.key = 'async_ats_scorer_url'
  LIMIT 1;

  IF scorer_url IS NULL OR btrim(scorer_url) = '' THEN
    scorer_url := current_setting('app.settings.async_ats_scorer_url', true);
  END IF;

  IF scorer_url IS NULL OR btrim(scorer_url) = '' THEN
    RAISE NOTICE 'async_ats_scorer_url not configured; skipping async-ats-scorer invocation';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net extension not enabled; skipping async-ats-scorer invocation';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := scorer_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'trigger', 'pg_cron',
      'invoked_at', now()
    )
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'sats_async_ats_scorer_15m'
    ) THEN
      PERFORM cron.schedule(
        'sats_async_ats_scorer_15m',
        '*/15 * * * *',
        'SELECT public.invoke_async_ats_scorer();'
      );
    END IF;
  END IF;
END;
$$;
