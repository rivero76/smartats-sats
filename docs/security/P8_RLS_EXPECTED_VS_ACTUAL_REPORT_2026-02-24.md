# P8.1 RLS Expected vs Actual Report

**Date (UTC):** 2026-02-24  
**Source of truth:** Remote schema dump (`supabase db dump --schema public`)  
**Evaluated migration:** `20260224235000_p8_rls_tenant_isolation_hardening.sql`

## Summary

- **Overall status:** `PARTIAL PASS`
- **Pass:** Core tenant-isolation hardening controls from P8.1 are present in remote policy state.
- **Open items:** A few policy-integrity and data-governance items remain and should be handled in next hardening increment.

## Expected vs Actual Matrix

| Control | Expected | Actual | Status |
|---|---|---|---|
| `account_deletion_logs` insert locked to owner | `TO authenticated` + `WITH CHECK (auth.uid() = user_id)` | `Users can insert own deletion logs` found exactly as expected | PASS |
| `account_deletion_logs` admin read role hygiene | `Admins can view deletion logs` scoped to `authenticated` | Found as `FOR SELECT TO authenticated USING has_role(...)` | PASS |
| `document_extractions` duplicate policy families removed | Only `Users can * for own resumes` policy set remains | Legacy `extraction_insert/select/update` policies absent; strict set present | PASS |
| `document_extractions` update anti-escalation | Explicit `WITH CHECK` on UPDATE | `Users can update extractions for own resumes` has explicit `WITH CHECK` | PASS |
| Owner/tenant policies moved from `public` to `authenticated` | Core owner policies should be `TO authenticated` | Verified for `ats_* owner`, `enriched_experiences`, `sats_*`, `work_experiences`, `resume_*` | PASS |
| `resume_update` ownership lock | `USING user_id = auth.uid()` + explicit `WITH CHECK` | Found with explicit `WITH CHECK` | PASS |
| `sats_users_public` update ownership lock | Explicit `WITH CHECK (auth.uid() = auth_user_id)` | Found with explicit `WITH CHECK` | PASS |
| `enriched_experiences` update anti-escalation | Explicit `WITH CHECK (auth.uid() = user_id)` | Found with explicit `WITH CHECK` | PASS |

## Residual Gaps (Post-P8.1)

### 1) Shared dictionary write permissiveness

- `sats_companies`: `Users can insert companies for their job descriptions` uses `WITH CHECK (true)`.
- `sats_locations`: `Users can insert locations for their job descriptions` uses `WITH CHECK (true)`.

**Risk:** Authenticated users can write arbitrary shared reference data (integrity/spam risk).  
**Recommendation:** Move inserts behind trusted RPC/edge function or add ownership/approval model.

### 2) Admin ALL policies without explicit WITH CHECK (consistency hardening)

Some admin `FOR ALL` policies rely only on `USING has_role(...)` with no explicit `WITH CHECK`.  
This is usually safe for admin-only paths but inconsistent with strict explicit-check posture.

**Recommendation:** Add explicit `WITH CHECK (has_role(auth.uid(), 'admin'::app_role))` where missing.

### 3) Table GRANT surface is broad (RLS still active)

Schema dump shows several `GRANT ALL ON TABLE ... TO anon/authenticated`.  
RLS is enabled and policies gate access, so this is not an immediate tenant-breach by itself.

**Recommendation:** For defense-in-depth, reduce table grants where practical and rely on least-privilege grants + RLS.

## Evidence Snippets (from remote dump)

- `CREATE POLICY "Users can insert own deletion logs" ... TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));`
- `CREATE POLICY "Users can update extractions for own resumes" ... WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ... )));`
- `CREATE POLICY "resume_update" ... TO "authenticated" ... WITH CHECK (("user_id" = "auth"."uid"()));`
- `CREATE POLICY "Users can update their own record" ... TO "authenticated" ... WITH CHECK (("auth"."uid"() = "auth_user_id"));`

## Verdict

The **P8.1 migration goals are substantially achieved** and remote policy state reflects the intended hardening controls.  
Proceed with next iteration to close residual data-governance and explicit-admin-check consistency gaps.
