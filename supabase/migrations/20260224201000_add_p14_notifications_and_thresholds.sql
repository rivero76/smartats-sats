-- P14 Story 3: Threshold filtering and notification engine

CREATE TABLE IF NOT EXISTS public.sats_user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sats_user_notifications_user_created_at
  ON public.sats_user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sats_user_notifications_user_is_read
  ON public.sats_user_notifications (user_id, is_read);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sats_user_notifications_user_type_dedupe
  ON public.sats_user_notifications (user_id, type, dedupe_key);

ALTER TABLE public.sats_user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their own notifications" ON public.sats_user_notifications;
CREATE POLICY "Users can access their own notifications"
  ON public.sats_user_notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS sats_update_sats_user_notifications_updated_at ON public.sats_user_notifications;
CREATE TRIGGER sats_update_sats_user_notifications_updated_at
  BEFORE UPDATE ON public.sats_user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.sats_update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS proactive_match_threshold numeric(4,3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_proactive_match_threshold_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_proactive_match_threshold_check
      CHECK (
        proactive_match_threshold IS NULL
        OR (proactive_match_threshold >= 0 AND proactive_match_threshold <= 1)
      );
  END IF;
END;
$$;

INSERT INTO public.sats_runtime_settings (key, value, description)
VALUES (
  'proactive_match_threshold_default',
  '0.60',
  'Global default threshold for proactive match notifications'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();
