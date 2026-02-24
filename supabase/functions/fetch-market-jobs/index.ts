/**
 * UPDATE LOG
 * 2026-02-24 18:20:00 | P14 Story 1: Added scheduled staging worker with mock market jobs, URL/hash dedupe, and centralized logging.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:8080'
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') || DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
)

const MOCK_JOBS: Array<{
  source: string
  source_url: string
  title: string
  company_name: string
  description: string
}> = [
  {
    source: 'mock-linkedin',
    source_url: 'https://example.com/jobs/senior-react-engineer-1001',
    title: 'Senior React Engineer',
    company_name: 'Northstar Labs',
    description:
      'Build production React and TypeScript apps, partner with product/design, optimize performance, and mentor engineers. Experience with testing and CI/CD preferred.',
  },
  {
    source: 'mock-aggregator',
    source_url: 'https://example.com/jobs/fullstack-ai-platform-1002',
    title: 'Full-Stack AI Platform Developer',
    company_name: 'VectorWorks',
    description:
      'Develop TypeScript services and React interfaces for AI workflows. Build APIs, integrate LLM providers, and work with PostgreSQL and observability tooling.',
  },
  {
    source: 'mock-remote',
    source_url: 'https://example.com/jobs/product-engineer-growth-1003',
    title: 'Product Engineer, Growth',
    company_name: 'SignalForge',
    description:
      'Ship customer-facing features quickly, run A/B experiments, instrument analytics, and collaborate with marketing. Strong frontend and SQL skills required.',
  },
]

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true
  return ALLOWED_ORIGINS.has('*') || ALLOWED_ORIGINS.has(origin)
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.has('*')
    ? '*'
    : origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'null'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
  message: string,
  metadata: Record<string, unknown>,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const functionsBaseUrl =
    Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
    supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
  const loggingEndpoint = `${functionsBaseUrl}/functions/v1/centralized-logging`

  try {
    await fetch(loggingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        script_name: 'fetch-market-jobs',
        log_level: level,
        message,
        metadata: {
          event_name: 'proactive_market_fetch.lifecycle',
          component: 'fetch-market-jobs',
          operation: 'stage_market_jobs',
          outcome: level === 'ERROR' ? 'failure' : 'info',
          ...metadata,
        },
      }),
    })
  } catch (_error) {
    // Do not fail fetch flow due to telemetry errors.
  }
}

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ success: false, error: 'Supabase env not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const startedAt = Date.now()
  let stagedCount = 0
  let skippedByHash = 0
  let failedCount = 0

  await logEvent(
    'INFO',
    'Starting staged market job fetch run',
    { mock_jobs_count: MOCK_JOBS.length },
    supabaseUrl,
    supabaseServiceKey
  )

  for (const job of MOCK_JOBS) {
    try {
      const sourceUrl = normalizeText(job.source_url)
      const title = normalizeText(job.title)
      const companyName = normalizeText(job.company_name)
      const descriptionRaw = normalizeText(job.description)
      const descriptionNormalized = descriptionRaw.toLowerCase()
      const contentHash = await sha256(descriptionNormalized)

      const { data: existingByHash, error: existingByHashError } = await supabase
        .from('sats_staged_jobs')
        .select('id, source_url')
        .eq('content_hash', contentHash)
        .neq('source_url', sourceUrl)
        .limit(1)

      if (existingByHashError) {
        throw existingByHashError
      }

      if (existingByHash && existingByHash.length > 0) {
        skippedByHash += 1
        continue
      }

      const { error: upsertError } = await supabase.from('sats_staged_jobs').upsert(
        {
          source: job.source,
          source_url: sourceUrl,
          title,
          company_name: companyName,
          description_raw: descriptionRaw,
          description_normalized: descriptionNormalized,
          content_hash: contentHash,
          fetched_at: new Date().toISOString(),
          status: 'queued',
          error_message: null,
        },
        {
          onConflict: 'source_url',
          ignoreDuplicates: false,
        }
      )

      if (upsertError) {
        throw upsertError
      }

      stagedCount += 1
    } catch (error) {
      failedCount += 1
      await logEvent(
        'ERROR',
        'Failed to stage market job row',
        {
          source_url: job.source_url,
          error: error instanceof Error ? error.message : String(error),
        },
        supabaseUrl,
        supabaseServiceKey
      )
    }
  }

  const durationMs = Date.now() - startedAt

  await logEvent(
    failedCount > 0 ? 'ERROR' : 'INFO',
    'Completed staged market job fetch run',
    {
      mock_jobs_count: MOCK_JOBS.length,
      staged_count: stagedCount,
      skipped_by_hash: skippedByHash,
      failed_count: failedCount,
      duration_ms: durationMs,
    },
    supabaseUrl,
    supabaseServiceKey
  )

  return new Response(
    JSON.stringify({
      success: failedCount === 0,
      data: {
        processed: MOCK_JOBS.length,
        staged: stagedCount,
        skipped_by_hash: skippedByHash,
        failed: failedCount,
        duration_ms: durationMs,
      },
    }),
    {
      status: failedCount > 0 ? 207 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
