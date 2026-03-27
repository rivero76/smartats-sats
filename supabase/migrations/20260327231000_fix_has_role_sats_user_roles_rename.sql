-- UPDATE LOG
-- 2026-03-27 23:00:00 | Fix has_role() function broken by P21 Tier 1 table rename.
--                       P21 S1 migration 20260327150000 renamed user_roles -> sats_user_roles,
--                       but has_role() was not updated. Recreates function to query new table name
--                       and also checks backward-compat RBAC tables (sats_user_role_assignments
--                       joined with sats_roles) for future transition support.

-- -----------------------------------------------------------------------
-- FIX: has_role() function was broken by user_roles -> sats_user_roles rename
-- -----------------------------------------------------------------------
--
-- Prior definition (broken):
--   CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
--   RETURNS boolean
--   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
--   AS $$
--     SELECT EXISTS (
--       SELECT 1 FROM public.user_roles  -- <-- TABLE NO LONGER EXISTS
--       WHERE user_id = _user_id AND role = _role
--     )
--   $$;
--
-- New definition: checks both legacy sats_user_roles (enum-based) and new RBAC system
-- for seamless backward compatibility during enterprise transition.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Legacy check: sats_user_roles table (enum-based)
    SELECT 1 FROM public.sats_user_roles
    WHERE user_id = _user_id AND role = _role
  )
  OR EXISTS (
    -- New RBAC check: sats_user_role_assignments with sats_roles lookup
    -- Maps enum values ('admin', 'user') to role slugs ('admin', 'member', 'viewer', etc.)
    SELECT 1
    FROM public.sats_user_role_assignments ura
    JOIN public.sats_roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id
      AND r.slug = LOWER(_role::text)
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  )
$$;

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- Test 1: Verify legacy path (sats_user_roles) works
--   SELECT has_role(
--     '00000000-0000-0000-0000-000000000001'::uuid,
--     'admin'::app_role
--   );
--   Expected: boolean result (true/false depending on test data)
--
-- Test 2: Verify new RBAC path (sats_user_role_assignments + sats_roles) works
--   SELECT has_role(
--     (SELECT user_id FROM sats_user_role_assignments LIMIT 1),
--     'admin'::app_role
--   );
--   Expected: boolean result
--
-- Test 3: Verify policies using has_role() execute without 42P01 (undefined_table)
--   SELECT * FROM sats_runtime_settings LIMIT 1;
--   -- Should not raise: ERROR 42P01: relation "user_roles" does not exist
--

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
