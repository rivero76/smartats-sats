# Technical Spec: LLM Model Governance and Change Protocol

<!-- UPDATE LOG -->
<!-- 2026-03-17 00:15:00 | Created. Documents model selection rationale, change procedure, and required
     test protocol for any future LLM model upgrade. Triggered by switch from gpt-4.1 to o4-mini for
     ATS scoring and introduction of seed-based determinism. -->

## 1. Purpose

This spec defines how LLM models are selected, configured, and validated for each task in the SATS
platform. Any model change — including provider switches, version upgrades, or per-task reconfiguration —
must follow this protocol. The ATS score is the core trust signal for users; instability in that score
is a product-level defect.

---

## 2. Model Register

| Task | Env var | Current model | Fallback | Temperature | Seed |
|---|---|---|---|---|---|
| ATS scoring (baseline) | `OPENAI_MODEL_ATS` | `o4-mini` | `gpt-4.1` | `0` | `42` |
| CV Optimisation Score | (same as ATS) | `o4-mini` | `gpt-4.1` | `0` | `42` |
| Skill enrichment | `OPENAI_MODEL_ENRICH` | `gpt-4.1-mini` | `gpt-4o-mini` | `0.3` | — |
| Upskilling roadmap | `OPENAI_MODEL_ROADMAP` | `gpt-4.1-mini` | `gpt-4o-mini` | `0.3` | — |
| LinkedIn profile parse | `OPENAI_MODEL_LINKEDIN` | `gpt-4.1-mini` | `gpt-4o-mini` | `0.1` | — |

> Seed is only used for scoring tasks where determinism matters. Creative/generative tasks (enrichment,
> roadmaps) intentionally use no seed to allow variation across calls.

---

## 3. Why o4-mini for ATS Scoring

Switched from `gpt-4.1` to `o4-mini` on 2026-03-17. Rationale:

- **Reasoning models think step-by-step before outputting JSON.** For a multi-weighted rubric
  (`skills_alignment 40%`, `experience_relevance 30%`, `domain_fit 20%`, `format_quality 10%`),
  this produces more consistent per-dimension scores and reduces criterion-skipping.
- **Temperature `0` + seed `42` eliminates run-to-run variance.** Identical inputs now produce
  identical scores — a requirement for user trust in a scoring product.
- **Async architecture absorbs latency.** The function returns HTTP 202 immediately; the score
  arrives via Supabase Realtime. `o4-mini`'s higher latency (~8–15s vs ~3–6s for `gpt-4.1`) has
  no visible UX impact.
- **Cost is ~2× `gpt-4.1-mini` but justified.** ATS scoring is the core value proposition.
  Enrichment and roadmaps use `gpt-4.1-mini` where creative variance is acceptable.

---

## 4. Model Change Protocol

Follow this protocol for **any** change to a model in the register above. A model change is:
- Switching model family (`gpt-4.1` → `o4-mini`)
- Upgrading within a family (`o4-mini` → `o3`)
- Changing provider (`openai` → alternative via `SATS_LLM_PROVIDER`)
- Changing temperature or seed for a scoring task

### 4.1 Pre-change baseline capture

Before making the change, run **all three** baseline captures on the current model:

**Baseline Set A — Determinism test** (run 3 times on the same resume + JD):
```
Resume: <your primary test resume>
JD: <a known JD with a clear seniority and skill profile>
Expected: all three ats_score values must be within ±2pp of each other
```
Record: `run1_score`, `run2_score`, `run3_score`, `score_variance_pp`

**Baseline Set B — Rubric consistency test** (5 diverse resume+JD pairs):
For each pair record: `ats_score`, `score_breakdown` (all 4 dimensions), `keywords_missing`
Expected: `keywords_missing` should be stable for the same pair across runs.

**Baseline Set C — Edge case test**:
- Very strong match (expected score ≥ 85%): confirm model scores high
- Very weak match (expected score ≤ 30%): confirm model scores low
- Resume with no relevant experience: confirm `resume_warnings` is non-empty

### 4.2 Apply the change

1. Update the relevant `OPENAI_MODEL_*` env var in Supabase project `nkgscksbgmzhizohobhg`
2. Update the default in the edge function code (`ats-analysis-direct/index.ts`)
3. Update `MODEL_PRICING_USD` in `_shared/llmProvider.ts` if the new model is not already listed
4. Deploy: `supabase functions deploy ats-analysis-direct`

### 4.3 Post-change validation

Repeat **all three baseline sets** on the new model. Compare against pre-change results.

**Pass criteria** — all must be met before merging:

| Test | Pass condition |
|---|---|
| Determinism (Set A) | All 3 runs within ±2pp of each other |
| Rubric direction (Set B) | Same skills appear in `keywords_missing` as pre-change for ≥ 4/5 pairs |
| Score ranking preserved (Set B) | Relative ranking of the 5 pairs is unchanged (strongest → weakest) |
| Edge cases (Set C) | Strong match still scores ≥ 85%; weak match still scores ≤ 30% |
| No regressions in warnings | `resume_warnings` count does not increase for previously clean resumes |
| CV Optimisation direction | `cv_optimisation_score` ≥ `ats_score` when accepted enrichments exist |

**Regression threshold**: If any pair's `ats_score` shifts by more than **8pp** vs the pre-change
baseline, investigate before releasing. This is not an automatic block — some shift is expected when
moving model families — but it requires a documented explanation.

### 4.4 Post-change documentation

After validation passes, update this document:
1. Update the Model Register table (Section 2)
2. Add an entry to the Change Log (Section 6)
3. Update `docs/changelog/CHANGELOG.md` and `docs/changelog/SATS_CHANGES.txt`
4. Update `docs/releases/UNTESTED_IMPLEMENTATIONS.md` with the E2E pending entry

---

## 5. Determinism Configuration

ATS scoring uses `temperature: 0` + `seed: 42` on all calls.

**What this guarantees**: identical `(resume_text, jd_text, model_version)` tuples will produce
identical output. OpenAI's seed guarantee is best-effort per their documentation; in practice,
variance with seed+temperature-0 is negligible (< 1pp).

**What this does not guarantee**: if the model is upgraded (e.g. `o4-mini-2025-04-16` →
`o4-mini-2025-07-01`), scores will change even with the same seed — this is a silent model version
change on OpenAI's end and is expected. The `model_used` field in `analysis_data` will reflect the
actual version served.

**Overriding the seed** for testing: set `OPENAI_ATS_SEED` to any integer in Supabase secrets.
Set to a different value to verify that output changes, confirming seed is being respected.

---

## 6. Change Log

| Date | Change | Pre-change model | Post-change model | Validated by | Notes |
|---|---|---|---|---|---|
| 2026-03-17 | Initial switch + determinism | `gpt-4.1`, temp=0.1, no seed | `o4-mini`, temp=0, seed=42 | Pending E2E | See UNTESTED_IMPLEMENTATIONS.md |
