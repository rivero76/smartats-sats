<!--
  UPDATE LOG
  2026-04-08 | Created — MVP Upgrade Request Flow + Admin Notifications (plan-decomposer)
  2026-04-08 | COMPLETED — All stories implemented, verify:full passes, DoD satisfied (changelog, help content, CLAUDE.md, UNTESTED_IMPLEMENTATIONS.md updated)
-->

# P29 — MVP Upgrade Request Flow + Admin Notifications

<!-- Status: COMPLETED -->

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| **Phase**         | P29                                                    |
| **Priority**      | HIGH                                                   |
| **Tier gating**   | None (admin panel is role-gated; request flow is Free) |
| **Branch**        | `feat/mvp-upgrade-requests`                            |
| **Plan file**     | `plans/p29-mvp-upgrade-requests.md`                    |
| **Spec file**     | _none_                                                 |
| **Created by**    | `plan-decomposer`                                      |
| **Last reviewed** | 2026-04-08                                             |

## Goal

SmartATS is in MVP phase with no payment processor live (P22/Stripe is future work). Testers and early users who click an "Upgrade" CTA currently reach a dead-end "coming soon" dialog that opens a mailto link. This plan replaces that dead end with a lightweight "Request Access" modal that captures upgrade intent, persists it to a new `sats_upgrade_requests` table, and emails the admin automatically via Resend. A new Admin dashboard tab then lists all requests so the admin can approve or deny each one, manually updating the user's `profiles.plan_tier` with a single click. This bridge is explicitly temporary and must be replaced by P22/Stripe self-service when billing goes live.

## Advisory Checkpoint — saas-advisor

> This plan is internal operational tooling — a manual bridge for the pre-billing MVP phase. It does not introduce a new pricing tier, paywall, or positioning change. `saas-advisor` consultation is optional per plan-conventions §7. The product owner has explicitly confirmed it is not required before implementation begins.

<details>
<summary>saas-advisor findings — N/A (internal bridge tooling)</summary>

_Not required for this plan. Revisit when P22 (Stripe) ships and the upgrade CTA must route to the billing portal instead._

</details>

## Agent Execution Sequence

#### Before implementation

- [ ] `arch-reviewer` — review this plan before first commit
- [ ] `security-auditor` — plan touches auth (JWT validation in edge function), RLS on new table, and `profiles.plan_tier` write path

#### During implementation

- [ ] `migration-writer` — new `sats_upgrade_requests` table + RLS policies (Story 1)
- [ ] `edge-fn-scaffolder` — `request-plan-upgrade` edge function (Story 1)
- [ ] `component-scaffolder` — `UpgradeRequestModal` component (Story 1) + `UpgradeRequestsPanel` admin component (Story 2)
- [ ] `test-writer` — `useUpgradeRequests` hook (Story 2)

#### After implementation

- [ ] `convention-auditor` — check UPDATE LOG headers and naming conventions across all changed files
- [ ] `test-runner` — run full test suite
- [ ] `help-content-writer` — update /help page (user-facing flow: upgrade request modal)
- [ ] `changelog-keeper` — update CHANGELOG.md
- [ ] `release-gatekeeper` — final release readiness check

#### Future agents (add here as created)

- [ ] _new agent placeholder_

## Success Metrics

| Metric                      | Target                                                                                                          | How to measure                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Upgrade intent capture rate | 100% of upgrade CTA clicks that reach the modal result in a row in `sats_upgrade_requests` (no silent failures) | Query `sats_upgrade_requests` after test sessions                            |
| Admin notification delivery | Admin receives email within 60 s of request submission                                                          | Manual E2E test: submit request → check inbox                                |
| Admin approval latency      | Admin can approve a pending request in ≤ 3 clicks                                                               | Manual E2E: open admin panel → approve → verify `profiles.plan_tier` updated |

## Stories

---

### Story 1 — Upgrade Request Flow (User-facing)

**User story:**
As a free-tier user, when I click any "Upgrade" CTA in the app, I want a "Request Access" modal so I can express upgrade intent without needing a payment processor, so that I can get early access while billing is not yet live.

**Acceptance criteria:**

1. Given a user on any tier lower than the target tier, when they click an "Upgrade to [tier]" button in Settings → Your Plan, then an `UpgradeRequestModal` opens pre-filled with the target tier.
2. The modal presents a tier selector (Pro / Max / Enterprise) and a submit button labelled "Request Access".
3. On submit, the frontend calls the `request-plan-upgrade` edge function with a valid JWT. The edge function: validates the JWT (returns `401` if absent or invalid); validates `requested_tier` is one of `pro | max | enterprise` (returns `400` if not); returns `503` if `SATS_ADMIN_NOTIFICATION_EMAIL` is not set; persists a row to `sats_upgrade_requests` with `user_id`, `requested_tier`, `current_tier`, `status = 'pending'`, and `created_at`; sends an email via Resend to the address from `SATS_ADMIN_NOTIFICATION_EMAIL` containing requester display name (falls back to email if no name), requester email, requested tier, and UTC timestamp.
4. If Resend fails, the row is still persisted and the function returns a success response to the frontend (non-fatal email failure).
5. On success, the modal body replaces with the message: "Your request has been submitted. We'll review it and activate your plan shortly." The submit button is hidden.
6. On error (non-Resend), the modal shows "Something went wrong. Please try again." and re-enables the submit button.
7. `SATS_ADMIN_NOTIFICATION_EMAIL` is never present in any frontend bundle, network response body, or browser-visible payload.
8. The new `sats_upgrade_requests` table has RLS: authenticated users may `INSERT` their own rows and `SELECT` their own rows; no user may read another user's rows; only the service role may `UPDATE` (status changes are made server-side or via the admin panel using the service role).

**Files expected to change:**

- `supabase/migrations/<timestamp>_add_sats_upgrade_requests.sql` — new table `sats_upgrade_requests` with columns `id uuid PK`, `user_id uuid FK → auth.users`, `requested_tier text`, `current_tier text`, `status text DEFAULT 'pending'`, `created_at timestamptz DEFAULT now()`; full RLS policies; `updated_at` column + trigger following `sats_update_<table>_updated_at` naming convention
- `supabase/functions/request-plan-upgrade/index.ts` — new edge function; uses `_shared/cors.ts`, `_shared/env.ts`; validates JWT via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; sends email via Resend using `SATS_ADMIN_NOTIFICATION_EMAIL`; persists row via service-role Supabase client
- `src/components/settings/UpgradeRequestModal.tsx` — new modal component; replaces the existing "coming soon" dialog body in `PlanBillingCard.tsx` for `pro`, `max`, and `enterprise` upgrade CTAs
- `src/components/settings/PlanBillingCard.tsx` — wire the new modal in place of the existing `Dialog` that currently opens a mailto link; `enterprise` / "Contact sales" CTA remains unchanged (mailto)
- `src/integrations/supabase/types.ts` — regenerated after migration

**Validation commands:**

```bash
supabase db push
bash scripts/ops/gen-types.sh
supabase functions serve request-plan-upgrade
npm run verify:full
npm run test
```

Manual E2E: log in as a free-tier user → Settings → Your Plan → click "Upgrade to Pro" → submit modal → confirm row in `sats_upgrade_requests` → confirm admin email received.

**Risks / non-goals:**

- Do not send a confirmation email to the requesting user — out of scope for this story.
- Do not implement deduplication or rate limiting — out of scope.
- Do not build any pending-state UI indicator for the user after submission — out of scope.
- Risk: `profiles.plan_tier` write permission for the admin role must be verified before Story 2 can approve requests. The `PlanOverridePanel` component already writes `plan_tier` — confirm the existing RLS policy covers this and document it in Story 2.
- Risk: `SATS_ADMIN_NOTIFICATION_EMAIL` must be added to Supabase edge function secrets before deployment — document this in the function's README comment.
- The enterprise tier "Contact Sales" CTA in `PlanBillingCard.tsx` currently opens a mailto. Leave it unchanged — enterprise upgrade requests go through sales, not this modal.

---

### Story 2 — Admin Upgrade Requests Panel

**Dependency:** Story 1 must be merged first (migration + table must exist).

**User story:**
As an admin, I want a panel in the Admin dashboard listing all upgrade requests so I can approve or deny each one and manually activate the correct plan tier, so that testers get access while billing infrastructure is not yet live.

**Acceptance criteria:**

1. A new "Upgrade Requests" tab appears in `/admin` (`AdminDashboard.tsx`), gated by the existing `SATSUser` admin role check already in place on that route.
2. The tab header shows a live badge with the count of pending requests; the badge disappears when there are none.
3. The panel includes a filter bar (pill buttons: All / Pending / Approved / Denied) following the inline pill pattern from the UI/UX Design Principles (not a dropdown; placed in the card header, right-aligned).
4. Each row in the list shows: user display name, user email, requested tier, current tier, request timestamp (human-readable), and status (Pending / Approved / Denied).
5. Pending rows have two action buttons: "Approve" and "Deny".
6. Clicking "Approve" optimistically updates the row's status to `approved` in the UI, then calls a Supabase RPC or direct table update (via the authenticated admin session + service role edge function or existing admin write policy) that: sets `sats_upgrade_requests.status = 'approved'` and sets `profiles.plan_tier` to the `requested_tier` value for that user. No page reload.
7. Clicking "Deny" optimistically updates the row's status to `denied` in the UI, then sets `sats_upgrade_requests.status = 'denied'` with no change to `profiles.plan_tier`. No page reload.
8. Empty state when the filtered list is empty: "No upgrade requests yet." (or "No [filter] requests." for non-All filters).
9. The `useUpgradeRequests` TanStack Query hook fetches all rows from `sats_upgrade_requests` joined with `profiles` (for name and email), ordered by `created_at DESC`. Mutations use `useMutation` with `invalidateQueries` on success.
10. Before implementing the approve action, verify that the existing admin RLS policy on `profiles` permits `UPDATE` on `plan_tier` for admin-role users. If it does not, a targeted migration must add that policy (include it in the migration file for this story if needed).

**Files expected to change:**

- `src/components/admin/UpgradeRequestsPanel.tsx` — new panel component; filter bar, request list, Approve/Deny buttons, empty state, pending count badge
- `src/hooks/useUpgradeRequests.ts` — new TanStack Query hook; `useQuery` for list + `useMutation` for approve/deny
- `src/pages/AdminDashboard.tsx` — add "Upgrade Requests" `TabsTrigger` and `TabsContent` wiring `UpgradeRequestsPanel`; import `TrendingUp` or similar icon from lucide-react for the tab
- `supabase/migrations/<timestamp>_admin_rls_profiles_plan_tier.sql` — conditional: only needed if the existing admin RLS policy on `profiles` does not already allow `UPDATE` on `plan_tier`. Verify before creating; skip if already covered.
- `src/integrations/supabase/types.ts` — regenerate only if the conditional migration above is created

**Validation commands:**

```bash
# Only if the conditional RLS migration was created:
supabase db push
bash scripts/ops/gen-types.sh

npm run verify:full
npm run test -- tests/unit/hooks/useUpgradeRequests.test.ts
```

Manual E2E: log in as admin → `/admin` → Upgrade Requests tab → confirm pending request from Story 1 appears → click Approve → verify `profiles.plan_tier` updated in Supabase dashboard → confirm badge count decrements.

**Risks / non-goals:**

- Do not notify the user by email when their request is approved or denied — out of scope.
- Do not implement bulk approve/deny — out of scope.
- Do not implement pagination — out of scope for MVP volume.
- Do not implement tier downgrade via this panel — out of scope.
- Do not sync to Stripe — this plan is explicitly a pre-Stripe bridge; Stripe sync is P22.
- Risk: the approve action writes to both `sats_upgrade_requests` and `profiles` — these are two separate table updates. If the second write fails after the first succeeds, the request will show `approved` but the tier will not have changed. Mitigation: wrap both updates in a Postgres function (`sats_approve_upgrade_request(request_id uuid)`) called via RPC so both writes are atomic.
- Risk: the `useUpgradeRequests` hook joins `sats_upgrade_requests` with `profiles`. Confirm the admin role has `SELECT` on `profiles` (it should given `PlanOverridePanel` already reads profiles).

---

## Technical Risks

- **RLS risk on `sats_upgrade_requests`** — the INSERT policy must be restricted to `auth.uid() = user_id` to prevent a user from submitting a request on behalf of another user.
- **RLS risk on `profiles.plan_tier` write** — if the existing admin policy does not cover this column, a missing migration will silently fail (Supabase returns no error from RLS-blocked updates by default in some client configurations). The approve action must check the response and surface an error if `updated_at` did not change.
- **Admin email leak** — `SATS_ADMIN_NOTIFICATION_EMAIL` must only be read inside the edge function. It must never be passed through to the frontend response body. Code review must confirm this before merging.
- **Atomic approve** — the two-write approve path (request status + profile tier) must be wrapped in a Postgres RPC function to avoid split-brain state. See Story 2 risk notes.
- **P22 migration path** — when Stripe ships, the upgrade CTA in `PlanBillingCard.tsx` must route to Stripe instead of this modal. The modal component should be easy to swap out. Do not over-engineer the modal for permanence.

## Out of Scope

- Stripe, payment processing, or automated tier activation of any kind
- User-facing email confirmation when a request is submitted
- User-facing notification when a request is approved or denied
- Deduplication of upgrade requests (same user requesting the same tier twice)
- Rate limiting on the edge function
- Pending-state UI for the user after submission (no "you have a pending request" banner)
- Bulk approve/deny actions in the admin panel
- Audit log entries for approval/deny actions (P21 audit trail covers this in future)
- Pagination of the requests list
- Tier downgrade via this panel
- Stripe sync

## References

#### SaaS Podcast advisory

- Advisory guide: `docs/advisory/2026-04-07_saas-podcast-advisory-guide.md`
- Relevant phase: Phase 1 — Validation (manual processes before automation)
- Note: this plan is an intentionally manual bridge. The advisory guide's Phase 1 principle of "do things that don't scale" applies — manual approval is correct at this stage.

#### Internal references

- Roadmap entry: `docs/decisions/product-roadmap.md` → P22 Billing & Subscription Infrastructure (the permanent replacement)
- Roadmap entry: `docs/decisions/product-roadmap.md` → P24 Self-Service Onboarding & Pricing (the permanent upgrade CTA target)
- Related plan: `plans/p14.md` (existing edge function with Resend email pattern to reference)
- Existing Resend usage: `supabase/functions/delete-account/index.ts` — reference for Resend call pattern, non-fatal error handling
- Existing admin panel: `src/pages/AdminDashboard.tsx` + `src/components/admin/PlanOverridePanel.tsx` — reference for tab wiring and admin role gating patterns
- Existing upgrade CTA: `src/components/settings/PlanBillingCard.tsx` — primary call site for the modal
