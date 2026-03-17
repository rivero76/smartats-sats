# Product Roadmap and Change Tracking

**Last Updated:** 2026-03-17 (P17 BYOK + User-Controlled AI added; promoted to High priority)
**Vision File:** `docs/decisions/product-vision.md`
**Execution Source:** `plans/product-improvements.md`

## 1) Roadmap Snapshot

| Phase | Status | Priority | Summary |
|---|---|---|---|
| P0 Security + Guardrails | Completed | Done | Logging/security guardrails and admin access hardening delivered. |
| P1 Unified Structured Logging | Completed | Done | Shared schema, centralized logging behavior, and standardization delivered. |
| P2 Correlation + Tracing | Completed | Done | Request ID propagation and duration tracing delivered. |
| P3 Retention + Reliability | Completed | Done | Cleanup automation, retry/backoff, and reliability controls delivered. |
| P4 Observability + Governance | Completed | Done | Admin observability panels, alert checks, immutable audit trail delivered. |
| P5 Enrichment Lifecycle + Deletion Scope | Completed | Done | Enriched experience edit/delete lifecycle and account deletion scope alignment delivered. |
| P6 SDLC Operations + Governance | Completed | Done | `scripts/ops/` automation, CI quality gates, docs/secrets checks delivered. |
| P7 Release Version Synchronization | Planned | Medium | Manifest and parity controls across app/runtime/database versions. |
| P8 Global v1 Readiness | Planned | Medium | Multi-user hardening, i18n/l10n, compliance, regional controls. |
| P9 AI Runtime Governance + LLM Ops Analytics | Planned | High | Runtime config governance, telemetry, cost/perf analytics. |
| P10 Prompt Reliability + Model Quality | Completed | Done | Schema-locked outputs, fallback/retry controls, eval gate tooling delivered. |
| P11 JD ETL + Market Intelligence | In Progress | Highest | Text/URL foundation is in place; broader ingestion + analytics pipeline remains. |
| P12 Multi-language + Cloud + Enterprise Scale | Planned | High | Cloud migration/scaling and enterprise architecture readiness. |
| P13 LinkedIn Ingestion Loop Upgrade | In Progress | Highest | Stories 1-2 delivered (edge function + merge/dedupe utility); Story 3 HITL Review UI pending; full flow release-blocked on E2E validation. |
| P14 Proactive Search Engine | In Progress | Highest | Core async pipeline and opportunities UI foundation delivered; end-to-end rollout hardening remains. |
| P15 Upskilling Roadmap Engine | In Progress | High | Stories 1-3 are implemented (schema, generation, roadmap UI/progress); release validation remains before rollout. |
| P16 Career Fit & Live Job Discovery | Approved | Highest | LLM abstraction (Story 0), Persona model (Story 1), Resume storage upgrade (Story 2), Reconciliation engine (Story 3), Live job discovery via JSearch/Adzuna (Story 4), Career fit AI engine (Story 5), `/career-fit` UI (Story 6), Skill gap → P15 roadmap bridge (Story 7). Full spec: `docs/specs/product/p16-career-fit-live-job-discovery.md`. |
| **P17 User-Controlled AI** — BYOK + Model Selection | Planned | **High** | Let users bring their own LLM API keys (OpenAI, Anthropic, custom endpoint), select preferred model per account, and opt out of AI processing entirely. Unlocks enterprise sales, privacy-conscious users, and zero-AI-COGS tiers. Builds on `_shared/llmProvider.ts` abstraction already in place. Stories: S1 per-user model preference, S2 BYOK encrypted key storage + routing, S3 AI opt-out toggle (GDPR). |
| DX-1 Claude Code Developer Tooling | Planned | Low | Supabase MCP (highest ROI — live schema/RLS access), GitHub MCP (CI/PR status in-context), and four Claude Code skills: `/new-edge-function`, `/release-check`, `/new-migration`, `/verify`. Reduces scaffolding friction and shortens post-push feedback loop. Not a product feature; developer experience only. |

## 2) Strategic Assessment (From Technical Audit)
1. Current strength: advanced trust-first ATS matcher with evidence-grounded AI outputs.
2. Current gap: still mostly "bring your own job" workflow; 60% threshold is not yet an automated trigger.
3. Current onboarding gap: LinkedIn ingestion backend (Stories 1-2) is implemented; HITL Review UI (Story 3) is the remaining delivery gap before the full flow is release-ready.
4. Strategic direction: preserve trust layer and add proactive orchestration in the next sprint sequence.
5. **Emerging competitive gap (2026):** AI SaaS without BYOK or model selection is increasingly a friction point for enterprise buyers, privacy-sensitive users, and markets with data-residency requirements. BYOK is now a baseline expectation, not a differentiator. P17 closes this gap and directly unlocks new market segments without requiring a pricing redesign.

## 3) Now, Next, Later

### Now
1. P13 Story 3: implement HITL Review UI (`ProfileImportReviewModal.tsx` + Settings import button) to complete the LinkedIn ingestion flow.
2. P15 release hardening: close E2E validation blockers for `generate-upskill-roadmap`, milestone persistence, and `/roadmaps` UI in `docs/releases/UNTESTED_IMPLEMENTATIONS.md`.
3. P14 rollout completion: close remaining proactive pipeline release blockers (cron execution, scoring pipeline, threshold-notification, Opportunities UI).

### Next
1. P8.1 security execution: complete post-migration cross-tenant negative tests and periodic RLS drift checks.
2. Expand Help Center content coverage to all active user flows and map it into release DoD checks.
3. Close lingering UX blockers: enrichment modal scroll bug (`BUG-2026-02-24-ENRICH-SCROLL`) and ATS auto-refresh.

### Later
1. Continue P9, P8, and P12 platform programs after orchestration core is in motion.
2. **P17 User-Controlled AI:** Begin S1 (per-user model preference in `profiles`) in parallel with P16 S2/S3 — low schema footprint, high marketing value. S2 (BYOK) and S3 (AI opt-out) follow after P16 S4 is live.
3. P16 backlog items: Playwright for SEEK/Gupy/Computrabajo, salary intelligence, application tracker, cover letter generation, persona PDF export.
4. DX-1: Claude Code tooling — Supabase MCP first, then GitHub MCP, then skills (`/new-edge-function`, `/release-check`, `/new-migration`, `/verify`).

### P16 Delivery Sequence
Story 0 → Story 1 → Story 2 → Story 3 → Story 4 → Story 5 → Story 6 → Story 7
(Each story is a gate for the next — do not begin Story 4 before Story 3 is in E2E validation.)

## 4) Feature Lifecycle Register
| Feature | Status (Idea/Planned/In Progress/Live) | Category (Core/AI/Data/Platform) | User Value | Primary Tech Owner | Dependencies | Target Release |
|---|---|---|---|---|---|---|
| Proactive >60% Job Discovery | Planned | Core + AI + Data | Show only high-fit opportunities | TBD | Async job collector + ATS scoring queue + notifications | 3-4 weeks |
| LinkedIn Structured Ingestion | In Progress | Core + Data | Faster onboarding, richer profile baseline | TBD | Stories 1-2 done (edge function + merge utility); Story 3 HITL UI pending; release-blocked on E2E validation | Story 3 next |
| Skill-Gap Roadmap | In Progress | AI | Actionable upskilling plan from ATS gaps with persisted milestones and in-app progress tracking | TBD | Release validation for schema/function/UI flows | 4-6 weeks |
| In-App Help Hub (`/help`) | Live | Core UX | Centralized discoverability of workflows, troubleshooting, and feature guidance | TBD | `helpContent` coverage + page-level docs hygiene | Current |
| LLM Career Questionnaire | Planned | AI/Product | Personalize role pathing | TBD | Questionnaire schema + inference | TBD |
| LLM Provider Abstraction Layer (P16 S0) | Approved | Platform | Enable provider switching via env var | TBD | `_shared/llmProvider.ts` + refactor 4 edge functions | P16 Story 0 |
| **P17 S1** — Per-User Model Preference | Planned | AI + Platform | User selects preferred LLM provider and model in Settings; stored in `profiles`; edge functions read it at call time | TBD | `profiles` migration + Settings UI dropdown + `callLLM()` user-context lookup | P17 Story 1 |
| **P17 S2** — BYOK (Bring Your Own Key) | Planned | AI + Platform + Marketing | User stores their own OpenAI/Anthropic/custom API key in Settings (encrypted at rest via Supabase Vault); edge functions route their requests through it; eliminates AI COGS for that user tier | TBD | Supabase Vault integration + key routing in `callLLM()` + Settings BYOK card | P17 Story 2 |
| **P17 S3** — AI Opt-Out + Privacy Toggle | Planned | Platform + Compliance | User disables all LLM processing for their account from Settings; AI features degrade gracefully to manual-only mode; required for GDPR strictness and enterprise data-sovereignty buyers | TBD | `profiles.ai_processing_enabled` flag + guard in all edge functions + Settings toggle | P17 Story 3 |
| Master Profile + Resume Persona Model (P16 S1) | Approved | Core + Data | Multi-persona CV management from one canonical profile | TBD | `sats_resume_personas` table + Settings UI | P16 Story 1 |
| Resume Storage Security Upgrade (P16 S2) | Approved | Platform + Security | Signed URLs, SHA-256 dedup, version chain | TBD | `sats_resumes` migration + signed URL pattern | P16 Story 2 |
| Profile Reconciliation Engine (P16 S3) | Approved | Core + AI | Detect and resolve cross-source profile conflicts | TBD | `reconcile-profile` edge fn + 3 new tables + HITL page | P16 Story 3 |
| Live Job Discovery Engine (P16 S4) | Approved | Core + Data | JSearch + Adzuna integration with 4h cache | TBD | `fetch-live-jobs` edge fn + JSearch/Adzuna accounts | P16 Story 4 |
| Career Fit AI Engine (P16 S5) | Approved | AI | Role suggestions with match strength and skill gaps | TBD | `suggest-career-fit` edge fn + schema-locked output | P16 Story 5 |
| Career Fit UI — /career-fit (P16 S6) | Approved | Core UX | Live job discovery page with role cards and job panels | TBD | New page + sidebar nav entry | P16 Story 6 |
| Skill Gap → Roadmap Bridge (P16 S7) | Approved | AI | Pre-populated roadmap from career fit gap to P15 engine | TBD | P15 E2E validation must be complete first | P16 Story 7 |
| Enrichment Modal Scroll Reliability (`BUG-2026-02-24-ENRICH-SCROLL`) | Planned | Core UX | Ensure all generated suggestions/actions are reachable in modal review | TBD | `Dialog` height/overflow constraints + scroll affordance tuning | Next patch |
| **DX-1** Supabase MCP | Planned | Platform/DX | Live schema + RLS + migration state accessible to Claude Code without reading SQL files; catches type drift between DB and `types.ts` | Claude Code | Supabase MCP server install + project secrets config | DX-1 |
| **DX-1** GitHub MCP | Planned | Platform/DX | CI workflow status, PR review state, and failed check details accessible in-context after `git push` | Claude Code | GitHub MCP server install + PAT config | DX-1 |
| **DX-1** `/new-edge-function` skill | Planned | Platform/DX | Scaffolds `index.ts` with `_shared/` imports, CORS, env wiring, and UPDATE LOG header pre-filled | Claude Code | Skill definition file in `~/.claude/` | DX-1 |
| **DX-1** `/release-check` skill | Planned | Platform/DX | Reads `UNTESTED_IMPLEMENTATIONS.md`, cross-references recent commits, outputs go/no-go release summary | Claude Code | Skill definition file in `~/.claude/` | DX-1 |
| **DX-1** `/new-migration` skill | Planned | Platform/DX | Generates correctly timestamped `YYYYMMDDHHMMSS_<description>.sql` with header and `sats_` prefix reminder | Claude Code | Skill definition file in `~/.claude/` | DX-1 |
| **DX-1** `/verify` skill | Planned | Platform/DX | Runs `npm run build && npm run test && npm run lint` and summarises only new errors vs baseline | Claude Code | Skill definition file in `~/.claude/` | DX-1 |
| JD ETL Text + URL Ingestion | Live | Core + Data | Faster job input with URL fallback | TBD | URL ingest edge function + metadata fields | Current |
| JD ETL Multi-Channel Ingestion (`P11.1-P11.6`) | In Progress | Data Platform | Higher ingestion scale and coverage | TBD | File pipelines + ingestion queue + QA workflow | TBD |
| UI Placeholder Features Bundle (Dashboard/Settings/Admin Overview) | Planned | Core UX | Clear roadmap for currently visible but disabled controls | TBD | Feature specs + backend endpoints + permissions + UX validation | TBD |

## 4A) UI Placeholder Features (Formal Tracking)
1. Dashboard placeholders:
- `Advanced Reports` quick action.
- Future features panel entries (advanced analytics, notifications, data export/import).
2. Settings placeholders:
- Notification Preferences.
- Password update and 2FA controls.
- Data export control.
- API key generation. ← **Formally scoped as P17 S2 (BYOK).** Dead control to be replaced with BYOK card (provider selector + encrypted key input + connection test).
3. Admin Dashboard placeholders (overview tab):
- Mock system stats/activity/health widgets.
- User/Database/Analytics action cards.
- Alert action controls and system settings button.

## 5) Change Log (Roadmap-Level)
| Date | Version | Change Type | Summary | Why | Owner | Linked PR/Issue |
|---|---|---|---|---|---|---|
| 2026-03-17 | v1.2 | Feature Intake | Added P17 User-Controlled AI (3 stories): S1 per-user model preference, S2 BYOK encrypted key storage, S3 AI opt-out/GDPR toggle. Added to roadmap snapshot (High priority), strategic assessment, Later queue, feature register, Section 4A placeholder scoping, and decision log. Existing "API key generation" Settings placeholder formally scoped to P17 S2. | BYOK and model selection are now baseline market expectations for AI SaaS; unlocks enterprise, privacy-sensitive, and zero-COGS tiers without pricing redesign; `_shared/llmProvider.ts` abstraction (P16 S0) already provides the routing hook | Architecture | N/A |
| 2026-03-01 | v1.1 | DX Intake | Added DX-1 Claude Code Developer Tooling backlog: Supabase MCP (highest ROI), GitHub MCP, and four skills (`/new-edge-function`, `/release-check`, `/new-migration`, `/verify`). Added to roadmap snapshot, Later queue, and feature register. Recommended by Claude Code architecture review based on observed workflow friction. | Reduce scaffolding and post-push feedback loop friction | Architecture | N/A |
| 2026-03-01 | v1.0 | Feature Intake | Added P16 Career Fit & Live Job Discovery (Stories 0-7): LLM abstraction, persona model, resume security, reconciliation engine, live job APIs, career fit AI, /career-fit UI, roadmap bridge. Added to roadmap snapshot, Now/Next/Later, feature register, and decision log. ADR-0002 written. Architecture.md and product-vision.md updated. | PM refinement sessions confirmed scope, user intent, API strategy, schema design, and help content requirements | TPM/Architecture | TBD |
| 2026-03-01 | v0.9 | Delivery Sync | Updated P13 status to In Progress (Stories 1-2 done, Story 3 pending); removed stale P15 "Later" entry (Stories 1-3 implemented, release-blocked); updated Now/Next/Later; corrected strategic assessment onboarding gap note; synced feature register | Align roadmap with implemented code and release blocker state | TPM/Architecture | TBD |
| 2026-02-25 | v0.7 | Scope Clarification | Added formal `UI Placeholder Features` tracking section and feature register entry for visible-but-not-implemented controls across Dashboard/Settings/Admin | Prevent roadmap drift between visible UI affordances and actual delivery status | TPM/Architecture | TBD |
| 2026-02-25 | v0.8 | Delivery Sync | Updated P15 status summary to reflect Story 3 UI completion (`/roadmaps` timeline + milestone toggle + progress bar) while keeping release validation as remaining gate | Keep roadmap state aligned with implemented code and release blocker policy | TPM/Architecture | TBD |
| 2026-02-24 | v0.5 | Security Priority | Added P8.1 RLS tenant-isolation hardening as next execution priority, linked to migration bundle rollout and verification gates | Close horizontal privilege-escalation risk before broader enterprise rollout | TPM/Architecture | TBD |
| 2026-02-25 | v0.6 | Delivery Sync | Marked P14 and P15 as In Progress; recorded `/help` hub as Live and adjusted Now/Next priorities | Keep roadmap aligned with shipped features and active execution | TPM/Architecture | TBD |
| 2026-02-24 | v0.4 | Bug Intake | Added `BUG-2026-02-24-ENRICH-SCROLL` to Now backlog and feature register for enrichment modal usability | Track blocking UX defect in sprint planning view | TPM/Architecture | TBD |
| 2026-02-24 | v0.3 | Strategy Sync | Ingested PM strategy assessment and introduced sprint sequence P13-P15 (LinkedIn ingestion, proactive search, upskilling roadmap) | Align roadmap with audit-driven priorities | TPM/Architecture | TBD |
| 2026-02-24 | v0.2 | Sync Update | Synced roadmap phase statuses with `plans/product-improvements.md` and split into Now/Next/Later | Keep roadmap aligned with delivery reality | TPM/Architecture | TBD |
| 2026-02-24 | v0.1 | Baseline | Established initial roadmap structure after document split | Create product planning baseline | TPM/Architecture | TBD |

## 6) Decision Log (Architecture/Product)
| Date | Decision | Options Considered | Chosen Option | Impact | Revisit Trigger |
|---|---|---|---|---|---|
| 2026-03-17 | BYOK + User-Controlled AI (P17) | No user control vs per-user model preference only vs full BYOK vs managed tiers | Full 3-story scope: model preference (S1) + BYOK with Supabase Vault (S2) + AI opt-out (S3); all route through existing `callLLM()` abstraction | Zero new AI COGS for BYOK users; enterprise data-sovereignty compliance (S3); marketing differentiator for privacy-first and cost-conscious segments; S1 adds minimal schema footprint | If Supabase Vault pricing changes materially; if third-party gateway (LiteLLM/PortKey) proves simpler for multi-provider routing |
| 2026-03-01 | LLM Provider Abstraction | Direct per-function OpenAI calls vs shared utility vs third-party gateway | Shared `_shared/llmProvider.ts` utility with `SATS_LLM_PROVIDER` env var | Single switch point for provider change; eliminates duplicated error/retry logic | Cost or quality drivers; regional compliance requirement |
| 2026-03-01 | Resume multi-persona model | Multiple independent resumes vs Master Profile + Persona | Master Profile as canonical source + Personas as weighted views | Prevents conflicting ground truth; single update point; enables reconciliation | User feedback indicates persona model is confusing; simplify if adoption is low |
| 2026-03-01 | Job discovery source | Official API vs Playwright scraping vs hybrid | Official API first (JSearch/Adzuna); Playwright only for markets with no API and legal review complete | Legal safety; lower maintenance; sufficient market coverage for BR/AU/NZ/US | If Adzuna BR coverage proves insufficient for Gupy-heavy BR market |
| 2026-03-01 | Conflict resolution UX | Inline modal vs dedicated page | Dedicated page `/profile/reconcile` | Better usability for 5-15 concurrent conflicts; modal overflow risk | If typical conflict count is consistently ≤2, reconsider modal approach |
| YYYY-MM-DD | Example: URL ingestion strategy | crawler vs single-page fetch | single-page fetch | lower legal/risk surface, lower coverage | need broader source coverage |

## 7) KPI Tracking
| KPI | Definition | Current | Target | Cadence | Owner |
|---|---|---|---|---|---|
| ATS Analysis Completion Rate | completed analyses / started analyses | TBD | TBD | Weekly | TBD |
| High-Match Opportunity Rate | opportunities with score >= 60% / total discovered | TBD | TBD | Weekly | TBD |
| Skill Gap Closure Rate | gaps resolved over 30/60/90 days | TBD | TBD | Monthly | TBD |
| Enrichment Acceptance Rate | accepted or edited suggestions / generated suggestions | TBD | TBD | Weekly | TBD |

## 8) Update Protocol
1. Update phase status in Section 1 from `plans/product-improvements.md` evidence.
2. Refresh Now/Next/Later in Section 2.
3. Update feature statuses in Section 3.
4. Append roadmap-level change in Section 4.
5. Keep detailed implementation notes in `plans/product-improvements.md` only.
