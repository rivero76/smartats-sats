-- P14 Story 1: Runtime setting for fetch-market-jobs endpoint (without ALTER DATABASE privileges)

CREATE TABLE IF NOT EXISTS public.sats_runtime_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sats_runtime_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS sats_update_sats_runtime_settings_updated_at ON public.sats_runtime_settings;
CREATE TRIGGER sats_update_sats_runtime_settings_updated_at
  BEFORE UPDATE ON public.sats_runtime_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.sats_update_updated_at_column();

INSERT INTO public.sats_runtime_settings (key, value, description)
VALUES (
  'fetch_market_jobs_url',
  'https://nkgscksbgmzhizohobhg.functions.supabase.co/fetch-market-jobs',
  'Endpoint used by pg_cron invoker to trigger fetch-market-jobs function'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
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
  SELECT s.value INTO fetch_url
  FROM public.sats_runtime_settings s
  WHERE s.key = 'fetch_market_jobs_url'
  LIMIT 1;

  IF fetch_url IS NULL OR btrim(fetch_url) = '' THEN
    fetch_url := current_setting('app.settings.fetch_market_jobs_url', true);
  END IF;

  IF fetch_url IS NULL OR btrim(fetch_url) = '' THEN
    RAISE NOTICE 'fetch_market_jobs_url not configured; skipping fetch-market-jobs invocation';
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
