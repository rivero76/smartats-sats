-- Insert document processing log settings
INSERT INTO public.log_settings (script_name, logging_enabled, log_level, description, debug_enabled, trace_enabled) 
VALUES 
  ('document-processing', true, 'INFO', 'Document processing and text extraction logging', true, false),
  ('file-upload', true, 'INFO', 'File upload component logging', true, false),
  ('resume-processing', true, 'INFO', 'Resume processing workflow logging', true, false),
  ('pdf-worker', true, 'ERROR', 'PDF.js worker initialization and processing', true, false)
ON CONFLICT (script_name) DO UPDATE SET
  logging_enabled = EXCLUDED.logging_enabled,
  log_level = EXCLUDED.log_level,
  description = EXCLUDED.description,
  debug_enabled = EXCLUDED.debug_enabled,
  trace_enabled = EXCLUDED.trace_enabled;