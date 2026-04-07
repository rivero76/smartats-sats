/**
 * UPDATE LOG
 * 2026-04-02 04:00:00 | ADR-0007 — Postmark inbound email webhook receiver.
 * 2026-04-05 12:30:00 | Fix: also extract LinkedIn jobs/view URLs from plain text
 *   (Gmail forwarding strips anchor tags; regex now runs on both HTML anchors and
 *   raw URL text so forwarded alerts are parsed correctly).
 *   Parses forwarded LinkedIn job alert emails (and any job board email) into
 *   sats_staged_jobs for pickup by async-ats-scorer. Two security guards:
 *   (1) Postmark X-Postmark-Signature token verification,
 *   (2) sender allowlist from sats_runtime_settings.
 *   LinkedIn job URLs extracted from HTML body with title + company fallback.
 *   Falls back to generic URL extraction for non-LinkedIn job emails.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostmarkInboundPayload {
  From: string
  Subject: string
  HtmlBody: string | null
  TextBody: string | null
  MessageID: string
  Date: string
}

interface ExtractedJob {
  title: string
  company_name: string
  location_raw: string
  source_url: string
  description: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// LinkedIn alert HTML parser
//
// LinkedIn job alert emails contain blocks like:
//   <a href="https://www.linkedin.com/jobs/view/4359860602?...">Job Title</a>
//   ... Company Name · Location · N days ago ...
//
// Strategy: find all linkedin.com/jobs/view URLs, then walk nearby text
// for title (anchor text) and company (text after "·" separator).
// ---------------------------------------------------------------------------

function extractLinkedInJobs(html: string, subject = ''): ExtractedJob[] {
  const jobs: ExtractedJob[] = []

  // Match every linkedin.com/jobs/view URL with surrounding context
  // Capture: full URL, anchor text (title)
  const anchorRegex =
    /<a[^>]+href="(https:\/\/www\.linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawUrl = match[1]
    const jobId = match[2]
    const rawTitle = match[3].replace(/<[^>]+>/g, '').trim()

    // Clean URL — strip tracking params, keep canonical job ID
    const cleanUrl = `https://www.linkedin.com/jobs/view/${jobId}`

    if (!rawTitle || rawTitle.length < 3) continue

    // Extract company name: look for text after "·" within ~500 chars after the anchor
    const contextStart = match.index + match[0].length
    const context = html
      .slice(contextStart, contextStart + 600)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // LinkedIn format: "Company Name · Location · N days ago"
    const bulletParts = context
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
    const company = bulletParts[0] && bulletParts[0].length < 80 ? bulletParts[0] : 'Unknown'

    // Second bullet is location (e.g. "São Paulo, SP (Hybrid)" or "Auckland, New Zealand")
    const location = bulletParts[1] && bulletParts[1].length < 100 ? bulletParts[1] : ''

    // Use title + company as the description snippet (full JD fetched later by scorer)
    const description = normalizeText(
      `${rawTitle} at ${company}. Source: LinkedIn job alert email.`
    )

    jobs.push({
      title: normalizeText(rawTitle),
      company_name: normalizeText(company),
      location_raw: normalizeText(location),
      source_url: cleanUrl,
      description,
    })
  }

  // ---------------------------------------------------------------------------
  // Plain-text fallback: Gmail forwarding strips anchor tags and leaves bare URLs.
  // Match linkedin.com/jobs/view/JOBID in raw text (TextBody or stripped HTML).
  // ---------------------------------------------------------------------------
  const plainText = html.replace(/<[^>]+>/g, ' ')
  const plainRegex = /https?:\/\/(?:www\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)[^\s"]*/gi
  let plainMatch: RegExpExecArray | null

  while ((plainMatch = plainRegex.exec(plainText)) !== null) {
    const jobId = plainMatch[1]
    const cleanUrl = `https://www.linkedin.com/jobs/view/${jobId}`

    // Get surrounding text (~300 chars) for title/company inference
    const ctxStart = Math.max(0, plainMatch.index - 100)
    const ctxEnd = Math.min(plainText.length, plainMatch.index + plainMatch[0].length + 300)
    const surrounds = plainText.slice(ctxStart, ctxEnd).replace(/\s+/g, ' ').trim()

    // Try to pull a title from the email subject or surrounding text
    // Subject is not available here — use jobId as fallback; scorer will fetch full JD
    jobs.push({
      title: subject
        ? normalizeText(subject.replace(/^(Fwd?:\s*)+"?/i, '').replace(/"$/, ''))
        : `LinkedIn Job ${jobId}`,
      company_name: 'Unknown',
      location_raw: '',
      source_url: cleanUrl,
      description: normalizeText(
        `LinkedIn job ${jobId}. Context: ${surrounds}. Source: forwarded email.`
      ),
    })
  }

  // Deduplicate by source_url (same job can appear in multiple alert emails)
  const seen = new Set<string>()
  return jobs.filter((j) => {
    if (seen.has(j.source_url)) return false
    seen.add(j.source_url)
    return true
  })
}

// ---------------------------------------------------------------------------
// Generic job URL extractor (Seek, Indeed, recruiter emails, etc.)
//
// Extracts any URL that looks like a job posting from plain text or HTML.
// Less structured than the LinkedIn parser — title and company are inferred
// from surrounding text or left as defaults.
// ---------------------------------------------------------------------------

const JOB_URL_PATTERNS = [
  /https:\/\/www\.seek\.com\.au\/job\/\d+[^\s"<>]*/gi,
  /https:\/\/au\.indeed\.com\/viewjob\?[^\s"<>]*/gi,
  /https:\/\/www\.indeed\.com\/viewjob\?[^\s"<>]*/gi,
  /https:\/\/jobs\.lever\.co\/[^\s"<>]+/gi,
  /https:\/\/boards\.greenhouse\.io\/[^\s"<>]+/gi,
]

function extractGenericJobUrls(html: string, subject: string): ExtractedJob[] {
  const text = html.replace(/<[^>]+>/g, ' ')
  const jobs: ExtractedJob[] = []
  const seen = new Set<string>()

  for (const pattern of JOB_URL_PATTERNS) {
    let match: RegExpExecArray | null
    const re = new RegExp(pattern.source, pattern.flags)
    while ((match = re.exec(text)) !== null) {
      const url = match[0].replace(/[.,;)]+$/, '') // strip trailing punctuation
      if (seen.has(url)) continue
      seen.add(url)
      jobs.push({
        title: subject || 'Job from email',
        company_name: 'Unknown',
        source_url: url,
        description: normalizeText(`Job posting from email: "${subject}". URL: ${url}`),
      })
    }
  }

  return jobs
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate env
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Load runtime config
  const { data: settings } = await supabase
    .from('sats_runtime_settings')
    .select('key, value')
    .in('key', ['postmark_webhook_secret', 'inbound_email_allowlist'])

  const settingsMap: Record<string, string> = {}
  for (const row of settings ?? []) settingsMap[row.key] = row.value

  const webhookSecret = settingsMap['postmark_webhook_secret'] ?? ''
  const allowlistRaw = settingsMap['inbound_email_allowlist'] ?? ''

  // -------------------------------------------------------------------------
  // Guard 1 — Postmark token verification
  // Postmark sends X-Postmark-Signature header with the configured token.
  // When webhookSecret is empty (not yet configured), skip verification so
  // the function still works during initial setup/testing.
  // -------------------------------------------------------------------------
  if (webhookSecret.length > 0) {
    const incoming = req.headers.get('x-postmark-signature') ?? ''
    if (incoming !== webhookSecret) {
      console.warn('inbound-email-ingest: invalid Postmark signature — request rejected')
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Parse body
  let payload: PostmarkInboundPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // -------------------------------------------------------------------------
  // Guard 2 — Sender allowlist
  // Only process emails from known trusted senders.
  // Unknown senders are silently dropped (200 OK) to prevent Postmark retries.
  // -------------------------------------------------------------------------
  const allowlist = allowlistRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  // Extract bare address from "Name <email@domain.com>" format
  const fromRaw = payload.From ?? ''
  const fromMatch = fromRaw.match(/<([^>]+)>/)
  const fromAddr = (fromMatch ? fromMatch[1] : fromRaw).toLowerCase().trim()

  if (allowlist.length > 0 && !allowlist.includes(fromAddr)) {
    console.info(`inbound-email-ingest: sender ${fromAddr} not in allowlist — dropped`)
    return new Response(
      JSON.stringify({ success: true, staged: 0, reason: 'sender_not_allowed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // -------------------------------------------------------------------------
  // Parse email body
  // -------------------------------------------------------------------------
  const html = payload.HtmlBody ?? payload.TextBody ?? ''
  const subject = payload.Subject ?? ''

  // Try LinkedIn parser first; fall back to generic URL extractor
  let extracted: ExtractedJob[] = extractLinkedInJobs(html, subject)
  const isLinkedIn = extracted.length > 0

  if (!isLinkedIn) {
    extracted = extractGenericJobUrls(html, subject)
  }

  if (extracted.length === 0) {
    console.info('inbound-email-ingest: no job URLs found in email body')
    return new Response(JSON.stringify({ success: true, staged: 0, reason: 'no_jobs_found' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // -------------------------------------------------------------------------
  // Stage jobs — deduplicate by content_hash + source_url
  // -------------------------------------------------------------------------
  let staged = 0
  let skipped = 0
  const errors: string[] = []

  for (const job of extracted) {
    try {
      const normalized = normalizeText(job.description)
      const content_hash = await sha256(normalized)
      const source = isLinkedIn ? 'linkedin-email-alert' : 'email-forward'

      const { error } = await supabase
        .from('sats_staged_jobs')
        .insert({
          source,
          source_url: job.source_url,
          title: job.title,
          company_name: job.company_name,
          location_raw: job.location_raw || null,
          description_raw: job.description,
          description_normalized: normalized,
          content_hash,
          status: 'queued',
        })
        .select('id')
        .single()

      if (error) {
        // 23505 = unique_violation (source_url or content_hash already exists)
        if (error.code === '23505') {
          skipped++
        } else {
          errors.push(`${job.source_url}: ${error.message}`)
        }
      } else {
        staged++
      }
    } catch (err) {
      errors.push(`${job.source_url}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  console.info(
    `inbound-email-ingest: from=${fromAddr} subject="${subject}" ` +
      `found=${extracted.length} staged=${staged} skipped=${skipped} errors=${errors.length}`
  )

  return new Response(
    JSON.stringify({
      success: true,
      from: fromAddr,
      subject,
      source: isLinkedIn ? 'linkedin-email-alert' : 'email-forward',
      found: extracted.length,
      staged,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
