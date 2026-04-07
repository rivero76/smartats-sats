-- UPDATE LOG
-- 2026-04-08 | P29 — Create sats_upgrade_requests table for MVP upgrade intent capture.
--   Stores upgrade requests from free-tier users during pre-billing phase.
--   RLS: users can INSERT/SELECT own rows; admin can SELECT all + UPDATE status.
--   Includes sats_approve_upgrade_request(p_request_id uuid) atomic RPC that
--   updates both the request status AND profiles.plan_override in one transaction.

-- ─── TABLE ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sats_upgrade_requests (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_tier TEXT        NOT NULL CHECK (requested_tier IN ('pro', 'max', 'enterprise')),
  current_tier   TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'denied')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sats_update_sats_upgrade_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sats_update_sats_upgrade_requests_updated_at
  BEFORE UPDATE ON public.sats_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.sats_update_sats_upgrade_requests_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.sats_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "upgrade_requests_insert_own"
  ON public.sats_upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own requests
CREATE POLICY "upgrade_requests_select_own"
  ON public.sats_upgrade_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all requests
CREATE POLICY "upgrade_requests_admin_select"
  ON public.sats_upgrade_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update request status (approve / deny)
CREATE POLICY "upgrade_requests_admin_update"
  ON public.sats_upgrade_requests FOR UPDATE
  TO authenticated
  USING  (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─── ATOMIC APPROVE RPC ───────────────────────────────────────────────────────
-- Wraps both writes (request status + profiles.plan_override) in one transaction
-- so there is no split-brain state where status = 'approved' but tier was not set.

CREATE OR REPLACE FUNCTION public.sats_approve_upgrade_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_requested_tier TEXT;
BEGIN
  -- Caller must be an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Fetch and lock the pending request (STRICT raises if not found or already processed)
  SELECT user_id, requested_tier
    INTO STRICT v_user_id, v_requested_tier
    FROM public.sats_upgrade_requests
    WHERE id = p_request_id
      AND status = 'pending';

  -- Mark the request approved
  UPDATE public.sats_upgrade_requests
    SET status = 'approved', updated_at = now()
    WHERE id = p_request_id;

  -- Elevate the user's plan override
  UPDATE public.profiles
    SET plan_override = v_requested_tier, updated_at = now()
    WHERE user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sats_approve_upgrade_request(UUID) TO authenticated;
