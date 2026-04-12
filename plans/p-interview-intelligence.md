<!--
  UPDATE LOG
  2026-04-12 | Created — Interview Intelligence S1+S2 shipped. Plan file created for PM Dashboard visibility.
-->

# P-INTERVIEW — Interview Intelligence

<!-- Status: IN PROGRESS -->

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| **Phase**         | P-INTERVIEW                                       |
| **Priority**      | HIGH                                              |
| **Tier gating**   | Pro+ (MVP) · Max+ (Employee Signals, Full Vision) |
| **Branch**        | `main` (S1+S2 merged 2026-04-12)                  |
| **Plan file**     | `plans/p-interview-intelligence.md`               |
| **Spec file**     | _none_                                            |
| **Created by**    | `product-analyst` + `Claude Code`                 |
| **Last reviewed** | 2026-04-12                                        |

---

## Summary

Closes the job search loop: after an ATS analysis, the candidate can generate a personalised interview prep kit without leaving SmartATS. No new data collection required — the feature leverages matched/missing skills, evidence pairs, resume text, enriched experiences, and company website data already in the database.

---

## Shipped — S1+S2 (2026-04-12, CODE-VERIFIED)

### S1 — MVP Generation Pipeline

| Deliverable                                                                                                                                                                                           | Status |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `supabase/migrations/20260412000000_add_interview_prep_sessions.sql` — `sats_interview_prep_sessions` table + full RLS + `pasted_text_hash` / `job_description_id` indexes (seeds S3 cache migration) | ✅     |
| `supabase/functions/generate-interview-prep/index.ts` — 3-call sequential LLM: company WebFetch → role decode → question bank + STAR scaffolds                                                        | ✅     |
| `src/hooks/useInterviewPrep.ts` — TanStack Query hook: session query, all-sessions, generate mutation                                                                                                 | ✅     |
| `src/hooks/usePlanFeature.ts` — `interview_prep` feature key (Pro+)                                                                                                                                   | ✅     |
| `src/pages/InterviewPrep.tsx` — `/interview-prep` page: 3 tabs (Question Bank, Company Brief, Role Decoder), STAR scaffold cards with risk flags, plan gate                                           | ✅     |
| `src/App.tsx` — `/interview-prep` route                                                                                                                                                               | ✅     |
| `src/components/AppSidebar.tsx` — Interview Prep nav item                                                                                                                                             | ✅     |
| `src/pages/ATSAnalyses.tsx` — "Prepare for Interview" button on completed analysis cards                                                                                                              | ✅     |

### S2 — Full Question Categories

All 5 question categories included in S1 delivery:

- **Behavioural** — from matched evidence pairs in ATS analysis
- **Gap-Bridge** — from missing skills, prepares candidate for gap conversation
- **Role-Specific** — from decoded JD implicit expectations
- **Company Values** — from company dossier (About/Careers/Values scrape)
- **Technical Deep-Dive** — high-weight matched skills + recency signals

---

## AI Architecture (3-Call Sequential Pipeline)

| Call                | Model                                              | Input                                                                    | Output                             |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| 1: Company Research | `gpt-4.1-mini` (`OPENAI_MODEL_INTERVIEW_RESEARCH`) | Scraped website text (≤4,000 chars)                                      | `company_dossier` JSON             |
| 2: Role Decode      | `gpt-4.1-mini`                                     | Full JD + company_dossier                                                | `role_decoder` JSON                |
| 3: Questions + STAR | `gpt-4.1` (`OPENAI_MODEL_INTERVIEW_QUESTIONS`)     | ATS evidence + resume (≤2,500 chars) + skill profile + dossier + decoder | `questions[]` with `star_scaffold` |

**Graceful degradation:** Scrape failure → `scrape_status = 'partial'` → `company_dossier = null` → Call 3 runs without company context. UI shows warning, never blocks.

**Rate limit:** 24h per `analysis_id`. `force_regenerate: true` bypasses.

---

## Remaining Stories

### S3 — Two-Table Shared Cache (Usage-Triggered)

**Trigger:** ≥3 concurrent users on the same JD OR LLM cost/day exceeds $5.

Split `sats_interview_prep_sessions` into:

- `sats_interview_prep_base` — JD-level data (company_dossier, role_decoder, shared question categories). SELECT for all auth users; INSERT/UPDATE service-role only.
- `sats_interview_prep_sessions` — candidate-level data (behavioural, gap-bridge, STAR scaffolds).

Cache key: `pasted_text_hash` (SHA-256 of normalised JD text) — already indexed in S1 table.

Cost impact: cached JD users run Call 3 only (~$0.020 vs $0.025 full).

### S4 — Proactive Pre-Generation

Hook into `fetch-market-jobs` pipeline: when a new job posting is ingested, enqueue Calls 1 & 2 as a background job to pre-populate `sats_interview_prep_base`. First user on that JD gets instant shared layer.

### S5 — Employee Signal Panel (Full Vision)

Expand Railway Playwright scraper to support company-employee search (new endpoint). Scrape 3–5 public profiles of people with the target job title. LLM extracts: common certifications, skill language, career paths. Surfaces hidden requirements ("4 of 5 people in this role hold a PMP. The JD doesn't mention it.").

**Prerequisite:** Dedicated scrape rate-limit bucket; current 10/hour limit insufficient.

---

## Success Metrics

| Metric                  | Target                                 |
| ----------------------- | -------------------------------------- |
| Generation time (P95)   | < 30 seconds                           |
| User-reported relevance | ≥ 4.0 / 5.0                            |
| Pro conversion lift     | +8% when surfaced as upgrade CTA       |
| Regeneration rate       | < 20% (high regen = low first-quality) |
| Session completion rate | ≥ 60% view all 3 tabs                  |

---

## E2E Validation Checklist (from UNTESTED_IMPLEMENTATIONS.md)

1. `/analyses` as Pro user with ≥1 completed analysis — expand card — "Prepare for Interview" button visible
2. Click button — navigates to `/interview-prep?analysis_id=<uuid>`
3. Auto-generation triggers (loading state, completes <30s)
4. 3 tabs render: Question Bank, Company Brief, Role Decoder
5. Question Bank shows ≥3 questions with `why_asked` and STAR scaffold
6. Company Brief shows values / keywords (or graceful degradation notice)
7. Role Decoder shows implicit seniority + deliverables
8. Free user — plan gate overlay shown
9. Second click within 24h — cached session returned (no new LLM calls)
10. `supabase functions deploy generate-interview-prep` succeeds

**Required:** Deploy `generate-interview-prep` edge function to project `nkgscksbgmzhizohobhg`.
