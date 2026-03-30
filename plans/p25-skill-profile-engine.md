<!-- UPDATE LOG -->
<!-- 2026-03-28 | P25 Skill Profile Engine plan created (plan-decomposer session) -->

# P25 — Skill Profile Engine

<!-- Status: ACTIVE -->

## Goal

Long-tenure users (e.g. 20-year careers spanning multiple chapters) receive misleading ATS scores because stale technical skills from early roles are weighted the same as recent skills, transferable soft and leadership skills are never extracted from technical roles, and career arc context is absent entirely. This phase introduces a three-layer skill profile system: an AI classification pass (temperature=0, seed=42, schema-locked) that tags every skill with category, depth, last-used year, and transferable derivatives; a deterministic decay model that computes an effective weight from stored facts at analysis time (no weights stored); and a human-in-the-loop transparency layer that shows users the AI's reasoning and offers three simple override choices before saving anything. Done means: skill profiles are stored in `sats_skill_profiles`, decay config is seeded in `sats_skill_decay_config`, the `classify-skill-profile` edge function classifies and diffs on re-ingestion, both ATS scorer paths consume profile weights with a flat-list fallback, users can confirm/override via a pre-save transparency report and a settings management page, and all paths degrade gracefully when no profile exists.

---

## Stories

### Story 1 — DB Foundation: `sats_skill_profiles` + `sats_skill_decay_config`

**Acceptance criteria:**

- Migration creates `sats_skill_profiles` with all columns specified in the feature brief: `id` (UUID PK), `user_id` (UUID FK to `auth.users`), `skill_name` (TEXT), `category` (TEXT — enforced as CHECK constraint covering `technical|soft|leadership|domain|certification|methodology`), `depth` (TEXT — CHECK constraint covering `awareness|practitioner|expert|trainer`), `ai_last_used_year` (INTEGER), `user_confirmed_last_used_year` (INTEGER NULLABLE), `transferable_to` (TEXT[]), `career_chapter` (TEXT NULLABLE), `user_context` (TEXT NULLABLE), `source_experience_ids` (UUID[]), `ai_classification_version` (TEXT), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- Migration creates `sats_skill_decay_config` with columns: `id` (UUID PK), `category` (TEXT UNIQUE NOT NULL), `decay_rate_pct` (NUMERIC NOT NULL), `grace_years` (INTEGER NOT NULL), `floor_weight` (NUMERIC NOT NULL), `no_decay` (BOOLEAN NOT NULL DEFAULT false), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).
- `sats_skill_decay_config` is seeded within the migration with the five canonical decay rules:
  - `technical`: decay_rate_pct=8, grace_years=3, floor_weight=0.15, no_decay=false
  - `soft`: decay_rate_pct=0, grace_years=0, floor_weight=1.0, no_decay=true
  - `leadership`: decay_rate_pct=0, grace_years=0, floor_weight=1.0, no_decay=true
  - `domain`: decay_rate_pct=5, grace_years=3, floor_weight=0.20, no_decay=false
  - `certification`: decay_rate_pct=100, grace_years=3, floor_weight=0.0, no_decay=false (binary valid/expired — caller computes from known validity period)
  - `methodology`: decay_rate_pct=0, grace_years=0, floor_weight=1.0, no_decay=true
- RLS on `sats_skill_profiles`: owner-only SELECT, INSERT, UPDATE, DELETE (`auth.uid() = user_id`).
- RLS on `sats_skill_decay_config`: SELECT is public (no auth required), INSERT/UPDATE/DELETE restricted to service role / admin check (`has_role('admin')`).
- `updated_at` trigger is added to both tables using the standard `moddatetime` extension pattern already used in the project.
- TypeScript types regenerated successfully after migration.
- `npm run verify` exits 0.

**Files expected to change:**

- `supabase/migrations/20260328900000_p25_s1_skill_profiles.sql` — new migration (two tables + RLS + seed data + triggers)
- `src/integrations/supabase/types.ts` — auto-regenerated; must not be manually edited

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
npm run verify
# Confirm tables exist:
# SELECT table_name FROM information_schema.tables WHERE table_name IN ('sats_skill_profiles','sats_skill_decay_config');
# Confirm seed rows:
# SELECT category, decay_rate_pct, no_decay FROM sats_skill_decay_config ORDER BY category;
```

**Risks / non-goals:**

- The `certification` binary logic (valid/expired from known validity periods) is NOT implemented in this story — the row is seeded, but the caller (S2/S4) is responsible for interpreting it; a full certification expiry registry is out of scope for P25.
- Do not add a `methodology` row that overlaps with `soft`; they are separate rows in the config table.
- The `sats_skill_decay_config` admin-write RLS depends on the `has_role` function from P21 S2 — confirm that migration is applied before running this story.

---

### Story 2 — `classify-skill-profile` Edge Function

**Acceptance criteria:**

- New Deno edge function at `supabase/functions/classify-skill-profile/index.ts`.
- Accepts POST body: `{ user_id: string, experience_text: string, experience_date_range: { start: string, end: string | null }, existing_profile?: ClassifiedSkill[] }`.
- Calls `callLLM()` with temperature=0, seed=42, `strict: true` JSON schema-locked output. Schema must require for each skill: `skill_name`, `category`, `depth`, `last_used_year`, `transferable_to` (array of strings), `career_chapter`.
- Infers career chapters from job titles and date ranges present in `experience_text` — returned as a `career_chapters` array alongside the `skills` array in the LLM response.
- When `existing_profile` is provided, returns a diff object: `{ new_skills, updated_skills, unchanged_skills }` by comparing `skill_name` (normalized lowercase) against the existing profile.
- Logs the LLM call to `sats_llm_call_logs` using the same pattern as other edge functions (wrap in try/catch — must never block response).
- On any LLM or DB error, returns a graceful fallback: HTTP 200 with `{ success: false, error: "<safe message>", skills: [], career_chapters: [] }` — never a 5xx that would block CV save.
- Uses `_shared/llmProvider.ts`, `_shared/cors.ts`, `_shared/env.ts` — no direct OpenAI SDK calls.
- Env var for model: `OPENAI_MODEL_SKILL_CLASSIFY`; fallback `gpt-4.1-mini`. Added to the model register in `docs/specs/technical/llm-model-governance.md`.
- Returns HTTP 400 with a structured error body for missing required fields (user_id, experience_text).
- Returns HTTP 503 (not 500) for missing environment variable configuration.
- CORS handled via `buildCorsHeaders` / `isOriginAllowed`.

**Files expected to change:**

- `supabase/functions/classify-skill-profile/index.ts` — new edge function
- `docs/specs/technical/llm-model-governance.md` — add `OPENAI_MODEL_SKILL_CLASSIFY` row to model register

**Validation commands:**

```bash
supabase functions serve classify-skill-profile
# In a second terminal — POST with minimal valid body and confirm 200 + skills array:
# curl -X POST http://localhost:54321/functions/v1/classify-skill-profile \
#   -H "Content-Type: application/json" \
#   -d '{"user_id":"test-uuid","experience_text":"Oracle DBA 2000-2010. Led 3-person team, managed SLAs.","experience_date_range":{"start":"2000-01-01","end":"2010-12-31"}}'
npm run verify
```

**Risks / non-goals:**

- The function does NOT write to `sats_skill_profiles` directly — it returns classified skills; the frontend (S3) is responsible for the save-after-confirm flow. This is intentional so the transparency report can be shown before any data is persisted.
- Do not implement a batch endpoint in this story — single experience classification only.
- Re-ingestion diff logic compares on normalized `skill_name` (lowercase, trimmed) — fuzzy matching is out of scope for P25.

---

### Story 3 — Transparency Report UI + Skill Override Flow

**Acceptance criteria:**

- New React component `src/components/skill-profile/SkillClassificationReview.tsx`.
- Component receives props: `classifiedSkills: ClassifiedSkill[]`, `careerChapters: string[]`, `onConfirm: (overrides: SkillOverride[]) => void`, `onCancel: () => void`.
- Renders a plain-English summary at the top: career chapter count, how many skills were classified per chapter, how many transferable skills were extracted, and a note that this will be saved when confirmed.
- For each career chapter, renders a collapsible section listing its skills with: skill name, category badge, depth badge, last_used_year, and transferable_to chips.
- For each skill, renders three override radio choices:
  1. "I still actively use this skill" — marks `user_confirmed_last_used_year = current year`
  2. "Foundation only — I've moved on" — no change, confirms AI classification
  3. "More relevant than it looks — let me explain" (Pro/Max tier only — show upgrade prompt for Free tier) — renders an inline textarea for user context; on submit triggers a re-classification call to the `classify-skill-profile` function with `user_context` appended to `experience_text`; shows what changed before allowing confirmation.
- After any re-classification triggered by option 3, renders a diff summary ("here's what changed") and re-renders the skill row with updated values.
- Primary "Looks good — save my skill profile" button calls `onConfirm` with the final overrides array.
- On re-ingestion (diff mode): renders only `new_skills` and `updated_skills` sections plus an "unchanged (N skills)" collapsed summary.
- Component uses animation presets from `src/lib/animations.ts` (`staggerContainer` + `listItem` on skill rows; cap stagger at 10).
- Component must pass axe-core a11y audit (add a test in `tests/unit/a11y/`).
- A TanStack Query mutation hook `src/hooks/useSkillProfile.ts` handles the save to `sats_skill_profiles` (upsert on `user_id` + `skill_name`).
- Tier check for option 3: read from the existing feature-flag / tier context used by other gated components in the codebase (do not introduce a new tier-check pattern).
- `npm run verify` exits 0.

**Files expected to change:**

- `src/components/skill-profile/SkillClassificationReview.tsx` — new component
- `src/hooks/useSkillProfile.ts` — new TanStack Query hook (query + mutation)
- `tests/unit/a11y/SkillClassificationReview.test.tsx` — new a11y test

**Validation commands:**

```bash
npm run verify
npm run test -- tests/unit/a11y/SkillClassificationReview.test.tsx
# Manual: storybook story optional but not required for this story
```

**Risks / non-goals:**

- The `SkillClassificationReview` component is NOT integrated into the CV upload flow in this story — integration is tracked as a follow-up within this story's PR description, or as a post-P25 task. The component must be independently renderable and testable.
- Do not show raw numeric weights to the user at any point — only plain-language choices and category/depth labels.
- Styling and colour choices for badges are delegated to the implementer using shadcn/ui conventions; do not over-specify.

---

### Story 4 — ATS Scorer Integration (`ats-analysis-direct`)

**Dependencies:** Stories 1, 2, and 3 must be merged before this story begins.

**Acceptance criteria:**

- `supabase/functions/ats-analysis-direct/index.ts` reads `sats_skill_profiles` for the requesting user at the start of `processAnalysis`.
- If a profile exists, builds a weighted skill input by:
  1. Reading `sats_skill_decay_config` rows (cached for the duration of the request — one query, not per-skill).
  2. For each skill in the profile, computing `effective_year = user_confirmed_last_used_year ?? ai_last_used_year`.
  3. Applying the decay formula: for non-`no_decay` categories, `weight = max(floor_weight, 1.0 - (decay_rate_pct/100) * max(0, (CURRENT_YEAR - effective_year - grace_years)))`. For `no_decay=true`, `weight = 1.0`.
  4. Appending each skill in `transferable_to[]` to the skill list at weight 1.0 (no decay for transferable skills regardless of category).
  5. Passing the weighted skill list to the ATS prompt as a structured block alongside the CV text.
- If no profile exists for the user (no rows in `sats_skill_profiles` for `user_id`), falls back to current flat skill extraction behaviour — no change to the analysis result.
- Weighted skill input does NOT replace the CV text — it is additive context in the prompt.
- The LLM call for ATS scoring is still Call 1 (pure baseline) as defined by the P18 two-call isolation — skill weights are injected into Call 1's prompt, not Call 2.
- DB reads for profile and decay config are wrapped in try/catch — any error falls back to flat extraction silently, logs a warning to `sats_llm_call_logs`.
- `npm run verify` exits 0.

**Files expected to change:**

- `supabase/functions/ats-analysis-direct/index.ts` — add profile read + decay computation + weighted prompt injection

**Validation commands:**

```bash
supabase functions serve ats-analysis-direct
# Test 1: run analysis for a user WITH a skill profile — confirm no error, result returns normally
# Test 2: run analysis for a user WITHOUT a skill profile — confirm fallback, result returns normally
npm run verify
```

**Risks / non-goals:**

- `CURRENT_YEAR` for decay computation must be derived at runtime (`new Date().getFullYear()`) — not hard-coded.
- Do not change the ATS JSON schema or the CV Optimisation second call — this story modifies prompt input only.
- Do not add `effective_weight` values to the `sats_analyses` output record in this story — that is a future analytics concern.
- Certification binary logic: if `category = 'certification'` and `no_decay = false`, treat `effective_weight` as 1.0 if `effective_year >= (CURRENT_YEAR - 3)` else 0.1 (simplified floor) — full certification validity registry is out of scope.

---

### Story 5 — Async ATS Scorer Integration (`async-ats-scorer`)

**Dependencies:** Stories 1 and 4 must be merged before this story begins.

**Acceptance criteria:**

- `supabase/functions/async-ats-scorer/index.ts` applies the same profile-read + decay computation + weighted prompt injection logic as Story 4.
- The implementation is extracted into a shared helper function rather than duplicated — the shared helper must live either in `_shared/skillDecay.ts` (new shared utility) or inline within the scorer if the diff is minimal; the plan does not mandate the structure, but duplication of the decay formula between the two functions is explicitly prohibited.
- If no profile exists for a user in the current batch, that user's jobs fall back to flat extraction — the batch continues unaffected.
- Profile and decay config reads are batched: one query per batch run to fetch all relevant `user_id` profiles (not one query per job).
- `npm run verify` exits 0.

**Files expected to change:**

- `supabase/functions/async-ats-scorer/index.ts` — add profile-aware weighted skill input
- `supabase/functions/_shared/skillDecay.ts` — new shared decay computation utility (if extracted; recommended)

**Validation commands:**

```bash
supabase functions serve async-ats-scorer
npm run verify
```

**Risks / non-goals:**

- Do not re-implement the decay formula independently — share it with Story 4 via `_shared/skillDecay.ts`.
- The async scorer does not run the CV Optimisation second call (it is proactive/background scoring only) — do not add it here.
- Profile reads must not increase per-job latency materially — batch queries are required.

---

### Story 6 — Skill Profile Management Page (Settings)

**Dependencies:** Stories 1, 2, and 3 must be merged before this story begins.

**Acceptance criteria:**

- New route section within `/settings` (or a new tab in the Settings page) titled "Skill Profile" renders a skill management view.
- The view uses `useSkillProfile` hook (from Story 3) to load all `sats_skill_profiles` rows for the current user.
- Skills are grouped by `career_chapter` with a collapsible section per chapter.
- Each skill row shows: skill name, category badge, depth badge, computed last-used year (`user_confirmed_last_used_year ?? ai_last_used_year`), transferable_to chips, and an "Edit" action.
- "Edit" opens an inline or modal panel reusing `SkillClassificationReview` in single-skill mode (only the selected skill is shown with all three override choices).
- A "Re-classify all" action (Pro/Max only; show upgrade prompt for Free) allows the user to re-run classification on all their existing experiences and see the diff report via `SkillClassificationReview` in diff mode.
- An empty state is shown when no profile exists yet, with a call-to-action prompting the user to upload a CV or add experiences.
- Tier gate: viewing the skill profile page is available to all tiers. The "More relevant — let me explain" re-classification flow (option 3) and "Re-classify all" are Pro/Max only. Apply the same tier-check pattern used elsewhere in the settings page.
- Page passes axe-core a11y audit (add a test in `tests/unit/a11y/`).
- `npm run verify` exits 0.

**Files expected to change:**

- `src/pages/Settings.tsx` (or the relevant settings tab component) — add Skill Profile section/tab
- `src/components/skill-profile/SkillProfileManager.tsx` — new component for the management view
- `tests/unit/a11y/SkillProfileManager.test.tsx` — new a11y test

**Validation commands:**

```bash
npm run verify
npm run test -- tests/unit/a11y/SkillProfileManager.test.tsx
```

**Risks / non-goals:**

- Do not build a standalone `/skill-profile` route — this feature lives within `/settings` for P25.
- The "Re-classify all" action must not auto-save — it must go through the transparency report confirm flow.
- Help page content (`src/data/helpContent.ts`) must be updated in this story to document the Skill Profile feature (per Memory: update help pages on every feature change).

---

## Cross-Cutting Constraints

The following apply to every story in this phase:

1. Every created or modified file must have an UPDATE LOG header appended (not replaced) with the current timestamp and a reference to P25.
2. Migration filenames must follow `YYYYMMDDHHMMSS_<short_description>.sql` with a 14-digit UTC timestamp. Timestamps must not collide with existing migrations (latest is `20260328230000`).
3. `bash scripts/ops/gen-types.sh` must be run after Story 1's migration and the resulting `src/integrations/supabase/types.ts` committed in the same PR.
4. `classify-skill-profile` must never throw an unhandled exception that blocks a CV save — graceful fallback is a hard requirement.
5. Weights are never stored — only facts (last_used_year, category, depth). Decay is always computed fresh at call time from `sats_skill_decay_config`.
6. Raw numeric weights must never appear in any user-facing UI component.
7. The `_shared/llmProvider.ts`, `_shared/cors.ts`, and `_shared/env.ts` utilities are mandatory for all edge function code — no direct provider calls.

## Dependency Graph

```
S1 (DB) ──► S2 (edge fn) ──► S3 (UI + hook)
                                     │
                              S4 (ats-direct) ◄── (S1 also required)
                                     │
                              S5 (async scorer) ◄── (S1 + S4 shared helper)
                                     │
S3 (hook) ──────────────────► S6 (settings page)
```

S1 is the only story with no dependencies. S2 depends on S1. S3 depends on S2 (calls the edge function) but can be developed in parallel with S2 using a mock. S4 and S5 depend on S1 and require S2's schema contract to be stable. S6 depends on S3.

## Tier Gating Summary

| Capability                               | Free | Pro | Max | C-Level |
| ---------------------------------------- | ---- | --- | --- | ------- |
| Classification on CV upload              | Yes  | Yes | Yes | Yes     |
| Transparency report (view + confirm)     | Yes  | Yes | Yes | Yes     |
| "Foundation only" override               | Yes  | Yes | Yes | Yes     |
| "I still use this" override              | Yes  | Yes | Yes | Yes     |
| "Explain" re-classification with context | No   | Yes | Yes | Yes     |
| Career chapter editing                   | No   | Yes | Yes | Yes     |
| "Re-classify all"                        | No   | Yes | Yes | Yes     |
| Skill profile management page (view)     | Yes  | Yes | Yes | Yes     |
