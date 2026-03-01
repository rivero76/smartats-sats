# Product Vision

**Last Updated:** 2026-03-01 (P16 added)
**Source of Truth:** Current codebase implementation (`src/`, `supabase/`, `docs/specs/`)
**Roadmap File:** `docs/decisions/product-roadmap.md`

## 1) Product Vision (Current)
Build an AI-assisted career platform that helps users improve job fit by combining:
1. Resume and job-description intelligence.
2. ATS-style compatibility scoring with explainable skill match gaps.
3. AI-assisted experience enrichment to close high-impact gaps.
4. Job description ingestion expansion (text, file, URL now; broader ETL channels planned).

Current positioning:
1. SmartATS is currently a trust-first ATS matcher with strong AI governance.
2. The next product step is evolving from reactive matching to proactive career orchestration.

## 2) Existing Features (Implemented)
1. User auth, protected routes, admin role gating.
2. Resume upload + extraction persistence + resume management.
3. Job description CRUD with text/file/URL ingestion and metadata (`source_type`, `source_url`).
4. ATS analysis pipeline with structured JSON output, score breakdown, and skills match/missing lists.
5. Enriched experience generation with evidence constraints, review, save, edit, soft-delete.
6. Dashboard + ATS analytics views.
7. Centralized observability/logging with correlation IDs, retention automation, admin controls.
8. In-app Help Hub (`/help`) with searchable feature guides sourced from `helpContent`.
9. Upskilling roadmap: persisted `sats_learning_roadmaps`/`sats_roadmap_milestones` schema + `generate-upskill-roadmap` edge function + `/roadmaps` timeline UI with milestone completion toggles and progress bar (release-blocked on E2E validation).

## 3) Future Features (Not Yet Fully Implemented)
1. Phase 1 (In Progress — P13): LinkedIn ingestion backend delivered (Stories 1-2: `linkedin-profile-ingest` edge function + `linkedinImportMerge` frontend utility); HITL Review UI (Story 3) is the remaining implementation gap; full flow is release-blocked on E2E validation.
2. Phase 2 (In Progress — P14): asynchronous proactive search engine (background job fetcher, async ATS scorer, threshold-notification engine, Opportunities UI) implemented; release-blocked on E2E validation for all four stories.
3. Phase 3 (In Progress — P15): `/roadmaps` timeline UI with milestone completion and progress tracking delivered (Stories 1-3); release-blocked on E2E validation.
4. Phase 4 (Approved — P16): Career Fit & Live Job Discovery — LLM provider abstraction, Master Profile + Resume Persona model, Profile Reconciliation Engine, Live Job Discovery (JSearch/Adzuna), Career Fit AI suggestions, `/career-fit` UI, and Skill Gap → P15 Roadmap bridge. Full spec at `docs/specs/product/p16-career-fit-live-job-discovery.md`.
5. LLM career questionnaire and goal-based pathing.
6. P11 multi-channel job description ETL rollout (CSV/XLS, PDF/DOC bulk, extension, email, feeds).
7. P12 globalization, enterprise cloud architecture, and large-scale readiness.

## 3A) UI Placeholder Features (Tracked)
The following items are visible in product UI but intentionally not fully implemented yet:
1. Dashboard:
- `Advanced Reports` quick action.
- Future features panel entries: advanced analytics, email notifications, data export/import.
2. Settings:
- Notification Preferences (all toggles).
- Security: password update and 2FA controls.
- Data Management: export control.
- API Access key generation.
3. Admin Dashboard (overview tab):
- System stats/activity/health preview widgets.
- Action cards: user management, database management, analytics/reports.
- Alert action buttons and system settings control.

## 4) Feature Matrix (Competitor Baseline vs MVP)

| Feature | Competitors | My MVP | File/Service in Code |
|---|---|---|---|
| ATS resume-job match scoring | ATS Matchers strong; Auto-Appliers light; Career Pathing limited | Supported | `supabase/functions/ats-analysis-direct/index.ts`, `src/hooks/useDirectATSAnalysis.ts`, `src/hooks/useATSAnalyses.ts` |
| Match explanation (matched/missing skills + recommendations) | ATS Matchers partial; others mixed | Supported | `supabase/functions/ats-analysis-direct/index.ts`, `src/pages/ATSAnalyses.tsx` |
| Deterministic/structured LLM output contract | Often weak in competitors | Supported | `ATS_JSON_SCHEMA` in `supabase/functions/ats-analysis-direct/index.ts`, enrichment schema in `supabase/functions/enrich-experiences/index.ts` |
| Proactive job search/scrape for >60% match | Auto-Appliers focus volume; others generally not threshold-driven this way | Not Supported (threshold only for reporting UI) | `src/pages/ATSAnalyses.tsx` (stats bucket under 60), no autonomous job crawler/search pipeline |
| Automatic job application submission | Auto-Appliers core strength | Not Supported | No apply pipeline found in `src/` or `supabase/functions/` |
| Job ingestion from URL | Some competitors support browser workflows | Partial (single URL fetch only, no crawler recursion) | `supabase/functions/job-description-url-ingest/index.ts`, `src/components/JobDescriptionModal.tsx` |
| LinkedIn data ingestion | Some tools support profile imports/extensions | In Progress (P13 Stories 1-2 done: `linkedin-profile-ingest` edge function + `linkedinImportMerge` frontend utility; HITL Review UI pending) | `supabase/functions/linkedin-profile-ingest/index.ts`, `src/utils/linkedinImportMerge.ts`, `src/hooks/useLinkedinImportPreparation.ts` |
| Skill-gap analysis | ATS Matchers basic keyword gap | Partial (missing skills surfaced, no sequenced roadmap) | `sats_analyses.missing_skills` via `src/hooks/useATSAnalyses.ts` and ATS edge function |
| Upskilling roadmap engine | Career Pathing tools stronger here | In Progress (schema + edge function + `/roadmaps` UI delivered; release-blocked on E2E validation) | `supabase/functions/generate-upskill-roadmap/index.ts`, `sats_learning_roadmaps`, `sats_roadmap_milestones`, `src/pages/UpskillingRoadmaps.tsx` |
| AI experience rewriting/enrichment | Mixed across competitor categories | Supported | `supabase/functions/enrich-experiences/index.ts`, `src/hooks/useEnrichedExperiences.ts`, `src/components/EnrichExperienceModal.tsx` |
| Admin observability + governance | Usually internal-only in competitors | Supported | `supabase/functions/centralized-logging/index.ts`, `src/pages/AdminDashboard.tsx`, `src/components/admin/ObservabilityPanel.tsx` |

## 5) Technical Gap Analysis (Vision vs Current Code)

### Gap A: Proactive >60% Job Discovery Loop
Current state:
- Match scoring exists only after user creates/selects a specific job description.
- No autonomous collector that continuously discovers jobs, computes scores, and surfaces only >60% jobs.

Needed:
1. Job source connectors and ingestion scheduler.
2. Batch scoring queue across candidate profile/resume versus incoming jobs.
3. Eligibility index (`match_score >= 0.60`) with freshness windows and dedupe.
4. User-facing recommendations feed and alerting.

### Gap B: LinkedIn + Resume Unified Candidate Graph
Current state:
- LinkedIn URL stored on profile.
- P13 Stories 1-2 delivered: `linkedin-profile-ingest` edge function (preview-only, schema-locked normalization) and `linkedinImportMerge` frontend utility (canonical + fuzzy skill dedupe, experience fingerprint dedupe, provenance tagging).
- Remaining gap: HITL Review UI (Story 3 — `ProfileImportReviewModal.tsx` and Settings import button) not yet implemented.

Needed:
1. P13 Story 3: HITL Review UI to allow user approval before DB writes.
2. Profile freshness/versioning with consent tracking (future).
3. E2E validation across Stories 1-3 before release.

### Gap C: Skill-Gap to Upskilling Roadmap
Current state:
- P15 Stories 1-3 delivered: `sats_learning_roadmaps`/`sats_roadmap_milestones` schema, `generate-upskill-roadmap` edge function (schema-locked LLM output, mandatory portfolio milestone), and `/roadmaps` timeline UI with completion toggles and progress bar.
- Full flow is release-blocked on E2E validation (migration application, tenant-isolation checks, function invocation, UI persistence).

Needed:
1. E2E validation pass to close `docs/releases/UNTESTED_IMPLEMENTATIONS.md` blockers before rollout.
2. Skill taxonomy normalization and proficiency levels (future enhancement).
3. Time-phased plans (30/60/90 day) and recommendation feedback loop (future enhancement).

### Gap E: LLM Provider Lock-in and Abstraction
Current state:
- All four edge functions call OpenAI directly via raw HTTP fetch with no abstraction layer.
- Error handling, retry logic, and schema validation are duplicated across functions.

Needed (P16 Story 0):
1. `supabase/functions/_shared/llmProvider.ts` shared utility.
2. `SATS_LLM_PROVIDER` environment variable to switch provider without code changes.
3. Refactor existing four functions to use the shared utility.
4. Document in ADR-0002 (`docs/decisions/adr-0002-llm-provider-abstraction.md`).

### Gap F: Resume Ground Truth and Persona Management
Current state:
- `sats_resumes` stores file references. No concept of role-specific personas or canonical master profile layer.
- Permanent public file URLs expose resume files without access control or expiry.

Needed (P16 Stories 1–2):
1. `sats_resume_personas` table for role-specific profile configurations.
2. Resume storage upgrade: signed URLs (15-min expiry), SHA-256 dedup, MIME validation, version chain.

### Gap G: Profile Data Reconciliation
Current state:
- No mechanism to detect or resolve conflicts between resume text, LinkedIn import data, and manually entered DB records.

Needed (P16 Story 3):
1. `reconcile-profile` edge function to compare sources and detect conflicts.
2. `sats_reconciliation_runs`, `sats_profile_conflicts`, `sats_conflict_resolutions` tables.
3. Dedicated `/profile/reconcile` HITL resolution page.

### Gap H: Live Job Discovery
Current state:
- No integration with external job APIs. Users must manually find and paste job descriptions.

Needed (P16 Stories 4–6):
1. JSearch API integration (US/global), Adzuna API integration (BR/AU/NZ/UK).
2. `fetch-live-jobs` edge function with 4-hour result cache.
3. `suggest-career-fit` edge function for AI role suggestions.
4. `/career-fit` page with role cards, job panels, and roadmap bridge.

### Gap D: LLM Questionnaire + Career Pathing
Current state:
- No structured conversational questionnaire flow for goals, constraints, salary/industry preference, mobility, etc.

Needed:
1. Questionnaire schema + storage.
2. Goal-to-role inference engine.
3. Path simulation layer tied to ATS gaps and market signals.

## 6) Moat Assessment (Current)
The strongest implemented differentiator is a **quality-controlled AI matching and enrichment pipeline with operational governance**:
1. Schema-locked ATS and enrichment outputs reduce unstructured LLM drift.
2. Evidence-grounded enrichment outputs with risk flags improve trust and explainability.
3. End-to-end observability (request IDs, retention policies, admin telemetry) supports production reliability and enterprise readiness.
4. Human-in-the-loop review and evidence requirements reduce hallucination risk and improve interview defensibility.

Compared to baseline categories, this is stronger than typical "keyword checker" depth and stronger governance than most "auto-apply" workflows.
