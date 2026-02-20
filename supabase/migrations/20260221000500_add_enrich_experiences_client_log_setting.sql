-- Provision frontend enrichment logger settings
-- Ensures `enrich-experiences-client` appears in Admin > Logging Control Panel.

INSERT INTO public.log_settings (
  script_name,
  description,
  logging_enabled,
  debug_enabled,
  trace_enabled,
  log_level
)
VALUES (
  'enrich-experiences-client',
  'Frontend enrichment invocation and save workflow logging',
  true,
  true,
  true,
  'TRACE'
)
ON CONFLICT (script_name) DO UPDATE SET
  description = EXCLUDED.description,
  logging_enabled = EXCLUDED.logging_enabled,
  debug_enabled = EXCLUDED.debug_enabled,
  trace_enabled = EXCLUDED.trace_enabled,
  log_level = EXCLUDED.log_level,
  updated_at = now();
