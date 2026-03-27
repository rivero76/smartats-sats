# Manual Test Procedures — Open Release Blockers

**Generated:** 2026-03-27
**Source:** `docs/releases/UNTESTED_IMPLEMENTATIONS.md`
**Prerequisites:** App running locally (`npm run dev` → `http://localhost:8080`) or pointed at staging. You need at least two test accounts (User A and User B) for RLS isolation tests.

---

## Index

| #   | Feature                                           | Section                                                |
| --- | ------------------------------------------------- | ------------------------------------------------------ |
| 1   | P14 S1 — `fetch-market-jobs` cron                 | [→](#1-p14-s1--fetch-market-jobs-cron)                 |
| 2   | P14 S2 — `async-ats-scorer`                       | [→](#2-p14-s2--async-ats-scorer)                       |
| 3   | P14 S3 — Threshold + notifications                | [→](#3-p14-s3--threshold--notifications)               |
| 4   | P14 S4 — `/opportunities` dashboard               | [→](#4-p14-s4--opportunities-dashboard)                |
| 5   | ATS auto-refresh UX                               | [→](#5-ats-auto-refresh-ux)                            |
| 6   | P15 S1 — Roadmap schema RLS                       | [→](#6-p15-s1--roadmap-schema-rls)                     |
| 7   | P15 S2 — `generate-upskill-roadmap` edge function | [→](#7-p15-s2--generate-upskill-roadmap-edge-function) |
| 8   | P15 S3 — Roadmap timeline UI                      | [→](#8-p15-s3--roadmap-timeline-ui)                    |
| 9   | P13 S1 — `linkedin-profile-ingest` edge function  | [→](#9-p13-s1--linkedin-profile-ingest-edge-function)  |
| 10  | P13 S2 — Merge/dedupe utility                     | [→](#10-p13-s2--mergededupe-utility)                   |
| 11  | P13 S3 — HITL Review UI (LinkedIn import)         | [→](#11-p13-s3--hitl-review-ui)                        |
| 12  | Help Hub (`/help`)                                | [→](#12-help-hub-help)                                 |
| 13  | P16 S1 — Resume Persona Model                     | [→](#13-p16-s1--resume-persona-model)                  |
| 14  | BUG: Location RLS INSERT path                     | [→](#14-bug-location-rls-insert-path)                  |
| 15  | P18 S2 — CV Optimisation scorer                   | [→](#15-p18-s2--cv-optimisation-scorer)                |
| 16  | P18 S3 — CV Optimisation UI panel                 | [→](#16-p18-s3--cv-optimisation-ui-panel)              |
| 17  | ATS model §4.3 determinism + governance           | [→](#17-ats-model-43-determinism--governance-update)   |
| 18  | Admin LogViewer time-window filter                | [→](#18-admin-logviewer-time-window-filter)            |

---

## 1. P14 S1 — `fetch-market-jobs` cron

**Goal:** Confirm cron runs, staged rows appear in `sats_staged_jobs`, deduplication works on repeated runs.

### Steps

1. Open Supabase Dashboard → **Database → Table Editor** → `sats_staged_jobs`. Note the current row count.
2. Trigger the function manually:
   - Supabase Dashboard → **Edge Functions** → `fetch-market-jobs` → **Invoke**.
   - Or via CLI: `supabase functions invoke fetch-market-jobs --no-verify-jwt`
3. Refresh `sats_staged_jobs`. Confirm new rows appeared with `status = 'queued'`.
4. Check each row has a non-null `content_hash` column.
5. Invoke the function a **second time** without changing any source data.
6. Refresh `sats_staged_jobs`. Confirm **no duplicate rows** were added (row count identical to after step 3).
7. Open Supabase Dashboard → **Logs → Edge Function Logs** → filter by `fetch-market-jobs`. Confirm no errors; confirm a run-log entry was recorded via centralized logging.

### Pass criteria

- New `queued` rows created on first invocation.
- Row count does not grow on second invocation with same data (dedup works).
- No error logs.

---

## 2. P14 S2 — `async-ats-scorer`

**Goal:** Scorer picks up `queued` staged jobs, creates rows in `sats_job_descriptions` and `sats_analyses`, marks processed/error status correctly.

### Prerequisites

- At least one row exists in `sats_staged_jobs` with `status = 'queued'` (run test #1 first if needed).
- Authenticated user with at least one resume in `sats_resumes`.

### Steps

1. Note current row counts in `sats_job_descriptions` and `sats_analyses`.
2. Invoke the scorer:
   - Supabase Dashboard → **Edge Functions** → `async-ats-scorer` → **Invoke** (pass a valid JWT in the auth header if required).
   - Or: `supabase functions invoke async-ats-scorer` with your local session token.
3. After invocation completes, check `sats_staged_jobs`: rows that were `queued` should now be `processed` (or `error` if the LLM call failed).
4. Check `sats_job_descriptions` — new rows should have appeared corresponding to the staged jobs.
5. Check `sats_analyses` — new rows should exist linked to those job descriptions.
6. Review Edge Function Logs for `async-ats-scorer`: confirm no unhandled errors.

### Pass criteria

- Staged jobs transition from `queued` → `processed`.
- Matching rows appear in `sats_job_descriptions` and `sats_analyses`.
- Idempotency: invoking again does not re-process already-`processed` rows.

---

## 3. P14 S3 — Threshold + notifications

**Goal:** Notifications are only sent when match score ≥ user threshold; duplicates are blocked.

### Steps

1. In the app, go to **Settings** and note your `proactive_match_threshold` value (default 0.60 if not set). Set it to a value you can test around (e.g. 0.70).
2. Trigger `async-ats-scorer` (see test #2) so that analyses are produced.
3. Open Supabase Dashboard → **Table Editor** → `sats_user_notifications`. Note existing rows.
4. After the scorer run, check `sats_user_notifications`:
   - Find notifications whose linked analysis has `ats_score ≥ threshold`. Expect **rows present**.
   - Find analyses whose `ats_score < threshold`. Expect **no notification rows**.
5. Trigger `async-ats-scorer` again with the same staged data.
6. Check `sats_user_notifications` again — row count should **not have increased** (dedupe guard).

### Pass criteria

- Notifications exist only for analyses meeting or exceeding threshold.
- Repeated scorer run does not create duplicate notification rows.

---

## 4. P14 S4 — `/opportunities` dashboard

**Goal:** Dashboard cards render correctly, sorted by score descending then by date.

### Steps

1. Log in as a user who has proactive analyses (from tests #2/#3 above).
2. Navigate to `/opportunities` in the browser.
3. Confirm the page loads without error.
4. Verify each card shows:
   - ATS score (as %).
   - List of missing skills.
   - Source URL for the job.
5. Confirm cards are ordered: highest score first; ties broken by most-recent date.
6. If no analyses exist yet, confirm an appropriate empty state is shown (not a blank page/error).

### Pass criteria

- Cards render with correct score, missing skills, and source URL.
- Ordering is score-desc, then date-desc.
- Empty state renders when no data is available.

---

## 5. ATS auto-refresh UX

**Goal:** An analysis that is `processing` automatically transitions to `completed` in the UI without a page reload.

### Steps

1. Log in and navigate to `/analyses`.
2. Upload a resume and submit a new ATS analysis.
3. Immediately watch the analysis card — it should show a progress indicator (expect ~60% during processing).
4. **Do not reload the page.** Wait for the analysis to complete (typically 10–30 seconds depending on LLM response time).
5. Confirm the progress bar reaches 100% and the card updates to show the final score **automatically**.
6. Check the "last sync" timestamp on the page updates accordingly.
7. Optional stress test: throttle your network to "Slow 3G" in DevTools, start an analysis, and confirm the polling fallback (3-second interval) still updates the card without a reload.

### Pass criteria

- Progress transitions from ~60% to 100% without a manual reload.
- Live-status indicator and last-sync timestamp update.

---

## 6. P15 S1 — Roadmap schema RLS

**Goal:** A user cannot read another user's learning roadmap rows.

### Steps

1. **As User A:**
   - Log in and navigate to `/roadmaps`.
   - Generate or verify that at least one roadmap exists (see test #7 for how to create one).
   - Note the `id` of the roadmap row from Supabase Dashboard → `sats_learning_roadmaps`.

2. **As User B (different account, different browser or incognito window):**
   - Log in.
   - Open browser DevTools → **Console** and run:
     ```js
     const { data, error } = await window.__supabase.from('sats_learning_roadmaps').select('*')
     console.log(data, error)
     ```
     _(If `window.__supabase` is not available, use the Supabase JS client directly or use the REST API with User B's JWT.)_
   - Alternatively, use the Supabase Dashboard REST API explorer with User B's JWT:
     `GET /rest/v1/sats_learning_roadmaps?select=*` with `Authorization: Bearer <userB-jwt>`.

3. Confirm the response for User B returns **0 rows** (User A's roadmap is not visible).

### Pass criteria

- User B receives empty array, not User A's data.
- No RLS policy error thrown (just empty result).

---

## 7. P15 S2 — `generate-upskill-roadmap` edge function

**Goal:** Edge function accepts a request and returns a `roadmap_id`; DB rows are correctly created.

### Prerequisites

- Authenticated user session.
- Know at least one `missing_skills` value (e.g. from an existing ATS analysis).

### Steps

1. From the app, navigate to an ATS analysis that has missing skills listed.
2. Click the **"Generate Roadmap"** button (or equivalent CTA linked to missing skills).
3. Wait for the response. A success toast/confirmation should appear.
4. Navigate to `/roadmaps`. Confirm the new roadmap appears.
5. Open Supabase Dashboard → `sats_learning_roadmaps` — confirm a new row with your `user_id` and correct `target_role`.
6. Open `sats_roadmap_milestones` — confirm milestone rows with sequential `order_index` values and at least one milestone with `type = 'project'`.
7. Confirm the `roadmap_id` returned by the edge function matches the row in `sats_learning_roadmaps`.

### Pass criteria

- `roadmap_id` returned.
- Roadmap row in DB with correct user and target role.
- Milestones present, ordered, and contain a `project` type milestone.

---

## 8. P15 S3 — Roadmap timeline UI

**Goal:** Milestones render in order, completion toggles persist, progress bar is accurate.

### Prerequisites

- At least one roadmap with milestones (run test #7 first).

### Steps

1. Navigate to `/roadmaps`.
2. Open a roadmap. Verify milestones appear in `order_index` sequence (1, 2, 3…) with appropriate type icons.
3. Toggle one milestone as **completed**. Confirm the UI updates immediately (optimistic or after save).
4. **Hard-reload** the page (`Cmd+Shift+R` / `Ctrl+Shift+R`). Confirm the toggled milestone is still checked.
5. Verify in Supabase Dashboard → `sats_roadmap_milestones` that the row's `is_completed = true`.
6. Toggle all milestones completed. Confirm the progress bar reaches 100%.
7. Toggle one back to incomplete. Confirm the progress bar drops below 100%.
8. Verify the empty state renders if no roadmaps exist (delete all and reload, then undo).

### Pass criteria

- Milestones in correct order with type icons.
- `is_completed` persists across page reloads.
- Progress % = `(completed / total) × 100`, updates dynamically.

---

## 9. P13 S1 — `linkedin-profile-ingest` edge function

**Goal:** Edge function returns structured profile data from a LinkedIn URL without writing to the DB.

### Prerequisites

- A valid, publicly-accessible LinkedIn profile URL.
- Authenticated user session.
- Railway LinkedIn scraper service is running.

### Steps

1. Navigate to **Settings** → **Import from LinkedIn** (or wherever the LinkedIn import flow is triggered).
2. Enter a valid LinkedIn profile URL and submit.
3. Confirm a preview of the parsed profile appears (name, skills array, experiences array, education, etc.).
4. Confirm `provenance` fields are tagged (e.g. `source: 'linkedin'`).
5. Open Supabase Dashboard → `sats_enriched_experiences` and `sats_user_skills` — confirm **no new rows** were inserted (this step is preview-only).
6. Check Edge Function Logs for `linkedin-profile-ingest` — confirm `HTTP 200` and no errors.

### Pass criteria

- Structured profile preview returned (skills, experiences, provenance).
- Zero DB writes.
- No errors in function logs.

---

## 10. P13 S2 — Merge/dedupe utility

**Goal:** Skills and experiences are correctly bucketed into `insert/merge/ignore` based on comparison against the user's existing baseline.

### Prerequisites

- User has existing skills and experiences in their profile.
- LinkedIn import preview from test #9 available.

### Steps

1. Start the LinkedIn import flow (same as test #9) with a profile URL that has overlapping skills/experiences with your existing profile.
2. After the preview step, proceed to the **merge preparation step** (before the review modal opens).
3. Open browser DevTools → Network tab and inspect the response payload from the merge-prep call. Look for:
   - `skills_to_insert` — new skills not in your baseline.
   - `skills_to_merge` — skills that match existing ones after canonicalization.
   - `skills_to_ignore` — exact duplicates.
   - `experiences_to_insert` — new experiences.
   - `experiences_ignored` — duplicate experiences (fingerprint match).
4. Confirm skills that are clearly identical to existing skills appear in `skills_to_ignore`, not `skills_to_insert`.
5. Confirm provenance fields (`source: 'linkedin'`) are present on all items in `skills_to_insert` and `experiences_to_insert`.

### Pass criteria

- Bucketing is logically correct (duplicates in ignore, new items in insert).
- Provenance tagged on all insert-ready rows.

---

## 11. P13 S3 — HITL Review UI

**Goal:** Review modal shows correct items, only selected items are saved to DB, rejected items produce no DB writes.

### Prerequisites

- Completed tests #9 and #10 (LinkedIn import flow up to merge prep).

### Steps

1. Continue the LinkedIn import flow until the **"Profile Import Review"** modal opens.
2. Confirm all items default to **checked** (selected for import).
3. **Uncheck** 2–3 skills and 1 experience you do NOT want to import.
4. Click **"Approve and Save"**.
5. After save, open Supabase Dashboard:
   - `sats_user_skills` — confirm **only the checked skills** were inserted.
   - `sats_enriched_experiences` — confirm **only the checked experiences** were inserted.
   - The unchecked items must **not** appear.
6. Re-open the import flow with the same URL. The skills/experiences you imported should now be in your baseline. Confirm they appear in the `skills_to_ignore` bucket (not offered for import again).
7. Test the **empty state**: use a profile URL that has no new items relative to your baseline. Confirm the modal renders an empty-state message rather than a blank/broken layout.
8. Test scroll: if the modal has more than ~5 items, confirm you can scroll to see all items including the bottom action buttons without them being hidden.

### Pass criteria

- Only checked items written to DB.
- Rejected items absent from DB.
- Empty state renders correctly.
- Scroll works; "Approve and Save" button always reachable.

---

## 12. Help Hub (`/help`)

**Goal:** Page loads for authenticated users, search works, topic buttons route correctly.

### Steps

1. Log in and navigate to `/help` directly.
2. Confirm the page renders without a 404 or blank screen.
3. Confirm the sidebar has a **Help** entry and clicking it navigates to `/help`.
4. Use the **search/filter** input: type a topic keyword (e.g. "resume"). Confirm matching topics appear in results.
5. Clear the search. Confirm all topics reappear.
6. Click each actionable topic button that links to another page (e.g. "Go to Resumes"). Confirm it routes to the correct route (`/resumes`, `/jobs`, etc.).
7. Test with a keyword that matches nothing. Confirm an appropriate "no results" state.

### Pass criteria

- Page loads for authenticated users.
- Search filters topics accurately.
- Deep-link buttons route to correct pages.
- No broken routes or JS errors in console.

---

## 13. P16 S1 — Resume Persona Model

**Goal:** CRUD operations for resume personas work end-to-end; RLS isolates personas per user.

### Steps

1. Log in as **User A** and navigate to **Settings**.
2. Find the **Personas** section (rendered by `PersonaManager`).
3. **Create** a new persona with a name and target role. Confirm it appears in the list.
4. Open Supabase Dashboard → `sats_resume_personas` — confirm the row exists with your `user_id`.
5. **Edit** the persona's name and target role. Save. Confirm the updated values appear in the UI and in the DB row.
6. **Set active**: mark the persona as the active persona. Confirm the UI reflects the active state.
7. **Delete** the persona. Confirm the confirmation dialog appears before deletion. Confirm the row is removed from the DB.
8. **RLS isolation test:**
   - As User A, create a persona and note its `id`.
   - Log in as **User B** (incognito/different browser).
   - In browser console or via REST API with User B's JWT:
     ```
     GET /rest/v1/sats_resume_personas?select=*
     Authorization: Bearer <userB-jwt>
     ```
   - Confirm 0 rows returned (User A's persona not visible to User B).

### Pass criteria

- Create, edit, set-active, delete all work correctly.
- DB rows reflect changes.
- User B cannot read User A's personas.

---

## 14. BUG: Location RLS INSERT path

**Goal:** Creating a Job Description with a new location does not throw an RLS error.

### Steps

1. Log in and navigate to `/jobs`.
2. Click **Add Job Description** → choose the **URL ingestion** option.
3. Enter a job posting URL from a company/location you have **not** used before (to ensure a new location row must be created).
4. Submit and wait for ingestion.
5. Confirm a **success toast** appears (should say something like "Job description added" or "Location created" — not an RLS error toast).
6. Open Supabase Dashboard → `sats_locations`. Confirm the new location row exists.
7. Confirm the new job description appears in the `/jobs` list.
8. Check Edge Function Logs for `job-description-url-ingest` — confirm no RLS errors.

### Pass criteria

- No RLS error during job description creation.
- New location row inserted in `sats_locations`.
- Job description card appears in UI.

---

## 15. P18 S2 — CV Optimisation scorer

**Goal:** ATS scorer produces `cv_optimisation_score`, `cv_optimisation_improvements`, and `enrichments_used_count > 0` in `analysis_data` when enrichments are present.

### Prerequisites

- At least one resume with **accepted enrichments** in `sats_enriched_experiences`.
- A job description to score against.

### Steps

1. **Baseline run (no enrichments):**
   - Pick a resume that currently has no accepted enrichments (or temporarily mark enrichments as not-accepted).
   - Run an ATS analysis against a job description. Note the `ats_score`.
   - Open Supabase Dashboard → `sats_analyses` → find the row → inspect `analysis_data` JSON. Confirm `cv_optimisation_score` is `null` or absent, and `enrichments_used_count = 0`.

2. **Enriched run:**
   - Ensure the same resume has ≥1 accepted enrichment in `sats_enriched_experiences`.
   - Run a **new** ATS analysis against the same job description.
   - Open `sats_analyses` → find the new row → inspect `analysis_data`. Confirm:
     - `cv_optimisation_score` is present and a number.
     - `cv_optimisation_improvements` is a non-empty array.
     - `enrichments_used_count > 0`.

3. **Baseline score integrity:**
   - Compare the `ats_score` from step 1 and step 2. They should be equal (or within ±2pp — the enrichment projection must NOT lower the baseline score).

### Pass criteria

- `cv_optimisation_score` and `enrichments_used_count > 0` present in enriched run.
- `cv_optimisation_score` absent/null in non-enriched run.
- `ats_score` unchanged (baseline not corrupted by enrichment call).

---

## 16. P18 S3 — CV Optimisation UI panel

**Goal:** Green optimisation panel renders when data is present; hidden when not.

### Prerequisites

- Completed test #15 (enriched analysis exists in DB).

### Steps

1. Navigate to `/analyses`.
2. Open the analysis card for the **enriched run** from test #15.
3. Confirm a green-coloured **CV Optimisation** panel is visible on the card, showing:
   - Projected optimisation score (%).
   - Delta badge (e.g. "+12%").
   - List of improvement suggestions.
4. Open the analysis card for the **non-enriched run** from step 1 of test #15.
5. Confirm the green optimisation panel is **absent** from this card.

### Pass criteria

- Panel visible on enriched analysis with correct values.
- Panel absent on non-enriched analysis.

---

## 17. ATS model §4.3 determinism + governance update

**Goal:** Scores are deterministic within ±2pp; rubric pairs are consistent; governance doc updated.

### Steps

**Set A — Determinism (3× same input ±2pp):**

1. Pick one resume and one job description.
2. Run an ATS analysis 3 separate times against the same resume+JD pair.
3. Record the three `ats_score` values from `sats_analyses`.
4. Confirm all three scores are within ±2 percentage points of each other.

**Set B — Rubric consistency (keyword missing):**

1. Pick 5 pairs of resumes — one resume in each pair has a keyword the JD requires; the other is missing it.
2. Run analyses for all 10 resumes against the same JD.
3. For each pair, confirm the resume WITH the keyword scores higher than the one WITHOUT.

**Set C — Edge cases:**

1. Submit a clearly strong resume (highly relevant skills/experience) against a well-matched JD. Confirm `ats_score ≥ 85`.
2. Submit a clearly weak resume (irrelevant skills) against an unrelated JD. Confirm `ats_score ≤ 30`.

**Governance doc update (after all sets pass):**

1. Open `docs/specs/technical/llm-model-governance.md`.
2. In **§2 Model Register**, update the ATS scoring model from `o4-mini` to `gpt-4.1`.
3. In **§6 Change Log**, add an entry for today's date documenting that §4.3 was run and passed, and that the production model is `gpt-4.1`.

### Pass criteria

- All three determinism scores within ±2pp.
- Rubric pairs: keyword-present always scores higher.
- Edge cases: strong ≥85%, weak ≤30%.
- Governance doc updated with correct model and change log entry.

---

## 18. Admin LogViewer time-window filter

**Goal:** Time-window dropdown correctly constrains log results; default is ERROR + Last 1h.

### Steps

1. Log in as an **admin** user and navigate to **Admin → Logging Control → Log Viewer**.
2. Confirm the **default** state shows:
   - Log level filter: **ERROR** (or similar default level).
   - Time window: **Last 1 hour**.
3. Check the displayed rows all fall within the last hour and are error-level.
4. Change the level filter to **All Levels** and time window to **All time**.
5. Confirm the row count **increases** compared to the default view.
6. Change time window to **Last 5 minutes**.
7. Confirm only very recent entries are shown (timestamps within the last 5 minutes); older rows from step 4 are no longer visible.
8. Switch back to **Last 1 hour** — confirm rows reappear appropriately.

### Pass criteria

- Default view: ERROR level, last 1h.
- Switching to "All/All" returns more rows than default.
- "Last 5 min" correctly constrains to recent entries only.
- Switching windows updates results without page reload.

---

## Closure Checklist

When a test above **passes**, record closure evidence in `docs/releases/UNTESTED_IMPLEMENTATIONS.md` using the **Closure Template** table at the bottom of that file:

```
| YYYY-MM-DD | <change name> | <evidence: screenshots, DB row IDs, log request IDs, or test output> | <your name> |
```

Then remove or mark the corresponding row in the **Open Blockers** table.
