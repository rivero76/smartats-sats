# Bug Backlog

<!--
  This file tracks active code defects — reproducible issues tracked against source changes.
  Operational/deployment incidents live in docs/incidents/ instead.

  Extracted from plans/product-improvements.md §1C on 2026-03-18.
  Update status here as bugs are fixed; add a link to the fix commit when resolved.
-->

## Status Key

- `OPEN` — not yet addressed
- `IN PROGRESS` — being worked
- `FIXED` — resolved; commit linked
- `WONT FIX` — accepted, documented reason

---

## BUG-2026-02-24-ENRICH-SCROLL · Enrichment modal has no effective vertical scroll

**Status:** OPEN
**Severity:** High — blocks core UX for reviewing/saving all suggestions
**Priority:** P1 (next UI bugfix batch)

**Affected files:**

- `src/components/EnrichExperienceModal.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/scroll-area.tsx`

**Current behavior:**
After generating multiple suggestions, lower content in the modal becomes partially inaccessible. Users do not see an obvious/usable scrollbar for navigating the whole modal. Action controls for later suggestions can be clipped below viewport on common laptop resolutions.

**Expected behavior:**
Modal remains fully navigable on desktop and mobile breakpoints. Users can always scroll through all generated suggestions and reach all action buttons. Scroll affordance is visible and discoverable.

**Reproduction steps:**

1. Open `Enriched Experiences` and launch `AI Experience Enrichment`.
2. Select an ATS analysis with enough matched/missing skills to produce multiple suggestions.
3. Click `Generate Suggestions`.
4. Attempt to navigate to the final suggestions and their action controls.
5. Observe that full content cannot be reliably reached or scrollbar is not apparent for the full modal context.

**User impact:**
Prevents completion of review workflow (`Save Experience` / `Reject`) for all generated items. Creates impression that content is missing or app is frozen. Increases abandonment risk on a key product differentiator (trust-first enrichment review).

**Root-cause hypothesis:**

- `DialogContent` has no viewport height cap + no dedicated outer modal scroll container.
- Nested scrolling is limited to suggestion list (`ScrollArea max-h-[360px]`) while other sections still expand total modal height.
- Scrollbar styling/visibility in `ScrollArea` is subtle and can be missed.

**Proposed fix direction:**

1. Constrain modal container height to viewport (`max-h`), make modal body scrollable.
2. Keep suggestion list scroll bounded but rebalance heights to reduce nested-scroll friction.
3. Improve scrollbar visibility/affordance for discoverability.
4. Validate behavior on both `localhost:3000` and `localhost:8080` across desktop/mobile widths.

**Acceptance criteria:**

1. User can reach all suggestion cards and all action buttons in one modal session.
2. Vertical scrolling is consistently available for long content.
3. No clipped controls at 1366x768 and common mobile viewport sizes.
4. Existing enrichment actions (generate/edit/save/reject/batch) remain functional.

**Testing requirements before release:**

1. Manual UI test with 8+ suggestions generated.
2. Verify keyboard accessibility (`Tab`, arrow keys, page scroll) inside modal.
3. Confirm no regression in modal close behavior and focus trap.
