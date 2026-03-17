# ADR-0006 — RLS-First Tenant Isolation Model

<!-- UPDATE LOG -->
<!-- 2026-03-18 00:00:00 | CR4-6: Created ADR documenting RLS-first tenant isolation architecture decision. -->

**Status:** Accepted
**Date:** 2026-03-18
**Deciders:** SmartATS engineering
**Phase:** P8 (baseline), P16 (hardened)

---

## Context

SmartATS is a multi-tenant SaaS application where every user has exclusive ownership of their data: resumes, job descriptions, ATS analyses, enriched experiences, and roadmaps. Each row in every `sats_*` table has a `user_id` column that references `auth.users.id`.

Two approaches exist for enforcing tenant data isolation:

1. **Application-layer isolation**: The application code (edge functions and frontend) is responsible for always appending `WHERE user_id = <current_user>` to every query. Isolation fails if any code path omits the filter.

2. **Database-layer isolation (RLS)**: Postgres Row-Level Security policies are defined per table. The database engine enforces isolation for every query, regardless of what the application sends. Isolation cannot be bypassed by a bug in application code.

---

## Decision

All tenant data isolation is enforced at the **RLS (Row-Level Security) layer**. Application code must not be relied upon as the primary isolation mechanism.

---

## Rationale

### Defense in depth

Application code can have bugs. A forgotten `.eq('user_id', user.id)` in a new edge function would expose all users' data to the requester. RLS ensures that even if application code omits the filter, the database will still return only rows the authenticated user owns.

### Postgres guarantees

PostgreSQL evaluates RLS policies using `auth.uid()` — the JWT sub claim from the Supabase session. This is cryptographically verified per request. There is no way for a client to claim a different `user_id` than their verified identity.

### Supabase architecture alignment

Supabase exposes the Postgres RLS surface directly to client-side Supabase SDK calls. The anon key can safely be used in the browser because RLS prevents cross-tenant reads even if the key is exposed.

### Audit trail

RLS policies are migration-tracked SQL artifacts. The isolation rules are inspectable, version-controlled, and testable independently of application logic. Application-layer filters are invisible to database-level audits.

---

## Implementation (P8 Migration Evidence)

Migration `20260224235000_p8_rls_tenant_isolation_hardening.sql` is the canonical P8 hardening bundle. Key patterns established:

### SELECT policies — owner-only reads

```sql
CREATE POLICY "Users can view own analyses"
  ON public.sats_analyses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### INSERT policies — WITH CHECK prevents spoofed user_id

```sql
CREATE POLICY "Users can create extractions for own resumes"
  ON public.document_extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sats_resumes r
      WHERE r.id = document_extractions.resume_id
        AND r.user_id = auth.uid()
    )
  );
```

The `WITH CHECK` clause on INSERT/UPDATE ensures a user cannot insert a row with another user's `user_id`. The `EXISTS` sub-select on join tables ensures the parent record also belongs to the same user.

### Admin access via role check

Admin-only rows (e.g. deletion logs) use a `has_role()` function:

```sql
CREATE POLICY "Admins can view deletion logs"
  ON public.account_deletion_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### Service role bypass (internal systems only)

`async-ats-scorer` and other background workers use `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. This is intentional — these are trusted internal processes, not user requests. Service role usage must be explicitly documented and is never exposed to the client.

---

## Application-Layer Responsibilities

While RLS is the primary isolation gate, application code must:

1. **Always pass the authenticated user's JWT** when calling Supabase from edge functions that act on behalf of users (not service role).
2. **Not hard-code `user_id` values** — always derive from `auth.uid()` or the verified JWT.
3. **Not disable RLS** on any `sats_*` table without a documented reason and a compensating control.

---

## Tables with RLS Enabled

All `sats_*` tables have RLS enabled. Key legacy tables (`document_extractions`, `error_logs`, `account_deletion_logs`, `profiles`) also have RLS enabled. The P16 shared reference tables (`sats_locations`, `sats_companies`) use open authenticated-read policies (`USING (true)`) because they contain no per-user private data.

---

## Consequences

- **Security by default**: New tables added via migration inherit the pattern. Any developer adding a new `sats_*` table must add RLS policies before the migration is merged.
- **Performance**: RLS policy evaluation adds a small constant cost per query (~microseconds). Not material at current scale.
- **Testing**: RLS can be tested directly in Postgres with `SET role = anon` / `SET LOCAL jwt.claims.sub = '<user_id>'`. Edge function integration tests should include cross-tenant access assertions.
- **Service role discipline**: The service role key must never be passed to client-side code. Edge functions using service role must be clearly documented as internal-only.
