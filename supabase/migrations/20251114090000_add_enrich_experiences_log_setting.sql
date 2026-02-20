INSERT INTO public.log_settings (script_name, description, logging_enabled, debug_enabled, trace_enabled, log_level)
SELECT 'enrich-experiences', 'Experience enrichment edge function', true, true, false, 'TRACE'
WHERE NOT EXISTS (
  SELECT 1 FROM public.log_settings WHERE script_name = 'enrich-experiences'
);
