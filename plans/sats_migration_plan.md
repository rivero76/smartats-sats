<!-- Status: COMPLETED -->
<!-- Completed: 2026-03-27 — All 6 stages (21 migrations) applied. Moved to plans/archive/. -->

# SmartATS (SATS) — Database Migration Plan
## MVP → Enterprise Stage

**Prepared from:** Diagnostic scan dated 2026-03-27, latest migration `20260317160000`  
**Target:** PostgreSQL via Supabase Cloud | Migration tool: Supabase SQL migrations  
**Naming convention used throughout:** `YYYYMMDDHHMMSS_<stage>_<description>.sql`

---

## How to Read This Document

Each stage is self-contained and additive. Stages are ordered by dependency — a later stage
may reference a table introduced in an earlier one. Never skip a stage unless confirmed absent
from your current schema.

**Stage labels:**
- **MVP** — Must exist before any real user or customer touches the system
- **Growth** — Required before first paying customer or enterprise pilot
- **Enterprise** — Required before regulated industry customers (healthcare, finance, legal)
- **AI/RAG** — AI agent and retrieval-augmented generation infrastructure
- **Global** — Multi-currency, multi-language, internationalisation

**Each migration block contains:**
1. What it creates / modifies and why
2. The SQL to run
3. The RLS policy to add (if applicable)
4. Any index required for performance
5. Post-migration verification query

**Current baseline confirmed in scan:**
- 37 tables, all with RLS enabled
- `created_at` on 100% of tables
- `updated_at` on 73% of tables
- `deleted_at` (soft delete) on 32% of tables
- `created_by` / `updated_by` / `deleted_by` — **0% coverage (critical gap)**
- `tenant_id` — **0% coverage (single-tenant design)**
- `version` — **0% coverage**
- pgvector — **not installed**
- Proper RBAC tables — **absent** (static enum only)
- Unified `audit_logs` — **absent** (3 fragmented log tables)
- `llm_call_logs` — **absent** (in-flight only in `llmProvider.ts`)

---

## The Universal Audit Trigger

Before running any migration, create this reusable trigger function once.
Every table in every stage below will reference it.

```sql
-- Migration: 20260318000000_universal_audit_trigger.sql

-- Function: auto-stamps updated_at, updated_by on every UPDATE
-- and sets created_by on INSERT if not already provided.
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- created_by: use app context if column exists and value is null
    IF TG_TABLE_NAME IN (
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = TG_TABLE_NAME
        AND column_name = 'created_by'
    ) THEN
      IF NEW.created_by IS NULL THEN
        NEW.created_by := (
          SELECT id FROM public.sats_users_public
          WHERE auth_user_id = auth.uid()
          LIMIT 1
        );
      END IF;
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, NOW());
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
    IF TG_TABLE_NAME IN (
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = TG_TABLE_NAME
        AND column_name = 'updated_by'
    ) THEN
      NEW.updated_by := (
        SELECT id FROM public.sats_users_public
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      );
    END IF;
    -- Bump optimistic lock version if column exists
    IF TG_TABLE_NAME IN (
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = TG_TABLE_NAME
        AND column_name = 'version'
    ) THEN
      NEW.version := OLD.version + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

**Attach to a table (repeat for each table that gains audit columns):**
```sql
-- Pattern — substitute <table_name>
CREATE TRIGGER trg_audit_<table_name>
  BEFORE INSERT OR UPDATE ON public.<table_name>
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
```

**Verification:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'set_audit_fields';
-- Expected: 1 row
```

---

---

# STAGE 1 — MVP: Critical Audit Columns

**Why now:** `created_by` / `updated_by` / `deleted_by` are forensic columns.
Data written today without them is permanently anonymous. There is no retroactive fix.
This is the single highest-priority change in the entire plan.

**Impact:** These are additive `ALTER TABLE` statements. All nullable with no defaults — safe
to run on live tables with zero downtime on Supabase.

---

## 1.1 — Add `created_by` and `updated_by` to All Data Tables

```sql
-- Migration: 20260318100000_stage1_add_created_by_updated_by.sql

-- Core user and profile tables
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_users_public
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Resume and job tables
ALTER TABLE public.sats_resumes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_resume_personas
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Skills and experience tables
ALTER TABLE public.sats_user_skills
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_skill_experiences
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Learning tables
ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_roadmap_milestones
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ATS pipeline tables
ALTER TABLE public.ats_jobs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_resumes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_runs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_derivatives
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_job_documents
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_user_notifications
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.document_extractions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
```

**Attach audit triggers (run once per table):**
```sql
-- Repeat this block for each table listed above
-- Example for sats_resumes:
CREATE TRIGGER trg_audit_sats_resumes
  BEFORE INSERT OR UPDATE ON public.sats_resumes
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- Do the same for all 19 tables above:
-- profiles, sats_users_public, sats_job_descriptions, sats_analyses,
-- sats_resume_personas, sats_user_skills, sats_skill_experiences,
-- enriched_experiences, work_experiences, sats_learning_roadmaps,
-- sats_roadmap_milestones, ats_jobs, ats_resumes, ats_runs,
-- ats_derivatives, ats_job_documents, sats_user_notifications,
-- document_extractions
```

**Verification:**
```sql
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'created_by'
ORDER BY table_name;
-- Expected: 19 rows
```

---

## 1.2 — Add `deleted_by` to All Soft-Delete Tables

Only tables that already have `deleted_at` need `deleted_by`.
Without it, you know *when* a record was deleted but not *who*.

```sql
-- Migration: 20260318110000_stage1_add_deleted_by.sql

ALTER TABLE public.ats_jobs
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_resumes
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.ats_runs
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_analyses
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_job_descriptions
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_resume_personas
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_resumes
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_skill_experiences
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_user_skills
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_users_public
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.enriched_experiences
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
```

**Update soft-delete RPCs to populate `deleted_by`:**
```sql
-- Pattern — update existing soft-delete functions to also set deleted_by
-- Example patch for soft_delete_enriched_experience():
CREATE OR REPLACE FUNCTION soft_delete_enriched_experience(experience_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.enriched_experiences
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = experience_id
    AND user_id = auth.uid();
END;
$$;
```

---

## 1.3 — Add `deleted_at` to Missing Tables

The diagnostic confirmed `sats_learning_roadmaps`, `sats_roadmap_milestones`,
and `sats_user_notifications` have no soft-delete protection.

```sql
-- Migration: 20260318120000_stage1_add_missing_deleted_at.sql

ALTER TABLE public.sats_learning_roadmaps
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_roadmap_milestones
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID REFERENCES auth.users(id);

ALTER TABLE public.sats_user_notifications
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID REFERENCES auth.users(id);

-- Partial indexes so queries on active rows stay fast
CREATE INDEX IF NOT EXISTS idx_roadmaps_active
  ON public.sats_learning_roadmaps (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_active
  ON public.sats_roadmap_milestones (roadmap_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON public.sats_user_notifications (user_id)
  WHERE deleted_at IS NULL;
```

**Update existing RLS policies to exclude soft-deleted rows:**
```sql
-- For each table that gains deleted_at, add this guard to SELECT policies
-- Example for sats_learning_roadmaps:
DROP POLICY IF EXISTS "Users can view their own roadmaps" ON public.sats_learning_roadmaps;
CREATE POLICY "Users can view their own active roadmaps"
  ON public.sats_learning_roadmaps FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);
```

---

## 1.4 — Add `version` (Optimistic Lock) to Mutable Tables

Protects against concurrent edit conflicts on key user-owned records.

```sql
-- Migration: 20260318130000_stage1_add_version_column.sql

ALTER TABLE public.sats_resumes       ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.sats_job_descriptions ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.sats_analyses      ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.sats_resume_personas ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.sats_skill_experiences ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.sats_user_skills   ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.work_experiences   ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.enriched_experiences ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.sats_learning_roadmaps ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
```

**Verification:**
```sql
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'version'
ORDER BY table_name;
```

---

## 1.5 — Persistent `llm_call_logs` Table

The diagnostic found that all four LLM edge functions track tokens, cost, and latency
in-flight (`llmProvider.ts:72–80`) but **write nothing to the database**.
One billing dispute makes this gap immediately painful.

```sql
-- Migration: 20260318140000_stage1_llm_call_logs.sql

CREATE TABLE IF NOT EXISTS public.llm_call_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Actor
  user_id           UUID        REFERENCES auth.users(id),
  function_name     TEXT        NOT NULL,   -- edge function name (e.g. 'ats-analysis-direct')
  -- Model
  model_provider    TEXT        NOT NULL DEFAULT 'openai',
  model_id          TEXT        NOT NULL,   -- exact model string e.g. 'gpt-4.1-mini'
  -- Tokens & cost (mirrors LLMResponse fields in llmProvider.ts)
  prompt_tokens     INT         NOT NULL DEFAULT 0,
  completion_tokens INT         NOT NULL DEFAULT 0,
  total_tokens      INT         GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd          NUMERIC(12,6) NOT NULL DEFAULT 0,
  duration_ms       INT,
  -- Outcome
  finish_reason     TEXT,        -- 'stop' | 'max_tokens' | 'error' | 'filtered'
  error_code        TEXT,        -- provider HTTP status if failure
  -- Context linkage
  run_id            UUID        REFERENCES public.ats_runs(id),
  analysis_id       UUID        REFERENCES public.sats_analyses(id),
  -- Tracing (future OpenTelemetry integration)
  trace_id          TEXT,
  span_id           TEXT,
  -- Timestamps
  called_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month in future; for now index called_at for range scans
CREATE INDEX IF NOT EXISTS idx_llm_logs_called_at
  ON public.llm_call_logs (called_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_logs_user_id
  ON public.llm_call_logs (user_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_logs_function
  ON public.llm_call_logs (function_name, called_at DESC);

-- RLS: users see their own logs; admins see all
ALTER TABLE public.llm_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own LLM logs"
  ON public.llm_call_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all LLM logs"
  ON public.llm_call_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role inserts LLM logs"
  ON public.llm_call_logs FOR INSERT
  WITH CHECK (true); -- service_role bypasses RLS; edge functions use service_role key
```

**Edge function integration — add to `llmProvider.ts` after each successful call:**
```typescript
// Add to LLMResponse handler in llmProvider.ts
// After getting a response, fire-and-forget to DB:
await supabaseAdmin.from('llm_call_logs').insert({
  user_id:           userId,          // pass from calling function
  function_name:     functionName,    // pass from calling function
  model_provider:    'openai',
  model_id:          response.modelUsed,
  prompt_tokens:     response.promptTokens,
  completion_tokens: response.completionTokens,
  cost_usd:          response.costEstimateUsd,
  duration_ms:       response.durationMs,
  finish_reason:     response.finishReason ?? 'stop',
  run_id:            context.runId ?? null,
  analysis_id:       context.analysisId ?? null,
});
```

**Verification:**
```sql
SELECT COUNT(*) FROM public.llm_call_logs;
-- Run one analysis, then check count > 0
```

---

---

# STAGE 2 — Growth: RBAC Infrastructure

**Why now:** The current `['user', 'admin']` static enum cannot support:
- P17 (BYOK — bring-your-own-key) requiring scoped API access
- P16 (persona management) requiring role-gated features
- Any enterprise customer needing custom access tiers
- Future team/org features

This stage replaces the enum with proper relational RBAC without breaking existing code.

---

## 2.1 — Roles, Permissions, and Assignment Tables

```sql
-- Migration: 20260319100000_stage2_rbac_tables.sql

-- Canonical role definitions (tenant-scoped in future; global for now)
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,           -- 'owner' | 'admin' | 'member' | 'viewer' | 'api_user'
  slug        TEXT    NOT NULL UNIQUE,    -- url-safe, used in code
  description TEXT,
  is_system   BOOL    NOT NULL DEFAULT false,  -- system roles cannot be deleted
  -- Audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id)
);

-- Seed system roles
INSERT INTO public.roles (name, slug, description, is_system)
VALUES
  ('Owner',       'owner',    'Full account control',             true),
  ('Admin',       'admin',    'Manage users and settings',        true),
  ('Member',      'member',   'Standard user access',             true),
  ('Viewer',      'viewer',   'Read-only access',                 true),
  ('API User',    'api_user', 'Programmatic access via API keys', true)
ON CONFLICT (slug) DO NOTHING;

-- Fine-grained permissions dictionary (global — not per-tenant)
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    TEXT    NOT NULL,  -- 'resumes' | 'analyses' | 'skills' | 'roadmaps' | 'users' | 'billing'
  action      TEXT    NOT NULL,  -- 'create' | 'read' | 'update' | 'delete' | 'export' | 'admin'
  scope       TEXT    NOT NULL DEFAULT 'own',  -- 'own' | 'team' | 'global'
  description TEXT,
  UNIQUE (resource, action, scope)
);

-- Seed core permissions
INSERT INTO public.permissions (resource, action, scope, description) VALUES
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

-- Bridge: which permissions does each role have
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID        NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID        NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by    UUID        REFERENCES auth.users(id),
  UNIQUE (role_id, permission_id)
);

-- Bridge: which roles does each user have
-- Replaces the static user_roles.role enum column over time
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID        REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ,   -- NULL = permanent
  UNIQUE (user_id, role_id)
);

-- Indexes for auth-time lookups (must be fast)
CREATE INDEX IF NOT EXISTS idx_role_assignments_user
  ON public.user_role_assignments (user_id)
  WHERE expires_at IS NULL OR expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
  ON public.role_permissions (role_id);

-- RLS
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read their own role assignments"
  ON public.user_role_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage role assignments"
  ON public.user_role_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    )
  );
```

**Helper function — check permission in RLS policies and edge functions:**
```sql
CREATE OR REPLACE FUNCTION has_permission(p_resource TEXT, p_action TEXT, p_scope TEXT DEFAULT 'own')
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON ura.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = auth.uid()
      AND p.resource = p_resource
      AND p.action   = p_action
      AND p.scope    = p_scope
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  );
$$;
```

**Migration note — backfill existing `user_roles` data:**
```sql
-- Migrate existing user_roles.role enum values into user_role_assignments
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT
  ur.user_id,
  r.id AS role_id
FROM public.user_roles ur
JOIN public.roles r ON r.slug = LOWER(ur.role)
ON CONFLICT (user_id, role_id) DO NOTHING;
-- After verifying, keep user_roles for backward compat during transition
-- then deprecate in a later migration
```

**Verification:**
```sql
SELECT r.slug, COUNT(rp.permission_id) AS permissions_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
GROUP BY r.slug
ORDER BY r.slug;
```

---

## 2.2 — API Keys Table

Required for P17 (BYOK) and programmatic access patterns.
Never store the raw key — only a SHA-256 hash and the first 8 chars for display.

```sql
-- Migration: 20260319110000_stage2_api_keys.sql

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,           -- friendly label
  key_hash      TEXT        NOT NULL UNIQUE,    -- SHA-256 of the raw key
  key_prefix    TEXT        NOT NULL,           -- first 8 chars, safe to display
  scopes        TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. {read:analyses, write:resumes}
  expires_at    TIMESTAMPTZ,                    -- NULL = no expiry
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  -- Audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID        REFERENCES auth.users(id),
  updated_by    UUID        REFERENCES auth.users(id),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_active
  ON public.api_keys (user_id)
  WHERE deleted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON public.api_keys (key_hash)
  WHERE deleted_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own API keys"
  ON public.api_keys FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## 2.3 — Unified `audit_logs` Table

The diagnostic found three fragmented log tables with incompatible schemas:
`account_deletion_logs`, `error_logs`, and `log_entries`.
This creates a single compliance-queryable audit trail.

```sql
-- Migration: 20260319120000_stage2_unified_audit_logs.sql

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who
  actor_id      UUID        REFERENCES auth.users(id),  -- NULL = system action
  actor_type    TEXT        NOT NULL DEFAULT 'user',    -- 'user' | 'system' | 'agent' | 'cron'
  -- What
  action        TEXT        NOT NULL,  -- 'user.created' | 'resume.deleted' | 'analysis.run' etc.
  resource_type TEXT        NOT NULL,  -- table name or domain object
  resource_id   UUID,                  -- the affected row's id
  -- State snapshot
  old_values    JSONB,                 -- row state before change (NULL for INSERT)
  new_values    JSONB,                 -- row state after change (NULL for DELETE)
  -- Context
  ip_address    INET,
  user_agent    TEXT,
  session_id    TEXT,
  metadata      JSONB,                 -- catch-all for extra context
  -- Timestamp
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month for high-volume tables in future
-- For now, cover the primary query patterns
CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON public.audit_logs (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_resource
  ON public.audit_logs (resource_type, resource_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON public.audit_logs (action, occurred_at DESC);

-- Append-only: no UPDATE or DELETE permitted (compliance requirement)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit events"
  ON public.audit_logs FOR SELECT
  USING (actor_id = auth.uid());

CREATE POLICY "Admins can read all audit events"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
        AND r.slug IN ('owner', 'admin')
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    )
  );

-- Only service_role may insert (from edge functions and triggers)
CREATE POLICY "Service role inserts audit events"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- DENY all updates and deletes (append-only enforcement)
CREATE POLICY "No updates allowed on audit_logs"
  ON public.audit_logs FOR UPDATE USING (false);

CREATE POLICY "No deletes allowed on audit_logs"
  ON public.audit_logs FOR DELETE USING (false);
```

**Generic audit trigger to auto-log changes to any table:**
```sql
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, actor_type, action,
    resource_type, resource_id,
    old_values, new_values,
    occurred_at
  ) VALUES (
    auth.uid(),
    'user',
    TG_TABLE_NAME || '.' || LOWER(TG_OP),  -- e.g. 'sats_resumes.delete'
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE')  THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to high-value tables (expand as needed)
CREATE TRIGGER trg_audit_log_sats_resumes
  AFTER INSERT OR UPDATE OR DELETE ON public.sats_resumes
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_log_sats_analyses
  AFTER INSERT OR UPDATE OR DELETE ON public.sats_analyses
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_log_work_experiences
  AFTER INSERT OR UPDATE OR DELETE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER trg_audit_log_user_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
```

---

---

# STAGE 3 — Enterprise: Multi-Tenancy Layer

**Why this stage:** When SATS moves from single-user to team accounts, org accounts,
or enterprise customers — the `tenant_id` must exist on every table from that point forward.
Adding it retroactively to a table with millions of rows requires a backfill migration
that is orders of magnitude more expensive.

This stage adds the structural foundation even if the app stays single-tenant.
`tenant_id` starts nullable and defaults to a "personal" sentinel value.

---

## 3.1 — Tenants Table

```sql
-- Migration: 20260320100000_stage3_tenants_table.sql

CREATE TABLE IF NOT EXISTS public.tenants (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT        NOT NULL UNIQUE,  -- URL-safe subdomain
  name                TEXT        NOT NULL,
  plan_id             UUID,                         -- FK added in Stage 3.2
  status              TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','suspended','cancelled','trial')),
  -- Storage and usage limits
  storage_quota_bytes BIGINT      NOT NULL DEFAULT 5368709120,  -- 5 GB default
  -- Extensible settings
  settings            JSONB       NOT NULL DEFAULT '{}',
  metadata            JSONB       NOT NULL DEFAULT '{}',
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES auth.users(id),
  updated_by          UUID        REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID        REFERENCES auth.users(id)
);

-- Personal tenant for all existing users (backfill in next step)
INSERT INTO public.tenants (id, slug, name, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'personal',
  'Personal',
  'active'
) ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Only superadmin sees all tenants; regular users see their own
CREATE POLICY "Admins read all tenants"
  ON public.tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid() AND r.slug = 'owner'
    )
  );
```

---

## 3.2 — Plans and Subscriptions

```sql
-- Migration: 20260320110000_stage3_plans_subscriptions.sql

CREATE TABLE IF NOT EXISTS public.plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,   -- 'free' | 'pro' | 'teams' | 'enterprise'
  display_name  TEXT        NOT NULL,
  price_cents   INT         NOT NULL DEFAULT 0, -- in base currency (USD cents)
  currency      CHAR(3)     NOT NULL DEFAULT 'USD',
  billing_period TEXT       NOT NULL DEFAULT 'monthly'
                CHECK (billing_period IN ('monthly','annual','lifetime')),
  limits        JSONB       NOT NULL DEFAULT '{}',
  -- e.g. {"seats": 1, "analyses_per_month": 10, "storage_bytes": 5368709120}
  is_active     BOOL        NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO public.plans (name, display_name, price_cents, limits) VALUES
  ('free',       'Free',        0,     '{"seats":1,"analyses_per_month":5,"storage_bytes":1073741824}'),
  ('pro',        'Pro',         1999,  '{"seats":1,"analyses_per_month":100,"storage_bytes":10737418240}'),
  ('teams',      'Teams',       4999,  '{"seats":5,"analyses_per_month":500,"storage_bytes":53687091200}'),
  ('enterprise', 'Enterprise',  0,     '{"seats":-1,"analyses_per_month":-1,"storage_bytes":-1}')
ON CONFLICT (name) DO NOTHING;

-- Add plan FK to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);

-- Default all tenants to free plan
UPDATE public.tenants t
SET plan_id = (SELECT id FROM public.plans WHERE name = 'free')
WHERE plan_id IS NULL;

-- Features dictionary
CREATE TABLE IF NOT EXISTS public.features (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT    NOT NULL UNIQUE,   -- e.g. 'ai_roadmap', 'byok', 'export_pdf'
  name        TEXT    NOT NULL,
  description TEXT,
  category    TEXT    NOT NULL DEFAULT 'core'
              CHECK (category IN ('core','add-on','beta','deprecated')),
  is_enabled  BOOL    NOT NULL DEFAULT true,  -- global kill-switch
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-tenant feature overrides
CREATE TABLE IF NOT EXISTS public.tenant_features (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_id  UUID    NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  is_enabled  BOOL    NOT NULL DEFAULT true,
  config      JSONB   NOT NULL DEFAULT '{}',
  enabled_by  UUID    REFERENCES auth.users(id),
  enabled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, feature_id)
);

ALTER TABLE public.plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read plans"
  ON public.plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated can read features"
  ON public.features FOR SELECT TO authenticated USING (true);
```

---

## 3.3 — Add `tenant_id` to Core Data Tables

This is a **nullable** additive column. All existing rows default to the personal tenant.
RLS policies are updated to use `tenant_id` instead of raw `user_id` once multi-tenancy
is activated.

```sql
-- Migration: 20260320120000_stage3_add_tenant_id.sql

-- Add to all primary data tables
ALTER TABLE public.sats_resumes          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sats_job_descriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sats_analyses         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sats_resume_personas  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sats_user_skills      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sats_skill_experiences ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.work_experiences      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.enriched_experiences  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sats_learning_roadmaps ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.ats_runs              ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.llm_call_logs         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.audit_logs            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Index every tenant_id for RLS performance
CREATE INDEX IF NOT EXISTS idx_sats_resumes_tenant        ON public.sats_resumes (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sats_analyses_tenant       ON public.sats_analyses (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sats_jd_tenant             ON public.sats_job_descriptions (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ats_runs_tenant            ON public.ats_runs (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_llm_logs_tenant            ON public.llm_call_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant          ON public.audit_logs (tenant_id, occurred_at DESC);
```

**Activate tenant-scoped RLS (run when multi-tenancy goes live, not before):**
```sql
-- Pattern for each table — replace user_id = auth.uid() with tenant_id check
-- Only activate once the app sets app.current_tenant_id in middleware

-- Set in Supabase edge function before each query:
-- await supabase.rpc('set_config', { key: 'app.current_tenant_id', value: tenantId })

-- Updated policy (example for sats_resumes):
DROP POLICY IF EXISTS "Users can view their own active resumes" ON public.sats_resumes;
CREATE POLICY "Tenant-scoped resume access"
  ON public.sats_resumes FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND deleted_at IS NULL
  );
```

---

---

# STAGE 4 — Global: Multi-Currency and Multi-Language

**Why now:** Currency and language are data-model decisions, not UI decisions.
Retrofitting `currency_code` onto cost columns with existing rows requires a backfill.
Adding it while tables are small is free.

---

## 4.1 — Currency Support

```sql
-- Migration: 20260321100000_stage4_multi_currency.sql

-- ISO 4217 currency reference
CREATE TABLE IF NOT EXISTS public.currencies (
  code          CHAR(3)     PRIMARY KEY,   -- ISO 4217 e.g. 'USD', 'EUR', 'BRL'
  name          TEXT        NOT NULL,
  symbol        TEXT        NOT NULL,
  decimal_places SMALLINT   NOT NULL DEFAULT 2,
  is_active     BOOL        NOT NULL DEFAULT true
);

INSERT INTO public.currencies (code, name, symbol, decimal_places) VALUES
  ('USD', 'US Dollar',         '$',  2),
  ('EUR', 'Euro',              '€',  2),
  ('GBP', 'British Pound',     '£',  2),
  ('BRL', 'Brazilian Real',    'R$', 2),
  ('CAD', 'Canadian Dollar',   'CA$',2),
  ('AUD', 'Australian Dollar', 'A$', 2),
  ('JPY', 'Japanese Yen',      '¥',  0),
  ('INR', 'Indian Rupee',      '₹',  2)
ON CONFLICT (code) DO NOTHING;

-- Exchange rate snapshots (for billing reports in local currency)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3)     NOT NULL REFERENCES public.currencies(code),
  to_currency   CHAR(3)     NOT NULL REFERENCES public.currencies(code),
  rate          NUMERIC(20,8) NOT NULL,
  source        TEXT        NOT NULL DEFAULT 'manual',  -- 'manual' | 'openexchangerates' | 'fixer'
  effective_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency, effective_at)
);

-- Add currency columns to cost-bearing tables
ALTER TABLE public.llm_call_logs
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'USD'
    REFERENCES public.currencies(code);

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'USD'
    REFERENCES public.currencies(code);

-- User-level currency preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency CHAR(3) NOT NULL DEFAULT 'USD'
    REFERENCES public.currencies(code);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read currencies"
  ON public.currencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read exchange rates"
  ON public.exchange_rates FOR SELECT TO authenticated USING (true);
```

---

## 4.2 — Internationalisation (i18n) Support

```sql
-- Migration: 20260321110000_stage4_i18n.sql

-- Supported locales
CREATE TABLE IF NOT EXISTS public.locales (
  code        TEXT        PRIMARY KEY,   -- BCP 47 e.g. 'en-US', 'pt-BR', 'fr-FR'
  name        TEXT        NOT NULL,
  native_name TEXT        NOT NULL,
  direction   TEXT        NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr','rtl')),
  is_active   BOOL        NOT NULL DEFAULT true
);

INSERT INTO public.locales (code, name, native_name) VALUES
  ('en-US', 'English (US)',        'English'),
  ('pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)'),
  ('es-419','Spanish (LATAM)',     'Español (Latinoamérica)'),
  ('fr-FR', 'French',              'Français'),
  ('de-DE', 'German',              'Deutsch'),
  ('ja-JP', 'Japanese',            '日本語')
ON CONFLICT (code) DO NOTHING;

-- User locale preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'en-US'
    REFERENCES public.locales(code);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Translatable content table (for system strings, email templates, UI labels)
CREATE TABLE IF NOT EXISTS public.translations (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace   TEXT    NOT NULL,      -- 'email' | 'ui' | 'notifications' | 'skill_names'
  key         TEXT    NOT NULL,      -- 'welcome_subject' | 'analysis_complete'
  locale      TEXT    NOT NULL REFERENCES public.locales(code),
  value       TEXT    NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (namespace, key, locale)
);

ALTER TABLE public.locales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read locales"
  ON public.locales FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can read translations"
  ON public.translations FOR SELECT TO authenticated USING (true);
```

---

---

# STAGE 5 — AI/RAG: Vector and Agent Infrastructure

**Why this stage:** The diagnostic confirmed zero RAG infrastructure.
This stage installs pgvector, creates the knowledge base pipeline tables,
and adds persistent agent state tables to support the 17 Claude agents currently
operating without any DB-layer memory or handoff tracking.

---

## 5.1 — pgvector Extension and Knowledge Base

```sql
-- Migration: 20260322100000_stage5_pgvector_knowledge_base.sql

-- Install pgvector (Supabase Cloud supports this natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge source registry
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  name                  TEXT        NOT NULL,
  type                  TEXT        NOT NULL
                        CHECK (type IN ('pdf','url','database','api','upload','crawl')),
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','indexing','ready','failed','stale')),
  -- Embedding config — record which model produced these vectors
  embedding_model       TEXT        NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_dimensions  INT         NOT NULL DEFAULT 1536,
  -- Chunking strategy
  chunk_strategy        TEXT        NOT NULL DEFAULT 'recursive'
                        CHECK (chunk_strategy IN ('fixed','semantic','recursive')),
  chunk_size_tokens     INT         NOT NULL DEFAULT 512,
  chunk_overlap_tokens  INT         NOT NULL DEFAULT 64,
  total_chunks          INT,
  -- Source config
  config                JSONB       NOT NULL DEFAULT '{}',
  -- Audit
  last_indexed_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID        REFERENCES auth.users(id),
  updated_by            UUID        REFERENCES auth.users(id),
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID        REFERENCES auth.users(id)
);

-- Document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  source_id           UUID        NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  -- Content
  content             TEXT        NOT NULL,
  embedding           VECTOR(1536),             -- pgvector column
  -- Position metadata
  chunk_index         INT         NOT NULL,
  token_count         INT,
  page_number         INT,
  section_heading     TEXT,
  -- Enrichment
  language            CHAR(5)     NOT NULL DEFAULT 'en-US',
  metadata            JSONB       NOT NULL DEFAULT '{}',
  -- Model snapshot (critical — never mix models)
  embedding_model     TEXT        NOT NULL DEFAULT 'text-embedding-3-small',
  -- Timestamps
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for approximate nearest-neighbour search (preferred over IVFFlat)
-- m=16, ef_construction=64 is a good starting point; tune for recall vs latency
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_document_chunks_source
  ON public.document_chunks (source_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant
  ON public.document_chunks (tenant_id);

-- RAG query log (your empirical optimisation loop)
CREATE TABLE IF NOT EXISTS public.rag_queries (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id),
  user_id             UUID        REFERENCES auth.users(id),
  session_id          UUID,                     -- FK to ai_sessions once created
  query_text          TEXT        NOT NULL,
  query_embedding     VECTOR(1536),
  retrieved_chunk_ids UUID[]      NOT NULL DEFAULT '{}',
  similarity_scores   FLOAT[]     NOT NULL DEFAULT '{}',
  retrieval_strategy  TEXT        NOT NULL DEFAULT 'semantic'
                      CHECK (retrieval_strategy IN ('semantic','hybrid','keyword')),
  top_k               INT         NOT NULL DEFAULT 5,
  latency_ms          INT,
  feedback_score      SMALLINT    CHECK (feedback_score BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_queries       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own knowledge sources"
  ON public.knowledge_sources FOR ALL
  USING (tenant_id = '00000000-0000-0000-0000-000000000001' OR created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users access chunks from their sources"
  ON public.document_chunks FOR SELECT
  USING (
    source_id IN (
      SELECT id FROM public.knowledge_sources
      WHERE created_by = auth.uid() AND deleted_at IS NULL
    )
  );
```

**Semantic search function (used by edge functions):**
```sql
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding     VECTOR(1536),
  match_threshold     FLOAT   DEFAULT 0.7,
  match_count         INT     DEFAULT 5,
  p_tenant_id         UUID    DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  content         TEXT,
  similarity      FLOAT,
  source_id       UUID,
  section_heading TEXT,
  metadata        JSONB
)
LANGUAGE sql STABLE AS $$
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.source_id,
    dc.section_heading,
    dc.metadata
  FROM public.document_chunks dc
  WHERE
    (p_tenant_id IS NULL OR dc.tenant_id = p_tenant_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 5.2 — AI Agent Registry and Session State

```sql
-- Migration: 20260322110000_stage5_ai_agent_infrastructure.sql

-- Agent registry (covers the 17 existing Claude Code agents and future runtime agents)
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id),
  slug                TEXT        NOT NULL,     -- matches .claude/agents/<slug>.md
  name                TEXT        NOT NULL,
  type                TEXT        NOT NULL DEFAULT 'worker'
                      CHECK (type IN ('orchestrator','worker','retriever','evaluator','scaffolder')),
  model_provider      TEXT        NOT NULL DEFAULT 'anthropic',
  model_id            TEXT        NOT NULL,     -- e.g. 'claude-sonnet-4-6'
  system_prompt       TEXT,
  tools               JSONB       NOT NULL DEFAULT '{}',   -- MCP server URLs, tool schemas
  knowledge_source_ids UUID[]     NOT NULL DEFAULT '{}',  -- linked RAG sources
  max_tokens          INT,
  temperature         FLOAT       NOT NULL DEFAULT 0.0,
  status              TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','paused','deprecated')),
  version             INT         NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES auth.users(id),
  updated_by          UUID        REFERENCES auth.users(id),
  UNIQUE (slug, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID))
);

-- Seed the 17 existing Claude Code agents from .claude/agents/
INSERT INTO public.ai_agents (slug, name, type, model_provider, model_id, status) VALUES
  ('adr-author',          'ADR Author',              'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('arch-reviewer',       'Architecture Reviewer',   'evaluator',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('component-scaffolder','Component Scaffolder',    'scaffolder',  'anthropic', 'claude-sonnet-4-6', 'active'),
  ('convention-auditor',  'Convention Auditor',      'evaluator',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('e2e-validator',       'E2E Validator',           'evaluator',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('edge-fn-scaffolder',  'Edge Function Scaffolder','scaffolder',  'anthropic', 'claude-sonnet-4-6', 'active'),
  ('incident-responder',  'Incident Responder',      'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('llm-eval-runner',     'LLM Eval Runner',         'evaluator',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('migration-writer',    'Migration Writer',        'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('plan-decomposer',     'Plan Decomposer',         'orchestrator','anthropic', 'claude-sonnet-4-6', 'active'),
  ('railway-deployer',    'Railway Deployer',        'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('release-gatekeeper',  'Release Gatekeeper',      'evaluator',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('security-auditor',    'Security Auditor',        'evaluator',   'anthropic', 'claude-sonnet-4-6', 'active'),
  ('test-runner',         'Test Runner',             'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('test-writer',         'Test Writer',             'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('product-analyst',     'Product Analyst',         'worker',      'anthropic', 'claude-sonnet-4-6', 'active'),
  ('changelog-keeper',    'Changelog Keeper',        'worker',      'anthropic', 'claude-sonnet-4-6', 'active')
ON CONFLICT DO NOTHING;

-- Persistent agent conversation sessions
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id),
  user_id             UUID        REFERENCES auth.users(id),
  agent_id            UUID        NOT NULL REFERENCES public.ai_agents(id),
  channel             TEXT        NOT NULL DEFAULT 'web'
                      CHECK (channel IN ('web','api','slack','email','cron','claude-code')),
  status              TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','completed','error','timeout','cancelled')),
  context             JSONB       NOT NULL DEFAULT '{}',
  memory_summary      TEXT,           -- compressed long-term context
  -- Cost rollups (updated per turn)
  total_input_tokens  INT         NOT NULL DEFAULT 0,
  total_output_tokens INT         NOT NULL DEFAULT 0,
  total_cost_usd      NUMERIC(12,6) NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ
);

-- Individual messages in a session
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id),
  session_id          UUID        NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  role                TEXT        NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content             TEXT        NOT NULL,
  turn_index          INT         NOT NULL,
  -- Tool use (MCP / function calling)
  tool_calls          JSONB       NOT NULL DEFAULT '[]',
  tool_results        JSONB       NOT NULL DEFAULT '[]',
  -- RAG linkage
  retrieved_chunks    UUID[]      NOT NULL DEFAULT '{}',
  -- Observability
  input_tokens        INT         NOT NULL DEFAULT 0,
  output_tokens       INT         NOT NULL DEFAULT 0,
  cache_read_tokens   INT         NOT NULL DEFAULT 0,   -- Anthropic prompt cache hits
  latency_ms          INT,
  cost_usd            NUMERIC(12,6) NOT NULL DEFAULT 0,
  feedback_score      SMALLINT    CHECK (feedback_score BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, turn_index)
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user     ON public.ai_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_agent    ON public.ai_sessions (agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session  ON public.ai_messages (session_id, turn_index);

ALTER TABLE public.ai_agents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read agent definitions"
  ON public.ai_agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users access their own sessions"
  ON public.ai_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users access messages in their sessions"
  ON public.ai_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.ai_sessions WHERE user_id = auth.uid()
    )
  );
```

---

## 5.3 — Multi-Agent Orchestration Tables

```sql
-- Migration: 20260322120000_stage5_agent_orchestration.sql

-- Tasks assigned to agents (the DB-layer coordination layer)
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        REFERENCES public.tenants(id),
  session_id          UUID        REFERENCES public.ai_sessions(id),
  parent_task_id      UUID        REFERENCES public.agent_tasks(id),  -- subtask hierarchy
  assigned_agent_id   UUID        NOT NULL REFERENCES public.ai_agents(id),
  objective           TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed','cancelled','awaiting_review')),
  priority            SMALLINT    NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  input_payload       JSONB       NOT NULL DEFAULT '{}',
  output_payload      JSONB,
  retry_count         INT         NOT NULL DEFAULT 0,
  max_retries         INT         NOT NULL DEFAULT 2,
  requires_human_review BOOL      NOT NULL DEFAULT false,
  reviewed_by         UUID        REFERENCES auth.users(id),
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  started_at          TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID        REFERENCES auth.users(id)
);

-- Handoff log — the most critical table for debugging multi-agent pipelines
CREATE TABLE IF NOT EXISTS public.agent_handoffs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  task_id         UUID        NOT NULL REFERENCES public.agent_tasks(id),
  from_agent_id   UUID        NOT NULL REFERENCES public.ai_agents(id),
  to_agent_id     UUID        NOT NULL REFERENCES public.ai_agents(id),
  reason          TEXT        NOT NULL,
  context_passed  JSONB       NOT NULL DEFAULT '{}',
  protocol        TEXT        NOT NULL DEFAULT 'internal'
                  CHECK (protocol IN ('mcp','a2a','api','queue','internal')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent memory (persistent context across sessions)
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  agent_id        UUID        NOT NULL REFERENCES public.ai_agents(id),
  user_id         UUID        REFERENCES auth.users(id),  -- NULL = global agent memory
  scope           TEXT        NOT NULL DEFAULT 'user'
                  CHECK (scope IN ('ephemeral','session','user','global')),
  key             TEXT        NOT NULL,
  value           JSONB       NOT NULL DEFAULT '{}',
  value_embedding VECTOR(1536),    -- for semantic memory retrieval
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID), key, scope)
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_session    ON public.agent_tasks (session_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent      ON public.agent_tasks (assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_task    ON public.agent_handoffs (task_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user      ON public.agent_memory (agent_id, user_id, scope);

ALTER TABLE public.agent_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own agent tasks"
  ON public.agent_tasks FOR ALL
  USING (
    session_id IN (SELECT id FROM public.ai_sessions WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Users access handoffs in their tasks"
  ON public.agent_handoffs FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.agent_tasks
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users access their agent memory"
  ON public.agent_memory FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());
```

---

## 5.4 — Prompt Template Versioning

Moves inline prompts (currently hardcoded in edge functions) into the database
with version tracking. This enables A/B testing and regression detection.

```sql
-- Migration: 20260322130000_stage5_prompt_templates.sql

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  agent_id        UUID        REFERENCES public.ai_agents(id),
  name            TEXT        NOT NULL,   -- e.g. 'ats-analysis-system-prompt'
  role            TEXT        NOT NULL DEFAULT 'system'
                  CHECK (role IN ('system','user','assistant')),
  template        TEXT        NOT NULL,   -- body with {{variable}} slots
  variables       JSONB       NOT NULL DEFAULT '{}',  -- expected variable schema
  version         INT         NOT NULL DEFAULT 1,
  is_active       BOOL        NOT NULL DEFAULT true,
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID        REFERENCES auth.users(id),
  updated_by      UUID        REFERENCES auth.users(id),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (name, version, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID))
);

-- Add prompt linkage to llm_call_logs
ALTER TABLE public.llm_call_logs
  ADD COLUMN IF NOT EXISTS prompt_template_id UUID REFERENCES public.prompt_templates(id),
  ADD COLUMN IF NOT EXISTS prompt_version      INT;

-- AI evaluation scores (enables LLM-as-judge and human eval workflows)
CREATE TABLE IF NOT EXISTS public.ai_evaluations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  message_id      UUID        NOT NULL REFERENCES public.ai_messages(id),
  evaluator_type  TEXT        NOT NULL DEFAULT 'automated'
                  CHECK (evaluator_type IN ('human','llm-judge','automated','rule-based')),
  evaluator_id    UUID,       -- FK to users.id or ai_agents.id depending on evaluator_type
  metric          TEXT        NOT NULL,
  -- e.g. 'faithfulness' | 'relevance' | 'hallucination_rate' | 'safety' | 'ats_accuracy'
  score           FLOAT       NOT NULL CHECK (score BETWEEN 0 AND 1),
  reasoning       TEXT,
  expected_output TEXT,
  evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_evals_message ON public.ai_evaluations (message_id, metric);
CREATE INDEX IF NOT EXISTS idx_ai_evals_metric  ON public.ai_evaluations (metric, evaluated_at DESC);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluations   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their tenant prompt templates"
  ON public.prompt_templates FOR SELECT
  USING (tenant_id IS NULL OR created_by = auth.uid());

CREATE POLICY "Admins manage prompt templates"
  ON public.prompt_templates FOR ALL
  USING (has_permission('prompts', 'admin', 'global'));
```

---

---

# STAGE 6 — Modern API Patterns

## 6.1 — Idempotency Keys

```sql
-- Migration: 20260323100000_stage6_idempotency.sql

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  key             TEXT        NOT NULL,     -- client-supplied idempotency key
  endpoint        TEXT        NOT NULL,     -- e.g. 'POST /api/v1/analyses'
  response_status INT         NOT NULL,
  response_body   JSONB       NOT NULL DEFAULT '{}',
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
  ON public.idempotency_keys (user_id, key, endpoint)
  WHERE expires_at > NOW();

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own idempotency keys"
  ON public.idempotency_keys FOR ALL
  USING (user_id = auth.uid());
```

---

## 6.2 — Transactional Outbox

Prevents dual-write inconsistency when triggering agent tasks, webhooks,
or downstream integrations. Write event in the same DB transaction as business data;
a background worker publishes to message bus.

```sql
-- Migration: 20260323110000_stage6_outbox_events.sql

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  event_type      TEXT        NOT NULL,   -- e.g. 'analysis.completed', 'user.deleted'
  aggregate_type  TEXT        NOT NULL,   -- 'analyses' | 'users' | 'ats_runs'
  aggregate_id    UUID        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','published','failed','dead_letter')),
  retry_count     INT         NOT NULL DEFAULT 0,
  max_retries     INT         NOT NULL DEFAULT 3,
  published_at    TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for worker polling query
CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON public.outbox_events (created_at ASC)
  WHERE status = 'pending';

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages outbox"
  ON public.outbox_events FOR ALL
  USING (true); -- service_role bypasses; no direct user access
```

---

## 6.3 — Rate Limit Counters

```sql
-- Migration: 20260323120000_stage6_rate_limits.sql

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES public.tenants(id),
  user_id         UUID        REFERENCES auth.users(id),
  resource        TEXT        NOT NULL,   -- 'api_calls' | 'ai_tokens' | 'analyses' | 'storage_writes'
  window_start    TIMESTAMPTZ NOT NULL,
  window_seconds  INT         NOT NULL,   -- 60 | 3600 | 86400
  count           INT         NOT NULL DEFAULT 0,
  limit_value     INT         NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (COALESCE(user_id::text, tenant_id::text), resource, window_start, window_seconds)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_resource
  ON public.rate_limit_counters (user_id, resource, window_start DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own rate limit state"
  ON public.rate_limit_counters FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limit_counters FOR ALL
  USING (true);
```

---

---

# Summary: Migration Execution Order

| Order | Migration File | Stage | Priority |
|-------|---------------|-------|----------|
| 1 | `20260318000000_universal_audit_trigger.sql` | MVP | Critical |
| 2 | `20260318100000_stage1_add_created_by_updated_by.sql` | MVP | Critical |
| 3 | `20260318110000_stage1_add_deleted_by.sql` | MVP | Critical |
| 4 | `20260318120000_stage1_add_missing_deleted_at.sql` | MVP | Critical |
| 5 | `20260318130000_stage1_add_version_column.sql` | MVP | High |
| 6 | `20260318140000_stage1_llm_call_logs.sql` | MVP | Critical |
| 7 | `20260319100000_stage2_rbac_tables.sql` | Growth | Critical |
| 8 | `20260319110000_stage2_api_keys.sql` | Growth | High |
| 9 | `20260319120000_stage2_unified_audit_logs.sql` | Growth | Critical |
| 10 | `20260320100000_stage3_tenants_table.sql` | Enterprise | High |
| 11 | `20260320110000_stage3_plans_subscriptions.sql` | Enterprise | High |
| 12 | `20260320120000_stage3_add_tenant_id.sql` | Enterprise | High |
| 13 | `20260321100000_stage4_multi_currency.sql` | Global | Medium |
| 14 | `20260321110000_stage4_i18n.sql` | Global | Medium |
| 15 | `20260322100000_stage5_pgvector_knowledge_base.sql` | AI/RAG | High |
| 16 | `20260322110000_stage5_ai_agent_infrastructure.sql` | AI/RAG | High |
| 17 | `20260322120000_stage5_agent_orchestration.sql` | AI/RAG | Medium |
| 18 | `20260322130000_stage5_prompt_templates.sql` | AI/RAG | Medium |
| 19 | `20260323100000_stage6_idempotency.sql` | Modern API | Medium |
| 20 | `20260323110000_stage6_outbox_events.sql` | Modern API | Medium |
| 21 | `20260323120000_stage6_rate_limits.sql` | Modern API | Low |

---

# Key Decisions and Rationale

**Why `created_by` references `auth.users(id)` instead of `sats_users_public.id`?**  
Supabase's `auth.users` is the source of truth for identity. `sats_users_public` is a
profile extension. Referencing `auth.users` directly ensures the FK is valid even if the
profile row hasn't been created yet (e.g. during signup race conditions).

**Why is `tenant_id` nullable in Stage 3 rather than `NOT NULL`?**  
Adding `NOT NULL` to an existing column with rows requires either a DEFAULT or a backfill
migration, both of which can lock the table. Making it nullable with a default of the
personal tenant sentinel allows a zero-downtime additive migration. Set `NOT NULL` after
backfill is confirmed.

**Why keep `user_roles` table alongside `user_role_assignments`?**  
Backward compatibility. The existing TypeScript types and RLS policies reference the
static `user_roles` table. Deprecate it in a separate PR after the frontend and all
edge functions are migrated to query `user_role_assignments` instead.

**Why HNSW over IVFFlat for the vector index?**  
HNSW provides better query-time performance and does not require a training step
(IVFFlat requires `VACUUM ANALYZE` after bulk inserts). For a growing knowledge base
where documents are added incrementally, HNSW is the right default.

**Why store `embedding_model` on every chunk row?**  
When you upgrade embedding models, you need to know exactly which chunks were produced
by which model to do targeted re-indexing. Comparing vectors from different models
produces semantically meaningless similarity scores.
