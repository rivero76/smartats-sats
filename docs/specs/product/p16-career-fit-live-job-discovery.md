# P16: Career Fit & Live Job Discovery

**Status:** Approved for Architecture — Pending Implementation Planning
**Date:** 2026-03-01
**Author:** Product + Architecture Review
**Depends On:** P13 (LinkedIn ingestion), P15 (Upskilling Roadmap)

---

## 1. Problem Statement

A user who uploads their resume or imports their LinkedIn profile has no guidance on:

1. Which job titles and role archetypes they are competitive for today.
2. Which live job postings they should apply to right now.
3. Where their profile data is inconsistent or incomplete across sources.
4. What specific skills to develop to access higher-value roles.

SATS currently requires the user to manually bring a job description and match it against a specific resume. This is a "bring your own job" workflow. P16 inverts that — SATS proactively tells the user where they fit and shows them real live jobs.

---

## 2. Target Personas

**Primary:** Active job seeker with 3+ years experience, partial or full profile in SATS (at least one resume + LinkedIn import or 3+ skills).

**Secondary:** Passive job seeker who wants to understand their market position without committing to active applications.

---

## 3. Primary User Intent (MVP)

> "I want to apply today — give me the best-fit live jobs right now."

Secondary intents (backlog, not MVP):
- "I don't know what I qualify for — show me options I haven't considered." (Exploration)
- "I think I'm ready for X roles — confirm that and surface real openings." (Validation)

---

## 4. Stories

### Story 0 — LLM Provider Abstraction Layer
**Scope:** Infrastructure prerequisite. Must complete before any new AI edge functions are added.

Deliverables:
- `supabase/functions/_shared/llmProvider.ts` — shared utility implementing `callLLM()` interface
- OpenAI adapter (migrating existing inline logic from four edge functions)
- Refactor of `ats-analysis-direct`, `async-ats-scorer`, `enrich-experiences`, `generate-upskill-roadmap` to use shared utility
- `SATS_LLM_PROVIDER` environment variable support
- ADR-0002 (already written at `docs/decisions/adr-0002-llm-provider-abstraction.md`)

Acceptance criteria:
- All existing edge function tests pass with no regression after refactor
- `SATS_LLM_PROVIDER=openai` produces identical outputs to current behaviour
- New env variable documented in `.env.example` and `check-secrets.sh`

---

### Story 1 — Master Profile + Resume Persona Model

**Problem:** Multiple resumes lead to conflicting ground truth. Keywords, dates, and proficiency levels diverge across CV versions with no canonical reference.

**Solution:** Introduce a two-layer model:
- **Master Profile** — canonical, reconciled source of truth (already exists as `sats_user_skills` + `sats_skill_experiences` + `sats_profiles`)
- **Resume Personas** — role-specific configurations that filter and weight from the master

#### New Table: `sats_resume_personas`

```sql
CREATE TABLE public.sats_resume_personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_resume_id    UUID REFERENCES public.sats_resumes(id) ON DELETE SET NULL,
  persona_name        TEXT NOT NULL,           -- "Solutions Architect", "Technical PM"
  target_role_family  TEXT NOT NULL,           -- free text or future enum
  custom_summary      TEXT,                    -- persona-specific professional summary
  skill_weights       JSONB DEFAULT '{}',      -- { "AWS": 1.5, "Kubernetes": 1.2 }
  keyword_highlights  TEXT[] DEFAULT '{}',     -- keywords to surface first for this role
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

ALTER TABLE public.sats_resume_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own personas"
  ON public.sats_resume_personas FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX ON public.sats_resume_personas (user_id, is_active);
```

**How it works:**
- A persona does not duplicate skills or experiences — it stores weights and keywords that influence how the master profile is presented and scored for a specific role family.
- When running ATS analysis or career fit suggestions, the user selects which persona to activate.
- Updating skills in the master profile does not require updating each persona separately.

**UI:**
- Persona manager in Settings → "My Resume Profiles" section
- Create / rename / delete personas
- Link a persona to a specific resume file
- Set custom summary and keyword highlights per persona

**Backlog (future):**
- Auto-generate tailored resume PDF from persona + master profile
- ATS score history per persona
- Persona performance analytics (which persona gets better match scores)

---

### Story 2 — Resume Storage Security Upgrade

**Problem:** Current `sats_resumes.file_url` stores a **permanent public URL** for resume files. This is a security gap — anyone with the URL can access the file indefinitely, with no expiry and no access audit.

**Enterprise best practices require:**

| Practice | Current State | Required State |
|---|---|---|
| File access control | Permanent public URL | Signed URL, generated on demand, 15-min expiry |
| Content deduplication | None | SHA-256 hash on upload |
| Server-side MIME validation | Client-side only | Edge function validates MIME on upload |
| Version history | Single file per resume | Version chain with `supersedes_id` FK |
| File access audit | None | Log every signed URL generation |
| Retention enforcement | Soft delete only | Hard delete trigger after GDPR retention window |

**Migration plan:**

```sql
-- Add to sats_resumes:
ALTER TABLE public.sats_resumes
  ADD COLUMN storage_bucket TEXT NOT NULL DEFAULT 'SATS_resumes',
  ADD COLUMN object_key     TEXT,          -- replaces file_url as the storage reference
  ADD COLUMN sha256         TEXT,          -- content hash for dedup
  ADD COLUMN mime_type      TEXT,
  ADD COLUMN size_bytes     BIGINT,
  ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN supersedes_id  UUID REFERENCES public.sats_resumes(id);

-- file_url kept temporarily for migration compatibility;
-- deprecate after all consumers use signed URL generation
```

**Signed URL generation pattern:**
```typescript
// Never expose file_url directly in API responses.
// Generate a signed URL at access time:
const { data } = await supabase.storage
  .from(resume.storage_bucket)
  .createSignedUrl(resume.object_key, 900) // 15 minutes
```

**Backlog (future):**
- ClamAV virus scanning on upload (Supabase storage hook or edge function trigger)
- File access audit log table
- Automatic hard delete after GDPR retention window

---

### Story 3 — Profile Reconciliation Engine

**Purpose:** Compare all data sources (resumes, LinkedIn import, manually entered DB records) to detect inconsistencies, surface them to the user with AI-assisted recommendations, and let the user resolve each conflict.

#### New Tables (defined in PM refinement session)

**`sats_reconciliation_runs`** — audit trail of each reconciliation session.

```sql
CREATE TABLE public.sats_reconciliation_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_by         TEXT NOT NULL CHECK (triggered_by IN (
                         'linkedin_import', 'resume_upload', 'manual', 'persona_create'
                       )),
  trigger_reference_id UUID,
  status               TEXT NOT NULL DEFAULT 'running' CHECK (
                         status IN ('running', 'completed', 'failed')
                       ),
  conflicts_detected   INTEGER NOT NULL DEFAULT 0,
  conflicts_pending    INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved   INTEGER NOT NULL DEFAULT 0,
  conflicts_dismissed  INTEGER NOT NULL DEFAULT 0,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`sats_profile_conflicts`** — one row per detected discrepancy.

```sql
CREATE TABLE public.sats_profile_conflicts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id           UUID NOT NULL REFERENCES public.sats_reconciliation_runs(id) ON DELETE CASCADE,
  conflict_type    TEXT NOT NULL CHECK (conflict_type IN (
                     'skill_missing_from_db',
                     'skill_level_mismatch',
                     'experience_date_mismatch',
                     'experience_description_gap',
                     'title_conflict',
                     'seniority_gap',
                     'persona_skill_absent',
                     'duplicate_experience'
                   )),
  severity         TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  source_a         TEXT NOT NULL CHECK (source_a IN ('resume', 'linkedin', 'database', 'manual')),
  source_a_ref_id  UUID,
  source_a_value   JSONB NOT NULL,
  source_b         TEXT NOT NULL CHECK (source_b IN ('resume', 'linkedin', 'database', 'manual')),
  source_b_ref_id  UUID,
  source_b_value   JSONB NOT NULL,
  ai_recommendation      TEXT,
  recommended_resolution JSONB,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (
                     status IN ('pending', 'resolved', 'dismissed', 'snoozed')
                   ),
  resolution_id    UUID,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`sats_conflict_resolutions`** — immutable audit trail of user decisions.

```sql
CREATE TABLE public.sats_conflict_resolutions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conflict_id       UUID NOT NULL REFERENCES public.sats_profile_conflicts(id) ON DELETE CASCADE,
  chosen_source     TEXT NOT NULL CHECK (chosen_source IN (
                      'source_a', 'source_b', 'manual', 'merge', 'dismiss'
                    )),
  resolved_value    JSONB NOT NULL,
  target_table      TEXT,
  target_record_id  UUID,
  applied           BOOLEAN NOT NULL DEFAULT false,
  applied_at        TIMESTAMPTZ,
  apply_error       TEXT,
  user_note         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS on all three tables:** `user_id = auth.uid()` for all operations.

#### Edge Function: `reconcile-profile`

Input: `{ user_id, trigger_source, trigger_reference_id? }`

Processing steps:
1. Fetch all sources: resume extractions, `sats_user_skills`, `sats_skill_experiences`, latest LinkedIn import session
2. Canonicalise skill names across all sources
3. Detect conflicts by type (skill missing, level mismatch, date conflict, description gap, title conflict)
4. For each conflict, call LLM via `callLLM()` (Story 0 abstraction) to generate `ai_recommendation` and `recommended_resolution`
5. Persist conflicts in `sats_profile_conflicts`
6. Update `sats_reconciliation_runs` with counts and `status = 'completed'`
7. Return conflict count to frontend trigger

#### UI: `/profile/reconcile` (dedicated page)

- Conflict list grouped by severity (high → medium → low)
- Per conflict: side-by-side comparison of source_a vs source_b values
- AI recommendation shown as an advisory callout (not auto-selected)
- Actions per conflict: Accept source A / Accept source B / Enter manually / Dismiss
- Bulk action: "Accept all AI recommendations"
- Progress indicator: "3 of 7 conflicts resolved"
- On all resolved: success banner → return to profile/settings

**Triggers:**
- Automatically after LinkedIn import HITL approval (P13 modal `onSuccess`)
- Automatically after first resume upload
- On-demand: "Check for profile inconsistencies" button in Settings

---

### Story 4 — Live Job Discovery Engine

**Purpose:** Query live job APIs to find real postings that match the user's merged profile and suggested role archetypes.

#### API Integration Plan

| Market | Primary API | Secondary | Notes |
|---|---|---|---|
| USA | JSearch (RapidAPI) | Adzuna | JSearch aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter |
| Brazil | Adzuna BR | JSearch | Adzuna has Brazilian market coverage |
| Australia | Adzuna AU | JSearch | SEEK has no public API; Adzuna covers AU well |
| New Zealand | Adzuna NZ | JSearch | Same as AU |
| Global fallback | JSearch | — | Covers most English-language markets |

**Playwright fallback** (backlog — not MVP):
- SEEK (AU/NZ), Gupy (BR), Computrabajo (LATAM)
- Only when Adzuna coverage is demonstrably insufficient for that market
- Must implement rate limiting, realistic browser fingerprinting, and respectful crawl cadence
- Legal review required before enabling per platform

#### New Table: `sats_job_discovery_cache`

```sql
CREATE TABLE public.sats_job_discovery_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES public.sats_resume_personas(id) ON DELETE SET NULL,
  query_role      TEXT NOT NULL,           -- role archetype used for the search
  query_location  TEXT,
  source_api      TEXT NOT NULL CHECK (source_api IN ('jsearch', 'adzuna', 'playwright')),
  job_title       TEXT NOT NULL,
  company         TEXT,
  location        TEXT,
  salary_range    TEXT,
  description_summary TEXT,               -- first 400 chars only for token efficiency
  apply_url       TEXT,
  posted_at       TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '4 hours',
  ats_score       NUMERIC(5,2),           -- pre-computed if ATS scorer runs on it
  is_dismissed    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.sats_job_discovery_cache (user_id, expires_at);
CREATE INDEX ON public.sats_job_discovery_cache (user_id, query_role, is_dismissed);
```

#### Edge Function: `fetch-live-jobs`

Input: `{ user_id, role_archetypes: string[], location?: string, persona_id?: string }`

Processing:
1. For each role archetype, build API queries for JSearch and/or Adzuna based on user's location preference
2. Deduplicate results by job URL hash
3. Filter to listings posted within last 14 days
4. Upsert into `sats_job_discovery_cache` with 4-hour TTL
5. Return fresh listing IDs to frontend

**Token optimisation:**
- Never pass raw HTML to the LLM
- Only store `description_summary` (first 400 chars) — not full job description
- Cache is reused for 4 hours — no re-fetch on every page load
- ATS pre-scoring is optional and triggered only by explicit user action

---

### Story 5 — Career Fit AI Engine

**Purpose:** Analyse the user's merged profile signal and suggest the role archetypes they are competitive for, with match strength and skill gap details.

#### Edge Function: `suggest-career-fit`

Input: `{ user_id, persona_id? }`

Processing:
1. Fetch merged profile signal:
   - `sats_user_skills` (with proficiency and years)
   - `sats_skill_experiences` (job titles, descriptions, keywords)
   - `sats_profiles` (location, summary)
   - Active persona weights if `persona_id` provided
2. Call LLM via `callLLM()` with schema-locked output:

```json
{
  "role_suggestions": [
    {
      "role_title": "string",
      "role_family": "string",
      "match_strength": "high|medium|stretch",
      "matching_skills": ["string"],
      "skill_gaps": [
        {
          "skill_name": "string",
          "importance": "critical|important|nice-to-have",
          "gap_description": "string"
        }
      ],
      "suggested_search_terms": ["string"]
    }
  ]
}
```

3. For each suggested role, trigger `fetch-live-jobs` (Story 4) asynchronously
4. Persist suggestions in `sats_career_fit_suggestions` (below)
5. Return suggestions with linked live job IDs

#### New Table: `sats_career_fit_suggestions`

```sql
CREATE TABLE public.sats_career_fit_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES public.sats_resume_personas(id) ON DELETE SET NULL,
  role_title      TEXT NOT NULL,
  role_family     TEXT NOT NULL,
  match_strength  TEXT NOT NULL CHECK (match_strength IN ('high', 'medium', 'stretch')),
  matching_skills TEXT[] NOT NULL DEFAULT '{}',
  skill_gaps      JSONB NOT NULL DEFAULT '[]',
  search_terms    TEXT[] NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_dismissed    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.sats_career_fit_suggestions (user_id, generated_at DESC);
```

---

### Story 6 — Career Fit UI (`/career-fit`)

**New page** with the following sections:

**Header:**
- "Your Career Fit" title
- Active persona selector dropdown (if user has personas)
- "Refresh Suggestions" button — prominent, always visible
- Last refreshed timestamp

**Role Suggestion Cards** (one per suggested role):
- Role title + match strength badge (High / Medium / Stretch)
- Matched skills list (chip display)
- Skill gaps list with importance indicator
- "Find live jobs for this role" — expands to job listing panel
- "Build Learning Roadmap" CTA → invokes P15 `generate-upskill-roadmap` with pre-populated context

**Job Listings Panel** (per role, expandable):
- Ranked by recency and relevance
- Per listing: job title, company, location, salary (if available), posted date, apply button
- "Pre-score this job" CTA → opens ATS analysis with the job description pre-loaded (bridges to existing ATS flow)
- "Dismiss" per listing

**Empty State:**
- If profile has fewer than 3 skills: "Add more skills to your profile to get suggestions"
- If suggestions are loading: skeleton card display
- If no live jobs found: "No recent postings found for this role — try refreshing in 24 hours"

**Triggers (auto-open or badge notification):**
- After LinkedIn import HITL approval → redirect to `/career-fit`
- After first resume upload → banner on dashboard with CTA
- On demand: sidebar nav item "Career Fit" (always visible)

---

### Story 7 — Skill Gap → P15 Roadmap Bridge

**Purpose:** Connect a specific skill gap identified in a career fit suggestion directly to the P15 upskilling roadmap generator with pre-populated context, so the user does not have to re-enter information manually.

**Current P15 flow (standalone):**
```
User on /roadmaps → "Generate Roadmap" → manual goal input → LLM → milestones stored
```

**New bridged flow:**
```
Career Fit UI → skill gap item → "Build Roadmap to close this gap" →
  invoke generate-upskill-roadmap with:
    { target_role: "Staff Data Engineer",
      gap_skills: ["Apache Kafka", "dbt", "Data Mesh"],
      current_skills: [...from profile...],
      persona_id: "..." }
→ milestones stored in sats_learning_roadmaps
→ redirect to /roadmaps with new roadmap active
```

**What the LLM receives (richer than manual invocation):**
- Target role (from career fit suggestion)
- Specific gap skills with importance ratings
- User's current skills (avoids recommending things they already know)
- Persona context (role family weighting)

**Test cases for manual validation:**
1. Click "Build Roadmap" from a "stretch" role gap → confirm roadmap is gap-specific, not generic
2. Confirm milestones reference the specific gap skills named in the suggestion
3. Confirm roadmap appears on `/roadmaps` under the user's profile
4. Confirm `sats_learning_roadmaps` record has `context` JSONB with `source_feature: 'career-fit'`, `target_role`, and `gap_skills`
5. Verify no duplicate roadmap is created if triggered twice for the same role

---

## 5. Data Flow — End to End

```
Resume Upload / LinkedIn Import
        │
        ▼
Profile Reconciliation Engine (Story 3)
        │ (after user resolves conflicts)
        ▼
Merged Profile Signal
  ├── sats_user_skills (canonical, reconciled)
  ├── sats_skill_experiences (verified)
  ├── sats_profiles (location, summary)
  └── Active Persona weights (Story 1)
        │
        ▼
Career Fit AI Engine — suggest-career-fit (Story 5)
        │
        ├──► Role Suggestions + Gaps
        │         │
        │         └──► Skill Gap → P15 Roadmap Bridge (Story 7)
        │
        └──► Live Job Discovery — fetch-live-jobs (Story 4)
                  │
                  └──► sats_job_discovery_cache (4h TTL)
                            │
                            ▼
                      Career Fit UI /career-fit (Story 6)
                            │
                            └──► "Pre-score this job"
                                  → ATS Analysis (existing P10 flow)
```

---

## 6. Job API Strategy — Avoiding Blocks

**Rule 1:** Always prefer an official API. Only use Playwright for markets where no API exists AND the market is critical to your user base.

**Rate limiting strategy:**
- JSearch: cache all results for 4 hours minimum. Never query per page load.
- Adzuna: 1,000 free requests/day — batch queries per user session, not per role card render.
- Playwright (future): max 1 request per domain per 30 seconds, realistic user-agent, no concurrent scraping.

**Deduplication:**
- Hash job URL + company name + role title → `sha256` key
- Skip insert if hash already exists in cache with `expires_at > now()`

**Legal note:** Do not use Playwright to scrape LinkedIn, Indeed, or Glassdoor. These platforms have active legal enforcement. Use JSearch API which aggregates their data via licensed partnerships.

---

## 7. Success Metrics

| Metric | Definition | Target |
|---|---|---|
| Activation rate | % of users with 3+ skills who view Career Fit page | >40% within 7 days of feature launch |
| Suggestion relevance | % of suggestions user rates as "accurate" (thumbs up) | >65% |
| Gap engagement | % of users who click a skill gap item | >30% |
| Roadmap conversion | % of gap clicks that result in a roadmap being generated | >20% |
| Job listing click-through | % of suggested jobs where user clicks "Apply" or "Pre-score" | >25% |
| Reconciliation completion | % of reconciliation runs where all conflicts are resolved (not dismissed) | >50% |

---

## 8. Help Content Requirements

The following help content entries must be created or updated in `src/data/helpContent.ts`:

| Help ID | Page / Context | Key Topics |
|---|---|---|
| `careerFit` | `/career-fit` | What suggestions mean, match strength levels, how to refresh, how to use persona selector |
| `profileReconcile` | `/profile/reconcile` | What a conflict is, how to read source comparisons, what AI recommendation means, why HITL matters |
| `resumePersonas` | Settings → My Resume Profiles | What a persona is vs a resume file, how weights work, when to create multiple personas |
| `skillGapRoadmap` | Career Fit UI → gap item | How the roadmap bridge works, what gets pre-populated, where to find the roadmap |
| `liveJobSearch` | Career Fit UI → job panel | Where jobs come from, how often they refresh, what "pre-score" does |
| `profileSettings` | Settings (update existing) | Add LinkedIn import section and "Check for inconsistencies" button explanation |

---

## 9. Backlog (Not in MVP)

| Item | Origin | Priority |
|---|---|---|
| Exploration intent: "what could I grow into?" | PM Round 1 A1 | Medium |
| Validation intent: "confirm I'm ready for X" | PM Round 1 A1 | Medium |
| Playwright for SEEK, Gupy, Computrabajo | PM Round 2 A3 | Low |
| Role titles only (lightweight suggestion mode) | PM Round 1 A3.C option 1 | Low |
| Roles + reasoning only (no gaps) | PM Round 1 A3.C option 2 | Low |
| Roles + live job links inline (no separate panel) | PM Round 1 A3.C option 4 | Medium |
| Roles + ATS pre-score inline (no click) | PM Round 1 A3.C option 5 | High |
| Scheduled weekly suggestions digest | PM Round 1 A3.D | Medium |
| Salary intelligence per role | PM Round 2 A5 | High |
| Competition density signal | PM Round 2 A5 | Medium |
| Application status tracker | PM Round 2 A5 | High |
| Cover letter generation per match | PM Round 2 A5 | Medium |
| Employer research summary | PM Round 2 A5 | Low |
| Stretch roles list ("almost qualify for") | PM Round 2 A5 | High |
| Persona auto-generate tailored resume PDF | Story 1 backlog | Medium |
| Persona performance analytics | Story 1 backlog | Low |
| ClamAV virus scanning on upload | Story 2 backlog | High (enterprise) |
| File access audit log | Story 2 backlog | High (enterprise) |
| Auto hard-delete after GDPR retention window | Story 2 backlog | High (compliance) |
| Playwright backlog — legal review per platform | Story 4 | Required before enabling |
| Location / remote / hybrid filtering | PM Round 1 out-of-scope | Medium |
| Salary expectations input | PM Round 1 out-of-scope | Medium |
| Multi-language job search (PT, ES) | Future globalisation | Low |

---

## 10. Dependencies and Risks

| Risk | Mitigation |
|---|---|
| JSearch API rate limits hit before cache implemented | Implement cache (Story 4) before enabling UI (Story 6) |
| OpenAI schema changes break `suggest-career-fit` | LLM abstraction (Story 0) isolates schema contract |
| Profile with very few skills produces useless suggestions | Gate career fit behind minimum signal: ≥3 skills OR ≥1 experience |
| Reconciliation engine overwhelms users with low-severity conflicts | Filter: show high severity first; low severity collapsed by default |
| Persona model confuses users unfamiliar with the concept | Clear in-app help content (see Section 8) + onboarding tooltip on first persona creation |
| P15 roadmap not yet E2E validated when Story 7 is built | Story 7 must be gated behind P15 release validation completion |
