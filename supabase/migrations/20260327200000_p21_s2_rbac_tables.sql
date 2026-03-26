-- UPDATE LOG
-- 2026-03-27 20:00:00 | P21 Stage 2 — RBAC: (fixed: removed NOW() from partial index predicate — volatile function not allowed)
-- 2026-03-27 20:00:00 | P21 Stage 2 — RBAC: roles, permissions, role_permissions,
--                       user_role_assignments tables + has_permission() helper function.
--                       Backfills existing sats_user_roles data into user_role_assignments.
--                       All tables use sats_ prefix per naming convention.
--                       sats_user_roles is kept for backward-compat during transition.

-- -----------------------------------------------------------------------
-- sats_roles — canonical role definitions (tenant-scoped in future)
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_roles (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,    -- url-safe, used in code
  description TEXT,
  is_system   BOOL    NOT NULL DEFAULT false,  -- system roles cannot be deleted
  -- Audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id)
);

INSERT INTO public.sats_roles (name, slug, description, is_system) VALUES
  ('Owner',    'owner',    'Full account control',             true),
  ('Admin',    'admin',    'Manage users and settings',        true),
  ('Member',   'member',   'Standard user access',             true),
  ('Viewer',   'viewer',   'Read-only access',                 true),
  ('API User', 'api_user', 'Programmatic access via API keys', true)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------
-- sats_permissions — fine-grained permissions dictionary
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_permissions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    TEXT    NOT NULL,  -- 'resumes' | 'analyses' | 'skills' | 'roadmaps' | 'users' | 'billing'
  action      TEXT    NOT NULL,  -- 'create' | 'read' | 'update' | 'delete' | 'export' | 'admin'
  scope       TEXT    NOT NULL DEFAULT 'own',  -- 'own' | 'team' | 'global'
  description TEXT,
  UNIQUE (resource, action, scope)
);

INSERT INTO public.sats_permissions (resource, action, scope, description) VALUES
  ('resumes',   'create', 'own',    'Upload and create resumes'),
  ('resumes',   'read',   'own',    'View own resumes'),
  ('resumes',   'update', 'own',    'Edit own resumes'),
  ('resumes',   'delete', 'own',    'Soft-delete own resumes'),
  ('analyses',  'create', 'own',    'Run ATS analyses'),
  ('analyses',  'read',   'own',    'View own analyses'),
  ('analyses',  'delete', 'own',    'Soft-delete own analyses'),
  ('skills',    'create', 'own',    'Add skills to profile'),
  ('skills',    'read',   'own',    'View skill profile'),
  ('skills',    'update', 'own',    'Edit skill experiences'),
  ('roadmaps',  'create', 'own',    'Generate learning roadmaps'),
  ('roadmaps',  'read',   'own',    'View roadmaps'),
  ('billing',   'read',   'own',    'View own usage and billing'),
  ('users',     'read',   'global', 'Admin: view all users'),
  ('users',     'update', 'global', 'Admin: manage user roles'),
  ('llm_logs',  'read',   'global', 'Admin: view all LLM cost logs')
ON CONFLICT (resource, action, scope) DO NOTHING;

-- -----------------------------------------------------------------------
-- sats_role_permissions — bridge: which permissions each role has
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_role_permissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID        NOT NULL REFERENCES public.sats_roles(id) ON DELETE CASCADE,
  permission_id UUID        NOT NULL REFERENCES public.sats_permissions(id) ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by    UUID        REFERENCES auth.users(id),
  UNIQUE (role_id, permission_id)
);

-- Seed: member gets all 'own'-scoped permissions
INSERT INTO public.sats_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sats_roles r
CROSS JOIN public.sats_permissions p
WHERE r.slug = 'member'
  AND p.scope = 'own'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Seed: admin gets all permissions (own + global)
INSERT INTO public.sats_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sats_roles r
CROSS JOIN public.sats_permissions p
WHERE r.slug IN ('owner', 'admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Seed: viewer gets read-only own permissions
INSERT INTO public.sats_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sats_roles r
CROSS JOIN public.sats_permissions p
WHERE r.slug = 'viewer'
  AND p.action = 'read'
  AND p.scope  = 'own'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- -----------------------------------------------------------------------
-- sats_user_role_assignments — bridge: which roles each user has
-- Replaces the flat sats_user_roles.role enum column over time.
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sats_user_role_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES public.sats_roles(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID        REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ,   -- NULL = permanent
  UNIQUE (user_id, role_id)
);

-- Index for auth-time lookups (must be fast)
-- Partial index covers permanent assignments (most common case).
-- Expiry check (expires_at > NOW()) is volatile and cannot be in the predicate;
-- it is applied at query time by the planner.
CREATE INDEX IF NOT EXISTS idx_sats_role_assignments_user
  ON public.sats_user_role_assignments (user_id)
  WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sats_role_permissions_role
  ON public.sats_role_permissions (role_id);

-- -----------------------------------------------------------------------
-- Backfill: migrate existing sats_user_roles data
-- -----------------------------------------------------------------------

INSERT INTO public.sats_user_role_assignments (user_id, role_id)
SELECT
  ur.user_id,
  r.id AS role_id
FROM public.sats_user_roles ur
JOIN public.sats_roles r ON r.slug = LOWER(ur.role::text)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- -----------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------

ALTER TABLE public.sats_roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sats_user_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read roles"
  ON public.sats_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read permissions"
  ON public.sats_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read role_permissions"
  ON public.sats_role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read their own role assignments"
  ON public.sats_user_role_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage role assignments"
  ON public.sats_user_role_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sats_user_role_assignments ura
      JOIN public.sats_roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    )
  );

-- -----------------------------------------------------------------------
-- sats_has_permission() — helper for RLS policies and edge functions
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sats_has_permission(
  p_resource TEXT,
  p_action   TEXT,
  p_scope    TEXT DEFAULT 'own'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sats_user_role_assignments ura
    JOIN public.sats_role_permissions rp ON ura.role_id = rp.role_id
    JOIN public.sats_permissions p       ON rp.permission_id = p.id
    WHERE ura.user_id = auth.uid()
      AND p.resource  = p_resource
      AND p.action    = p_action
      AND p.scope     = p_scope
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  );
$$;

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT r.slug, COUNT(rp.permission_id) AS permissions_count
-- FROM public.sats_roles r
-- LEFT JOIN public.sats_role_permissions rp ON r.id = rp.role_id
-- GROUP BY r.slug ORDER BY r.slug;
-- Expected: 5 rows; owner/admin have 16 permissions, member has 13, viewer ~6, api_user 0

-- NOTE: Run scripts/ops/gen-types.sh after applying this migration.
