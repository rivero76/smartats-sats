# Product Roadmap and Change Tracking

**Last Updated:** 2026-02-24
**Vision File:** `product/VISION.md`
**Execution Source:** `PRODUCT_IMPROVEMENTS.md`

## 1) Roadmap Snapshot

| Phase | Status | Priority | Summary |
|---|---|---|---|
| P0 Security + Guardrails | Completed | Done | Logging/security guardrails and admin access hardening delivered. |
| P1 Unified Structured Logging | Completed | Done | Shared schema, centralized logging behavior, and standardization delivered. |
| P2 Correlation + Tracing | Completed | Done | Request ID propagation and duration tracing delivered. |
| P3 Retention + Reliability | Completed | Done | Cleanup automation, retry/backoff, and reliability controls delivered. |
| P4 Observability + Governance | Completed | Done | Admin observability panels, alert checks, immutable audit trail delivered. |
| P5 Enrichment Lifecycle + Deletion Scope | Completed | Done | Enriched experience edit/delete lifecycle and account deletion scope alignment delivered. |
| P6 SDLC Operations + Governance | Completed | Done | `ops/` automation, CI quality gates, docs/secrets checks delivered. |
| P7 Release Version Synchronization | Planned | Medium | Manifest and parity controls across app/runtime/database versions. |
| P8 Global v1 Readiness | Planned | Medium | Multi-user hardening, i18n/l10n, compliance, regional controls. |
| P9 AI Runtime Governance + LLM Ops Analytics | Planned | High | Runtime config governance, telemetry, cost/perf analytics. |
| P10 Prompt Reliability + Model Quality | Completed | Done | Schema-locked outputs, fallback/retry controls, eval gate tooling delivered. |
| P11 JD ETL + Market Intelligence | In Progress | Highest | Text/URL foundation is in place; broader ingestion + analytics pipeline remains. |
| P12 Multi-language + Cloud + Enterprise Scale | Planned | High | Cloud migration/scaling and enterprise architecture readiness. |
| P13 LinkedIn Ingestion Loop Upgrade | Planned | Highest | Move from LinkedIn URL storage to parsed profile ingestion into skills/experience tables. |
| P14 Proactive Search Engine | Planned | Highest | Background discovery/scoring pipeline with user notifications for `>60%` matches. |
| P15 Upskilling Roadmap Engine | Planned | High | Convert missing-skill outputs into step-by-step learning plans. |

## 2) Strategic Assessment (From Technical Audit)
1. Current strength: advanced trust-first ATS matcher with evidence-grounded AI outputs.
2. Current gap: still mostly "bring your own job" workflow; 60% threshold is not yet an automated trigger.
3. Current onboarding gap: LinkedIn flow stores URL but does not yet ingest structured profile data.
4. Strategic direction: preserve trust layer and add proactive orchestration in the next sprint sequence.

## 3) Now, Next, Later

### Now
1. P13 delivery (1-2 weeks): LinkedIn structured ingestion into `sats_user_skills` and `sats_skill_experiences`.
2. Define ingestion mapping, merge rules, and quality checks for initial profile baseline.
3. Bugfix `BUG-2026-02-24-ENRICH-SCROLL`: restore reliable vertical scrolling in AI Experience Enrichment modal for multi-suggestion review flows.

### Next
1. P14 delivery (3-4 weeks): asynchronous search/ingestion/scoring worker for `>60%` opportunity alerts.
2. Establish source policy (aggregator API and/or compliant scraping), dedupe, and notification mechanics.

### Later
1. P15 delivery (4-6 weeks): generate actionable upskilling plans from gap outputs.
2. Continue P9, P8, and P12 platform programs after orchestration core is in motion.

## 4) Feature Lifecycle Register
| Feature | Status (Idea/Planned/In Progress/Live) | Category (Core/AI/Data/Platform) | User Value | Primary Tech Owner | Dependencies | Target Release |
|---|---|---|---|---|---|---|
| Proactive >60% Job Discovery | Planned | Core + AI + Data | Show only high-fit opportunities | TBD | Async job collector + ATS scoring queue + notifications | 3-4 weeks |
| LinkedIn Structured Ingestion | Planned | Core + Data | Faster onboarding, richer profile baseline | TBD | Profile parser + merge engine + consent controls | 1-2 weeks |
| Skill-Gap Roadmap | Planned | AI | Actionable upskilling plan | TBD | Gap-to-plan prompting + progress tracking | 4-6 weeks |
| LLM Career Questionnaire | Planned | AI/Product | Personalize role pathing | TBD | Questionnaire schema + inference | TBD |
| Enrichment Modal Scroll Reliability (`BUG-2026-02-24-ENRICH-SCROLL`) | Planned | Core UX | Ensure all generated suggestions/actions are reachable in modal review | TBD | `Dialog` height/overflow constraints + scroll affordance tuning | Next patch |
| JD ETL Text + URL Ingestion | Live | Core + Data | Faster job input with URL fallback | TBD | URL ingest edge function + metadata fields | Current |
| JD ETL Multi-Channel Ingestion (`P11.1-P11.6`) | In Progress | Data Platform | Higher ingestion scale and coverage | TBD | File pipelines + ingestion queue + QA workflow | TBD |

## 5) Change Log (Roadmap-Level)
| Date | Version | Change Type | Summary | Why | Owner | Linked PR/Issue |
|---|---|---|---|---|---|---|
| 2026-02-24 | v0.4 | Bug Intake | Added `BUG-2026-02-24-ENRICH-SCROLL` to Now backlog and feature register for enrichment modal usability | Track blocking UX defect in sprint planning view | TPM/Architecture | TBD |
| 2026-02-24 | v0.3 | Strategy Sync | Ingested PM strategy assessment and introduced sprint sequence P13-P15 (LinkedIn ingestion, proactive search, upskilling roadmap) | Align roadmap with audit-driven priorities | TPM/Architecture | TBD |
| 2026-02-24 | v0.2 | Sync Update | Synced roadmap phase statuses with `PRODUCT_IMPROVEMENTS.md` and split into Now/Next/Later | Keep roadmap aligned with delivery reality | TPM/Architecture | TBD |
| 2026-02-24 | v0.1 | Baseline | Established initial roadmap structure after document split | Create product planning baseline | TPM/Architecture | TBD |

## 6) Decision Log (Architecture/Product)
| Date | Decision | Options Considered | Chosen Option | Impact | Revisit Trigger |
|---|---|---|---|---|---|
| YYYY-MM-DD | Example: URL ingestion strategy | crawler vs single-page fetch | single-page fetch | lower legal/risk surface, lower coverage | need broader source coverage |

## 7) KPI Tracking
| KPI | Definition | Current | Target | Cadence | Owner |
|---|---|---|---|---|---|
| ATS Analysis Completion Rate | completed analyses / started analyses | TBD | TBD | Weekly | TBD |
| High-Match Opportunity Rate | opportunities with score >= 60% / total discovered | TBD | TBD | Weekly | TBD |
| Skill Gap Closure Rate | gaps resolved over 30/60/90 days | TBD | TBD | Monthly | TBD |
| Enrichment Acceptance Rate | accepted or edited suggestions / generated suggestions | TBD | TBD | Weekly | TBD |

## 8) Update Protocol
1. Update phase status in Section 1 from `PRODUCT_IMPROVEMENTS.md` evidence.
2. Refresh Now/Next/Later in Section 2.
3. Update feature statuses in Section 3.
4. Append roadmap-level change in Section 4.
5. Keep detailed implementation notes in `PRODUCT_IMPROVEMENTS.md` only.
