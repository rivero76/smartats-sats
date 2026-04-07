<!--
  UPDATE LOG
  2026-04-07 | P28 LinkedIn Profile Fit Analyzer plan created (plan-decomposer session)
-->

# P28 — LinkedIn Profile Fit Analyzer

<!-- Status: DRAFT -->

## Goal

Users who have imported their LinkedIn profile want to know how competitive they are for a specific target role before they start applying. Today, SmartATS can score a resume against a job description (ATS analysis) and compute a market gap matrix from aggregated signals (P26), but neither flow treats the LinkedIn profile as the primary input, and neither produces a single "how competitive am I?" percentage anchored to a named role family. This phase introduces the Profile Fit Analyzer: a user triggers an on-demand fit analysis by selecting a target role and (optionally) a target market; the system compares their LinkedIn-sourced skill and experience signals against `sats_market_signals` baselines for that role; a 0–100 Profile Fit Score is returned alongside a prioritised breakdown of gaps and actionable recommendations. An optional reconciliation sub-feature highlights discrepancies between the LinkedIn profile and any uploaded resume. Done means: the `analyze-profile-fit` edge function is live; `sats_profile_fit_reports` persists results; the `/profile-fit` route renders the score, breakdown, and recommendations with correct tier gating; the Playwright scraper enrichment captures certifications and recommendation count; and reconciliation (Max+ tier) highlights LinkedIn-vs-resume conflicts.

---

## Stories

### Story 1 — DB Foundation: `sats_profile_fit_reports`

**Acceptance criteria:**

- Migration creates `sats_profile_fit_reports` with columns:
  - `id` UUID PK DEFAULT gen_random_uuid()
  - `user_id` UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE
  - `target_role_family_id` UUID NOT NULL REFERENCES sats_role_families(id)
  - `target_market_code` TEXT NOT NULL
  - `fit_score` INTEGER NOT NULL CHECK (fit_score BETWEEN 0 AND 100)
  - `score_rationale` TEXT
  - `gap_snapshot_id` UUID NULLABLE REFERENCES sats_gap_snapshots(id)
  - `resume_id` UUID NULLABLE REFERENCES sats_resumes(id)
  - `reconciliation_conflicts` JSONB NULLABLE
  - `model_used` TEXT
  - `cost_estimate_usd` NUMERIC(10,6)
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- RLS: owner-only SELECT, INSERT, DELETE (UPDATE not permitted — reports are immutable).
- Migration file name follows `YYYYMMDDHHMMSS_p28_profile_fit_reports.sql` convention.
- `bash scripts/ops/gen-types.sh` run after migration — `src/integrations/supabase/types.ts` reflects the new table.
- `sats_profile_fit_reports` added to the Key tables list in `docs/architecture.md`.

**Files expected to change:**

- `supabase/migrations/<timestamp>_p28_profile_fit_reports.sql` — new migration with table DDL and RLS policies
- `src/integrations/supabase/types.ts` — auto-regenerated after migration
- `docs/architecture.md` — Key Data Tables entry

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
npm run verify
```

**Risks / non-goals:**

- Do not store raw LLM response payloads in this table; `reconciliation_conflicts` stores only the structured diff output.
- `gap_snapshot_id` is nullable — the fit report can exist independently of a gap matrix run; linking is best-effort.
- No update path — reports are append-only; if the user reruns the analysis a new row is created.

---

### Story 2 — `analyze-profile-fit` Edge Function

**Acceptance criteria:**

- New edge function at `supabase/functions/analyze-profile-fit/index.ts`.
- Accepts JSON body: `{ target_role_family_id: string, target_market_code: string, resume_id?: string }`.
- Authenticates caller via Supabase JWT (`Authorization: Bearer <token>`); returns `401` if missing.
- Validates env vars at top of function; returns `503` for any missing required var.
- Reads the user's skill profile from `sats_user_skills` (joined with `sats_skill_experiences` for recency context).
- Reads market signals from `sats_market_signals` for the requested `(role_family_id, market_code)` pair, 30-day window; if no signals exist, returns `404` with `{ error: "no_market_signals" }`.
- Computes a 0–100 Profile Fit Score using the following formula contract (enforced via LLM structured output):
  - Score = weighted coverage across critical (weight 3), important (weight 2), nice-to-have (weight 1) signal tiers; normalised to 100.
  - LLM call uses model `OPENAI_MODEL_PROFILE_FIT` env var, fallback `gpt-4.1-mini`.
  - `callLLM()` from `_shared/llmProvider.ts` is the only permitted LLM call path.
  - JSON schema (`PROFILE_FIT_JSON_SCHEMA`) is strict and enforces: `fit_score` (integer 0–100), `score_rationale` (string), `gap_items` array (each with `signal_value`, `signal_type`, `priority_tier`, `candidate_status`, `recommended_action`, `estimated_weeks_to_close`).
- When `resume_id` is provided:
  - Fetches text from `document_extractions` for that resume (owner-scoped query).
  - Runs a second, focused LLM call to identify discrepancies between LinkedIn profile data and resume text (job titles, dates, companies, skill claims); returns structured `reconciliation_conflicts` array.
  - Both calls are isolated (Call 1 score never influenced by reconciliation context).
- Persists results to `sats_profile_fit_reports`; returns the inserted row ID plus the full report body.
- All telemetry/logging calls wrapped in `try/catch` so they never block the response.
- Uses `buildCorsHeaders` / `isOriginAllowed` from `_shared/cors.ts`.
- Smoke tests cover: happy path (score returned), missing env var returns `503`, no market signals returns `404`, invalid JWT returns `401`.

**Files expected to change:**

- `supabase/functions/analyze-profile-fit/index.ts` — new edge function
- `supabase/functions/analyze-profile-fit/config.toml` — function config (verify_jwt=true)
- `tests/unit/edge-functions/analyze-profile-fit.test.ts` — smoke tests (happy path + 503 + 404 + 401)

**Validation commands:**

```bash
supabase functions serve analyze-profile-fit
npm run test -- tests/unit/edge-functions/analyze-profile-fit.test.ts
npm run verify:full
```

**Risks / non-goals:**

- Do not reuse `generate-gap-matrix` directly — that function writes gap snapshot rows and has different persistence semantics. Profile fit is a separate, lighter read path over the same `sats_market_signals` data.
- Reconciliation (second LLM call) is only triggered when `resume_id` is supplied; its output is stored in `reconciliation_conflicts` JSONB but is NOT the same as the P16 S3 full reconciliation engine (`sats_profile_conflicts` table). Do not merge these flows.
- If `sats_user_skills` is empty for the user, return a fit score of 0 with `score_rationale` noting no profile data — do not error out.
- Model governance doc (`docs/specs/technical/llm-model-governance.md`) must be updated to register `OPENAI_MODEL_PROFILE_FIT`.

---

### Story 3 — `useProfileFit` Hook and TanStack Query Integration

**Acceptance criteria:**

- New hook `src/hooks/useProfileFit.ts` exposing:
  - `useProfileFitHistory(userId)` — fetches all `sats_profile_fit_reports` rows for the user, ordered by `created_at` DESC.
  - `useRunProfileFit()` — mutation that POSTs to `analyze-profile-fit` edge function; invalidates `profile-fit-history` query on success.
- Hook follows existing conventions in `src/hooks/useGapAnalysis.ts` (TanStack Query, `supabase` client from context).
- Unit tests cover: query returns empty array on no data; mutation triggers cache invalidation.
- `usePlanFeature` gating is enforced in the hook's mutation: calling `useRunProfileFit()` when the user's plan does not include `profile_fit` throws a `PlanGateError` before hitting the edge function.
- `profile_fit` added as a new `PlanFeatureKey` in `src/hooks/usePlanFeature.ts`:
  - `free`: score-only (full gap breakdown hidden)
  - `pro` and above: full breakdown + recommendations
  - `max` and above: reconciliation view + historical score tracking

**Files expected to change:**

- `src/hooks/useProfileFit.ts` — new hook
- `src/hooks/usePlanFeature.ts` — add `profile_fit` key and tier assignments
- `tests/unit/hooks/useProfileFit.test.ts` — unit tests

**Validation commands:**

```bash
npm run test -- tests/unit/hooks/useProfileFit.test.ts
npm run verify:full
```

**Risks / non-goals:**

- Do not add historical score trend charts in this story — that is Max-tier UI deferred to Story 6.
- The hook must not import from `useGapAnalysis` — they are independent domains sharing only the `sats_role_families` reference table.

---

### Story 4 — `/profile-fit` Route and Core UI

**Acceptance criteria:**

- New route `/profile-fit` added to `src/App.tsx` and `src/components/AppSidebar.tsx` (nav item, appropriate icon).
- New page component `src/pages/ProfileFit.tsx` with:
  - Role family selector (dropdown, sourced from `useRoleFamilies()` already built in P26).
  - Market code selector (same markets as Gap Analysis: NZ/AU/UK/BR/US).
  - "Analyze Fit" CTA button that calls `useRunProfileFit()`.
  - **Free tier:** displays Profile Fit Score (large percentage display) and `score_rationale` text only; a blurred/locked panel below teases the breakdown with upgrade CTA.
  - **Pro+ tier:** full gap breakdown in three collapsible sections (Critical / Important / Nice-to-Have), each item showing `signal_value`, `signal_type`, `recommended_action`, and `estimated_weeks_to_close`.
  - Loading and error states handled.
  - Empty state when no analyses have been run yet.
- All animation imports use presets from `src/lib/animations.ts` (no ad-hoc Framer Motion values).
- Stagger applied to gap item lists; capped at 10 items per section.
- Page is accessible: landmark regions, correct heading hierarchy, interactive elements keyboard-navigable (axe check passes).

**Files expected to change:**

- `src/pages/ProfileFit.tsx` — new page
- `src/App.tsx` — add `/profile-fit` route
- `src/components/AppSidebar.tsx` — nav item
- `tests/unit/a11y/profile-fit.a11y.test.tsx` — axe accessibility test

**Validation commands:**

```bash
npm run test -- tests/unit/a11y/profile-fit.a11y.test.tsx
npm run build
npm run verify:full
```

**Risks / non-goals:**

- Do not build the reconciliation panel in this story — that is Story 5.
- Do not build the historical score chart in this story — that is Story 6.
- Upgrade CTA wording is a placeholder until P24 (Self-Service Onboarding) ships; use generic "Upgrade to Pro" text.

---

### Story 5 — Reconciliation View (Max+ Tier)

**Acceptance criteria:**

- When the authenticated user is on `max` or `enterprise` plan and has at least one uploaded resume, a "Resume Reconciliation" section is visible on `/profile-fit`.
- Section contains a resume selector (dropdown) sourced from `useResumes()` hook; defaults to the most recently uploaded resume.
- When "Analyze with Reconciliation" is triggered, `useRunProfileFit()` passes `resume_id` to the edge function.
- Returned `reconciliation_conflicts` array is rendered as a conflict list: each item shows the conflicting field (job title, company, dates, skill claim), the LinkedIn value, the resume value, and a severity badge (HIGH / MEDIUM / LOW, derived from conflict type).
- If no conflicts are found, a "No discrepancies detected" empty state is shown.
- Free and Pro users see a locked/blurred placeholder for this section with a "Max plan required" upgrade prompt.
- Section is only rendered when `hasFeature('profile_fit_reconciliation')` returns true — add this key to `usePlanFeature.ts`.

**Files expected to change:**

- `src/pages/ProfileFit.tsx` — add reconciliation section
- `src/hooks/usePlanFeature.ts` — add `profile_fit_reconciliation` key (max+)
- `src/components/profile-fit/ReconciliationConflictList.tsx` — new sub-component

**Validation commands:**

```bash
npm run build
npm run verify:full
```

**Risks / non-goals:**

- This story does NOT write to `sats_profile_conflicts` (the P16 S3 full reconciliation table). Conflicts here are stored only in `sats_profile_fit_reports.reconciliation_conflicts` JSONB and are read-only / informational.
- Do not implement a "resolve conflict" flow — resolution belongs to the P16 S3 engine. This surface is read-only awareness only.
- Reconciliation LLM call is already implemented in Story 2's edge function; this story is UI-only.

---

### Story 6 — Historical Score Tracking (Max+ Tier)

**Acceptance criteria:**

- On `/profile-fit`, Max+ users see a "Score History" section below the current score display.
- Section renders a simple line chart (use shadcn/ui + Recharts, consistent with existing chart usage in the codebase) showing `fit_score` over time for the selected `(target_role_family_id, target_market_code)` combination.
- Chart only appears when there are 2 or more historical reports for the selected role/market pair.
- `useProfileFitHistory()` already provides the data (Story 3); no new queries needed.
- Free and Pro users see a locked placeholder with "Max plan required" messaging.
- A "Clear History" button (destructive, confirmation required) calls a `DELETE` on `sats_profile_fit_reports` for the current user — uses Supabase client directly, scoped to the authenticated user.

**Files expected to change:**

- `src/pages/ProfileFit.tsx` — add history section
- `src/components/profile-fit/FitScoreHistoryChart.tsx` — new sub-component

**Validation commands:**

```bash
npm run build
npm run verify:full
```

**Risks / non-goals:**

- Do not add cross-role trend analysis or comparative charts — single role/market line chart only.
- "Clear History" deletes all reports for the current user (not role-scoped) to avoid partial data confusion; this is intentional for MVP.
- Recharts is already a transitive dependency; do not add a new charting library.

---

### Story 7 — Playwright Scraper Enrichment (Certifications + Recommendation Count)

**Acceptance criteria:**

- `scripts/playwright-linkedin/src/scraper.ts` extended to extract two additional fields from a LinkedIn profile page:
  - `certifications`: array of `{ name: string, issuing_org: string, issued_date?: string }` from the Certifications section.
  - `recommendation_count`: integer count of received recommendations (from the Recommendations section header).
- `scripts/playwright-linkedin/src/types.ts` updated: `LinkedInProfile` interface gains `certifications` (array, nullable/optional) and `recommendation_count` (integer, nullable/optional).
- Both fields are gracefully absent (undefined / null) when the profile section does not exist or is not rendered — no exceptions thrown.
- `linkedin-profile-ingest` edge function updated to accept and forward both new fields to the LLM normalization step; `LINKEDIN_NORMALIZATION_SCHEMA` updated to include a `certifications` array and `recommendation_count` field.
- `sats_user_skills` certification entries seeded from `certifications` scraper output during the standard ingest flow (if cert name matches existing signal taxonomy); otherwise stored as raw skill records with `category = 'certification'`.
- Existing unit tests for the scraper types remain passing.

**Files expected to change:**

- `scripts/playwright-linkedin/src/types.ts` — add `certifications` and `recommendation_count` to `LinkedInProfile`
- `scripts/playwright-linkedin/src/scraper.ts` — extraction logic for both new fields
- `supabase/functions/linkedin-profile-ingest/index.ts` — forward new fields + update normalization schema
- `tests/unit/edge-functions/linkedin-profile-ingest.test.ts` — update/add tests covering the new fields

**Validation commands:**

```bash
supabase functions serve linkedin-profile-ingest
npm run test -- tests/unit/edge-functions/linkedin-profile-ingest.test.ts
npm run verify:full
```

**Risks / non-goals:**

- LinkedIn's DOM structure for Certifications and Recommendations sections is not guaranteed stable. The scraper must treat extraction failures as soft failures (return `null`, not throw).
- This story does NOT change the scraper's authentication or session management (`session.ts` untouched).
- Do not attempt to scrape recommendations text content — count only.
- The `recommendation_count` field is informational only in this phase; no scoring weight is assigned to it.

---

### Story 8 — Help Content and Marketing Page Updates

**Acceptance criteria:**

- `/help` page content updated to document the Profile Fit Analyzer workflow: how to trigger an analysis, what the score means, how tier gating affects the breakdown, and the reconciliation sub-feature.
- `landing.html` updated to include a feature callout for "Profile Fit Score" under the appropriate tier section (Pro and Max).
- `investor.html` updated if the Profile Fit Analyzer strengthens any existing talking point (competitive differentiation narrative).
- `docs/releases/UNTESTED_IMPLEMENTATIONS.md` updated with P28 as a new untested feature block.
- `docs/changelog/CHANGELOG.md` updated with a P28 entry.

**Files expected to change:**

- `src/pages/Help.tsx` (or equivalent help content source file) — new Profile Fit section
- `landing.html` — feature callout for Profile Fit Score
- `investor.html` — update if applicable
- `docs/releases/UNTESTED_IMPLEMENTATIONS.md` — P28 entry
- `docs/changelog/CHANGELOG.md` — P28 entry

**Validation commands:**

```bash
npm run docs:check
npm run verify:full
```

**Risks / non-goals:**

- Do not rewrite existing help content — append the new section only.
- Marketing copy must only describe features that are RUNTIME-VERIFIED; mark Profile Fit as "new" and note tier requirements accurately.

---

## Dependency Order

Stories 1 → 2 → 3 → 4 are a linear chain (each builds on the previous). Stories 5 and 6 depend on Story 4 (UI scaffolding must exist) but are independent of each other. Story 7 (scraper enrichment) is fully independent and can be worked in parallel with any other story. Story 8 (help/marketing) depends on Story 4 being merged.

```
S1 (DB) → S2 (edge fn) → S3 (hook) → S4 (core UI) → S5 (reconciliation UI)
                                                    ↘ S6 (history chart)
S7 (scraper) — independent
S8 (help/marketing) — after S4
```

## Cross-cutting Concerns

- Every new TS/JS/SQL file must include an UPDATE LOG header block.
- `OPENAI_MODEL_PROFILE_FIT` must be registered in `docs/specs/technical/llm-model-governance.md` as part of Story 2.
- All new tables use `sats_` prefix, full RLS owner-only policies, and are included in a `gen-types.sh` run.
- `supabase functions serve analyze-profile-fit` must be used for local validation of Story 2.
- The `profile_fit` and `profile_fit_reconciliation` feature keys added to `usePlanFeature.ts` in Stories 3 and 5 must not be removed or renamed — P23 (Feature Gating Enforcement) will wire real billing checks against these exact key names.
