# Untested Implementations and Release Blockers

## Purpose
Track changes that are implemented but not fully validated. Any item listed here is a release blocker for end-user rollout until required tests are completed.

## Rule
1. If implementation is complete but testing is partial/incomplete, add an entry here immediately.
2. Mark release status as `BLOCKED`.
3. Remove or close the entry only after required tests pass.

## Open Blockers
| Date | Change | Status | Missing Tests | Owner | Required Before Release |
|---|---|---|---|---|---|
| 2026-02-24 | P14 Story 1 (`fetch-market-jobs`) deployment | BLOCKED | Scheduled cron execution verification and staging dedupe behavior validation in production-like run cadence | TBD | Confirm cron runs, validate staged row lifecycle and dedupe outcomes over repeated runs |
| 2026-02-24 | P14 Story 2 (`async-ats-scorer`) deployment | BLOCKED | End-to-end authenticated invocation and data-flow validation (`sats_staged_jobs` -> `sats_job_descriptions` -> `sats_analyses`) under real JWT/session context | TBD | Run E2E test pass and confirm logs + DB outputs |
| 2026-02-24 | P14 Story 3 (threshold + notifications) deployment | BLOCKED | Threshold resolution validation (`profiles.proactive_match_threshold` override vs global default) and deduped notification behavior (`sats_user_notifications`) | TBD | Run E2E tests confirming only above-threshold matches notify and duplicates are prevented |
| 2026-02-24 | P14 Story 4 (`/opportunities` UI dashboard) implementation | BLOCKED | UI end-to-end validation with real proactive data, threshold filtering behavior, and external URL navigation checks | TBD | Validate dashboard cards against seeded/real proactive analyses and confirm ordering + content rendering |
| 2026-02-24 | Enrichment modal scroll reliability fix (`BUG-2026-02-24-ENRICH-SCROLL`) | BLOCKED | Manual UI validation on desktop/mobile viewports for full modal-body scroll and suggestion-list scroll behavior | TBD | Confirm all generated suggestions and action buttons are reachable, scrollbar is visible/discoverable, and no clipped controls in `AI Experience Enrichment` modal |
| 2026-02-24 | ATS analyses auto-refresh UX improvement (processing state stays at 60% until manual refresh) | BLOCKED | End-to-end UI verification that processing analyses transition to completed state without browser reload; validate polling + realtime fallback behavior under normal and delayed realtime scenarios | TBD | Confirm `ATS Analyses` page auto-updates completed cards, live-status indicator/last-sync timestamp render correctly, and manual `Refresh` works as fallback |
| 2026-02-25 | P15 Story 1 (`sats_learning_roadmaps` + `sats_roadmap_milestones` schema and RLS) | BLOCKED | Migration execution and tenant-isolation verification for roadmap and milestone CRUD under authenticated ownership boundaries | TBD | Apply migration `20260225001000_add_p15_upskilling_roadmap_schema.sql`; validate owner-only SELECT/INSERT/UPDATE/DELETE and cross-tenant denial checks |
| 2026-02-25 | P15 Story 2 (`generate-upskill-roadmap` edge function) implementation + deployment | BLOCKED | Authenticated function invocation validation, strict JSON output contract verification (including mandatory portfolio `project` milestone), and persistence checks for `sats_learning_roadmaps` / `sats_roadmap_milestones` | TBD | Run E2E call from authenticated UI/session, verify returned `roadmap_id`, confirm milestone ordering + project milestone, and validate ownership-bound inserts in DB |
| 2026-02-25 | Help Hub page (`/help`) UI implementation | BLOCKED | Manual navigation and usability validation: sidebar entry, route render, topic search/filter behavior, and deep-link navigation to related pages | TBD | Verify `/help` loads for authenticated users, search results are accurate, and each actionable topic button routes correctly |

## Closure Template
| Date Closed | Change | Evidence | Closed By |
|---|---|---|---|
| 2026-02-24 | Enrichment edge compatibility fix (`enrich-experiences`) | Deployed to project `nkgscksbgmzhizohobhg`; direct function invocation returned `HTTP 200` and `success: true` with suggestions (`request_id=manual-test-20260224c`) | Codex |
| 2026-02-24 | Enriched experience soft-delete RLS fix (delete flow stability) | User-verified logs show repeated `enrichment.deleted` success events with no new RLS failures in latest window (`request_id`s include `enrich-delete-ee15b057-7a86-4601-a5a5-dfc7b012ceff`, `enrich-delete-26b8c887-0ffa-4031-855a-d88d3acb922d`) | Codex |
| YYYY-MM-DD | Change name | test report / SQL verification / logs | Name |
