# Opportunities Feature — Session Notes & Next Steps

**Date:** 2026-04-05  
**Branch:** `p20-data-deletion`  
**Author:** Ricardo Rivero + Claude Code

---

## 1. Feature Intent

### What is /opportunities?

`/opportunities` is the **proactive job matching** dashboard. Instead of requiring the user to manually paste job descriptions and run ATS analyses, the system discovers jobs automatically, scores them against the user's resume in the background, and surfaces only the high-match results.

The end-user value proposition:

> _"Never miss a great job. Smart ATS scans your job alerts and tells you which roles are worth applying for — before you even open LinkedIn."_

### The pipeline (end-to-end)

```
LinkedIn job alert email
  → Gmail auto-forward filter
    → Postmark inbound webhook
      → inbound-email-ingest edge function
        → sats_staged_jobs (status: queued)
          → async-ats-scorer (cron / manual trigger)
            → sats_analyses (source: proactive)
              → sats_user_notifications (if score ≥ threshold)
                → /opportunities UI (filtered by threshold)
```

---

## 2. What Was Built (Shipped as of 2026-04-05)

### Database

| Table                     | Purpose                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sats_staged_jobs`        | Holds jobs waiting to be scored. Columns: `title`, `company_name`, `source_url`, `source`, `description_raw`, `description_normalized`, `content_hash`, `status` (`queued` → `processed` / `failed`) |
| `sats_analyses`           | Stores all ATS analyses including proactive ones (`source = 'proactive'`)                                                                                                                            |
| `sats_user_notifications` | One row per high-match proactive result, drives `/opportunities` UI                                                                                                                                  |
| `sats_runtime_settings`   | Stores operator config: `proactive_match_threshold` (global), `postmark_webhook_secret`, `inbound_email_allowlist`, `inbound_email_ingest_url`                                                       |

### Edge Functions

| Function               | Purpose                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch-market-jobs`    | Polls configured job sources and stages mock/real jobs (P14). Used for initial pipeline testing.                                                              |
| `async-ats-scorer`     | Picks up `queued` rows from `sats_staged_jobs`, runs ATS scoring per user, writes to `sats_analyses`, creates `sats_user_notifications` if score ≥ threshold. |
| `inbound-email-ingest` | **New (ADR-0007).** Postmark webhook receiver. Parses LinkedIn job alert emails, stages jobs into `sats_staged_jobs`.                                         |

### inbound-email-ingest — Key Implementation Details

**Security:**

- Guard 1: `X-Postmark-Signature` header token verification against `postmark_webhook_secret` in `sats_runtime_settings`. Skipped if empty (safe for initial setup).
- Guard 2: Sender allowlist (`inbound_email_allowlist`). Emails from unlisted senders silently return `200 OK` (prevents Postmark retries).
- `verify_jwt = false` in `supabase/config.toml` — required because Postmark is an external service and cannot provide a Supabase JWT.

**Parsing:**

- Pass 1 (HTML anchors): Regex matches `<a href="linkedin.com/comm/jobs/view/JOBID">` — extracts job ID, title from anchor text, company from bullet-separated context (e.g. `"Peloton Consulting Group · São Paulo, SP (Hybrid)"`).
- Pass 2 (plain text fallback): Regex matches bare `linkedin.com/comm/jobs/view/JOBID` URLs — handles Gmail forwarding which may strip anchor tags.
- Canonical URL: Tracking params stripped; stored as `https://www.linkedin.com/jobs/view/JOBID`.
- Deduplication: `content_hash` (SHA-256 of normalized description) + `source_url` unique constraint. Duplicate jobs silently skipped (`23505` error code).

**Key bug fixed during setup:** LinkedIn job alert emails use `linkedin.com/comm/jobs/view/` (note the `/comm/` path). The original regex only matched `linkedin.com/jobs/view/`. Fixed 2026-04-05 by adding `(?:comm\/)?` to both anchor and plain-text regex patterns.

**Returns:**

```json
{
  "success": true,
  "from": "...",
  "subject": "...",
  "source": "linkedin-email-alert",
  "found": 5,
  "staged": 5,
  "skipped": 0
}
```

### Frontend

| Component                       | Purpose                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/Opportunities.tsx`   | `/opportunities` route. Reads `sats_user_notifications`, filters by threshold, displays scored jobs ordered by ATS score descending. |
| `src/components/AppSidebar.tsx` | "Opportunities" nav item wired.                                                                                                      |

### Settings UI — Email Job Alerts Card

Located in `src/pages/Settings.tsx`. Shows:

- Step 1: Postmark inbound address with copy button
- Step 2: Numbered setup instructions (webhook URL, SQL commands for token + allowlist)

**Note:** This UI is operator-facing (dev setup) — not suitable for end-users at scale. See §5 (Next Steps) for the redesign plan.

### Migrations Applied

| File                                               | Purpose                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `20260402040000_postmark_inbound_email_config.sql` | Seeds `postmark_webhook_secret`, `inbound_email_allowlist`, `inbound_email_ingest_url` into `sats_runtime_settings` |

### ADR

`docs/decisions/adr-0007-2026-04-02-email-inbound-job-ingestion.md` — documents Postmark MVP choice vs Gmail OAuth, URL polling, and Cloudflare Email Workers alternatives.

---

## 3. How It Was Set Up (Operator Steps Completed)

### Postmark account

- Account created at postmark.com
- Server created: `smart.ats`
- Default Inbound Stream configured
- Inbound address: `b52cfe6bf692b531f31b3f9917843558@inbound.postmarkapp.com`
- Webhook URL set to: `https://nkgscksbgmzhizohobhg.functions.supabase.co/inbound-email-ingest`
- Account in **Test mode** (100 email cap) — approval request pending

### Supabase config

```sql
-- Current state of runtime settings:
UPDATE public.sats_runtime_settings SET value = 'jobalerts@linkedin.com,rrivero@gmail.com' WHERE key = 'inbound_email_allowlist';
-- postmark_webhook_secret: empty (token verification skipped during testing)
-- inbound_email_ingest_url: set to function URL
```

### Gmail forwarding

- Manual forward tested: `rrivero@gmail.com` → Postmark inbound address
- Gmail forwarding confirmation email received and processed by Postmark (correctly silently dropped by edge function — sender not in allowlist)
- **Auto-forward filter not yet configured** — currently manual forward only

### End-to-end test result (2026-04-05 00:46)

Forwarded 1 LinkedIn job alert email → **5 jobs staged** in `sats_staged_jobs`:

| Title                                             | Company             | Status |
| ------------------------------------------------- | ------------------- | ------ |
| Software Engineer \| Intermediate                 | Westpac New Zealand | queued |
| Technical Lead - Mobile (React Native) - Contract | Theta (NZ)          | queued |
| Technical Business Analyst                        | SThree              | queued |
| Engineering Manager                               | Tribe Recruitment   | queued |
| Product Owner                                     | Cin7                | queued |

---

## 4. Current State (What Is and Isn't Working)

| Component                                              | Status                                                 |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Email → Postmark → edge function                       | ✅ Working                                             |
| Edge function → sats_staged_jobs                       | ✅ Working                                             |
| sats_staged_jobs → async-ats-scorer                    | ⚠️ Not triggered yet (jobs sit at `queued`)            |
| async-ats-scorer → sats_analyses                       | ⚠️ Pending scorer run                                  |
| sats_analyses → /opportunities UI                      | ⚠️ Pending scorer run                                  |
| /opportunities shows "No high-match opportunities yet" | ⚠️ Expected — scorer not run, no notifications created |
| Gmail auto-forward filter                              | ❌ Not configured — manual forward only                |
| Postmark account approval                              | ❌ Pending (100 email test mode cap)                   |

---

## 5. Next Steps (Priority Order)

### P0 — Trigger async-ats-scorer (unblocks everything else)

The 5 queued jobs will not be scored until the scorer runs. Do one of:

- Supabase Dashboard → Edge Functions → `async-ats-scorer` → **Invoke**
- Or via CLI: `supabase functions invoke async-ats-scorer --no-verify-jwt`

After running, check:

```sql
SELECT now() AS queried_at, status, count(*)
FROM public.sats_staged_jobs
GROUP BY status;

SELECT now() AS queried_at, ats_score, analysis_data->>'job_title' AS title, created_at
FROM public.sats_analyses
WHERE created_at > now() - interval '1 hour'
ORDER BY ats_score DESC;
```

If threshold blocks results from appearing in `/opportunities`, lower it temporarily:

```sql
UPDATE public.sats_runtime_settings
SET value = '0.40'
WHERE key = 'proactive_match_threshold';
```

---

### P1 — Show pending/queued jobs on /opportunities

**Problem:** User forwards email, jobs are staged, UI shows nothing. Broken feedback loop.

**Fix:** Add a "Pending" section to `/opportunities` that shows jobs in `sats_staged_jobs` with `status = queued` or `processing`. Label it "Scoring in progress..." with a spinner. This closes the feedback loop immediately after forwarding.

**Files to change:** `src/pages/Opportunities.tsx`, `src/hooks/useOpportunities.ts` (add query for staged jobs).

---

### P2 — In-app notification on email ingestion

**Problem:** User has no confirmation that forwarding worked.

**Fix:** When `inbound-email-ingest` stages ≥1 job, insert a row into `sats_user_notifications` with type `email_ingestion_confirmed` and a message like _"5 jobs found in your LinkedIn alert — scoring in progress."_ The notification bell in the UI picks this up automatically.

**Files to change:** `supabase/functions/inbound-email-ingest/index.ts` (insert notification row after staging).

---

### P3 — Lower cold-start threshold

**Problem:** New users with no enriched experiences or skill profiles score lower because the scorer has no weighted context. A 60% threshold eliminates results before the user sees any value.

**Fix:** In `async-ats-scorer`, detect if user has fewer than 3 prior analyses. If so, use 40% threshold regardless of global setting. This is a one-time cold-start override.

**Files to change:** `supabase/functions/async-ats-scorer/index.ts`.

---

### P4 — "Last synced" and job count on /opportunities

**Problem:** User can't tell if the system is active or stale.

**Fix:** Show last scorer run timestamp and count of jobs processed. Source from `sats_runtime_settings` (scorer can write `last_scorer_run` key) or derive from `max(created_at)` on recent `sats_analyses`.

---

### P5 — Gmail auto-forward filter (user action required)

Set up Gmail to automatically forward LinkedIn job alerts without manual forwarding:

1. Gmail → Settings → Filters and Blocked Addresses → Create a new filter
2. **From:** `jobalerts-noreply@linkedin.com`
3. Action: **Forward to** `b52cfe6bf692b531f31b3f9917843558@inbound.postmarkapp.com`
4. Confirm the forwarding address (Gmail will send a confirmation email to Postmark — the edge function silently drops it, which is correct)

Once active, every LinkedIn job alert lands in Smart ATS automatically — no manual forwarding needed.

---

### P6 — Redesign Settings "Email Job Alerts" card (PM priority)

**Problem:** Current UI exposes operator infrastructure (SQL commands, webhook tokens) to end-users. Unmarketable.

**Target UX:** Each user gets a personal inbound address. 2-step setup visible to user:

1. Copy your personal SmartATS address: `{token}@inbound.smartats.app` [Copy]
2. Forward LinkedIn alerts to this address

**Implementation:**

- Add `inbound_email_token` UUID column to `profiles` table (auto-generated at signup)
- Update `inbound-email-ingest` to route by `To:` address token instead of sender allowlist
- Requires Postmark inbound domain forwarding (`@inbound.smartats.app`) — one-time operator setup
- Eliminates the allowlist problem entirely — scales to any number of users

---

### P7 — Request Postmark account approval

Click **Request approval** in the Postmark dashboard to exit test mode (100 email cap). Required before onboarding real users.

---

### P8 — Configure postmark_webhook_secret

Once Postmark is approved and stable, add the webhook token for proper request verification:

```sql
UPDATE public.sats_runtime_settings
SET value = '<token-from-postmark-settings>'
WHERE key = 'postmark_webhook_secret';
```

---

## 6. Open Questions

| Question                                                         | Notes                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Should SEEK and Indeed alerts also be parsed?                    | Generic URL extractor already handles Seek/Indeed/Lever/Greenhouse — needs testing                                                   |
| What happens when the same job appears in multiple alert emails? | Deduplicated by `source_url` unique constraint — second insert silently skipped ✅                                                   |
| Should users be able to see and manage their staged jobs?        | Not yet built — could be useful for transparency                                                                                     |
| Who owns the proactive match threshold per user?                 | Currently global via `sats_runtime_settings`. Per-user override exists in `profiles.proactive_match_threshold` but not exposed in UI |

---

## 7. Architecture Decisions

| Decision                               | Rationale                                                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Postmark over Gmail OAuth              | Gmail OAuth requires app verification (weeks), OAuth consent screen, refresh token management. Postmark webhook is a one-hour integration.     |
| Postmark over Cloudflare Email Workers | Cloudflare requires DNS control of a domain, Workers setup, R2 or KV storage. Estimated 2-3 days vs 2 hours for Postmark.                      |
| Sender allowlist (MVP)                 | Simple security gate for single-user MVP. Replace with per-user token routing (P6) before multi-user launch.                                   |
| `verify_jwt = false`                   | Postmark cannot provide a Supabase JWT. Security handled by signature token + allowlist instead.                                               |
| Canonical URL storage                  | Tracking params stripped from LinkedIn URLs (`/comm/jobs/view/JOBID?trackingId=...` → `jobs/view/JOBID`). Dedup works correctly across emails. |

---

_Document generated 2026-04-05. See `docs/decisions/adr-0007-2026-04-02-email-inbound-job-ingestion.md` for the full architecture decision record._
