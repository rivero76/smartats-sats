-- Add missing columns to sats_analyses table for storing analysis results
ALTER TABLE public.sats_analyses 
ADD COLUMN matched_skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN missing_skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN suggestions text,
ADD COLUMN analysis_data jsonb DEFAULT '{}'::jsonb;