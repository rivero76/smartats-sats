# RLS Baseline Checklist

Purpose: prevent regressions in tenant isolation and avoid permissive policy drift.

## Change Rules

1. Every table in `public` exposed to PostgREST must have RLS enabled.
2. Every RLS-enabled table must have at least one policy.
3. User-owned tables must enforce `auth.uid() = user_id`:
   - `USING` for `SELECT/UPDATE/DELETE`
   - `WITH CHECK` for `INSERT/UPDATE`
4. Avoid `WITH CHECK (true)` and `USING (true)` on write policies.
5. Admin/system tables should be `authenticated` + explicit admin guard:
   - `has_role(auth.uid(), 'admin'::app_role)`
6. Prefer `TO authenticated` over `TO public` unless anonymous access is explicitly required.
7. Soft-delete models must have both:
   - read path condition (for active rows, if intended)
   - update `WITH CHECK` that preserves tenant ownership

## Pre-Deploy Verification SQL

```sql
-- A) RLS disabled in public schema
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = false
order by 1,2;

-- B) RLS enabled but no policies
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = true
group by 1,2
having count(p.policyname) = 0
order by 1,2;

-- C) Always-true write policies (high-risk)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT','UPDATE','DELETE','ALL')
  and (
    coalesce(trim(with_check), '') in ('true', '(true)')
    or coalesce(trim(qual), '') in ('true', '(true)')
  )
order by tablename, policyname;

-- D) Write policies missing WITH CHECK
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT','UPDATE','ALL')
  and with_check is null
order by tablename, policyname;
```

## Release Gate

Treat any non-empty result from sections A/B/C as release-blocking.

For section D:
- valid only when table is intentionally read-only for end users;
- otherwise add/adjust `WITH CHECK`.

## Operations Note

After every security migration:
1. Run `supabase db push`.
2. Re-run Supabase Security Advisor.
3. Store query output in `docs/security/` with date stamp if changes touched RLS.
