# Deployment Runbook

## Pre-checks

- `npm run verify:full` passes with no errors
- All migrations applied (`supabase db push`)
- TypeScript types regenerated (`bash scripts/ops/gen-types.sh`)
- `docs/releases/UNTESTED_IMPLEMENTATIONS.md` updated for any new features

## Deploy Steps

SmartATS deploys automatically to Vercel on every push to `main`.

1. Merge your branch into `main` and push.
2. Monitor the Vercel deployment in the Vercel dashboard.
3. After deploy completes, run smoke tests listed in `UNTESTED_IMPLEMENTATIONS.md`.

## Validation

- Open `/settings` — confirm Plan & Billing card loads
- Open `/analyses` — confirm at least one analysis renders
- Open `/admin` — confirm Admin Dashboard loads (admin account required)
- Trigger an upgrade request (Free → Pro) — confirm modal submits without error

---

## Edge Function Secrets

All edge function secrets are set per-project in the Supabase Dashboard:

**Supabase Dashboard → Edge Functions → Secrets**

| Secret | Required | Purpose |
|--------|----------|---------|
| `SUPABASE_URL` | Auto-set | Supabase project URL (injected automatically) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set | Service role key (injected automatically) |
| `SUPABASE_ANON_KEY` | Auto-set | Anon key (injected automatically) |
| `SATS_ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins (e.g. `https://smartats-sats.vercel.app`) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for all LLM calls |
| `RESEND_API_KEY` | Recommended | Resend API key for transactional emails (deletion confirmation, upgrade notifications). Functions degrade gracefully without it — email steps are skipped. |
| `SATS_ADMIN_NOTIFICATION_EMAIL` | Recommended | Email address to notify when a user submits an upgrade request. Set to your own email address. Without this, upgrade requests are still saved to the database — only the admin notification email is skipped. **Supabase Dashboard → Edge Functions → Secrets → add `SATS_ADMIN_NOTIFICATION_EMAIL` = your email address** |
| `SATS_APP_URL` | Recommended | Public app URL (e.g. `https://smartats-sats.vercel.app`). Used in account deletion confirmation email for the cancel link. |
| `PLAYWRIGHT_SERVICE_URL` | Yes (LinkedIn import) | URL of the Railway Playwright scraper service. Required for LinkedIn profile import. |
| `OPENAI_MODEL_ATS` | Optional | Override default ATS scoring model (default: `gpt-4.1`) |
| `OPENAI_MODEL_ENRICH` | Optional | Override skill enrichment model (default: `gpt-4.1-mini`) |
| `OPENAI_MODEL_LINKEDIN_INGEST` | Optional | Override LinkedIn parse model (default: `gpt-4.1-mini`) |
| `OPENAI_MODEL_PROFILE_FIT` | Optional | Override profile fit model (default: `gpt-4.1-mini`) |
| `OPENAI_TEMPERATURE_ATS` | Optional | Override ATS scoring temperature (default: `0`) |
| `OPENAI_ATS_SEED` | Optional | Override ATS scoring seed for reproducibility (default: `42`) |

### First-time setup checklist

1. **Supabase Dashboard → Edge Functions → Secrets** — add all "Yes" and "Recommended" secrets above.
2. Verify `SATS_ALLOWED_ORIGINS` includes your Vercel deployment URL and any preview URLs.
3. Set `SATS_ADMIN_NOTIFICATION_EMAIL` to the email address where you want to receive upgrade request notifications.
4. Set `RESEND_API_KEY` from [resend.com](https://resend.com) to enable transactional emails.
5. Deploy the Railway Playwright service (`scripts/playwright-linkedin/`) and set `PLAYWRIGHT_SERVICE_URL`.
