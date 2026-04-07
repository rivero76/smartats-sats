/**
 * UPDATE LOG
 * 2026-04-08 | P29 — New edge function: captures upgrade intent from users,
 *   persists to sats_upgrade_requests, and sends admin notification via Resend.
 *   Admin email read from SATS_ADMIN_NOTIFICATION_EMAIL (server-side only — never
 *   returned in any response body). Non-fatal email: row is always persisted even
 *   if Resend fails. Returns 503 on missing env vars, 401 on bad JWT, 400 on
 *   invalid tier.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'

const VALID_TIERS = new Set(['pro', 'max', 'enterprise'])

interface UpgradeRequestBody {
  requested_tier: string
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // ── Env validation (503 on misconfiguration) ─────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminEmail = Deno.env.get('SATS_ADMIN_NOTIFICATION_EMAIL')
  if (!adminEmail) {
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Input validation ─────────────────────────────────────────────────────────
  let body: UpgradeRequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!body?.requested_tier || !VALID_TIERS.has(body.requested_tier)) {
    return new Response(
      JSON.stringify({ error: 'Invalid tier. Must be one of: pro, max, enterprise' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── Fetch current profile (for tier + display info) ──────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, plan_override')
    .eq('user_id', user.id)
    .single()

  const currentTier = (profile?.plan_override as string | null) ?? 'free'
  const displayName = profile?.full_name || profile?.email || user.email || 'Unknown user'
  const userEmail = profile?.email || user.email || 'unknown'

  // ── Persist the request ───────────────────────────────────────────────────────
  const { error: insertError } = await supabase.from('sats_upgrade_requests').insert({
    user_id: user.id,
    requested_tier: body.requested_tier,
    current_tier: currentTier,
    status: 'pending',
  })

  if (insertError) {
    console.error('Failed to persist upgrade request:', insertError)
    return new Response(JSON.stringify({ error: 'Failed to submit request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Admin notification email (non-fatal) ─────────────────────────────────────
  // IMPORTANT: adminEmail is read from env only — it is never included in any
  // response body or log visible to the requesting user.
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      const timestamp = new Date().toUTCString()
      const tierLabel = body.requested_tier.charAt(0).toUpperCase() + body.requested_tier.slice(1)
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SmartATS <noreply@smartats.io>',
          to: [adminEmail],
          subject: `[SmartATS] Upgrade request — ${tierLabel} — ${displayName}`,
          html: `
            <h2 style="font-family:sans-serif;margin-bottom:16px;">New Upgrade Request</h2>
            <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280;"><strong>Name</strong></td><td>${displayName}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280;"><strong>Email</strong></td><td>${userEmail}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280;"><strong>Requested tier</strong></td><td><strong>${tierLabel}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280;"><strong>Current tier</strong></td><td>${currentTier}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280;"><strong>Submitted</strong></td><td>${timestamp}</td></tr>
            </table>
            <p style="font-family:sans-serif;margin-top:20px;">
              <a href="https://smartats-sats.vercel.app/admin" style="background:#7b5ea7;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">
                Review in Admin Dashboard →
              </a>
            </p>
          `,
          text: `New upgrade request\nName: ${displayName}\nEmail: ${userEmail}\nRequested: ${tierLabel}\nCurrent: ${currentTier}\nSubmitted: ${timestamp}\n\nReview at: https://smartats-sats.vercel.app/admin`,
        }),
      })

      if (!emailRes.ok) {
        const errBody = await emailRes.text()
        console.error('Admin notification email failed:', emailRes.status, errBody)
      } else {
        console.log('Admin notification email sent')
      }
    } else {
      console.warn('RESEND_API_KEY not set — skipping admin notification email')
    }
  } catch (emailError) {
    // Non-fatal: the request is already persisted above
    console.error('Admin notification email error (non-fatal):', emailError)
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
