-- P14 Story 1: Staged jobs table + scheduled market fetch invoker

CREATE TABLE IF NOT EXISTS public.sats_staged_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  company_name text,
  description_raw text NOT NULL,
  description_normalized text NOT NULL,
  content_hash text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processed', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_staged_jobs_source_url_unique
  ON public.sats_staged_jobs (source_url);

CREATE INDEX IF NOT EXISTS idx_sats_staged_jobs_content_hash
  ON public.sats_staged_jobs (content_hash);

CREATE INDEX IF NOT EXISTS idx_sats_staged_jobs_status_created_at
  ON public.sats_staged_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_staged_jobs_source_fetched_at
  ON public.sats_staged_jobs (source, fetched_at DESC);

ALTER TABLE public.sats_staged_jobs ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS sats_update_sats_staged_jobs_updated_at ON public.sats_staged_jobs;
CREATE TRIGGER sats_update_sats_staged_jobs_updated_at
  BEFORE UPDATE ON public.sats_staged_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.sats_update_updated_at_column();

INSERT INTO public.log_settings (
  script_name,
  description,
  logging_enabled,
  debug_enabled,
  trace_enabled,
  log_level
)
VALUES (
  'fetch-market-jobs',
  'P14 scheduled worker that stages market jobs for proactive scoring',
  true,
  false,
  false,
  'INFO'
)
ON CONFLICT (script_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.invoke_fetch_market_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fetch_url text;
BEGIN
  -- Required one-time setting (environment-specific):
  -- ALTER DATABASE postgres SET app.settings.fetch_market_jobs_url =
  --   'https://<project-ref>.functions.supabase.co/fetch-market-jobs';
  fetch_url := current_setting('app.settings.fetch_market_jobs_url', true);

  IF fetch_url IS NULL OR btrim(fetch_url) = '' THEN
    RAISE NOTICE 'app.settings.fetch_market_jobs_url is not configured; skipping fetch-market-jobs invocation';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net extension not enabled; skipping fetch-market-jobs invocation';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := fetch_url,
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
      SELECT 1
      FROM cron.job
      WHERE jobname = 'sats_fetch_market_jobs_15m'
    ) THEN
      PERFORM cron.schedule(
        'sats_fetch_market_jobs_15m',
        '*/15 * * * *',
        'SELECT public.invoke_fetch_market_jobs();'
      );
    END IF;
  END IF;
END;
$$;
