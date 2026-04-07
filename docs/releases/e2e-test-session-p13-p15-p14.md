<!-- Created: 2026-03-17 — E2E runtime test session guide for P13, P15, P14 -->
<!-- Purpose: Step-by-step manual test protocol to close UNTESTED_IMPLEMENTATIONS.md blockers -->
<!-- Status: PENDING EXECUTION -->

# E2E Runtime Test Session: P13 → P15 → P14

Run these sessions in order. Each session depends on data created in the previous one.

**Pre-conditions (all sessions):**

- App running (local: `npm run dev`, or production URL)
- Authenticated as a test user with at least one uploaded resume
- Supabase project `nkgscksbgmzhizohobhg` accessible
- Supabase Studio open for DB verification queries

---

## Session 1 — P13: LinkedIn Profile Ingestion

**Entry point:** Settings page → LinkedIn URL field

### 1.1 — Edge function: linkedin-profile-ingest

1. Enter a valid LinkedIn profile URL in the LinkedIn URL field (e.g. your own)
2. Click "Import Profile"
3. **Expected:** Loading spinner appears; no blank screen or console error
4. **Expected:** `ProfileImportReviewModal` opens with parsed skills and experiences
5. **DB check (should be empty):** `SELECT count(*) FROM sats_user_skills WHERE source='linkedin'` before save

### 1.2 — Merge/dedupe buckets

6. Review the modal — note which items are marked as new vs merge candidates
7. Verify at least one skill shows a "merge" decision if the user has existing resume skills
8. Verify provenance shows `source: 'linkedin'` on all items
9. Uncheck one skill and one experience intentionally

### 1.3 — HITL save

10. Click "Approve and Save"
11. **Expected:** Success toast appears
12. **DB check:** `SELECT skill_name, source FROM sats_user_skills WHERE source='linkedin' AND user_id='<your-uid>' ORDER BY created_at DESC LIMIT 10`
    - Should show only the items that were checked
    - The unchecked items should NOT appear
13. **Confirm no duplicate rows** for existing skills (check merge vs insert decisions)

### 1.4 — Rejection check

14. Re-run the import, select NO items, click "Approve and Save"
15. **Expected:** No new DB rows created; success toast still appears (empty save is valid)

**Pass criteria:** Steps 11–13 verified. Record result in UNTESTED_IMPLEMENTATIONS.md.

---

## Session 2 — P15: Upskilling Roadmap Engine

**Pre-condition:** At least one ATS analysis exists with `missing_skills` populated.

### 2.1 — generate-upskill-roadmap edge function

1. Navigate to an existing ATS analysis result
2. Click "Generate Roadmap" (or the equivalent CTA to trigger roadmap generation)
3. **Expected:** Loading state; no console errors
4. **DB check immediately after:**
   ```sql
   SELECT id, target_role, status, created_at
   FROM sats_learning_roadmaps
   WHERE user_id = '<your-uid>'
   ORDER BY created_at DESC LIMIT 1;
   ```
5. **Expected:** A new roadmap row with a valid UUID is returned
6. Note the `id` for the next step

### 2.2 — Milestones

7. ```sql
   SELECT skill_name, milestone_type, order_index, is_completed
   FROM sats_roadmap_milestones
   WHERE roadmap_id = '<id-from-step-6>'
   ORDER BY order_index;
   ```
8. **Expected:** ≥3 milestones; at least one `milestone_type = 'project'`; all `is_completed = false`

### 2.3 — /roadmaps UI

9. Navigate to `/roadmaps`
10. **Expected:** New roadmap appears in the list
11. Click into the roadmap — milestones should render in `order_index` sequence
12. Toggle the first milestone to completed
13. **Expected:** Progress bar advances (e.g. 1/N → percentage shown)
14. **DB check:** `SELECT is_completed FROM sats_roadmap_milestones WHERE id = '<milestone-id>'` — should be `true`
15. Refresh the page — milestone should still show as completed (persistence check)

**Pass criteria:** Steps 5, 8, 13, 14 all verified. Record result.

---

## Session 3 — P14: Proactive Search Engine

**Pre-condition:** At least one user with complete skill profile exists.

### 3.1 — fetch-market-jobs cron function

1. Invoke `fetch-market-jobs` directly via Supabase Dashboard → Edge Functions → Invoke (use empty payload `{}`)
2. **Expected:** HTTP 200; logs show "fetch run complete"
3. **DB check:**
   ```sql
   SELECT status, title, company_name, fetched_at
   FROM sats_staged_jobs
   ORDER BY fetched_at DESC LIMIT 5;
   ```
4. **Expected:** Rows with `status = 'queued'`

### 3.2 — Deduplication check

5. Invoke `fetch-market-jobs` a second time immediately
6. **DB check:** Row count should NOT have doubled — dedupe by `source_url` should prevent duplicates

### 3.3 — async-ats-scorer

7. Invoke `async-ats-scorer` directly (empty payload)
8. **Expected:** HTTP 200; staged job rows are updated to `status = 'processed'`
9. **DB check:**
   ```sql
   SELECT id, match_score, user_id
   FROM sats_analyses
   WHERE analysis_data->>'source' = 'proactive'
   ORDER BY created_at DESC LIMIT 5;
   ```
10. **Expected:** New analysis rows with proactive source metadata

### 3.4 — Threshold + notifications (Story 3)

11. Check your `profiles.proactive_match_threshold` — set it to `0.01` temporarily (to ensure at least one notification fires)
12. Re-run `async-ats-scorer`
13. **DB check:**
    ```sql
    SELECT type, title, payload, is_read, created_at
    FROM sats_user_notifications
    WHERE user_id = '<your-uid>'
    ORDER BY created_at DESC LIMIT 5;
    ```
14. **Expected:** At least one notification row; `payload` includes `match_score` and `staged_job_id`
15. Reset `proactive_match_threshold` to `0.60`

### 3.5 — Opportunities UI (Story 4)

16. Navigate to `/opportunities`
17. **Expected:** Cards appear for the proactive analyses with score ≥ threshold
18. Each card should show: ATS score, missing skills, source URL, timestamp
19. Cards should be sorted highest score first

**Pass criteria:** Steps 4, 9, 14, 18 all verified. Record result.

---

## Recording Results

For each session, update `docs/releases/UNTESTED_IMPLEMENTATIONS.md`:

- Change status from `CODE-VERIFIED — runtime E2E pending` to closed
- Fill in the Closure Template row with date, evidence (SQL query result screenshot or log snippet), and your name

Example closure entry:

```
| 2026-03-17 | P15 Story 1 (schema) | Applied to project nkgscksbgmzhizohobhg; sats_learning_roadmaps row created, RLS blocks cross-user query | [your name] |
```
