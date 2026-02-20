-- Phase 1: Admin Logging, Tracing & Debugging Control Panel Database Schema
-- Create tables for centralized logging configuration and storage

-- Create log settings table to control per-script logging configuration
CREATE TABLE IF NOT EXISTS public.log_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_name text NOT NULL UNIQUE,
  description text,
  logging_enabled boolean DEFAULT false,
  debug_enabled boolean DEFAULT false,
  trace_enabled boolean DEFAULT false,
  log_level text DEFAULT 'OFF' CHECK (log_level IN ('OFF', 'ERROR', 'INFO', 'DEBUG', 'TRACE')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create log entries table to store actual log data
CREATE TABLE IF NOT EXISTS public.log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_name text NOT NULL,
  log_level text NOT NULL CHECK (log_level IN ('ERROR', 'INFO', 'DEBUG', 'TRACE')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  user_id uuid,
  session_id text,
  request_id text,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create log cleanup policies table
CREATE TABLE IF NOT EXISTS public.log_cleanup_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_name text,
  retention_days integer DEFAULT 7,
  max_entries integer DEFAULT 10000,
  auto_cleanup_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all logging tables
ALTER TABLE public.log_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_cleanup_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin-only access
DROP POLICY IF EXISTS "Admins can manage log settings" ON public.log_settings;
CREATE POLICY "Admins can manage log settings"
ON public.log_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sats_users_public sup
    WHERE sup.auth_user_id = auth.uid()
      AND sup.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sats_users_public sup
    WHERE sup.auth_user_id = auth.uid()
      AND sup.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can view all log entries" ON public.log_entries;
CREATE POLICY "Admins can view all log entries"
ON public.log_entries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sats_users_public sup
    WHERE sup.auth_user_id = auth.uid()
      AND sup.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage cleanup policies" ON public.log_cleanup_policies;
CREATE POLICY "Admins can manage cleanup policies"
ON public.log_cleanup_policies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sats_users_public sup
    WHERE sup.auth_user_id = auth.uid()
      AND sup.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sats_users_public sup
    WHERE sup.auth_user_id = auth.uid()
      AND sup.role = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_log_entries_script_timestamp ON public.log_entries(script_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_entries_level_timestamp ON public.log_entries(log_level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON public.log_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_settings_script_name ON public.log_settings(script_name);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_log_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_log_settings_updated_at ON public.log_settings;
CREATE TRIGGER update_log_settings_updated_at
  BEFORE UPDATE ON public.log_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_log_settings_updated_at();

DROP TRIGGER IF EXISTS update_log_cleanup_policies_updated_at ON public.log_cleanup_policies;
CREATE TRIGGER update_log_cleanup_policies_updated_at
  BEFORE UPDATE ON public.log_cleanup_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default log settings for existing scripts
INSERT INTO public.log_settings (script_name, description, log_level) VALUES 
('ats-analysis-direct', 'ATS Analysis Direct Function', 'OFF'),
('delete-account', 'Account Deletion Function', 'OFF'),
('cancel-account-deletion', 'Account Deletion Cancellation Function', 'OFF')
ON CONFLICT (script_name) DO NOTHING;

-- Insert default cleanup policy
INSERT INTO public.log_cleanup_policies (script_name, retention_days, max_entries) VALUES 
(NULL, 30, 50000) -- Global default policy
ON CONFLICT DO NOTHING;
