# ADR-0004 — Async vs Direct ATS Scoring: Two-Path Architecture

<!-- UPDATE LOG -->
<!-- 2026-03-18 00:00:00 | CR4-4: Created ADR documenting the async-ats-scorer vs ats-analysis-direct dual code paths. -->

**Status:** Accepted
**Date:** 2026-03-18
**Deciders:** SmartATS engineering
**Phase:** P14 (async path), P8 (direct path)

---

## Context

SmartATS has two separate code paths for ATS scoring:

| Path | Entry point | Trigger | Scope |
|---|---|---|---|
| **Direct** | `supabase/functions/ats-analysis-direct/index.ts` | User action (button click) | One resume × one job description |
| **Async** | `supabase/functions/async-ats-scorer/index.ts` | Cron job (every N minutes) | All users × all queued staged jobs |

Both paths call the same underlying LLM scoring logic via `callLLM()`, but they serve fundamentally different purposes and are not interchangeable.

---

## Decision

Maintain both paths indefinitely. They are not duplicates — they serve different user journeys and operational requirements.

---

## The Direct Path (`ats-analysis-direct`)

**Purpose:** Immediate, interactive ATS scoring for a specific resume + job description pair.

**Trigger:** User clicks "Analyse" in the job description modal or uploads a resume to a job.

**Characteristics:**
- Synchronous from the user's perspective (waits for result, shows spinner).
- Returns within the HTTP request timeout (~30s).
- Includes P18 CV Optimisation Score (second `callLLM()` call if enrichment context exists).
- Operates on user-owned data already in the database (`sats_resumes`, `sats_job_descriptions`).
- Subject to RLS — each user can only score their own data.
- Called from: `src/hooks/useDirectATSAnalysis.ts`.

**When to use this path:** Any user-initiated, on-demand scoring request.

---

## The Async Path (`async-ats-scorer`)

**Purpose:** Proactive, background scoring of market jobs against all users' active resumes.

**Trigger:** Supabase cron job, typically every 5-15 minutes.

**Characteristics:**
- Runs entirely in the background — users are not waiting.
- Processes `sats_staged_jobs` rows (populated by `fetch-market-jobs`) queued with `status: 'queued'`.
- Iterates over all active users with eligible resumes and scores them against each staged job.
- Creates `sats_user_notifications` rows when a match score exceeds `SATS_PROACTIVE_MATCH_THRESHOLD` (default: 0.6).
- Does **not** run the CV Optimisation second call — proactive scoring is baseline-only for cost and latency reasons.
- Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) since it is an internal system process, not a user request.
- Called from: cron trigger → `async-ats-scorer` → `sats_staged_jobs` pipeline.

**When to use this path:** Any background, batch, or proactive scoring operation.

---

## Why Not Merge the Paths?

### Operational model differs

Direct scoring is latency-sensitive (user is waiting). Async scoring is throughput-sensitive (process as many staged jobs as possible per cron window). Combining them would require a queueing layer that adds complexity without benefit.

### Authorization model differs

Direct path uses user JWT + RLS to ensure a user can only score their own data. Async path uses service role key because it acts on behalf of all users — there is no single authenticated user context.

### Feature scope differs

Direct path includes P18 CV Optimisation second call. Async path does not. Merging would require conditional logic that makes both paths harder to reason about.

### Failure isolation

If the async cron fails (e.g. OpenAI rate limit during a batch run), direct user-triggered scoring must continue unaffected. Shared infrastructure would couple their failure modes.

---

## Long-Term Direction

- The async path will eventually be replaced or supplemented by a proper job queue (e.g. Supabase `pg_cron` + `pgmq` or a dedicated worker). This ADR documents the current architecture — that migration will require a new ADR.
- The direct path is the permanent user-facing scoring entry point and will evolve with new features (personas, career-fit weighting, etc.).
- There is **no plan to merge the two paths** — the separation is intentional and should be preserved.

---

## Consequences

- Two code paths to maintain and keep in sync when core scoring logic changes.
- Shared scoring logic should be extracted to `_shared/` utilities if divergence grows — currently acceptable because the paths differ in scope, not in core scoring prompts.
- New scoring features must explicitly decide which path(s) they apply to.
