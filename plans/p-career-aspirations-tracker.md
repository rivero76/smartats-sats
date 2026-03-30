# P-Career-Aspirations-Tracker: Career Aspirations Tracker

<!-- Status: ACTIVE -->

**Created:** 2026-03-28
**Owner:** Claude Code
**Branch convention:** `p-career-aspirations`

---

## Goal

Today SmartATS evaluates how well a candidate fits a specific job. This feature adds the complementary "delta" view: when a candidate is aspirational about a role they are not yet qualified for, they receive a structured Career Gap Analysis showing what skills, certifications, experiences, and role transitions are needed over two time horizons (6–12 months and 2–5 years), along with a readiness percentage, a coach nudge, and a living tracker that recalculates as their profile grows. The feature also lays critical market-intelligence infrastructure by extracting normalised signals from every ingested job description into `sats_jd_signals` — a table that cannot be backfilled retroactively and must be built early. "Done" means: (S1) low-score ATS results route to `/aspirations`; (S2) a gap report with readiness %, two-horizon breakdown, and coach nudge is generated on demand; (S3) `sats_jd_signals` is populated on every JD ingest path; (S4) the report recalculates on profile updates with score-drift display. S5 and S6 (trend layer and trend alerts) are defined below as future stories for roadmap clarity but are explicitly out of scope for the MVP delivery sprint.

---

## Tier Gating

| Story                     | Tier                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| S1 — Routing rule         | Free (all users see the routing; the `/aspirations` page entry point is free)               |
| S2 — Gap report MVP       | Pro/Max (full gap report generation is a Pro+ feature; Free users see a teaser with gating) |
| S3 — JD signal extraction | Internal / platform infrastructure — no tier gate on ingestion; trend surfaces are Pro+     |
| S4 — Living tracker       | Pro/Max                                                                                     |
| S5 — Trend layer          | Max / C-Level                                                                               |
| S6 — Trend alerts         | Max / C-Level                                                                               |

---

## Stories

### Story S1 — ATS Routing Rule: Low-Score Results Route to `/aspirations`

**Context:** When an ATS match score is below 70%, the current UX delivers a discouraging score with no constructive path forward. This story reframes those low-score results as aspirational paths instead of failures.

**Acceptance criteria:**

- When a completed ATS analysis has `match_score < 70`, the "View Analysis" action and any auto-navigation after scoring routes to `/aspirations?analysisId=<id>` instead of `/analyses/<id>`.
- The `/aspirations` route exists in React Router and renders a placeholder page (e.g. "Your Career Path for [Job Title]") — full content ships in S2.
- Analyses with `match_score >= 70` continue to route to `/analyses` unchanged.
- The routing threshold (70) is read from a named constant in the frontend codebase — not a magic number scattered across components.
- Navigation in the sidebar/nav bar includes an "Aspirations" entry with a route to `/aspirations`.
- The `/aspirations` index page lists all aspirations (analyses < 70%) for the current user with job title, company, and readiness score (shows "Pending" until S2 is complete).
- Existing ATS analysis views for scores >= 70 are unaffected — no regressions.
- `npm run verify` exits 0.

**Files expected to change:**

- `src/App.tsx` — add `/aspirations` and `/aspirations/:analysisId` routes
- `src/components/layout/Sidebar.tsx` (or equivalent nav file) — add Aspirations nav entry
- `src/pages/Aspirations.tsx` (new) — aspirations index page (list view placeholder)
- `src/pages/AspirationDetail.tsx` (new) — aspiration detail placeholder
- `src/lib/ats-thresholds.ts` (new) — export `ATS_ASPIRATION_THRESHOLD = 70` and any other threshold constants
- `src/hooks/useAnalyses.ts` (or equivalent) — update navigation helpers to use threshold constant
- Any component that currently auto-navigates after ATS analysis completion (e.g. result modal, post-analysis redirect)

**Validation commands:**

```bash
npm run verify
npm run lint
npm run test
```

**Risks / non-goals:**

- Do not change how existing analyses are stored or scored — this is a routing and UI framing change only.
- Do not backfill existing low-score analyses into a new table — the routing reads existing `sats_analyses` rows.
- Tier gating UI for S2 content is deferred to S2 — the `/aspirations` route itself is visible to all users in S1.
- The threshold of 70 is a product decision; the code must make it easy to change (constant) but the value itself is not configurable per user in S1.

---

### Story S2 — Gap Report MVP: Two Horizons, Readiness %, Coach Nudge

**Context:** The core user-facing feature. When a user opens an aspiration, they see a structured Career Gap Analysis generated by an LLM: what's missing and how to close it over two time horizons, plus an estimated readiness percentage and a contextual coach nudge.

**Acceptance criteria:**

- A new edge function `career-gap-analysis` accepts `{ analysisId, userId }`, retrieves the resume text and job description, calls `callLLM()` with a structured prompt, and returns a schema-locked JSON response.
- The LLM response schema includes at minimum:
  - `readiness_pct` (integer 0–100)
  - `readiness_disclaimer` (string)
  - `short_term_gaps[]` — each item: `{ gap_type: 'skill'|'cert'|'course', label, priority: 'high'|'medium'|'low', close_action }`
  - `long_term_gaps[]` — each item: `{ gap_type: 'experience'|'seniority'|'transition'|'relationship', label, priority, close_action }`
  - `coach_nudge` (string — the contextual message shown after the report)
- A new table `sats_aspiration_reports` stores the gap report output:
  - `id` (uuid PK)
  - `analysis_id` (FK → `sats_analyses.id`)
  - `user_id` (FK → `auth.users.id`)
  - `readiness_pct` (integer)
  - `short_term_gaps` (jsonb)
  - `long_term_gaps` (jsonb)
  - `coach_nudge` (text)
  - `model_used` (text)
  - `cost_estimate_usd` (numeric)
  - `created_at`, `updated_at` (timestamptz)
- RLS on `sats_aspiration_reports`: users can only SELECT/INSERT/UPDATE their own rows.
- Migration file follows naming convention `YYYYMMDDHHMMSS_p_career_aspirations_s2_gap_report.sql`.
- After migration: `bash scripts/ops/gen-types.sh` regenerates types.
- The `AspirationDetail.tsx` page renders:
  - Readiness % as a prominent visual (e.g. circular progress or large badge)
  - Disclaimer text beneath the readiness %, matching the product brief wording style
  - Short-term section (6–12 months) with gap cards
  - Long-term section (2–5 years) with gap cards
  - Coach nudge block rendered **after** both gap sections, not before
  - A "Generate Report" button that triggers the edge function call if no report exists yet
  - Loading state while the LLM call is in progress
- For Pro/Max tier gate: Free-tier users see the readiness % and the first two short-term gaps; remaining gaps are blurred/locked with an upgrade CTA. The gate is enforced in the frontend via the existing subscription/tier check pattern — no server-side enforcement required in S2 (add a comment noting this is a future hardening item).
- `npm run verify` exits 0.
- `supabase functions serve career-gap-analysis` starts without errors.

**Files expected to change:**

- `supabase/migrations/YYYYMMDDHHMMSS_p_career_aspirations_s2_gap_report.sql` (new) — `sats_aspiration_reports` table + RLS
- `supabase/functions/career-gap-analysis/index.ts` (new) — edge function
- `supabase/functions/career-gap-analysis/` — standard Deno edge function directory
- `src/integrations/supabase/types.ts` — regenerated after migration (do not hand-edit)
- `src/pages/AspirationDetail.tsx` — full gap report UI
- `src/pages/Aspirations.tsx` — update list view to show readiness_pct from stored reports
- `src/hooks/useAspirationReport.ts` (new) — TanStack Query hook to fetch/mutate aspiration reports
- `docs/changelog/CHANGELOG.md` — update after implementation

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
npm run verify
npm run lint
supabase functions serve career-gap-analysis
```

**Risks / non-goals:**

- The LLM model for gap analysis must follow the model governance spec. Use `OPENAI_MODEL_ATS` (or introduce `OPENAI_MODEL_GAP_ANALYSIS`) — document the choice. Do not hardcode a model name.
- Do not implement the living-tracker recalculation logic in S2 — that is S4. S2 generates a report on demand only.
- The tier gate in S2 is frontend-only. Server-side enforcement is a known gap — flag it in code comments and in `docs/releases/UNTESTED_IMPLEMENTATIONS.md`.
- Do not design the trend layer references in S2 UI — that surface comes in S5.
- The coach nudge copy is generated by the LLM per-report. The product brief provides example wording to guide the system prompt but the LLM should personalise it.

---

### Story S3 — JD Signal Extraction: `sats_jd_signals` Infrastructure (Foundational)

**Context:** This is the most strategically important story. Historical data cannot be backfilled. Every job description ingested from this point forward must produce a normalised signal record. This table is the foundation for trend analysis, market intelligence, and aspiration routing improvements.

**Acceptance criteria:**

- A new table `sats_jd_signals` is created with the following columns:
  - `id` (uuid PK default `gen_random_uuid()`)
  - `jd_id` (uuid NOT NULL FK → `sats_job_descriptions.id` ON DELETE CASCADE)
  - `user_id` (uuid FK → `auth.users.id`) — nullable, system-level ingests may be anonymous
  - `role_category` (text) — e.g. "Cloud Director", "Software Engineer"
  - `required_skills` (text[]) — normalised array
  - `preferred_skills` (text[])
  - `certifications` (text[]) — e.g. ["AWS SAA", "PMP"]
  - `min_years_experience` (integer)
  - `seniority_level` (text) — one of: 'IC', 'Manager', 'Director', 'VP', 'C-Level', 'Unknown'
  - `market_region` (text) — e.g. 'ANZ', 'US', 'UK', 'EU', 'Unknown'
  - `ingested_at` (timestamptz NOT NULL default `now()`)
  - `extraction_model` (text) — which LLM model produced this record
  - `created_at`, `updated_at` (timestamptz)
  - Unique constraint on `jd_id` (one signal record per JD)
- RLS on `sats_jd_signals`: users can SELECT their own rows (where `user_id = auth.uid()`); INSERT is restricted to the service role (edge functions run as service role); no UPDATE/DELETE for regular users.
- A new edge function `extract-jd-signals` accepts `{ jdId }`, retrieves the JD text from `sats_job_descriptions`, calls `callLLM()` with a structured extraction prompt, and upserts the result into `sats_jd_signals`. The function is idempotent — re-running on the same `jdId` updates the existing record.
- The `job-description-url-ingest` edge function is updated to call `extract-jd-signals` (or inline the extraction) after successful JD persistence. This ensures all new URL-ingested JDs get signal extraction automatically.
- The manual JD save path (frontend form submission to `sats_job_descriptions`) triggers signal extraction — either via a database trigger or via a frontend hook call after the insert succeeds. The chosen approach must be documented in the implementation (a comment explaining the decision).
- Indexes are added: `idx_sats_jd_signals_jd_id`, `idx_sats_jd_signals_role_category`, `idx_sats_jd_signals_seniority_level`, `idx_sats_jd_signals_market_region`, `idx_sats_jd_signals_ingested_at`.
- Migration file follows naming convention `YYYYMMDDHHMMSS_p_career_aspirations_s3_jd_signals.sql`.
- After migration: `bash scripts/ops/gen-types.sh` regenerates types.
- `npm run verify` exits 0.
- `supabase functions serve extract-jd-signals` starts without errors.

**Files expected to change:**

- `supabase/migrations/YYYYMMDDHHMMSS_p_career_aspirations_s3_jd_signals.sql` (new) — table, indexes, RLS
- `supabase/functions/extract-jd-signals/index.ts` (new) — signal extraction edge function
- `supabase/functions/job-description-url-ingest/index.ts` — add downstream call to signal extraction
- `src/integrations/supabase/types.ts` — regenerated after migration
- `src/hooks/useJobDescriptions.ts` (or equivalent) — trigger signal extraction after manual JD save if using frontend path
- `docs/changelog/CHANGELOG.md` — update after implementation

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
npm run verify
npm run lint
supabase functions serve extract-jd-signals
supabase functions serve job-description-url-ingest
```

**Risks / non-goals:**

- Do not attempt to backfill existing JDs — backfilling is a separate operational task requiring a one-off script, which is out of scope for this story.
- Do not expose a trend analysis UI in S3 — the table is infrastructure only. The data surface comes in S5.
- The extraction LLM should use `gpt-4.1-mini` class (fast + cheap) since this runs on every JD ingest. Use `OPENAI_MODEL_ENRICH` env var or introduce `OPENAI_MODEL_JD_SIGNALS`. Document the choice following the model governance spec.
- If the signal extraction call fails (LLM error, network error), the JD ingest must still succeed. Signal extraction failure must be logged but must not block the user's JD save.
- `user_id` is nullable by design — system-ingested JDs (proactive `fetch-market-jobs`) do not have a user owner. The RLS read policy must handle this correctly so users do not accidentally see each other's signals via a null `user_id` match.

---

### Story S4 — Living Tracker: Recalculation on Profile Updates + Score Drift

**Context:** The aspiration report is not a one-time snapshot. As the user adds new experiences, uploads a new resume, or logs a completed certification, their readiness score should update and the history of score changes should be visible.

**Acceptance criteria:**

- A new table `sats_aspiration_score_history` is created:
  - `id` (uuid PK)
  - `aspiration_report_id` (uuid FK → `sats_aspiration_reports.id` ON DELETE CASCADE)
  - `user_id` (uuid FK → `auth.users.id`)
  - `readiness_pct` (integer)
  - `trigger_event` (text) — one of: 'new_resume', 'new_enrichment', 'cert_logged', 'manual_refresh'
  - `snapshot_at` (timestamptz default `now()`)
- RLS on `sats_aspiration_score_history`: users can only SELECT their own rows.
- When a user uploads a new resume (i.e. a new active resume is set), all their existing aspiration reports are queued for recalculation. "Queued" means the recalculation runs asynchronously in an edge function, not synchronously in the upload flow.
- When a user accepts a new enriched experience (from the `/experiences` flow), the same recalculation queue is triggered.
- A new edge function `recalculate-aspiration` accepts `{ aspirationReportId, triggerEvent }`, re-runs the gap analysis LLM call, updates the `sats_aspiration_reports` row, and inserts a row into `sats_aspiration_score_history` with the previous score captured before the update.
- The `AspirationDetail.tsx` page renders a score drift timeline: e.g. "3 months ago: 34% → Today: 41%" using the `sats_aspiration_score_history` records.
- A "Refresh Report" button is available on the detail page allowing the user to manually trigger recalculation (`trigger_event: 'manual_refresh'`). This button is rate-limited in the UI (disabled for 60 seconds after triggering) to prevent abuse.
- A user can log a completed certification via a small form on the aspiration detail page. This creates a record and triggers recalculation with `trigger_event: 'cert_logged'`. The certification log is stored in `sats_aspiration_reports.short_term_gaps` (mark the relevant gap as `completed: true`) or in a separate lightweight table if the implementation requires it — the implementer should choose the simplest approach and document the decision.
- `npm run verify` exits 0.
- `supabase functions serve recalculate-aspiration` starts without errors.

**Files expected to change:**

- `supabase/migrations/YYYYMMDDHHMMSS_p_career_aspirations_s4_score_history.sql` (new) — `sats_aspiration_score_history` table + RLS
- `supabase/functions/recalculate-aspiration/index.ts` (new) — recalculation edge function
- `src/integrations/supabase/types.ts` — regenerated after migration
- `src/pages/AspirationDetail.tsx` — add score drift timeline and manual refresh button
- `src/hooks/useAspirationReport.ts` — add score history query and manual recalculate mutation
- Any hook or component that handles resume upload completion — add trigger for aspiration recalculation
- Any hook or component that handles enrichment acceptance — add trigger for aspiration recalculation
- `docs/changelog/CHANGELOG.md` — update after implementation

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
npm run verify
npm run lint
supabase functions serve recalculate-aspiration
```

**Risks / non-goals:**

- S4 has a hard dependency on S2. Do not begin S4 until S2 is merged and passing `npm run verify`.
- Recalculation must be fire-and-forget from the user's perspective — upload flows and enrichment flows must not block waiting for aspiration recalculation.
- Do not implement a full notification system for score drift in S4 — the score drift display is on-page only. Proactive notifications are a future item.
- The rate-limit on the manual refresh button is frontend-only in S4. Server-side rate limiting is a future hardening item — flag it in a code comment.
- If a user has many aspiration reports and uploads a resume, queuing all of them for recalculation simultaneously could cause high LLM cost. The implementation should process at most 3 aspiration reports per trigger event and log a warning if more are pending. Document this limit in a constant.

---

### Story S5 — Trend Layer: Surface JD Signal Trends in Aspiration Reports (Future)

**Context:** Using the `sats_jd_signals` table built in S3, surface aggregate skill and certification trend data inside aspiration reports. This story requires a meaningful volume of `sats_jd_signals` data before it delivers value — it should not be started until at least a few weeks of signal data has been accumulated.

**Acceptance criteria:**

- A query layer over `sats_jd_signals` aggregates the top required skills, preferred skills, and certifications for a given `role_category` and `seniority_level`.
- The aspiration detail page includes a "Market Signals" section showing: "Based on N `{role_category}` JDs we've analysed, the most commonly required skills are: [list]."
- The trend section shows a simple time comparison if data permits: e.g. "6 months ago: X% required AWS cert → Today: Y%."
- The trend query is read-only and does not call the LLM — it aggregates from `sats_jd_signals` directly.
- The section is hidden (not rendered) if fewer than 5 signal records exist for the target role category — show a message: "Not enough data yet for trend insights on this role."
- Tier gate: trend section is visible to Pro/Max only. Free users see the section header with an upgrade CTA.
- `npm run verify` exits 0.

**Files expected to change:**

- `src/pages/AspirationDetail.tsx` — add Market Signals section
- `src/hooks/useJdSignalTrends.ts` (new) — TanStack Query hook for aggregated signal data
- `supabase/functions/` — no new edge function required if aggregation is done via a Supabase RPC or direct query; if a new RPC is needed, add a migration

**Validation commands:**

```bash
npm run verify
npm run lint
npm run test
```

**Risks / non-goals:**

- S5 has a hard dependency on S3 having accumulated real data. It also has a logical dependency on S2 (the detail page it extends).
- Do not attempt real-time trend computation — query on page load, cache via TanStack Query.
- Do not build a standalone trend dashboard in S5 — that is a separate product surface.

---

### Story S6 — Trend Alerts: Notify User When Market Signals Shift (Future)

**Context:** When the market signals for a user's tracked aspiration role shift significantly (e.g. a certification requirement drops or a new skill becomes dominant), notify the user proactively.

**Acceptance criteria:**

- A scheduled edge function (or pg_cron job) runs periodically (e.g. weekly) and compares current `sats_jd_signals` aggregates for each user's tracked aspiration role categories against the aggregates from the previous period.
- If a significant shift is detected (configurable threshold — e.g. >=20% change in a top-5 required skill or certification), a notification is inserted into `sats_user_notifications`.
- Notification message example: "Market update: PMP certification requirement in Cloud Director roles has changed significantly since you started tracking this path."
- The `/aspirations` index page shows a badge indicator when unread trend alerts are present.
- Tier gate: Max / C-Level only.
- `npm run verify` exits 0.

**Files expected to change:**

- `supabase/functions/aspiration-trend-alert/index.ts` (new) — scheduled alerting function
- `supabase/migrations/` — cron schedule migration if not reusing existing scheduler
- `src/pages/Aspirations.tsx` — badge indicator for unread trend alerts
- `docs/changelog/CHANGELOG.md` — update after implementation

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
npm run verify
supabase functions serve aspiration-trend-alert
```

**Risks / non-goals:**

- S6 has hard dependencies on S3 (signal data) and the existing notification infrastructure (`sats_user_notifications`).
- Do not build a new notification system — reuse `sats_user_notifications` and existing notification display patterns.
- The shift detection algorithm does not need to be sophisticated in the first implementation — a simple percentage-change comparison is acceptable.

---

## Delivery Sequence

```
S3 (foundational — start first, no UI dependencies)
  ↓
S1 (routing, can be built in parallel with S3)
  ↓
S2 (depends on S1 route existing; benefits from S3 signals but does not block on them)
  ↓
S4 (depends on S2)
  ↓
S5 (depends on S2 UI and S3 data accumulation — start after several weeks of S3 data)
  ↓
S6 (depends on S3 data + S5 aggregation patterns + notification infrastructure)
```

**MVP sprint scope: S3 + S1 + S2 (in that order).**
S4 is post-MVP. S5 and S6 are future.

---

## Cross-Cutting Requirements

- Every new file must have the UPDATE LOG header block per coding conventions.
- Every new edge function must import `cors.ts`, `env.ts`, and `llmProvider.ts` from `supabase/functions/_shared/`. No direct OpenAI SDK calls.
- Every new table requires RLS policies in the same migration file.
- After every migration: run `bash scripts/ops/gen-types.sh`.
- Changelog entry required in `docs/changelog/CHANGELOG.md` after each story.
- The `/aspirations` route and nav entry must be added to the Help Center content (per memory: every new feature requires updated `/help` page content).
- After S2 ships: add an entry to `docs/releases/UNTESTED_IMPLEMENTATIONS.md` for the tier-gate server-side enforcement gap.
