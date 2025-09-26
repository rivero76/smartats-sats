-- Add job description ingestion logging settings
INSERT INTO public.log_settings (script_name, description, logging_enabled, debug_enabled, trace_enabled, log_level) VALUES 
('job-description-ingest', 'Job description ingestion process logging', true, true, false, 'INFO'),
('content-extraction', 'Content extraction and parsing logging', true, true, false, 'INFO'),
('company-location-management', 'Company and location creation/lookup logging', true, false, false, 'INFO')
ON CONFLICT (script_name) DO UPDATE SET
  description = EXCLUDED.description,
  logging_enabled = EXCLUDED.logging_enabled,
  debug_enabled = EXCLUDED.debug_enabled,
  trace_enabled = EXCLUDED.trace_enabled,
  log_level = EXCLUDED.log_level;