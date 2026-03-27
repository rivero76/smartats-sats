# Database Architecture Diagnostic Report: SmartATS (SATS)

**Scan Date:** 2026-03-27 | **Latest Migration:** `20260317160000` (2026-03-17)
**Requested by:** Ricardo Rivero
**Performed by:** Claude Code (product-analyst session)
**Purpose:** Enterprise-readiness baseline assessment. Identify schema gaps across audit trail, RLS, soft-delete, RBAC, RAG, and LLM observability layers before beginning P20 Data Safety & Contamination Recovery and future enterprise phases (P8, P12, P17).

---

## 1. Project Overview

| Aspect                  | Finding                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| **Project**             | SmartATS (SATS)                                                          |
| **Primary Language**    | React 18.3 + TypeScript (frontend); Deno + TypeScript (edge functions)   |
| **Database Engine**     | PostgreSQL (via Supabase Cloud — project ref: `nkgscksbgmzhizohobhg`)    |
| **ORM / Query Builder** | Supabase PostgREST + raw SQL — no ORM layer                              |
| **Migration Tool**      | Supabase migrations (59 `.sql` files, 14-digit UTC timestamp naming)     |
| **Deployment**          | Supabase Cloud + Railway (LinkedIn scraper) + Docker multi-stage (nginx) |

---

## 2. Current Table Inventory

**Total Tables: 37** (31 in public schema + legacy tables)

| Table                     | Key Columns                                                                   | RLS | Soft Delete | Audit Cols                                         |
| ------------------------- | ----------------------------------------------------------------------------- | --- | ----------- | -------------------------------------------------- |
| `account_deletion_logs`   | id, user_id, created_at                                                       | ✓   | ✗           | created_at                                         |
| `ats_derivatives`         | id, resume_id, bucket, object_key, created_at                                 | ✓   | ✗           | created_at                                         |
| `ats_findings`            | id, run_id, finding_type, label                                               | ✓   | ✗           | —                                                  |
| `ats_job_documents`       | id, job_id, bucket, object_key, created_at                                    | ✓   | ✗           | created_at                                         |
| `ats_jobs`                | id, user_id, title, description, created_at, deleted_at                       | ✓   | ✓           | created_at, deleted_at                             |
| `ats_resumes`             | id, user_id, bucket, object_key, created_at, deleted_at                       | ✓   | ✓           | created_at, deleted_at                             |
| `ats_runs`                | id, user_id, resume_id, job_id, status, started_at, finished_at, deleted_at   | ✓   | ✓           | created_at, started_at, finished_at, deleted_at    |
| `ats_scores`              | run_id, ats_match_score, confidence, gap_risk                                 | ✓   | ✗           | —                                                  |
| `cost_tracking`           | id, service_name, cost_amount, created_at                                     | ✓   | ✗           | created_at                                         |
| `document_extractions`    | id, resume_id, extracted_text, created_at, updated_at                         | ✓   | ✗           | created_at, updated_at                             |
| `enriched_experiences`    | id, user_id, resume_id, skill_name, deleted_at, deleted_reason                | ✓   | ✓           | created_at, updated_at, deleted_at, deleted_reason |
| `error_logs`              | id, error_type, error_message, created_at                                     | ✓   | ✗           | created_at                                         |
| `log_cleanup_policies`    | id, script_name, retention_days, created_at, updated_at                       | ✓   | ✗           | created_at, updated_at                             |
| `log_entries`             | id, script_name, log_level, message, created_at                               | ✓   | ✗           | created_at                                         |
| `log_settings`            | id, script_name, logging_enabled, updated_at                                  | ✓   | ✗           | created_at, updated_at                             |
| `profiles`                | id, user_id, email, deleted_at, deletion_requested_at, deletion_scheduled_for | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_analyses`           | id, user_id, resume_id, jd_id, ats_score, status, deleted_at                  | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_companies`          | id, name, industry, website                                                   | ✓   | ✗           | created_at, updated_at                             |
| `sats_job_descriptions`   | id, user_id, name, jd_id, company_id, location_id, deleted_at                 | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_job_skills`         | id, job_id, skill_id, extracted_at                                            | ✓   | ✗           | extracted_at                                       |
| `sats_learning_roadmaps`  | id, user_id, target_role, status                                              | ✓   | ✗           | created_at, updated_at                             |
| `sats_locations`          | id, city, state, country                                                      | ✓   | ✗           | created_at, updated_at                             |
| `sats_resumes`            | id, user_id, name, file_url, deleted_at                                       | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_resume_personas`    | id, user_id, persona_name, target_role_family, is_active, deleted_at          | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_roadmap_milestones` | id, roadmap_id, skill_name, is_completed                                      | ✓   | ✗           | created_at, updated_at                             |
| `sats_runtime_settings`   | key (PK), value, description                                                  | ✓   | ✗           | created_at, updated_at                             |
| `sats_skill_experiences`  | id, user_id, skill_id, company_id, job_title, deleted_at                      | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_skills`             | id, name                                                                      | ✓   | ✗           | created_at, updated_at                             |
| `sats_staged_jobs`        | id, source, source_url, title, status                                         | ✓   | ✗           | created_at, updated_at                             |
| `sats_user_notifications` | id, user_id, type, title, message, is_read, read_at                           | ✓   | ✗           | created_at, updated_at                             |
| `sats_user_skills`        | id, user_id, skill_id, proficiency_level, deleted_at                          | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `sats_users_public`       | id, auth_user_id, name, role, deleted_at, deletion_requested_at               | ✓   | ✓           | created_at, updated_at, deleted_at                 |
| `service_status`          | id, service_name, status, last_checked                                        | ✓   | ✗           | created_at, updated_at                             |
| `system_metrics`          | id, metric_name, value                                                        | ✓   | ✗           | created_at                                         |
| `techstack_services`      | id, name, category                                                            | ✓   | ✗           | created_at, updated_at                             |
| `user_roles`              | id, user_id, role                                                             | ✓   | ✗           | created_at                                         |
| `work_experiences`        | id, user_id, company, job_title, deleted_at                                   | ✓   | ✓           | created_at, updated_at, deleted_at                 |

---

## 3. Audit Column Coverage

| Metric                     | Coverage                         |
| -------------------------- | -------------------------------- |
| `created_at`               | 37/37 (100%)                     |
| `updated_at`               | 27/37 (73%)                      |
| `deleted_at` (soft delete) | 12/37 (32%)                      |
| `created_by`               | 0/37 (0%) — **critical gap**     |
| `updated_by`               | 1/37 (3%) — `log_settings` only  |
| `deleted_by`               | 0/37 (0%)                        |
| `tenant_id`                | 0/37 (0%) — single-tenant design |
| `version`                  | 0/37 (0%)                        |

**Fully compliant tables** (created_at + updated_at + deleted_at): `profiles`, `sats_analyses`, `sats_resumes`, `sats_resume_personas`, `sats_job_descriptions`, `sats_skill_experiences`, `sats_user_skills`, `sats_users_public`, `enriched_experiences`, `work_experiences`, `ats_jobs`, `ats_resumes`

**Critical gap:** No `created_by` or `updated_by` on any table — data mutations are entirely anonymous at the DB layer. Impossible to answer "who changed this record" for compliance.

---

## 4. Row-Level Security (RLS) Status

- **RLS enabled:** ✓ All 37 public tables
- **Session variable `app.current_tenant_id`:** ✗ Not set — no multi-tenant scoping
- **Isolation model:** Per-user ownership via `auth.uid() = user_id` in all policies

### Policy categories found

| Pattern                          | Tables                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner-only CRUD                  | `enriched_experiences`, `sats_analyses`, `sats_resumes`, `sats_resume_personas`, `sats_skill_experiences`, `sats_user_skills`, `document_extractions`, `ats_runs`, `ats_derivatives`, `sats_learning_roadmaps`, `sats_roadmap_milestones` |
| Authenticated read + owner write | `sats_locations`, `sats_companies`, `sats_skills`, `sats_job_skills`, `sats_job_descriptions`, `ats_job_documents`                                                                                                                        |
| Admin-only                       | `sats_runtime_settings`, `sats_staged_jobs`, `log_settings`, `account_deletion_logs`                                                                                                                                                      |
| Shared / broad read              | `log_entries`, `error_logs`, `service_status`, `system_metrics`, `techstack_services`                                                                                                                                                     |

### Service-role bypass (SECURITY DEFINER RPCs)

| Function                            | Purpose                      | Evidence                                                     |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `soft_delete_enriched_experience()` | Soft-delete with owner check | `20260224224500_add_soft_delete_enriched_experience_rpc.sql` |
| `soft_delete_user()`                | Account deletion cascade     | `types.ts:1483`                                              |
| `cancel_account_deletion()`         | Reverse soft-delete          | `types.ts:1444`                                              |
| `manage_admin_user()`               | Promote/demote admin         | `types.ts:1471`                                              |
| `has_role()`                        | Role membership check        | `types.ts:1464`                                              |

### RLS hardening history

| Migration                                                  | Date       | Change                                                    |
| ---------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `20260224235000_p8_rls_tenant_isolation_hardening.sql`     | 2026-02-24 | Tighten role scope; add WITH CHECK on writes              |
| `20260225143500_enable_rls_on_public_policy_tables.sql`    | 2026-02-25 | Batch enable RLS on all public tables                     |
| `20260317150000_fix_locations_companies_select_policy.sql` | 2026-03-17 | Fix over-restrictive SELECT (BUG-2026-03-17-LOCATION-RLS) |

---

## 5. AI & Agent Infrastructure

### 5a. RAG / Embeddings

| Feature                           | Status      |
| --------------------------------- | ----------- |
| `pgvector` extension              | ✗ Not found |
| Vector columns (`vector(N)`)      | ✗ Not found |
| Document chunk / embedding tables | ✗ Not found |
| HNSW / IVFFlat indexes            | ✗ Not found |
| Embedding model references        | ✗ Not found |

**Conclusion:** No RAG infrastructure. LLM is used for structured generation only (no retrieval-augmented patterns). Confirmed by grep across all 59 migration files — zero matches for `pgvector` or `vector(`.

### 5b. LLM Provider (`supabase/functions/_shared/llmProvider.ts`)

| Feature                   | Status | Detail                                                               |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| LLM abstraction layer     | ✓      | `callLLM()` entry point; provider via `SATS_LLM_PROVIDER` env var    |
| Models supported          | ✓      | `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, `o4-mini`, `o3`, `o3-mini` |
| Built-in pricing table    | ✓      | Input/output USD per 1M tokens (`llmProvider.ts:72–80`)              |
| Schema-locked JSON output | ✓      | Strict mode JSON Schema (`llmProvider.ts:149–160`)                   |
| Seed / determinism        | ✓      | Optional `seed` field (`llmProvider.ts:43`)                          |
| Retry with fallback chain | ✓      | 0–2 retries per model (`llmProvider.ts:126–217`)                     |
| Token counting            | ✓      | `promptTokens`, `completionTokens` per call                          |
| Cost estimation           | ✓      | `costEstimateUsd` per call                                           |
| Duration tracking         | ✓      | `durationMs` wall-clock                                              |
| Error classification      | ✓      | 401, 403, 429, 5xx, 400 mapped (`llmProvider.ts:270–324`)            |

**Edge functions using LLM:** `ats-analysis-direct`, `async-ats-scorer`, `enrich-experiences`, `generate-upskill-roadmap`

### 5c. Claude Code Agents (`.claude/agents/`)

17 agents: `adr-author`, `arch-reviewer`, `component-scaffolder`, `convention-auditor`, `e2e-validator`, `edge-fn-scaffolder`, `incident-responder`, `llm-eval-runner`, `migration-writer`, `plan-decomposer`, `railway-deployer`, `release-gatekeeper`, `security-auditor`, `test-runner`, `test-writer`, `product-analyst`, `changelog-keeper`

**Orchestration pattern:** Independent invocation only — no inter-agent DB-level state, memory, or handoff tables.

### 5d. MCP Servers

**`.mcp.json`:** ✗ Not found at project root.

### 5e. LLM Observability

| Metric                           | Status                              |
| -------------------------------- | ----------------------------------- |
| Token counts tracked             | ✓ In-flight only                    |
| Cost estimation                  | ✓ In-flight + `cost_tracking` table |
| Duration / latency               | ✓ In-flight only                    |
| Model used                       | ✓ In-flight only                    |
| Persistent `llm_call_logs` table | ✗ Not found                         |
| Prompt versioning                | ✗ Not found                         |
| Eval scores / `ai_evaluations`   | ✗ Not found                         |

---

## 6. Skills & Automation

### Skills (`.claude/skills/`)

| Skill               | Purpose                    |
| ------------------- | -------------------------- |
| `adr-draft`         | ADR template and numbering |
| `new-edge-function` | Edge function scaffolder   |
| `new-migration`     | Migration file creator     |
| `verify-gate`       | Verification gate runner   |

### Background Jobs (pg_cron)

| Job                     | Schedule     | Invokes                           | Evidence                                                       |
| ----------------------- | ------------ | --------------------------------- | -------------------------------------------------------------- |
| `fetch_market_jobs_15m` | Every 15 min | `fetch-market-jobs` edge function | `20260224182000_add_p14_staged_jobs_and_fetch_cron.sql:95–112` |
| `async_ats_scorer_15m`  | Every 15 min | `async-ats-scorer` edge function  | `20260224194000_add_p14_async_ats_scorer_pipeline.sql:93–108`  |

---

## 7. Multi-Tenancy Assessment

| Aspect                     | Finding                                            |
| -------------------------- | -------------------------------------------------- |
| `tenant_id` across tables  | 0/37 (0%)                                          |
| `tenants` table            | ✗ Not found                                        |
| Subscription / plans table | ✗ Not found                                        |
| Isolation model            | Per-user ownership (`auth.uid() = user_id`)        |
| Role hierarchy             | Static enum: `['user', 'admin']` (`types.ts:1511`) |
| Org / team structure       | ✗ Not present                                      |

---

## 8. Missing Tables — Gap Analysis

### Critical gaps (block enterprise readiness)

| Missing Table          | Why Critical                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `roles`                | Static enum cannot scale RBAC                                    |
| `permissions`          | No fine-grained permission system                                |
| `role_permissions`     | Cannot bind permissions to roles                                 |
| `audit_logs` (unified) | Three fragmented log tables; no compliance-queryable audit trail |
| `llm_call_logs`        | LLM cost/token/latency in-flight only; no persistent record      |

### AI/RAG gaps

| Missing Table                    | Why Needed                                      |
| -------------------------------- | ----------------------------------------------- |
| `knowledge_sources`              | No knowledge base management                    |
| `document_chunks`                | No chunked text with vector embeddings          |
| `rag_queries`                    | No RAG query logging                            |
| `ai_sessions` / `ai_messages`    | No persistent agent conversation state          |
| `agent_tasks` / `agent_handoffs` | No DB-level multi-agent coordination            |
| `agent_memory`                   | Agent context is ephemeral only                 |
| `prompt_templates`               | Prompts inline in edge functions; no versioning |
| `ai_evaluations`                 | No eval scores or model comparison records      |

### Nice-to-have gaps (defer post-MVP)

`tenants`, `plans`/`subscriptions`, `features`/`tenant_features`, `idempotency_keys`, `outbox_events`, `rate_limit_counters`, `api_keys`, `webhooks`, `sessions`

---

## 9. Missing Columns — Gap Analysis

| Table                                                                | Missing Column            | Priority | Reason                                            |
| -------------------------------------------------------------------- | ------------------------- | -------- | ------------------------------------------------- |
| All data tables (37)                                                 | `created_by`              | Critical | Cannot audit who created any record               |
| All data tables (37)                                                 | `updated_by`              | Critical | Data mutations are anonymous at DB layer          |
| `ats_runs`, `sats_analyses`                                          | `cost_usd`                | High     | LLM costs tracked in-flight but not persisted     |
| `enriched_experiences`, `sats_skill_experiences`, `sats_user_skills` | `deleted_by`              | High     | Soft-delete present but no actor recorded         |
| `sats_skill_experiences`, `sats_user_skills`                         | `version`                 | Medium   | No revision history for skill profile changes     |
| `sats_analyses`                                                      | `analysis_schema_version` | Medium   | Cannot track schema drift across analyses         |
| `sats_learning_roadmaps`                                             | `deleted_at`              | Medium   | Hard deletes bypass audit trail                   |
| `sats_roadmap_milestones`                                            | `deleted_at`              | Medium   | Same — P20 time-bounded delete depends on this    |
| `sats_user_notifications`                                            | `deleted_at`              | Low      | Notifications cannot be soft-archived             |
| `profiles`                                                           | `metadata` (JSON)         | Low      | No extensible store for future profile attributes |

---

## 10. Overall Readiness Score

| Dimension                      | Score | Notes                                                                                  |
| ------------------------------ | ----- | -------------------------------------------------------------------------------------- |
| **Audit trail coverage**       | 2/5   | `created_at` universal; `deleted_at` on 32%; `created_by`/`updated_by` absent entirely |
| **Multi-tenancy / RLS**        | 4/5   | RLS on all 37 tables, well-hardened; single-tenant design is the ceiling               |
| **Soft delete pattern**        | 3/5   | 12/37 tables (32%); missing on roadmaps, milestones, notifications                     |
| **RBAC (roles + permissions)** | 1/5   | Static binary enum; no role/permission/assignment tables                               |
| **RAG / vector readiness**     | 0/5   | No pgvector, no embeddings, no chunk tables                                            |
| **Agent orchestration**        | 2/5   | 17 Claude agents defined; no DB-level agent state, memory, or handoff                  |
| **LLM observability**          | 3/5   | Strong in-flight telemetry; no persistent `llm_call_logs`; no prompt versioning        |
| **Enterprise compliance**      | 2/5   | RLS solid; missing audit-by-user, unified audit log, RBAC hierarchy                    |

**Overall: 2.1 / 5**

---

## 11. Recommended Immediate Actions

1. **Add `created_by` / `updated_by` to all data tables** — Without this, the system cannot answer "who changed what" for any record. Required for GDPR audit rights and SOC 2.
2. **Create a persistent `llm_call_logs` table** — All four LLM edge functions track tokens and cost in-flight but write nothing to the DB. One billing dispute makes this gap painful.
3. **Replace static role enum with `roles` / `permissions` / `role_permissions` tables** — Current binary `['user', 'admin']` enum cannot support P17 (BYOK), P16 personas, or enterprise access tiers.
4. **Add `deleted_at` to `sats_learning_roadmaps`, `sats_roadmap_milestones`, and `sats_user_notifications`** — P20 time-bounded delete cannot cleanly cover these tables without it.
5. **Create a unified `audit_logs` table** — Consolidate `account_deletion_logs`, `error_logs`, and `log_entries` into a single schema with `event_type`, `actor_id`, `resource_type`, `resource_id`, `before_state` (JSON), `after_state` (JSON), `created_at`.

---

## 12. Raw Evidence

| Finding                           | File                                                                             | Line      |
| --------------------------------- | -------------------------------------------------------------------------------- | --------- |
| All 37 table definitions          | `src/integrations/supabase/types.ts`                                             | 1–1641    |
| RLS batch enable                  | `supabase/migrations/20260225143500_enable_rls_on_public_policy_tables.sql`      | 1–34      |
| P8 RLS hardening                  | `supabase/migrations/20260224235000_p8_rls_tenant_isolation_hardening.sql`       | 1–150+    |
| Location RLS bug fix              | `supabase/migrations/20260317150000_fix_locations_companies_select_policy.sql`   | 1–30      |
| Soft-delete RPC                   | `supabase/migrations/20260224224500_add_soft_delete_enriched_experience_rpc.sql` | 1–45      |
| LLM provider + pricing table      | `supabase/functions/_shared/llmProvider.ts`                                      | 1–335     |
| Model pricing USD                 | `supabase/functions/_shared/llmProvider.ts`                                      | 72–80     |
| Cost estimation function          | `supabase/functions/_shared/llmProvider.ts`                                      | 256–268   |
| Role enum (`['user','admin']`)    | `src/integrations/supabase/types.ts`                                             | 1511      |
| RPC definitions (5 functions)     | `src/integrations/supabase/types.ts`                                             | 1443–1509 |
| pg_cron: fetch market jobs        | `supabase/migrations/20260224182000_add_p14_staged_jobs_and_fetch_cron.sql`      | 95–112    |
| pg_cron: async ATS scorer         | `supabase/migrations/20260224194000_add_p14_async_ats_scorer_pipeline.sql`       | 93–108    |
| Agent definitions (17 files)      | `.claude/agents/*.md`                                                            | —         |
| Skills (4 files)                  | `.claude/skills/*/SKILL.md`                                                      | —         |
| pgvector grep (all 59 migrations) | Confirmed absent — zero matches                                                  | —         |
| Latest migration timestamp        | `supabase/migrations/20260317160000_p18_s1_enrichment_experience_anchor.sql`     | 1         |
