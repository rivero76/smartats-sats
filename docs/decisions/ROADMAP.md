<!-- UPDATE LOG -->
<!-- 2026-04-07 | Created — visual product roadmap in professional PM format, with agent references and saas-advisor checkpoints. Derived from product-roadmap.md (technical detail) and the SaaS Podcast advisory guide. -->
<!-- 2026-04-12 | Add P-INTERVIEW — Interview Intelligence (S1+S2 shipped). -->

# SmartATS — Product Roadmap

**Last updated:** 2026-04-12
**Owner:** Founder
**Technical detail:** [`docs/decisions/product-roadmap.md`](product-roadmap.md) (dense reference doc — use this file for strategy, that file for implementation detail)
**Advisory guide:** [`docs/advisory/2026-04-07_saas-podcast-advisory-guide.md`](../advisory/2026-04-07_saas-podcast-advisory-guide.md)
**Plan conventions:** [`docs/conventions/plan-conventions.md`](../conventions/plan-conventions.md)

---

## Product Vision

> SmartATS is the only AI career intelligence platform that explains _why_ you're being rejected and gives you a personalised path to change it — not just a score, but a plan.

**Stage today:** Pre-commercial. Technically sophisticated. No paying customers yet.
**6-week critical path to soft launch:** Billing (P22) → Feature Gating (P23) → Self-Service Onboarding (P24)
**Moat:** Explainable AI + governance quality — not speed or volume.

---

## Tiers

| Tier           | Price  | ICP                                                           |
| -------------- | ------ | ------------------------------------------------------------- |
| **Free**       | $0     | Job seekers exploring the product                             |
| **Pro**        | $19/mo | Active job seekers running multiple analyses                  |
| **Max**        | $39/mo | Power users: gap analysis, profile fit, roadmaps              |
| **Enterprise** | $99/mo | Career coaches, university career centers, outplacement firms |

---

## Status Legend

| Badge              | Meaning                                  |
| ------------------ | ---------------------------------------- |
| ✅ **DONE**        | Shipped and E2E validated                |
| 🔄 **IN PROGRESS** | Active development or validation pending |
| 🚧 **PLANNED**     | Approved, not yet started                |
| 🔒 **BLOCKED**     | Hard dependency on another phase         |
| 💡 **IDEA**        | Under consideration — not yet approved   |

---

## Now — Pre-Commercial Launch (Weeks 1–6)

> **Goal:** First paying customer. Billing live. Feature gates enforced. Pricing page exists.
> **saas-advisor phase:** Phase 1 (Validation) → Phase 2 (Pricing) → Phase 3 (First 10 Customers)

### 🚧 P22 — Billing & Subscription Infrastructure

**Priority:** HIGHEST | **Tier:** All | **Branch:** TBD | **Plan:** TBD

|                 |                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Problem**     | No revenue is possible without payment infrastructure. Today every user accesses every feature at zero cost. |
| **Solution**    | Stripe integration: subscription lifecycle, webhook handling, billing portal.                                |
| **Done when**   | A job seeker can pay $19/month via Stripe and their Pro features activate immediately.                       |
| **Blocker for** | P23, P24 — nothing can be gated until billing state is reliable                                              |

**saas-advisor checkpoint:** Ask Phase 2 questions before building the pricing page. Specifically: _willingness-to-pay validation, tier presentation for four tiers on one page, whether the $19/$39 split is evidence-based._

**Agents to run:**
`saas-advisor` → `plan-decomposer` → `migration-writer` → `arch-reviewer` → `test-runner` → `release-gatekeeper`

---

### 🚧 P23 — Feature Gating Enforcement

**Priority:** HIGHEST | **Tier:** All | **Branch:** TBD | **Depends on:** P22

|               |                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Problem**   | `sats_tenant_features` schema exists but enforcement is not wired. Every user accesses every feature today — unlimited LLM cost, no upgrade incentive. |
| **Solution**  | Wire plan checks into frontend guards and edge function entry points. Wire rate limit counters for free tier caps.                                     |
| **Done when** | A Free user who triggers a Pro feature sees an upgrade CTA, not the feature.                                                                           |

**Agents to run:** `plan-decomposer` → `arch-reviewer` → `security-auditor` → `test-runner`

---

### 🚧 P24 — Self-Service Onboarding & Pricing Page

**Priority:** HIGHEST | **Tier:** All | **Branch:** TBD | **Depends on:** P22 + P23

|               |                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Problem**   | Users cannot discover tiers, understand value, or self-upgrade. No pricing page exists.                            |
| **Solution**  | Public pricing page, account tier display in Settings, upgrade CTAs at feature gates, post-signup onboarding flow. |
| **Done when** | A new user can sign up, understand the tier structure, and upgrade to Pro without contacting the founder.          |

**saas-advisor checkpoint:** Ask Phase 4 questions (activation and onboarding) before designing the onboarding flow. Specifically: _the demo resume analysis concept, the "actively searching vs. strategically upskilling" segmentation question, the North Star activation metric._

**Agents to run:** `saas-advisor` → `product-analyst` → `component-scaffolder` → `help-content-writer` → `landing-page-writer`

---

## Next — Commercial Launch Gate (Weeks 3–8)

> **Goal:** 10 paying customers. Repeatable acquisition channel started. Churn rate visible.
> **saas-advisor phase:** Phase 3 (First 10 Customers) → Phase 4 (Activation)

### 🔄 P13 — LinkedIn Ingestion Loop (Story 3 pending)

**Priority:** HIGHEST | **Tier:** Pro+ | **Branch:** p13 | **Plan:** `plans/p14.md`

|               |                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------- |
| **Status**    | Stories 1–2 shipped. Story 3 (HITL Review UI) and E2E validation pending.                           |
| **Remaining** | `ProfileImportReviewModal.tsx` + Settings import button + E2E validation pass                       |
| **Done when** | User can import LinkedIn profile, review a diff of changes, and approve or reject before DB writes. |

---

### 🔄 P14 — Proactive Search Engine

**Priority:** HIGHEST | **Tier:** Pro+ | **Branch:** p14 | **Plan:** `plans/p14.md`

|               |                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| **Status**    | Core async pipeline and Opportunities UI delivered. Release-blocked on E2E validation.                |
| **Remaining** | E2E validation: token renewal, threshold notification fire, opportunities feed populated.             |
| **Done when** | A Pro user receives a notification when a job above their 60% match threshold is found automatically. |

---

### 🔄 P15 — Upskilling Roadmap Engine

**Priority:** HIGH | **Tier:** Pro+ | **Plan:** see roadmap |

|               |                                                                                      |
| ------------- | ------------------------------------------------------------------------------------ |
| **Status**    | Stories 1–3 shipped (schema, generation, UI). Release-blocked on E2E validation.     |
| **Remaining** | Migration application, tenant-isolation checks, function invocation, UI persistence. |

---

### 🔄 P18 — CV Optimisation Score

**Priority:** HIGH | **Tier:** Pro+ |

|               |                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| **Status**    | S1 (data model), S2 (ATS enrichment projection), S3 (UI panel) all implemented. E2E validation pending. |
| **Done when** | User sees projected ATS score improvement if they apply accepted enrichments to their CV.               |

---

### 🔄 P26 — Gap Analysis Engine

**Priority:** HIGH | **Tier:** Pro+ | **Plan:** `plans/p26-gap-analysis-engine.md`

|            |                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| **Status** | CODE-VERIFIED. RUNTIME-VERIFIED pending real job signal data.                                               |
| **Scope**  | 5 markets (NZ/AU/UK/BR/US), 88 role families, market signal aggregation, on-demand gap matrix, `/gap` page. |

---

### 🔄 P28 — LinkedIn Profile Fit Analyzer

**Priority:** HIGH | **Tier:** Pro+ (score) / Max+ (reconciliation + history) | **Plan:** `plans/p28-linkedin-profile-fit-analyzer.md`

|            |                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **Status** | RUNTIME-VERIFIED. Test 9 (scraper enrichment) pending Railway LinkedIn credentials.                                   |
| **Scope**  | 0–100 fit score against market signals, per-gap recommendations, reconciliation (LinkedIn vs. resume), history chart. |

---

### ✅ P29 — MVP Upgrade Request Flow

**Priority:** HIGH | **Tier:** Free (submit) / Admin (approve) | **Plan:** `plans/p29-mvp-upgrade-requests.md`

|            |                                                                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | COMPLETED — CODE-VERIFIED 2026-04-08. E2E runtime validation pending migration deploy.                                                                                                                                                                                            |
| **Scope**  | `sats_upgrade_requests` table + RLS, atomic `sats_approve_upgrade_request()` RPC, `request-plan-upgrade` edge function (Resend email), `UpgradeRequestModal` user-facing component, `UpgradeRequestsPanel` admin panel with approve/deny, Admin Dashboard tab with pending badge. |

---

### 🔄 P-INTERVIEW — Interview Intelligence

**Priority:** HIGH | **Tier:** Pro+ (MVP) · Max+ (Employee Signals, Full Vision) | **Plan:** `plans/p-interview-intelligence.md` (brainstorm) · `plans/concurrent-knitting-crescent.md` (PM discovery)

|            |                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status** | S1+S2 SHIPPED 2026-04-12 — CODE-VERIFIED. E2E runtime validation pending edge function deploy.                                                                                                                                                                                                         |
| **Scope**  | 3-call sequential LLM pipeline (company research → role decode → question bank + STAR scaffolds). All 5 question categories (behavioural, gap-bridge, role-specific, company values, technical deep-dive). 24h rate limit. Graceful degradation. Entry from ATS Analyses card. `/interview-prep` page. |
| **Next**   | S3: Two-table shared architecture (triggered when ≥3 users on same JD). S4: Proactive pre-generation. S5: Employee Signal Panel (Railway scraper expansion).                                                                                                                                           |

---

## Later — Post-Launch Growth

> **Goal:** 100 paying customers. ICP defined. One repeatable acquisition channel. Enterprise motion beginning.
> **saas-advisor phase:** Phase 5 (Churn) → Phase 6 (Growth) → Phase 7 (Enterprise)

### 🚧 P17 — BYOK + Model Selection

**Priority:** HIGH | **Tier:** Max+ / Enterprise |

|             |                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| **Why now** | Enterprise buyers treat BYOK as baseline. Closes the enterprise sales gap without a pricing redesign.              |
| **Scope**   | Per-user model preference (S1), BYOK encrypted key storage via Supabase Vault (S2), AI opt-out toggle / GDPR (S3). |

**saas-advisor checkpoint:** Ask Phase 7 questions about enterprise motion. Is BYOK a buying criterion for career coaches and university career centers, or only for larger enterprise buyers?

---

### 🚧 P16 — Career Fit & Live Job Discovery

**Priority:** HIGHEST | **Tier:** Pro+ |

|              |                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**    | Persona model, resume storage security upgrade, profile reconciliation engine, live job discovery (JSearch/Adzuna), career fit AI suggestions, `/career-fit` UI, skill gap → roadmap bridge. |
| **Sequence** | S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 (each gates the next)                                                                                                                                  |
| **Spec**     | `docs/specs/product/p16-career-fit-live-job-discovery.md`                                                                                                                                    |

---

### 🚧 P-CAT — Career Aspirations Tracker

**Priority:** HIGH | **Tier:** Pro+ / Max+ |

|                   |                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why**           | Strongest marketing narrative for Max tier: "SmartATS doesn't just score your resume — it shows you what the next 5 years of your career should look like." |
| **Scope**         | Two time horizons (6–12 months / 2–5 years), readiness %, coach + mentor nudge, living tracker that recalculates as profile grows.                          |
| **Pre-requisite** | P26 infrastructure is already live — P-CAT can start with S1 directly.                                                                                      |
| **Plan**          | `plans/p-career-aspirations-tracker.md`                                                                                                                     |

**saas-advisor checkpoint:** Ask Phase 6 questions (positioning). How do we make "career trajectory intelligence" legible in 30 seconds on a landing page to a B2C buyer who is comparing us to free tools?

---

### 💡 P9 — AI Runtime Governance & LLM Ops Analytics

**Priority:** HIGH | **Tier:** Internal / Enterprise |
Cost/performance analytics, runtime model config governance, telemetry dashboards.

### 💡 P8 — Global v1 Readiness

**Priority:** MEDIUM |
Multi-user hardening, i18n/l10n, compliance, regional controls.

### 💡 P12 — Multi-Language + Cloud + Enterprise Scale

**Priority:** HIGH |
Cloud migration/scaling and enterprise architecture readiness. Dependency: stable commercial core.

### 💡 DX-1 — Claude Code Developer Tooling

**Priority:** LOW | **Tier:** Internal |
Supabase MCP, GitHub MCP, additional Claude Code skills. Developer experience only.

---

## Quarterly OKRs (Q2 2026)

| Objective                               | Key Result                                           | Status |
| --------------------------------------- | ---------------------------------------------------- | ------ |
| Ship billing and generate first revenue | P22 live, first paid conversion                      | 🚧     |
| Validate product-market fit             | 10 paying customers, ≥5 retained at month 2          | 🚧     |
| Establish one acquisition channel       | >50% of signups from a repeatable, non-manual source | 🚧     |
| Close all E2E validation blockers       | 0 open UNTESTED_IMPLEMENTATIONS items                | 🔄     |

---

## Agent Execution Flow for New Plans

When adding a new phase to this roadmap, always follow this sequence:

```
1. saas-advisor     → Strategic validation: does this belong at our current stage?
2. product-analyst  → User stories + acceptance criteria
3. plan-decomposer  → Technical decomposition into stories
4. arch-reviewer    → Plan review before implementation
5. [implement]
6. test-runner      → All tests pass
7. help-content-writer → /help page updated
8. landing-page-writer → Marketing pages updated (if pricing/feature copy changes)
9. changelog-keeper → CHANGELOG.md updated
10. release-gatekeeper → Final release readiness
```

See [`docs/conventions/plan-conventions.md`](../conventions/plan-conventions.md) for the full plan format, required sections, agent checklists, and the plan template.

---

## References

| Resource                 | Location                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Technical roadmap detail | [`docs/decisions/product-roadmap.md`](product-roadmap.md)                                                          |
| Product vision           | [`docs/decisions/product-vision.md`](product-vision.md)                                                            |
| Plan format standard     | [`docs/conventions/plan-conventions.md`](../conventions/plan-conventions.md)                                       |
| SaaS advisory guide      | [`docs/advisory/2026-04-07_saas-podcast-advisory-guide.md`](../advisory/2026-04-07_saas-podcast-advisory-guide.md) |
| Active plans             | [`plans/`](../../plans/)                                                                                           |
| Release blockers         | [`docs/releases/UNTESTED_IMPLEMENTATIONS.md`](../releases/UNTESTED_IMPLEMENTATIONS.md)                             |
| Changelog                | [`docs/changelog/CHANGELOG.md`](../changelog/CHANGELOG.md)                                                         |
| All agents               | [`.claude/agents/`](../../.claude/agents/)                                                                         |
