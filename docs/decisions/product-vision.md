# Product Vision

**Last Updated:** 2026-02-25
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
9. Upskilling roadmap backend foundation: persisted roadmap/milestone schema + `generate-upskill-roadmap` edge function.

## 3) Future Features (Not Yet Fully Implemented)
1. Phase 1 (Next 1-2 weeks): upgrade LinkedIn ingestion from URL storage to structured profile parsing into `sats_user_skills` and `sats_skill_experiences`.
2. Phase 2 (Next 3-4 weeks): build an asynchronous proactive search engine that finds jobs externally and alerts users on matches above 60%.
3. Phase 3 (In progress, next 4-6 weeks): complete roadmap UX/progress tracking on top of the deployed roadmap generation backend.
4. LLM career questionnaire and goal-based pathing.
5. P11 multi-channel job description ETL rollout (CSV/XLS, PDF/DOC bulk, extension, email, feeds).
6. P12 globalization, enterprise cloud architecture, and large-scale readiness.

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
| LinkedIn data ingestion | Some tools support profile imports/extensions | Partial (LinkedIn URL field + extraction heuristics from pasted text) | `src/pages/Settings.tsx`, `src/hooks/useProfile.ts`, `src/utils/contentExtraction.ts` |
| Skill-gap analysis | ATS Matchers basic keyword gap | Partial (missing skills surfaced, no sequenced roadmap) | `sats_analyses.missing_skills` via `src/hooks/useATSAnalyses.ts` and ATS edge function |
| Upskilling roadmap engine | Career Pathing tools stronger here | In Progress (backend live, UI pending) | `supabase/functions/generate-upskill-roadmap/index.ts`, `sats_learning_roadmaps`, `sats_roadmap_milestones` |
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
- LinkedIn URL is stored on profile.
- Text extraction has LinkedIn-oriented parsing heuristics, but no OAuth/profile sync pipeline.

Needed:
1. LinkedIn import mechanism (or extension-assisted structured import).
2. Identity resolution and merge rules into resume + skills entities.
3. Profile freshness/versioning with consent tracking.

### Gap C: Skill-Gap to Upskilling Roadmap
Current state:
- Missing skills are generated per ATS analysis.
- Enrichment suggestions improve bullet quality but do not generate a sequenced learning plan.

Needed:
1. Skill taxonomy normalization and proficiency levels.
2. Gap prioritization by market demand and role target.
3. Time-phased roadmap generation (30/60/90 day plans, checkpoints, outcomes).
4. Progress tracking model and recommendation feedback loop.

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
