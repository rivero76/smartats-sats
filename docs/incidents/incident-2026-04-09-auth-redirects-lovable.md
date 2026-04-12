# Incident: Auth Redirects Sending Users to Lovable.dev

**Date:** 2026-04-09  
**Severity:** HIGH — all sign-up confirmation emails and password reset links redirected users to a dead Lovable.dev URL instead of the production app  
**Status:** RESOLVED  
**Resolved by:** Claude Code (automated fix via Supabase Management API)

---

## Summary

All Supabase auth flows (email confirmation, password reset, magic link) were redirecting users to `https://dbe265ab-2483-4c23-aa44-69fcb1894344.lovableproject.com` — the original Lovable.dev URL from when the project was bootstrapped. This URL is no longer active. Users clicking confirmation links in signup or password reset emails were landing on a dead page, making registration and password recovery completely broken in production.

---

## Timeline

| Time                 | Event                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ~2026-03             | Project migrated from Lovable.dev to self-hosted Vite + Vercel. Code cleaned of Lovable artifacts (MAINT-1, completed 2026-03-30).      |
| 2026-03 → 2026-04-09 | Supabase project `site_url` and `uri_allow_list` were never updated during migration. Continued pointing to Lovable.dev.                |
| 2026-04-09           | User reported sign-in/sign-up links redirecting to Lovable instead of Vercel.                                                           |
| 2026-04-09           | Deep code review found no Lovable references in source code. Investigation expanded to Supabase project auth config via Management API. |
| 2026-04-09           | Root cause confirmed: `site_url` = Lovable URL, `uri_allow_list` = 13 Lovable domains.                                                  |
| 2026-04-09           | Fix applied via Supabase Management API PATCH. Verified correct values returned.                                                        |

---

## Root Cause

When the project was bootstrapped on Lovable.dev, Supabase set the auth `site_url` to the Lovable preview URL. During the migration to Vercel, all source code references to Lovable were removed (MAINT-1), but the **Supabase project auth configuration was not updated**.

The `site_url` controls where Supabase sends users after email confirmation and password reset. The `uri_allow_list` controls which redirect URLs are permitted in auth flows.

**Before fix:**

```
site_url:       https://dbe265ab-2483-4c23-aa44-69fcb1894344.lovableproject.com
uri_allow_list: 13 lovable.app / lovableproject.com domains (none for Vercel)
```

**After fix:**

```
site_url:       https://smartats-sats.vercel.app
uri_allow_list: https://smartats-sats.vercel.app/**, http://localhost:8080/**, http://localhost:5173/**
```

---

## Impact

- **All new user sign-ups** since Vercel deployment: confirmation email link led to dead Lovable URL → users could not verify email → could not log in
- **All password reset requests**: reset link led to dead Lovable URL → users could not complete password reset
- **Existing logged-in users**: unaffected (session tokens work independently of `site_url`)
- **OAuth flows**: potentially affected if any OAuth providers used the Supabase redirect URL

---

## Fix Applied

```bash
# Supabase Management API PATCH — applied 2026-04-09
PATCH https://api.supabase.com/v1/projects/nkgscksbgmzhizohobhg/config/auth
{
  "site_url": "https://smartats-sats.vercel.app",
  "uri_allow_list": "https://smartats-sats.vercel.app/**,http://localhost:8080/**,http://localhost:5173/**"
}
```

No code changes required — this was a Supabase project configuration issue only.

---

## Action Items

| #   | Action                                                                                              | Owner       | Status                                                        |
| --- | --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| 1   | Add Supabase `site_url` + `uri_allow_list` to deployment checklist in `docs/runbooks/deployment.md` | Claude Code | ✅ Done (see below)                                           |
| 2   | Re-send confirmation emails to any users who signed up and could not verify                         | Ricardo     | Pending — check `auth.users` for `email_confirmed_at IS NULL` |
| 3   | Consider adding Vercel preview URL pattern to `uri_allow_list` if preview deployments need auth     | Ricardo     | Optional                                                      |

---

## Prevention

Added to `docs/runbooks/deployment.md` under **First-time setup checklist**:

> **Supabase Auth config** — After every new deployment target, update `site_url` and `uri_allow_list` in Supabase Dashboard → Authentication → URL Configuration (or via Management API). `site_url` must match the production URL. `uri_allow_list` must include all valid redirect origins.
