<!-- UPDATE LOG -->
<!-- 2026-04-01 | Created — LinkedIn scraper hosting comparison: Fly.io vs Railway across MVP/Growth/Enterprise phases. Decision: stay on Railway for MVP. -->

# LinkedIn Scraper Hosting Comparison — Fly.io vs Railway

**Date:** 2026-04-01
**Context:** Railway subscription was being cancelled for cost reasons. Migration to Fly.io was attempted but blocked (requires payment method even for free tier, Docker auth callback broken). This audit compares both platforms across all product phases to inform the final decision.

**Decision:** Revert to Railway for MVP. Migrate to Fly.io at Growth stage (>200 MAU).

---

## Feature / Capability Comparison

|                            | Fly.io                                              | Railway                                           |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| **Free tier**              | Yes — but requires payment method on file to deploy | Yes — $5 credit/month, no card required initially |
| **Docker deploy**          | Native (Dockerfile or pre-built image)              | Native (Dockerfile)                               |
| **ARM64 Mac build**        | Needs `--platform linux/arm64` flag                 | Transparent, no flag needed                       |
| **CLI auth**               | Token-based (browser callback broken in Docker)     | `railway login` works cleanly                     |
| **Auto-stop when idle**    | Yes (`auto_stop_machines = "stop"`)                 | Yes (sleep on inactivity)                         |
| **Cold start**             | ~20–30s                                             | ~15–25s                                           |
| **Persistent env secrets** | `fly secrets set`                                   | Dashboard or `railway variables`                  |
| **Health checks**          | Native in `fly.toml`                                | Native in `railway.json`                          |
| **Region selection**       | 35+ global regions                                  | Limited (US/EU)                                   |
| **Logs**                   | `fly logs` (real-time)                              | Dashboard + `railway logs`                        |
| **SLA**                    | None on free/hobby                                  | None on free                                      |
| **Support**                | Community forum                                     | Community + email (paid)                          |

---

## Cost by Phase

### MVP (<50 MAU, <10 scrapes/hour)

|                    | Fly.io                                     | Railway                        |
| ------------------ | ------------------------------------------ | ------------------------------ |
| **Plan**           | Free (shared-cpu-1x, 1 GB RAM)             | Hobby ($5 credit/month)        |
| **Monthly cost**   | $0 — but card required                     | $0 (within $5 credit)          |
| **RAM available**  | 1 GB                                       | 512 MB (hobby)                 |
| **Free compute**   | 160 GB-hours/month (~4,800 scrapes/month)  | $5 credit covers ~50–100 hrs   |
| **Setup friction** | Medium (card required, Docker auth issues) | Low (GitHub login, no card)    |
| **Verdict**        | ✅ Free but annoying to set up             | ✅ Easier, was already working |

**Note:** At MVP scrape volumes (~100 scrapes/month), Railway's $5 credit easily covers usage. The subscription was cancelled due to the card requirement, not actual overage costs.

### Growth (100–1,000 MAU, ~500–1,000 scrapes/month)

|                        | Fly.io                                        | Railway                            |
| ---------------------- | --------------------------------------------- | ---------------------------------- |
| **Plan needed**        | Paid (shared-cpu-2x) to eliminate cold starts | Developer plan ($20/month)         |
| **Monthly cost**       | ~$5–$15                                       | ~$20 flat                          |
| **RAM**                | 1–2 GB configurable                           | 8 GB max                           |
| **Auto-scaling**       | Yes (multiple machines)                       | No (single instance)               |
| **Concurrent scrapes** | Yes                                           | No                                 |
| **Verdict**            | ✅ Cheaper, more scalable                     | ⚠️ More expensive, single instance |

### Enterprise (1,000+ MAU)

At this stage **neither platform is the right answer** — the Playwright scraper itself must be retired or replaced with the LinkedIn Official API (see INFRA-1 in TECHNICAL_IMPROVEMENTS.md and ARCH-REVIEW-2026-03-31.md). Forced comparison:

|                  | Fly.io             | Railway                  |
| ---------------- | ------------------ | ------------------------ |
| **Plan**         | Performance tier   | Pro plan (usage-based)   |
| **Monthly cost** | ~$30–$60           | Unpredictable            |
| **SLA**          | None               | None                     |
| **Multi-region** | Yes                | No                       |
| **Verdict**      | ✅ Better at scale | ❌ Single region, no SLA |

---

## Decision Log

| Phase                       | Decision              | Rationale                                                                                                              |
| --------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **MVP (now)**               | **Railway**           | Was already working; $5 credit covers all MVP scrape volume; zero setup friction; no Docker auth issues                |
| **Growth (>200 MAU)**       | **Migrate to Fly.io** | Cheaper ($5–15 vs $20/month); auto-scaling; multi-region; cold start issue resolved with always-on                     |
| **Enterprise (>1,000 MAU)** | **Retire scraper**    | LinkedIn ToS risk is disqualifying; replace with LinkedIn Official API (apply now — 2–6 month lead time) or CSV import |

---

## Migration Checklist (Railway → Fly.io, when triggered at >200 MAU)

- [ ] Add payment method to Fly.io account
- [ ] Run `bash scripts/ops/fly.sh auth whoami` to verify token
- [ ] Run `bash scripts/ops/fly.sh launch --no-deploy` to init app
- [ ] Set secrets: `PLAYWRIGHT_API_KEY`, `LINKEDIN_EMAIL`, `LINKEDIN_PASSWORD`
- [ ] Run `bash scripts/ops/fly.sh deploy`
- [ ] Update `PLAYWRIGHT_SERVICE_URL` in Supabase secrets
- [ ] Redeploy `linkedin-profile-ingest` edge function
- [ ] Verify `/health` endpoint responds
- [ ] Cancel Railway service
- [ ] Update `CLAUDE.md` and `TECHNICAL_IMPROVEMENTS.md` INFRA-1

---

## Related Documents

- [ARCH-REVIEW-2026-03-31.md](../improvements/ARCH-REVIEW-2026-03-31.md) — Full tech stack review with hosting cost projections
- [TECHNICAL_IMPROVEMENTS.md](../improvements/TECHNICAL_IMPROVEMENTS.md) — INFRA-1 backlog entry
- [aws-waf-review-prompt.md](aws-waf-review-prompt.md) — WAF review prompt
