-- Add authentication logging script settings
INSERT INTO public.log_settings (script_name, description, logging_enabled, log_level, debug_enabled, trace_enabled) VALUES
  ('authentication-frontend', 'Frontend authentication processes - signup, signin, password reset, session management', true, 'INFO', true, false),
  ('authentication-backend', 'Backend authentication processes - triggers, functions, user creation', true, 'INFO', true, false),
  ('authentication-session', 'Session management and token validation processes', true, 'DEBUG', true, true),
  ('authentication-ui', 'User interface authentication interactions and form submissions', true, 'INFO', false, false)
ON CONFLICT (script_name) DO UPDATE SET
  description = EXCLUDED.description,
  logging_enabled = EXCLUDED.logging_enabled,
  log_level = EXCLUDED.log_level,
  debug_enabled = EXCLUDED.debug_enabled,
  trace_enabled = EXCLUDED.trace_enabled,
  updated_at = now();