-- UPDATE LOG
-- 2026-04-02 04:00:00 | ADR-0007 — Seed Postmark inbound email configuration keys into
--                       sats_runtime_settings. These keys are read by the
--                       inbound-email-ingest edge function at runtime.
--                       POSTMARK_WEBHOOK_SECRET must be set to the token configured
--                       in the Postmark dashboard (Servers → Inbound → Webhook).
--                       INBOUND_EMAIL_ALLOWLIST is a comma-separated list of sender
--                       addresses that are permitted to stage jobs via email forward.

INSERT INTO public.sats_runtime_settings (key, value, description)
VALUES
  (
    'postmark_webhook_secret',
    '',
    'Postmark inbound webhook token — copy from Postmark dashboard: Servers → Default → Settings → Inbound. Used to verify all POST requests come from Postmark.'
  ),
  (
    'inbound_email_allowlist',
    '',
    'Comma-separated list of sender email addresses allowed to trigger job ingestion via email forward (e.g. "you@gmail.com,you@work.com"). Emails from unlisted senders are silently dropped.'
  ),
  (
    'inbound_email_ingest_url',
    'https://nkgscksbgmzhizohobhg.functions.supabase.co/inbound-email-ingest',
    'Public URL of the inbound-email-ingest edge function. Set as the Webhook URL in Postmark: Servers → Default → Settings → Inbound.'
  )
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = now();

-- -----------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------
-- SELECT key, value, description FROM public.sats_runtime_settings
-- WHERE key LIKE 'postmark%' OR key LIKE 'inbound_email%'
-- ORDER BY key;
-- Expected: 3 rows — postmark_webhook_secret (empty), inbound_email_allowlist (empty),
--           inbound_email_ingest_url (set)
--
-- After setup, fill values via Supabase SQL Editor:
--   UPDATE public.sats_runtime_settings SET value = '<your-token>' WHERE key = 'postmark_webhook_secret';
--   UPDATE public.sats_runtime_settings SET value = 'you@gmail.com' WHERE key = 'inbound_email_allowlist';
