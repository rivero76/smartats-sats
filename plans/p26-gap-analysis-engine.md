# P26 — Gap Analysis Engine

<!-- Status: COMPLETED -->

**Shipped:** 2026-04-05 / 2026-04-06
**Status:** CODE-VERIFIED — RUNTIME-VERIFIED pending real job posting data
**Tier gate:** Pro+ (`gap_analysis` feature key in `usePlanFeature`)
**Branch:** `p20-data-deletion`

---

## What Was Built

A systematic market gap analysis pipeline in 7 phases:

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 0 – Migrations | Role taxonomy (88 families), market signals table, gap snapshot/items tables, profile career goal columns, cert status columns | ✅ Applied |
| 1 – Signal Extraction | `async-ats-scorer` extracts certifications/tools/methodologies/seniority/market_code/role_family_id from staged jobs | ✅ CODE-VERIFIED |
| 2 – Aggregation | `aggregate-market-signals` edge function (nightly, 30d + 90d windows) | ✅ CODE-VERIFIED |
| 3 – Profile Enrichment | Cert status UI in `SkillProfileManager`; Career Goals card in Settings | ✅ CODE-VERIFIED |
| 4 – Gap Matrix | `generate-gap-matrix` edge function + `useGapAnalysis` hook | ✅ CODE-VERIFIED |
| 5 – Roadmap Integration | `generate-upskill-roadmap` accepts `gap_snapshot_id`; `useGenerateRoadmap` mutation | ✅ CODE-VERIFIED |
| 6 – Frontend | `/gap` route, `GapMatrix.tsx`, sidebar entry, help content | ✅ CODE-VERIFIED |

---

## Key Files

**Migrations (9):** `supabase/migrations/20260405100000` → `20260405180000`

**Edge Functions (new):**
- `supabase/functions/aggregate-market-signals/index.ts`
- `supabase/functions/generate-gap-matrix/index.ts`

**Edge Functions (modified):**
- `supabase/functions/async-ats-scorer/index.ts` — signal extraction
- `supabase/functions/generate-upskill-roadmap/index.ts` — gap_snapshot_id input path

**Frontend (new):**
- `src/pages/GapMatrix.tsx`
- `src/hooks/useGapAnalysis.ts`
- `src/hooks/useCareerGoals.ts`
- `src/hooks/useRoleFamilies.ts`
- `src/hooks/usePlanFeature.ts`
- `src/components/CareerGoalsCard.tsx`

**Frontend (modified):**
- `src/hooks/useUpskillingRoadmaps.ts` — `useGenerateRoadmap` mutation + `source_gap_snapshot_id`
- `src/hooks/useSkillProfile.ts` — cert status fields
- `src/components/skill-profile/SkillProfileManager.tsx` — cert status inline editing
- `src/pages/Settings.tsx` — Career Goals card
- `src/App.tsx` — `/gap` route
- `src/components/AppSidebar.tsx` — Gap Analysis nav item

---

## Runtime Validation Sequence

1. `supabase db push` — apply all P26 migrations
2. `bash scripts/ops/gen-types.sh` — regenerate types
3. Deploy: `supabase functions deploy async-ats-scorer aggregate-market-signals generate-gap-matrix`
4. Forward a LinkedIn job alert email to the Postmark inbound address
5. Trigger `async-ats-scorer` — confirm `certifications`, `tools`, `market_code`, `role_family_id` populated in `sats_staged_jobs`
6. POST to `aggregate-market-signals` with service-role key — confirm `sats_market_signals` rows appear
7. Go to `/settings` → set Career Goals (role family + market)
8. Go to `/gap` → click "Refresh Analysis" — gap matrix should render

## Known Risks

- **Role family null rate:** job titles that don't match any alias produce `role_family_id = null` and are excluded from aggregation. Track null rate once real jobs flow.
- **Skill string matching:** `generate-gap-matrix` uses case-insensitive containment matching. "React.js" vs "React" may not match. Requires real-data validation.
- **Chicken-and-egg:** gap matrix returns 404 until `aggregate-market-signals` has been run with real extracted job data. Use seeded `sats_market_signals` rows for UI validation before pipeline is live.
