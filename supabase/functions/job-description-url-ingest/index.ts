/**
 * UPDATE LOG
 * 2026-03-18 00:00:00 | CR4-2 + CR1-2: Add missing UPDATE LOG header; replace inline CORS block with shared _shared/cors.ts import.
 * 2026-04-01 00:00:00 | UX-FILE-1: Detect SPA shell pages, extract title hint from URL slug, return content_quality/is_spa_shell/title_hint fields.
 * 2026-04-01 12:00:00 | UX-FILE-1 continued: Add JSON-LD JobPosting schema extraction (Workday, Greenhouse, Lever, ADP, etc.).
 * 2026-04-01 13:00:00 | UX-FILE-1 fix: Replace content-word SPA detection (false-negative on EEO footer "requirements") with HTML structural signals (<div id="root">, __NEXT_DATA__, etc.) + short-text length check.
 * 2026-04-01 14:00:00 | UX-FILE-1 fix 2: Remove hasSpaSignal requirement — short stripped text alone is sufficient. Databricks uses a custom framework with no standard React/Next.js HTML markers, so signal check always failed. Any page with <800 chars of visible text is useless for extraction regardless of framework.
 * 2026-04-01 15:00:00 | UX-FILE-1 fix 3: Replace char-count threshold (unreliable — Databricks nav+EEO footer exceeds 800) with substantial-lines count. A real job description has >= MIN_SUBSTANTIAL_LINES lines of >= 20 words. Nav dumps have only 0-2 such lines (EEO footer); real JDs have 10+.
 *                       Fix URL slug parser for Workday _JR-suffix and --- triple-dash patterns.
 *                       Return jsonld_job field with normalised title/company/location/employmentType.
 *                       When JSON-LD is present, override is_spa_shell=false and content_quality=high.
 *                       Include blocked_host in 403 error for site-specific UI hints (e.g. Seek).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'

// ---------------------------------------------------------------------------
// HTML utilities
// ---------------------------------------------------------------------------

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')

  const withLineBreaks = withoutScripts
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|section|article|li|h1|h2|h3|h4|h5|h6)\s*>/gi, '\n')

  const stripped = withLineBreaks.replace(/<[^>]+>/g, ' ')
  return decodeHtmlEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// JSON-LD JobPosting extraction
// ---------------------------------------------------------------------------

interface JsonLdJob {
  title: string | null
  company: string | null
  location: { city: string | null; state: string | null; country: string | null } | null
  employmentType: string | null
  description: string | null
}

/**
 * ISO 3166-1 alpha-2 country codes → full names for common hiring markets.
 * Workday stores country as "NZ", "AU", "US", "GB" etc.
 */
const COUNTRY_CODE_MAP: Record<string, string> = {
  NZ: 'New Zealand',
  AU: 'Australia',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  SG: 'Singapore',
  IN: 'India',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  IE: 'Ireland',
}

function resolveCountry(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return COUNTRY_CODE_MAP[trimmed.toUpperCase()] || trimmed || null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : null
}

/** Strip HTML tags from a description string (JSON-LD descriptions can contain HTML). */
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Walk a parsed JSON-LD object/array to find the first node with @type === "JobPosting".
 * Handles both single objects and @graph arrays.
 */
function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
    return obj
  }
  // Check @graph
  if (obj['@graph']) {
    return findJobPosting(obj['@graph'])
  }
  return null
}

/**
 * Extract structured job data from any JSON-LD <script type="application/ld+json"> tags
 * embedded in the raw HTML. Returns null if no JobPosting schema is found.
 *
 * Works for: Workday, Greenhouse, Lever, SmartRecruiters, ADP, Taleo, iCIMS, etc.
 * All modern ATS providers embed Schema.org JobPosting for SEO — even SPA shells include
 * this in the initial HTML payload before JS hydration.
 */
function extractJsonLdJobPosting(rawHtml: string): JsonLdJob | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(rawHtml)) !== null) {
    const jsonText = match[1].trim()
    if (!jsonText) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      continue
    }

    const posting = findJobPosting(parsed)
    if (!posting) continue

    // --- title ---
    const title = cleanText(posting['title'])

    // --- company (hiringOrganization) ---
    let company: string | null = null
    const org = posting['hiringOrganization']
    if (org && typeof org === 'object') {
      company = cleanText((org as Record<string, unknown>)['name'])
    }

    // --- location (jobLocation) ---
    let location: JsonLdJob['location'] = null
    const jobLoc = posting['jobLocation']
    const locNode = Array.isArray(jobLoc) ? jobLoc[0] : jobLoc
    if (locNode && typeof locNode === 'object') {
      const addr = (locNode as Record<string, unknown>)['address']
      if (addr && typeof addr === 'object') {
        const a = addr as Record<string, unknown>
        location = {
          city: cleanText(a['addressLocality']),
          state: cleanText(a['addressRegion']),
          country: resolveCountry(cleanText(a['addressCountry'])),
        }
      }
    }

    // --- employmentType ---
    let employmentType: string | null = null
    const rawType = posting['employmentType']
    if (typeof rawType === 'string') {
      employmentType = rawType.replace(/_/g, '-').toLowerCase()
    } else if (Array.isArray(rawType) && typeof rawType[0] === 'string') {
      employmentType = rawType[0].replace(/_/g, '-').toLowerCase()
    }

    // --- description (strip HTML, cap at 8000 chars for downstream extraction) ---
    let description: string | null = null
    const rawDesc = posting['description']
    if (typeof rawDesc === 'string') {
      const stripped = stripHtml(rawDesc)
      description = stripped.length > 8000 ? stripped.slice(0, 8000) + '…' : stripped
    }

    // Only return if we got at least a title or company
    if (title || company) {
      return { title, company, location, employmentType, description }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// SPA shell detection — HTML-level signals (not content text)
// ---------------------------------------------------------------------------

/**
 * Detect SPA shells from the RAW HTML before text extraction.
 *
 * Strategy: use structural HTML signals that are unambiguous, not content words
 * that can appear in EEO/compliance footer text (e.g. "requirements").
 *
 * Positive SPA signals (HTML structure):
 *   - React root mount points: <div id="root">, <div id="app">, <div id="__next">
 *   - Next.js data island: __NEXT_DATA__
 *   - Gatsby: window.___gatsby
 *   - Nuxt: __NUXT__
 *   - Generic SPA bootstrap with empty body: <body>\s*<div id="...">
 *   - Explicit JS-required messages
 *
 * Confidence booster: if the stripped text is shorter than MIN_USEFUL_CHARS after
 * removing nav/boilerplate signals, it's almost certainly a shell regardless.
 *
 * We do NOT check for job content keywords here — they are too common in footer
 * legal/EEO text and will produce false negatives (as seen with Databricks).
 */

// Raw HTML signals that indicate a React/Next/Nuxt/Gatsby SPA
const HTML_SPA_SIGNALS = [
  '<div id="root"',
  '<div id="app"',
  '<div id="__next"',
  '__NEXT_DATA__',
  'window.___gatsby',
  '__NUXT__',
  'enable javascript to run this app',
  'you need to enable javascript',
  'javascript is required to use this site',
  'this site requires javascript',
]

// Stripped text markers that confirm explicit JS-gating (definitive hard gate)
const TEXT_JS_GATE_MARKERS = [
  'enable javascript to run this app',
  'you need to enable javascript',
  'javascript is required',
  'this app requires javascript',
]

/**
 * Count lines with >= minWords words.
 * Real job descriptions: many paragraphs / bullet points with 20+ words each (10+).
 * Nav/SPA shell dumps: only 0-2 long lines (EEO boilerplate) — rest are short nav items.
 * This is the only signal that reliably separates Databricks nav+EEO (~2 long lines)
 * from real job content (~10+ long lines), regardless of JS framework used.
 */
const MIN_SUBSTANTIAL_LINES = 4 // below this → SPA/nav shell
const MIN_WORDS_PER_SUBSTANTIAL_LINE = 20

function countSubstantialLines(text: string): number {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.split(/\s+/).filter(Boolean).length >= MIN_WORDS_PER_SUBSTANTIAL_LINE).length
}

function assessContentQuality(
  rawHtml: string,
  strippedText: string,
  hasJsonLd: boolean
): { isSpaShell: boolean; contentQuality: 'high' | 'low' } {
  if (hasJsonLd) return { isSpaShell: false, contentQuality: 'high' }

  const lowerHtml = rawHtml.toLowerCase()
  const lowerText = strippedText.toLowerCase()

  // 1. Hard JS-gate message in visible text — definitive, fast exit
  if (TEXT_JS_GATE_MARKERS.some((m) => lowerText.includes(m))) {
    return { isSpaShell: true, contentQuality: 'low' }
  }

  // 2. Substantial-lines check — primary reliable signal.
  //    Counts lines with >= MIN_WORDS_PER_SUBSTANTIAL_LINE words.
  //    Databricks (and similar custom-framework SPAs): nav items are all short phrases;
  //    only EEO footer contributes ~2 long lines → below threshold → SPA shell.
  //    Real job descriptions: role description + bullets + requirements = 10+ long lines.
  //    Not fooled by char count (nav dump can be thousands of chars) or by EEO footer alone.
  const substantialLineCount = countSubstantialLines(strippedText)
  const hasSubstantialContent = substantialLineCount >= MIN_SUBSTANTIAL_LINES

  // 3. HTML structural SPA signals (React, Next.js, Gatsby, Nuxt) — bonus override
  const hasSpaSignal = HTML_SPA_SIGNALS.some((s) => lowerHtml.includes(s.toLowerCase()))

  const isSpaShell = !hasSubstantialContent || hasSpaSignal
  const contentQuality = isSpaShell ? 'low' : 'high'
  return { isSpaShell, contentQuality }
}

// ---------------------------------------------------------------------------
// URL slug title hint
// ---------------------------------------------------------------------------

/**
 * Extracts a human-readable job title hint from the URL path slug.
 * Handles:
 *   - Databricks: "manager-professional-services-8445817002"      → "Manager Professional Services"
 *   - Workday:    "Technology-Delivery-Lead---9-months-contract_JR107011" → "Technology Delivery Lead 9 Months Contract"
 *   - LinkedIn:   "4388892124"                                    → null (pure numeric — skip)
 */
function extractTitleFromUrlSlug(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const lastSegment = segments[segments.length - 1]

  // Skip pure-numeric segments (e.g. LinkedIn job IDs)
  if (/^\d+$/.test(lastSegment)) return null

  let slug = lastSegment
  // Strip Workday-style _JR123456 job-ref suffix (underscore + letters + digits at end)
  slug = slug.replace(/_[A-Z]{1,4}\d{4,}$/i, '')
  // Strip trailing numeric-only ID (Databricks style: -8445817002)
  slug = slug.replace(/-\d{6,}$/, '').replace(/^\d{6,}-/, '')
  // Collapse triple-or-more dashes (Workday: "---") into single space
  slug = slug.replace(/-{2,}/g, ' ')
  // Replace remaining hyphens/underscores with spaces
  slug = slug.replace(/[-_]+/g, ' ').trim()

  if (!slug || slug.length < 3) return null

  // Title-case each word
  const readable = slug.replace(/\b\w/g, (c) => c.toUpperCase())
  return readable.length > 3 ? readable : null
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ success: false, error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const rawUrl = String(body?.url || '').trim()

    if (!rawUrl) {
      return new Response(JSON.stringify({ success: false, error: 'url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only http(s) URLs are supported' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SmartATS-Ingestion/1.0; +https://smartats.io/bot)',
        Accept: 'text/html, text/plain;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }).finally(() => clearTimeout(timeout))

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unable to fetch URL content (${response.status})`,
          // Include hostname so the UI can show site-specific advice (e.g. "Seek blocks bots")
          blocked_host: parsedUrl.hostname,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const isLikelyHtmlOrText =
      contentType.includes('text/html') || contentType.includes('text/plain')

    const rawBody = await response.text()
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'URL returned empty content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Try JSON-LD first — works for Workday, Greenhouse, Lever, etc.
    const jsonldJob = isLikelyHtmlOrText ? extractJsonLdJobPosting(rawBody) : null

    const titleMatch = rawBody.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const pageTitle = titleMatch ? htmlToText(titleMatch[1]) : null
    const extractedText = isLikelyHtmlOrText ? htmlToText(rawBody) : rawBody.trim()

    // When JSON-LD has a description, append it to extracted text so skills can be parsed
    const fullText = jsonldJob?.description
      ? `${jsonldJob.description}\n\n${extractedText}`
      : extractedText

    const boundedText =
      fullText.length > 50_000 ? `${fullText.slice(0, 50_000)}...[truncated]` : fullText

    const { isSpaShell, contentQuality } = assessContentQuality(rawBody, boundedText, !!jsonldJob)
    const titleHint = !jsonldJob ? extractTitleFromUrlSlug(parsedUrl) : null

    return new Response(
      JSON.stringify({
        success: true,
        url: parsedUrl.toString(),
        page_title: pageTitle,
        extracted_text: boundedText,
        content_length: boundedText.length,
        content_quality: contentQuality,
        is_spa_shell: isSpaShell,
        title_hint: titleHint,
        jsonld_job: jsonldJob,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ success: false, error: `URL ingestion failed: ${message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
