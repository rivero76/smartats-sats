<!-- UPDATE LOG -->
<!-- 2026-04-07 | Rewritten — consolidated all prompt outputs to docs/audits/reports/, added phase-based schedule, updated report archive links -->

# Audit Log

This file is the index for all audits performed on the SmartATS codebase. It tracks:

- **Active prompts** — the reusable prompt templates in this folder
- **Phase schedule** — when to run each audit
- **Report archive** — links to all generated reports in `docs/audits/reports/`

---

## Active Audit Prompts

Three reusable prompt templates live in this folder. Use the schedule below to know when to run each.

| Prompt                                                             | Purpose                                                                 | Cadence                                      | Output naming                                             |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| [`ARCHITECTURE-DECISION-AUDIT.md`](ARCHITECTURE-DECISION-AUDIT.md) | One-time: rebuild vs. refactor strategic decision                       | Run ONCE before any major rewrite discussion | `docs/audits/reports/YYYY-MM-DD_architecture-decision.md` |
| [`PM-PGM-AUDIT.md`](PM-PGM-AUDIT.md)                               | One-time: PM/PgM maturity assessment + framework                        | Run ONCE when docs feel scattered            | `docs/audits/reports/YYYY-MM-DD_pm-pgm-audit.md`          |
| [`aws-waf-review-prompt.md`](aws-waf-review-prompt.md)             | Periodic: 6-pillar WAF quality review (includes help-page parity check) | See schedule below                           | `docs/audits/reports/YYYY-MM-DD_code-review.md`           |

> **Deprecated:** `code-review-prompt.md` — superseded by `aws-waf-review-prompt.md` which covers all its dimensions plus two WAF pillars. Retained for historical reference only.

---

## Phase-Based Audit Schedule

| Product stage                               | Audit to run                                  | Trigger                                      |
| ------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| Pre-launch (first time)                     | **Architecture Decision**                     | Before any rebuild discussion                |
| When docs feel chaotic (first time)         | **PM/PgM Audit**                              | When artifacts are scattered across the repo |
| After every 5 phases shipped                | **WAF Code Review** (quick: Pillars 1–2 only) | After P5, P10, P15, P20, P25…                |
| Before any public launch or billing go-live | **WAF Code Review** (full: all 6 pillars)     | P22 (Billing), first external users          |
| Quarterly post-launch                       | **WAF Code Review** (full: all 6 pillars)     | Every 3 months after launch                  |
| Ad-hoc (infra change, strategy review)      | Any of the above or one-off analysis          | Event-triggered                              |

---

## Report Archive

All generated audit reports live in [`docs/audits/reports/`](reports/). Naming convention: `YYYY-MM-DD_<type>.md`.

| Date       | Type                       | Report                                                                                   | Key finding                                                                                                      |
| ---------- | -------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2026-03-18 | Code Review                | [2026-03-18_code-review.md](reports/2026-03-18_code-review.md)                           | 23 findings; 2 CRITICAL (503 status code, UPDATE LOG enforcement); all resolved                                  |
| 2026-03-18 | Docs Structure Analysis    | [2026-03-18_docs-structure.md](reports/2026-03-18_docs-structure.md)                     | Root cause of doc scatter: `plans/product-improvements.md` god-doc; ~2h to fix                                   |
| 2026-03-27 | DB Architecture Diagnostic | `2026-03-27_db-architecture-diagnostic.md` (external)                                    | Overall enterprise readiness: 2.1/5; RBAC and RAG not implemented                                                |
| 2026-03-27 | Product Strategy           | [2026-03-27_product-strategy.md](reports/2026-03-27_product-strategy.md)                 | SmartATS is reactive+high-personalisation; opportunity in proactive quadrant                                     |
| 2026-03-27 | Job Seeker Gap Analysis    | [2026-03-27_job-seeker-gap-analysis.md](reports/2026-03-27_job-seeker-gap-analysis.md)   | 8 unmet user needs; top: Interview Readiness Score, Career Gap Advisor                                           |
| 2026-03-31 | WAF Code Review            | [2026-03-31_code-review.md](reports/2026-03-31_code-review.md)                           | SEC-1 CRITICAL: `linkedin-profile-ingest` bypasses `callLLM()`; REL-1: `logContext` missing in 5/6 LLM functions |
| 2026-04-01 | LinkedIn Scraper Hosting   | [2026-04-01_linkedin-scraper-hosting.md](reports/2026-04-01_linkedin-scraper-hosting.md) | Decision: Railway for MVP, Fly.io at >200 MAU, retire scraper at Enterprise                                      |
| 2026-04-06 | Architecture Decision      | [2026-04-06_architecture-decision.md](reports/2026-04-06_architecture-decision.md)       | **Verdict: Incremental refactor.** No rebuild. Core model, auth, LLM abstraction are sound.                      |
| 2026-04-06 | PM/PgM Audit               | [2026-04-06_pm-pgm-audit.md](reports/2026-04-06_pm-pgm-audit.md)                         | PM maturity: EMERGING. #1 risk: runbooks are empty shells. #1 asset: UNTESTED_IMPLEMENTATIONS.md                 |

---

## How to Add an Entry

1. Run the relevant prompt (see Active Audit Prompts table above).
2. Save the report to `docs/audits/reports/YYYY-MM-DD_<type>.md`.
3. Append a row to the Report Archive table above with: date, type, link, and a one-line key finding.
4. Update `LAST RUN` in the prompt file's front-matter comment.
