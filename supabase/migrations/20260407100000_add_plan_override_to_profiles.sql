-- UPDATE LOG
-- 2026-04-07 10:00:00 | Add plan_override column to profiles for admin-controlled
--   per-user plan elevation. Adds admin SELECT + UPDATE policies for admin panel UI.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_override TEXT
    CHECK (plan_override IN ('free', 'pro', 'max', 'enterprise'));

CREATE POLICY "profiles_admin_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_admin_update_plan_override"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING  (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
