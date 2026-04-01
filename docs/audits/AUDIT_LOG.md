# Audit Log

This file records all structured audits performed on the SmartATS codebase — schema reviews, security audits, architecture assessments, and code reviews. Each entry links to the full report for traceability.

---

## Audit Registry

| Date | Type | Performed By | Purpose | Report |
|---|---|---|---|---|
| 2026-03-27 | Database Architecture Diagnostic | Claude Code (product-analyst session) | Enterprise-readiness baseline: identify gaps across audit trail, RLS, soft-delete, RBAC, RAG, and LLM observability layers. Triggered by P20 Data Safety & Contamination Recovery planning and future enterprise phases (P8, P12, P17). | [2026-03-27_db-architecture-diagnostic.md](../../claude-audit-reports/2026-03-27_db-architecture-diagnostic.md) |
| 2026-03-31 | AWS Well-Architected Framework Prompt | Claude Code | Reusable prompt for arch-reviewer + security-auditor agents covering all 6 WAF pillars. Run before major releases or quarterly. | [aws-waf-review-prompt.md](aws-waf-review-prompt.md) |
| 2026-04-01 | LinkedIn Scraper Hosting Comparison | Claude Code (arch-reviewer) | Fly.io vs Railway comparison across MVP/Growth/Enterprise phases. Triggered by failed Fly.io migration. Decision: Railway for MVP, Fly.io at >200 MAU, retire scraper at Enterprise. | [linkedin-scraper-hosting-comparison-2026-04-01.md](linkedin-scraper-hosting-comparison-2026-04-01.md) |

---

## Summary of Key Findings (2026-03-27 — DB Diagnostic)

**Overall Readiness: 2.1 / 5**

| Dimension | Score |
|---|---|
| Audit trail coverage | 2/5 |
| Multi-tenancy / RLS | 4/5 |
| Soft delete pattern | 3/5 |
| RBAC (roles + permissions) | 1/5 |
| RAG / vector readiness | 0/5 |
| Agent orchestration | 2/5 |
| LLM observability | 3/5 |
| Enterprise compliance | 2/5 |

**Top 5 immediate actions identified:**
1. Add `created_by` / `updated_by` to all 37 tables — mutations are currently anonymous at the DB layer.
2. Create a persistent `llm_call_logs` table — LLM cost/token data is in-flight only.
3. Replace static role enum with `roles` / `permissions` / `role_permissions` tables.
4. Add `deleted_at` to `sats_learning_roadmaps`, `sats_roadmap_milestones`, `sats_user_notifications` — required for P20 time-bounded delete.
5. Create a unified `audit_logs` table — consolidate three fragmented log tables.

---

## How to Add an Audit Entry

When a new audit is performed, append a row to the registry table above and optionally add a summary section. Save the full report under `claude-audit-reports/YYYY-MM-DD_<audit-type>.md`.
