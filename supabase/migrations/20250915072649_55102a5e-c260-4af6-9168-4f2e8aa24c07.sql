-- Update the sats_analyses table status constraint to allow 'processing' and 'error' statuses
ALTER TABLE public.sats_analyses DROP CONSTRAINT IF EXISTS sats_analyses_status_check;

-- Add new constraint that includes all valid statuses
ALTER TABLE public.sats_analyses ADD CONSTRAINT sats_analyses_status_check 
CHECK (status IN ('initial', 'queued', 'processing', 'completed', 'error'));