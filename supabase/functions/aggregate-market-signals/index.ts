/**
 * UPDATE LOG
 * 2026-04-05 19:30:00 | P26 S2-1 — Create aggregate-market-signals edge function.
 *   Reads structured extraction data from sats_staged_jobs (status=processed,
 *   structured_extracted_at IS NOT NULL) and aggregates frequency signals into
 *   sats_market_signals for 30-day and 90-day windows. Runs nightly via cron
 *   (configured via Supabase Dashboard > Edge Functions > Schedules: 0 2 * * *).
 *   Also callable on-demand for backfill. Service-role only — no user auth.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalType = 'certification' | 'tool' | 'methodology'

type StagedJobSignalRow = {
  id: string
  role_family_id: string | null
  market_code: string | null
  certifications: string[]
  tools: string[]
  methodologies: string[]
  structured_extracted_at: string
}

type SignalAccumulator = Map<string, number> // signal_value → posting count

type GroupKey = `${string}:${string}` // `${role_family_id}:${market_code}`

type GroupData = {
  role_family_id: string
  market_code: string
  total_postings: number
  certification_counts: SignalAccumulator
  tool_counts: SignalAccumulator
  methodology_counts: SignalAccumulator
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WINDOWS: Array<{ label: string; days: number }> = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function windowDates(days: number): { window_start: string; window_end: string } {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days)
  return {
    window_start: start.toISOString().split('T')[0],
    window_end: end.toISOString().split('T')[0],
  }
}

function incrementAccumulator(acc: SignalAccumulator, values: string[]): void {
  for (const val of values) {
    const normalized = val.trim()
    if (!normalized) continue
    acc.set(normalized, (acc.get(normalized) ?? 0) + 1)
  }
}

function buildGroupKey(roleFamilyId: string, marketCode: string): GroupKey {
  return `${roleFamilyId}:${marketCode}` as GroupKey
}

async function logEvent(
  level: 'INFO' | 'ERROR',
  message: string,
  metadata: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
  requestId: string
): Promise<void> {
  const functionsBaseUrl =
    Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
    supabaseUrl.replace('.supabase.co', '.functions.supabase.co')

  try {
    await fetch(`${functionsBaseUrl}/functions/v1/centralized-logging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        script_name: 'aggregate-market-signals',
        log_level: level,
        message,
        request_id: requestId,
        metadata: {
          event_name: 'aggregate_market_signals.lifecycle',
          component: 'aggregate-market-signals',
          ...metadata,
        },
      }),
    })
  } catch {
    // Telemetry must not block
  }
}

// ─── Main aggregation logic ──────────────────────────────────────────────────

async function aggregateForWindow(
  supabase: ReturnType<typeof createClient>,
  windowDays: number,
  requestId: string
): Promise<{ role_families_processed: number; signals_upserted: number }> {
  const { window_start, window_end } = windowDates(windowDays)

  // Fetch all processed jobs in this window that have structured extraction data
  const { data: jobs, error: jobsError } = await supabase
    .from('sats_staged_jobs')
    .select(
      'id, role_family_id, market_code, certifications, tools, methodologies, structured_extracted_at'
    )
    .eq('status', 'processed')
    .not('structured_extracted_at', 'is', null)
    .not('role_family_id', 'is', null)
    .not('market_code', 'is', null)
    .gte('structured_extracted_at', window_start)
    .lte('structured_extracted_at', window_end)

  if (jobsError) throw new Error(`Failed to fetch staged jobs: ${jobsError.message}`)

  const rows = (jobs ?? []) as StagedJobSignalRow[]
  if (rows.length === 0) {
    return { role_families_processed: 0, signals_upserted: 0 }
  }

  // Group by (role_family_id, market_code) and accumulate signal counts
  const groups = new Map<GroupKey, GroupData>()

  for (const row of rows) {
    if (!row.role_family_id || !row.market_code) continue

    const key = buildGroupKey(row.role_family_id, row.market_code)
    if (!groups.has(key)) {
      groups.set(key, {
        role_family_id: row.role_family_id,
        market_code: row.market_code,
        total_postings: 0,
        certification_counts: new Map(),
        tool_counts: new Map(),
        methodology_counts: new Map(),
      })
    }

    const group = groups.get(key)!
    group.total_postings += 1
    incrementAccumulator(group.certification_counts, row.certifications ?? [])
    incrementAccumulator(group.tool_counts, row.tools ?? [])
    incrementAccumulator(group.methodology_counts, row.methodologies ?? [])
  }

  // Build upsert rows for sats_market_signals
  const signalRows: Array<{
    role_family_id: string
    market_code: string
    signal_type: SignalType
    signal_value: string
    frequency_pct: number
    posting_count: number
    window_start: string
    window_end: string
  }> = []

  for (const group of groups.values()) {
    const { role_family_id, market_code, total_postings } = group

    const buildSignalRows = (acc: SignalAccumulator, type: SignalType) => {
      for (const [signal_value, count] of acc.entries()) {
        signalRows.push({
          role_family_id,
          market_code,
          signal_type: type,
          signal_value,
          frequency_pct: Math.round((count / total_postings) * 100 * 10) / 10, // 1 decimal place
          posting_count: total_postings,
          window_start,
          window_end,
        })
      }
    }

    buildSignalRows(group.certification_counts, 'certification')
    buildSignalRows(group.tool_counts, 'tool')
    buildSignalRows(group.methodology_counts, 'methodology')
  }

  if (signalRows.length === 0) {
    return { role_families_processed: groups.size, signals_upserted: 0 }
  }

  // Upsert in batches of 100 to avoid payload limits
  const BATCH_SIZE = 100
  let upsertedCount = 0

  for (let i = 0; i < signalRows.length; i += BATCH_SIZE) {
    const batch = signalRows.slice(i, i + BATCH_SIZE)
    const { error: upsertError } = await supabase.from('sats_market_signals').upsert(batch, {
      onConflict: 'role_family_id,market_code,signal_type,signal_value,window_start,window_end',
      ignoreDuplicates: false,
    })

    if (upsertError) {
      console.error(
        `[aggregate-market-signals] Upsert batch ${i / BATCH_SIZE} failed: ${upsertError.message}`
      )
      // Continue — partial failure is recoverable on next run
    } else {
      upsertedCount += batch.length
    }
  }

  return { role_families_processed: groups.size, signals_upserted: upsertedCount }
}

// ─── Serve ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!isOriginAllowed(origin) && req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required env configuration' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const requestId = `ams-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const supabase = createClient(supabaseUrl, serviceKey)
  const startedAt = Date.now()

  await logEvent(
    'INFO',
    'Aggregate market signals started',
    { windows: WINDOWS.map((w) => w.label) },
    supabaseUrl,
    serviceKey,
    requestId
  )

  try {
    const results: Record<string, { role_families_processed: number; signals_upserted: number }> =
      {}

    for (const window of WINDOWS) {
      results[window.label] = await aggregateForWindow(supabase, window.days, requestId)
    }

    const totalSignals = Object.values(results).reduce((sum, r) => sum + r.signals_upserted, 0)
    const durationMs = Date.now() - startedAt

    await logEvent(
      'INFO',
      'Aggregate market signals completed',
      { results, total_signals_upserted: totalSignals, duration_ms: durationMs },
      supabaseUrl,
      serviceKey,
      requestId
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          request_id: requestId,
          windows: results,
          total_signals_upserted: totalSignals,
          duration_ms: durationMs,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await logEvent(
      'ERROR',
      'Aggregate market signals failed',
      { error: message },
      supabaseUrl,
      serviceKey,
      requestId
    )

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
