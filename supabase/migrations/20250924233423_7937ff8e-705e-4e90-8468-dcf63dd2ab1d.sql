-- Fix security linter issues by enabling RLS on tables with policies
-- Enable RLS on tables that have policies but RLS disabled

ALTER TABLE public.sats_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_locations ENABLE ROW LEVEL SECURITY;