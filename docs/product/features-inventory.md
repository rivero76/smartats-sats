# SmartATS — Product Feature Inventory

> Generated: 2026-03-27 | Updated: 2026-03-27 — P21 all 6 stages completed | Sources: docs/, plans/, src/pages/, src/components/, README.md

---

## Current Features (Live / Production-Ready)

### Core Resume & Job Management

| Feature                         | Description                                                                                                        | Source                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **Resume Management**           | Upload, extract, store, and manage multiple resumes; content preview with structured sections                      | `src/pages/MyResumes.tsx`             |
| **Job Description Management**  | Create/update job descriptions via text, file, or URL ingestion; metadata tagging                                  | `src/pages/JobDescriptions.tsx`       |
| **ATS Scoring & Analysis**      | AI-powered resume-to-JD match scoring with score breakdown, matched/missing skills, and gap analysis               | `src/pages/ATSAnalyses.tsx`           |
| **Experience Enrichment**       | AI suggestions to strengthen resume bullets with evidence validation and risk flags; projected improvement scoring | `src/hooks/useEnrichedExperiences.ts` |
| **Resume Personas**             | Multiple role-specific resume versions generated from a single master profile                                      | `src/components/PersonaManager.tsx`   |
| **CV Optimisation Score (P18)** | Projected ATS score improvement if all enrichment suggestions are applied; separate from raw ATS score             | `plans/`                              |

### AI & Intelligence

| Feature                          | Description                                                                                            | Source                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **Deterministic LLM Scoring**    | All ATS scoring uses seed=42, temperature=0 for reproducible, consistent results                       | `supabase/functions/_shared/llmProvider.ts` |
| **Schema-locked AI Outputs**     | All AI responses use JSON schema enforcement — no hallucinated structures                              | `supabase/functions/ats-analysis-direct/`   |
| **Two-call Isolation**           | Pure ATS scoring and enrichment projection run in separate LLM calls to avoid contamination            | Architecture                                |
| **Evidence-grounded Enrichment** | AI enrichment suggestions must cite specific evidence from resume content; flags unsupported claims    | `src/hooks/useEnrichedExperiences.ts`       |
| **Token & Cost Tracking**        | Every LLM call tracks prompt/completion tokens and estimated cost in USD                               | `supabase/functions/_shared/llmProvider.ts` |
| **LLM Provider Abstraction**     | Provider (OpenAI, Anthropic, etc.) controlled by environment variable; switchable without code changes | `supabase/functions/_shared/llmProvider.ts` |

### LinkedIn Integration

| Feature                       | Description                                                                                      | Source                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| **LinkedIn Profile Import**   | Scrape and import LinkedIn work history into resume system via Railway-hosted Playwright scraper | `scripts/playwright-linkedin/` |
| **Fuzzy Skill Deduplication** | Automatic deduplication of skills imported from LinkedIn against existing profile skills         | `plans/p14-*/`                 |

### Career Intelligence

| Feature                           | Description                                                                                                          | Source                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Upskilling Roadmaps (P15)**     | AI-generated personalized learning plans with milestones and progress tracking, tied to identified skill gaps (Beta) | `plans/`                            |
| **Proactive Job Discovery (P14)** | Background job fetching from external APIs; async ATS scoring of discovered jobs; opportunities dashboard            | `plans/`                            |
| **Career Fit Scoring**            | Holistic score combining skills, experience trajectory, and job requirements beyond keyword matching                 | `docs/decisions/product-roadmap.md` |

### Platform & UX

| Feature              | Description                                                                                         | Source                               |
| -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Dashboard**        | Summary metrics, quick actions, recent activity, and planned feature panel                          | `src/pages/Dashboard.tsx`            |
| **Help Hub**         | In-app searchable documentation system with contextual help buttons per page                        | `src/components/help/HelpButton.tsx` |
| **Resume Preview**   | Live resume preview rendered from structured content                                                | `src/components/ResumePreview.tsx`   |
| **Animation System** | Framer Motion presets (fadeIn, slideUp, scaleIn, staggerContainer, listItem) across all transitions | `src/lib/animations.ts`              |

### Admin & Operations

| Feature                    | Description                                                                               | Source                                       |
| -------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Admin Dashboard**        | Centralized observability, logging controls, alert thresholds, and audit trail management | `src/components/admin/`                      |
| **Structured Logging**     | Request-ID-correlated logging; all events sent to centralized edge function               | `src/lib/centralizedLogger.ts`               |
| **Log Cleanup Manager**    | Automated log retention with configurable cleanup schedules                               | `src/components/admin/LogCleanupManager.tsx` |
| **Cost Anomaly Detection** | Monitoring for LLM cost spikes and error rate anomalies                                   | Admin dashboard                              |

### Security & Data

| Feature                              | Description                                                                                                                                     | Source                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Row-Level Security**               | All database tables protected with RLS policies; users can only access their own data                                                           | `supabase/migrations/`                      |
| **Admin Role Gating**                | Admin-only features hidden behind role check in auth context                                                                                    | `src/contexts/AuthContext.tsx`              |
| **Account Deletion**                 | Full account deletion workflow with cascade cleanup                                                                                             | `supabase/functions/delete-account/`        |
| **Soft-delete Audit Trails**         | All mutable data uses soft-delete with `deleted_at` timestamps for auditability                                                                 | Database schema                             |
| **Universal Audit Columns (P21 S1)** | `created_by`, `updated_by`, `deleted_by`, `version` on all 37 tables; optimistic locking via auto-incremented `version`                         | `supabase/migrations/`                      |
| **LLM Call Logs (P21 S1)**           | Persistent `sats_llm_call_logs` table; fire-and-forget telemetry insert after every `callLLM()` call                                            | `supabase/functions/_shared/llmProvider.ts` |
| **RBAC (P21 S2)**                    | `sats_roles`, `sats_permissions`, `sats_role_permissions`, `sats_user_role_assignments`; `sats_has_permission()` function; replaces static enum | `supabase/migrations/`                      |
| **API Keys (P21 S2)**                | `sats_api_keys` — SHA-256 hash only (raw key never stored), scoped, per-tenant                                                                  | `supabase/migrations/`                      |
| **Unified Audit Log (P21 S2)**       | Append-only `sats_audit_logs`; UPDATE/DELETE blocked by RLS policy; trigger on 4 tables                                                         | `supabase/migrations/`                      |
| **Idempotency Keys (P21 S6)**        | `sats_idempotency_keys` — client-supplied header; edge functions return cached response on replay; 24h TTL                                      | `supabase/migrations/`                      |
| **Transactional Outbox (P21 S6)**    | `sats_outbox_events` — dual-write safety for agent tasks, webhooks, integrations; service-role-only                                             | `supabase/migrations/`                      |
| **Rate Limit Counters (P21 S6)**     | `sats_rate_limit_counters` — per-user/tenant sliding-window counters for api_calls, ai_tokens, analyses, storage_writes (60s/1h/24h windows)    | `supabase/migrations/`                      |

### Platform Infrastructure (P21)

| Feature                               | Description                                                                                                                    | Source                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **Multi-tenancy Foundation (P21 S3)** | `sats_tenants` table; personal sentinel UUID; `tenant_id` propagated to all 12 core tables with partial indexes                | `supabase/migrations/` |
| **Plans & Subscriptions (P21 S3)**    | `sats_plans` (Free/Pro/Team/Enterprise seeded), `sats_features` (8 capabilities seeded), `sats_tenant_features` junction       | `supabase/migrations/` |
| **Multi-Currency (P21 S4)**           | `sats_currencies` (8 ISO 4217 currencies), `sats_exchange_rates` (daily snapshots); `currency_code` on cost-bearing tables     | `supabase/migrations/` |
| **i18n / Localisation (P21 S4)**      | `sats_locales` (6 BCP 47 locales), `sats_translations` (namespace+key+locale); `preferred_locale` and `timezone` on `profiles` | `supabase/migrations/` |

### AI Infrastructure (P21 S5)

| Feature                       | Description                                                                                                                                                          | Source                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **pgvector + Knowledge Base** | `vector` extension; `sats_knowledge_sources`, `sats_document_chunks` (VECTOR(1536), HNSW cosine index), `sats_rag_queries`, `sats_search_document_chunks()` function | `supabase/migrations/` |
| **AI Agent Registry**         | `sats_ai_agents` — 17 canonical SmartATS agents seeded; `sats_ai_sessions`, `sats_ai_messages` for conversation history                                              | `supabase/migrations/` |
| **Agent Orchestration**       | `sats_agent_tasks`, `sats_agent_handoffs`, `sats_agent_memory` (HNSW on `value_embedding`) for cross-agent state                                                     | `supabase/migrations/` |
| **Prompt Templates**          | `sats_prompt_templates` (versioned, tenant-scoped), `sats_ai_evaluations` (LLM-as-judge); `prompt_template_id`/`prompt_version` on `sats_llm_call_logs`              | `supabase/migrations/` |

---

## Planned / Future Features

### Near-term (Active Development — Next 1-2 Months)

| Feature                              | Description                                                                         | Plan |
| ------------------------------------ | ----------------------------------------------------------------------------------- | ---- |
| **LinkedIn HITL Review UI (P13 S3)** | Human-in-the-loop approval modal before LinkedIn import data is written to database | P13  |
| **P14 E2E Validation**               | End-to-end validation of proactive job discovery pipeline with live data            | P14  |
| **P15 Release Validation**           | Production E2E testing gate for upskilling roadmaps before full release             | P15  |
| **P18 CV Optimisation E2E**          | End-to-end testing of projected CV optimisation score feature                       | P18  |
| **P19 S2-S3 UI/UX**                  | Continued micro-interaction improvements, modal transitions, page animations        | P19  |

### Medium-term (P16 — Career Fit & Live Job Discovery)

| Feature                              | Description                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| **Master Profile + Personas**        | Single authoritative career profile with multiple derived personas for different job targets |
| **Resume Security Upgrade**          | Signed URLs for resume access; SHA-256 content deduplication to prevent duplicates           |
| **Profile Reconciliation Engine**    | AI-driven engine to merge/reconcile data from LinkedIn, uploaded resumes, and manual entries |
| **JSearch / Adzuna API Integration** | Real-time job discovery from external job boards; AI-scored matches returned to user         |
| **Career Fit AI Engine**             | Full career fit scoring engine comparing multi-dimensional profile vs. job requirements      |
| **/career-fit Discovery UI**         | Dedicated page for browsing and scoring discovered job opportunities                         |
| **Skill Gap → Roadmap Bridge**       | Automatic generation of upskilling roadmap from identified career fit skill gaps             |

### Medium-term (P17 — User-Controlled AI)

| Feature                       | Description                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| **Per-user Model Preference** | Users can select their preferred LLM provider (OpenAI, Anthropic, custom endpoint) |
| **Bring Your Own Key (BYOK)** | Users supply their own API keys, stored encrypted in Supabase Vault                |
| **AI Opt-out Toggle**         | GDPR-compliant toggle to disable all AI processing for a user's data               |
| **Zero-COGS Tier**            | BYOK users incur no LLM cost to the platform — enables a true free/zero-cost tier  |

### Medium-term (P20 — Data Safety & Contamination Recovery)

| Feature                          | Description                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- |
| **Upload-time Identity Check**   | Warn/confirm modal if uploaded resume appears to belong to a different person |
| **Resume Deletion with Cascade** | Delete a resume and all associated analyses, enrichments, and roadmap data    |
| **Time-bounded Delete**          | Audit-guided deletion of data within a specific time window                   |
| **Full Career Data Reset**       | Option to completely reset all career data and start fresh                    |

### Future / Long-term (Q2+ 2026)

| Feature                    | Plan | Description                                                                                                               |
| -------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| **Global v1 Readiness**    | P8   | Regional compliance (GDPR, CCPA) enforcement; tenant-scoped RLS activation — schema foundations now live (P21 S4)         |
| **AI Runtime Governance**  | P9   | LLM ops analytics, model performance monitoring, runtime A/B testing — agent infra and prompt templates now live (P21 S5) |
| **JD ETL Expansion**       | P11  | CSV, XLS, email parsing, RSS feed, browser extension for job clipping                                                     |
| **Multi-language Support** | P12  | Resume creation and analysis in multiple languages — i18n schema now live (P21 S4)                                        |
| **Enterprise Scale**       | P12  | Multi-cloud deployment, horizontal scaling, enterprise SLA — tenancy and RBAC schema now live (P21 S2/S3)                 |

---

## UI Placeholders (Visible in App — Not Yet Implemented)

### Dashboard Quick Actions

- Advanced Reports
- Email Notifications _(Upcoming)_
- Data Export & Import

### Dashboard Planned Features Panel

- Advanced Analytics Dashboard
- Two-Factor Authentication
- API Access

### Settings Page

- Notification Preferences (all toggles non-functional)
- Update Password _(Coming Soon)_
- Enable 2FA _(Coming Soon)_
- Data Export
- API Key Generation _(scoped to P17 S2)_

### Admin Dashboard

- System stats widgets (mock data, 60% opacity)
- Recent activity feed (mock data)
- User / Database / Analytics management cards
- System Settings button

---

## Pricing Architecture

No formal pricing tiers are currently published, but `sats_plans` is now live with 4 seeded tiers:

| Tier                 | DB Plan      | Indicators                                                                              |
| -------------------- | ------------ | --------------------------------------------------------------------------------------- |
| **Free**             | `free`       | Basic resume scoring, limited analyses per month                                        |
| **Pro**              | `pro`        | Unlimited scoring, enrichment, LinkedIn import, upskilling roadmaps                     |
| **BYOK / Zero-COGS** | `pro`        | User brings their own API key — no LLM cost to platform (P17 — schema ready)            |
| **Team**             | `team`       | Multi-seat, shared tenant, team-level reporting (requires tenant-scoped RLS activation) |
| **Enterprise**       | `enterprise` | Full multi-tenancy (P21 S3), RBAC (P21 S2), API keys, rate limits, audit logs, SLA      |

---

_Sources: `docs/decisions/product-roadmap.md`, `plans/`, `src/pages/`, `src/components/`, `docs/changelog/CHANGELOG.md`, `README.md`_
