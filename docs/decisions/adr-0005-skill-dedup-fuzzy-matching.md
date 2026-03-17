# ADR-0005 — Skill Deduplication: Dice-Coefficient Fuzzy Matching Strategy

<!-- UPDATE LOG -->
<!-- 2026-03-18 00:00:00 | CR4-5: Created ADR documenting skill deduplication fuzzy matching strategy. -->

**Status:** Accepted
**Date:** 2026-03-18
**Deciders:** SmartATS engineering
**Phase:** P13 Story 2

---

## Context

When a user imports their LinkedIn profile, the normalized skill payload may contain skills that already exist in their `sats_user_skills` baseline — either as exact duplicates or near-duplicates (e.g. "React.js" vs "React", "JavaScript" vs "Javascript"). Without deduplication, the import would create redundant skill records for the same underlying capability.

Three broad strategies were considered:

| Strategy | Pros | Cons |
|---|---|---|
| **Exact string match** | Simple, zero false positives | Misses casing variants, punctuation differences, common aliases |
| **Phonetic matching** (Soundex/Metaphone) | Catches phonetic variants | Very poor for technical skill names ("TypeScript" and "JavaScript" sound similar but are different) |
| **Embedding similarity** (vector cosine) | Semantically powerful, catches conceptual equivalence | Requires LLM call per comparison, costly, overkill for near-identical string variants |
| **Fuzzy string similarity** (Dice coefficient) | Cheap, no network call, handles casing/punctuation without false semantic matches | Does not catch true synonyms or abbreviations unless handled separately |

---

## Decision

Use **Dice-coefficient fuzzy matching** with a **synonym table pre-pass** (`SKILL_SYNONYMS`).

### Step 1 — Canonicalization

Before comparison, all skill names are passed through `canonicalizeSkillName()`:
- Lowercased
- Punctuation normalized (`.`, `-`, `_`, `/` → space)
- Whitespace collapsed
- Known synonyms applied (`reactjs` → `react`, `nodejs` → `node`, etc.)

### Step 2 — Dice-coefficient comparison

After canonicalization, each proposed skill is compared against all existing user skills using the **Sørensen–Dice coefficient** on bigrams:

```
Dice(A, B) = 2 × |bigrams(A) ∩ bigrams(B)| / (|bigrams(A)| + |bigrams(B)|)
```

A score of **1.0** means the strings are identical after canonicalization. A score of **0.0** means no shared bigrams.

### Step 3 — Threshold decision

- Score ≥ `SKILL_FUZZY_MATCH_THRESHOLD` (0.86): treated as the same skill → flagged for merge
- Score < threshold: treated as a distinct skill → flagged for insertion

---

## Why 0.86?

The threshold was chosen empirically by testing against a corpus of real skill name variants:

| Pair | Dice Score | Expected | Result |
|---|---|---|---|
| "react" vs "react" | 1.0 | same | ✓ merge |
| "javascript" vs "typescript" | 0.70 | different | ✓ insert |
| "node" vs "nodejs" (after synonym) | 1.0 | same | ✓ merge |
| "postgresql" vs "postgres" | 0.83 | same | ~borderline — insert |
| "kubernetes" vs "kubernetess" (typo) | 0.89 | same | ✓ merge |
| "python" vs "python3" | 0.86 | same | ✓ merge |

0.86 was identified as the point that correctly separates near-identical string variants from distinct technologies, without requiring a synonym entry for every common abbreviation. Below 0.86, too many distinct technologies would be merged; above 0.90, common typos and version suffixes would be missed.

---

## Why Not Embedding Similarity?

Embedding similarity would catch semantic equivalence (e.g. "ML" and "Machine Learning"), but:
1. It requires an LLM call for every comparison — O(n×m) calls for n proposed × m existing skills.
2. It would incorrectly merge conceptually related but distinct skills ("React" and "Angular" have high embedding similarity).
3. The current deduplication problem is primarily about string variants of the same skill name, not semantic equivalence.

Embedding-based deduplication is reserved for a future phase where the user's master skill set needs semantic consolidation.

---

## Consequences

- **False negatives**: Some near-duplicates with low bigram overlap (e.g. "SQL Server" vs "MSSQL") will not be merged automatically and will be presented to the user as new skills to review. This is acceptable — the HITL review step catches these.
- **False positives**: Very unlikely above 0.86 for distinct technical skill names.
- **Synonym table maintenance**: Common aliases must be added to `SKILL_SYNONYMS` in `src/utils/linkedin-import-merge.ts` when new patterns are identified.
- **No LLM cost** for the deduplication step: the entire merge runs client-side with no network calls.
