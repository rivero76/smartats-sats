-- P11.0 ingestion metadata: text/url/file source tracking for job descriptions
ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_url text;

UPDATE public.sats_job_descriptions
SET source_type = CASE
  WHEN file_url IS NOT NULL THEN 'file'
  WHEN pasted_text IS NOT NULL THEN 'text'
  ELSE source_type
END
WHERE source_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sats_job_descriptions_source_type_check'
  ) THEN
    ALTER TABLE public.sats_job_descriptions
      ADD CONSTRAINT sats_job_descriptions_source_type_check
      CHECK (source_type IS NULL OR source_type IN ('text', 'url', 'file'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_sats_job_descriptions_source_type
  ON public.sats_job_descriptions (source_type);

CREATE INDEX IF NOT EXISTS idx_sats_job_descriptions_source_url
  ON public.sats_job_descriptions (source_url);
