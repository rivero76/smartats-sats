# ADR-0003 — Two-Call Isolation for ATS Scoring and CV Optimisation (P18)

<!-- UPDATE LOG -->
<!-- 2026-03-18 00:00:00 | CR4-3: Created ADR documenting two-call isolation pattern for P18 CV Optimisation. -->

**Status:** Accepted
**Date:** 2026-03-18
**Deciders:** SmartATS engineering
**Phase:** P18

---

## Context

P18 introduced CV Optimisation Score: an LLM-powered projection of what an ATS score _could be_ if the user applied the suggested improvements to their resume. This projection runs in the same code path as the base ATS analysis (`ats-analysis-direct`).

The naive implementation would be to include the enrichment context (suggested improvements, career-fit signals) in a single combined LLM prompt that returns both the base score and the optimised projection together.

---

## Decision

P18 uses **two separate, sequential `callLLM()` calls**:

1. **Call 1 — Base ATS Score**: Pure scoring prompt. Receives only the resume text and job description. No enrichment context. No knowledge of what improvements may be suggested. Returns the raw ATS score and gap analysis.

2. **Call 2 — CV Optimisation Projection**: Receives the output of Call 1 (base score, gap analysis) plus the enrichment context (suggested improvements, upskilling roadmap signals). Returns the projected score if improvements are applied.

The two calls are never merged into a single prompt.

---

## Rationale: Why a Single Combined Call Was Rejected

### Contamination risk

If enrichment context is present in the same prompt used to generate the base score, the model may unconsciously inflate the base score by anchoring on the "improved" version of the candidate. This produces a base score that does not reflect the actual resume — it reflects the improved resume. The user then sees an overly optimistic baseline, defeating the purpose of ATS scoring.

**Contamination in this context means**: the base score being influenced by information about the _improved_ resume rather than the _submitted_ resume.

### Reproducibility

Call 1 uses `temperature: 0` and a deterministic seed. The same resume + job description must always produce the same base score. If enrichment context changes between runs (e.g. new roadmap milestones), a single-call approach would produce different base scores for identical inputs.

### Separation of concerns

The base ATS score is a factual assessment. The CV Optimisation Score is a projection. Keeping them in separate calls makes the boundary explicit and testable: Call 1 can be regression-tested independently of Call 2.

---

## How the Two-Call Pattern Is Enforced

- `ats-analysis-direct/index.ts` runs Call 1 unconditionally.
- Call 2 is only invoked if enrichment context exists in the database for the user.
- The result of Call 1 is passed to Call 2 as read-only input — Call 2 cannot modify the base score.
- The frontend (`useDirectATSAnalysis.ts`, `ATSDebugModal.tsx`) displays base score and CV optimisation score as distinct fields; they are never summed or averaged.

---

## Consequences

- **Two LLM API calls per enriched analysis** — increases per-analysis cost by ~30-50% for users with enrichment context. Accepted as the price of correctness.
- **Latency additive** — sequential calls add ~1-3s to analysis time. Acceptable for a user-triggered workflow.
- **No single-call optimisation path** — a future "fast mode" that collapses to one call must be explicitly approved via a new ADR and must include a contamination risk assessment.
