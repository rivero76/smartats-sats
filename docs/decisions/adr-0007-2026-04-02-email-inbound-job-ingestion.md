<!-- UPDATE LOG -->
<!-- 2026-04-02 00:00:00 | Created ADR-0007: Email Inbound Webhook for Job Alert Ingestion (Postmark MVP, Cloudflare future). -->

# ADR-0007: Email Inbound Webhook for Job Alert Ingestion (Postmark MVP, Cloudflare future)

**Status:** Accepted
**Date:** 2026-04-02
**Deciders:** Architecture (Claude Code)

---

## Context

SmartATS P14 introduced a proactive job pipeline: a cron-driven `fetch-market-jobs` edge function stages jobs into `sats_staged_jobs`, `async-ats-scorer` scores them, and matched results surface on `/opportunities`. The P14 feed relies on JSearch/Adzuna API polling, which misses personalised recruiter emails and LinkedIn job alert emails that users already receive in their inbox. A supplementary ingestion channel is needed so that user-forwarded job alert emails (from LinkedIn, Seek, Indeed, or direct recruiters) can enter the same `sats_staged_jobs` → `async-ats-scorer` pipeline without changing any downstream code.

Three ingestion approaches were evaluated: Gmail OAuth pull, URL/RSS polling, and email-forward inbound webhook. The email-forward pattern was selected because it is push-based, source-agnostic, and requires no OAuth grant or scheduled polling. For the MVP phase, Postmark Inbound Webhooks deliver the webhook payload. A migration path to Cloudflare Email Workers is documented for when SmartATS moves its domain DNS to Cloudflare.

---

## Decision

1. **Adopt the email-forward inbound webhook pattern as the canonical second ingestion channel for job alert emails.** Users configure a single email auto-forward filter in their email client (e.g., Gmail filter on `jobalerts@linkedin.com`) that forwards matching messages to a SmartATS inbound address.

2. **Use Postmark Inbound Webhooks for the MVP.** Postmark provides a dedicated inbound address (e.g., `alerts@inbound.smartats.app`), parses raw email into structured JSON (headers, HTML body, text body, attachments), and delivers a POST webhook to a Supabase edge function URL. No custom domain or Cloudflare DNS is required.

3. **Implement a new `inbound-email-ingest` Supabase edge function** that:
   - Verifies the Postmark HMAC signature (`X-Postmark-Signature` header) against `POSTMARK_WEBHOOK_SECRET` stored in `sats_runtime_settings`.
   - Validates the sender address against an `INBOUND_EMAIL_ALLOWLIST` in `sats_runtime_settings`; unknown senders are silently dropped (no 4xx — avoids Postmark retry storms).
   - Parses the HTML body to extract `linkedin.com/jobs/view/XXXXXXXXXX` URLs, job title, and company name using a LinkedIn alert HTML parser.
   - Falls back to a generic URL extractor for non-LinkedIn job emails (Seek, Indeed, recruiter emails) when the LinkedIn parser yields no results.
   - Deduplicates incoming jobs by `content_hash` before inserting into `sats_staged_jobs`.
   - Inserts extracted jobs into `sats_staged_jobs` with `source = 'email_inbound'` and `staged_by = user_id` derived from the allowlist mapping.

4. **Store all configuration in `sats_runtime_settings`**, not in edge function environment variables, so per-user allowlist entries and the webhook secret can be rotated without a function redeployment.

5. **Make zero changes to `async-ats-scorer`, `sats_staged_jobs` schema, or `/opportunities` UI.** The new ingestion channel is transparent to all downstream components.

6. **Document the Cloudflare Email Workers migration path** (see dedicated section below) as the target architecture once the project domain is on Cloudflare DNS. Postmark is explicitly MVP-scoped.

---

## Cloudflare Email Workers Migration Path

When SmartATS DNS is delegated to Cloudflare (a prerequisite regardless of this decision for DDoS protection and edge caching):

- Enable **Cloudflare Email Routing** on the domain. Route `alerts@smartats.app` to an **Email Worker**.
- The Email Worker is a Cloudflare Worker that receives the raw `ReadableStream` of the RFC 2822 message via the `email` event handler.
- Parse the raw message using `postal-mime` (npm-compatible WASM package available in Workers).
- Forward the parsed payload directly to the `inbound-email-ingest` Supabase edge function via a `fetch()` call using a shared `INBOUND_WORKER_SECRET` header (replaces Postmark HMAC).
- **Cost:** Cloudflare Email Routing is free; Workers free tier is 100,000 requests/day (vs Postmark $15/month paid after 100 emails/month free).
- **No edge function changes are required** beyond replacing Postmark HMAC verification with the `INBOUND_WORKER_SECRET` check. The parsing, deduplication, and staging logic remain identical.
- **Migration trigger:** When Postmark free tier is consistently saturated (>100 emails/month) or when Cloudflare DNS migration occurs, whichever comes first.
- Track migration progress under `INFRA-1` in `docs/improvements/TECHNICAL_IMPROVEMENTS.md` (alongside the existing Railway → Fly.io LinkedIn scraper migration item).

---

## Alternatives Considered

1. **Gmail OAuth pull.** Connects to Gmail via Google OAuth to poll the inbox for job alert emails. Rejected because it requires a Google Cloud project, an OAuth consent screen, refresh-token management, and per-user OAuth grants — significant setup cost for MVP. It is also Gmail-only: users on Outlook, Fastmail, or corporate email cannot use it. The poll-based model introduces latency and quota complexity.

2. **URL polling and RSS feed ingestion.** Subscribes to RSS feeds from job boards (Indeed, LinkedIn) or scrapes listing pages on a schedule. RSS feeds are clean and reliable; indeed and LinkedIn RSS remain a valid complementary Mode 2 channel. Rejected as the _primary_ new channel because it does not capture personalised recruiter outreach or niche job boards, and LinkedIn blocks automated listing-page scraping (consistent with the rationale in the existing Railway/Playwright scraper, INFRA-1). RSS polling remains a candidate for a future dedicated ADR as a parallel channel.

3. **Cloudflare Email Workers (immediate adoption).** Architecturally identical to the Postmark webhook path but requires the SmartATS domain to be on Cloudflare DNS before any email routing can be configured. Rejected for the MVP because the DNS migration has not yet occurred; blocking email ingestion on a DNS migration would delay a user-facing feature by weeks. Documented as the target migration path above.

---

## Consequences

**Positive:**

- Push-based ingestion: jobs appear in `/opportunities` within seconds of the alert email arriving, with no polling delay.
- Source-agnostic: any email that a user forwards (LinkedIn, Seek, Indeed, recruiter) enters the same pipeline without code changes.
- Zero downstream impact: `sats_staged_jobs`, `async-ats-scorer`, and `/opportunities` require no modification.
- Low setup cost for MVP: Postmark inbound address is operational in ~15 minutes; no OAuth, no Google Cloud project.
- Sender allowlist provides a first line of spam/abuse protection independent of the webhook signature.
- Cloudflare migration path eliminates the $15/month Postmark cost at scale and simplifies architecture (Worker IS the receiver; no separate webhook verification step).

**Negative / trade-offs:**

- **LinkedIn HTML parser fragility.** LinkedIn can change the job alert email template without notice, breaking title/company extraction. Mitigation: the raw `linkedin.com/jobs/view/` URL must always be extracted first; title/company are best-effort enrichment. A fallback URL extractor handles other sources.
- **Manual forward configuration.** Users must create an email filter once to auto-forward job alerts. There is no silent background setup. Mitigation: onboarding copy and a setup guide in `/help` cover the one-time configuration step.
- **Postmark free tier limit.** 100 inbound emails/month is sufficient for early MVP but will be saturated by active users. Mitigation: upgrade to Postmark paid ($15/month) or trigger the Cloudflare Email Workers migration.
- **`sats_runtime_settings` as config store.** Per-user allowlist entries in a runtime settings table require a well-defined schema and RLS policy. If `sats_runtime_settings` does not yet have a row-level structure suitable for per-user config, a dedicated `sats_inbound_email_config` table may be required — to be resolved during implementation.
- **Webhook replay risk.** A leaked `POSTMARK_WEBHOOK_SECRET` allows arbitrary job injection. Mitigation: secret rotation via `sats_runtime_settings` without redeployment; sender allowlist as a second gate.

---

## Cross-references

- Related ADRs:
  - ADR-0004: Async vs Direct ATS Scoring — `async-ats-scorer` is the downstream consumer of `sats_staged_jobs` entries produced by this ingestion channel.
  - ADR-0006: RLS-First Tenant Isolation — `sats_staged_jobs` and any new `sats_inbound_email_config` table must have RLS policies consistent with this model.
- Related plans: `plans/` — P14 proactive matching plan (original `sats_staged_jobs` introduction).
- Related specs: none at time of writing; a `docs/specs/technical/email-inbound-ingest.md` should be created during implementation to document the LinkedIn HTML parsing strategy and the `sats_runtime_settings` schema extension.
- Related improvements: `docs/improvements/TECHNICAL_IMPROVEMENTS.md` — INFRA-1 (Cloudflare migration tracking).
