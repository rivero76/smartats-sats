/**
 * UPDATE LOG
 * 2026-04-05 21:00:00 | P26 S4-1 — Create generate-gap-matrix edge function.
 *   On-demand, user-triggered. Computes the gap between a user's skill profile and
 *   market frequency signals for a given (role_family_id, market_code). Classifies
 *   gaps as critical (≥50% frequency, missing), important (20–50%), or nice_to_have
 *   (<20%). LLM (gpt-4.1-mini) generates recommended_action, estimated_weeks_to_close,
 *   and resume_language_template for each critical + important gap. Writes results to
 *   sats_gap_snapshots + sats_gap_items (upsert on today's date).
 * 2026-04-07 23:50:00 | WAF REL-2 — Add fallback model candidate so a transient gpt-4.1-mini
 *   error falls through to gpt-4o-mini instead of failing the entire gap matrix.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llmProvider.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityTier = 'critical' | 'important' | 'nice_to_have'
type CandidateStatus = 'missing' | 'in_progress' | 'held'

type MarketSignal = {
  signal_type: string
  signal_value: string
  frequency_pct: number
  window_end: string
}

type SkillProfileRow = {
  skill_name: string
  category: string
  certification_status: string | null
}

type GapItem = {
  signal_type: string
  signal_value: string
  frequency_pct: number
  priority_tier: PriorityTier
  candidate_status: CandidateStatus
  recommended_action?: string
  estimated_weeks_to_close?: number | null
  resume_language_template?: string | null
}

type GapRecommendation = {
  signal_value: string
  recommended_action: string
  estimated_weeks_to_close: number | null
  resume_language_template: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OPENAI_MODEL_GAP = Deno.env.get('OPENAI_MODEL_ENRICH') || 'gpt-4.1-mini'
const OPENAI_MODEL_GAP_FALLBACK = Deno.env.get('OPENAI_MODEL_ENRICH_FALLBACK') || 'gpt-4o-mini'

// Frequency thresholds for gap priority classification
const CRITICAL_THRESHOLD = 50 // ≥50% → critical
const IMPORTANT_THRESHOLD = 20 // 20–50% → important, <20% → nice_to_have

const GAP_RECOMMENDATIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'signal_value',
          'recommended_action',
          'estimated_weeks_to_close',
          'resume_language_template',
        ],
        properties: {
          signal_value: { type: 'string' },
          recommended_action: { type: 'string' },
          estimated_weeks_to_close: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
          resume_language_template: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyPriority(frequencyPct: number, status: CandidateStatus): PriorityTier {
  if (status === 'in_progress') return 'nice_to_have' // partial gap = lower priority
  if (frequencyPct >= CRITICAL_THRESHOLD) return 'critical'
  if (frequencyPct >= IMPORTANT_THRESHOLD) return 'important'
  return 'nice_to_have'
}

function deriveCandidateStatus(
  signalValue: string,
  signalType: string,
  skillProfiles: SkillProfileRow[]
): CandidateStatus {
  const normalizedSignal = signalValue.toLowerCase().trim()

  for (const sp of skillProfiles) {
    const normalizedSkill = sp.skill_name.toLowerCase().trim()

    // Exact match or signal contained in skill name (or vice versa)
    if (
      normalizedSkill === normalizedSignal ||
      normalizedSkill.includes(normalizedSignal) ||
      normalizedSignal.includes(normalizedSkill)
    ) {
      // For certifications, respect explicit status field
      if (sp.category === 'certification' && signalType === 'certification') {
        if (sp.certification_status === 'in_progress') return 'in_progress'
        if (sp.certification_status === 'planned') return 'in_progress' // planned = partial
        if (sp.certification_status === 'held') return 'held'
        // certification in profile but no status set → treat as held (user has it)
        return 'held'
      }

      return 'held'
    }
  }

  return 'missing'
}

function calculateOverallGapScore(items: GapItem[]): number {
  if (items.length === 0) return 0

  const gapItems = items.filter((i) => i.candidate_status !== 'held')
  if (gapItems.length === 0) return 0

  // Weighted score: critical=3pts, important=2pts, nice_to_have=1pt
  const totalWeight = items.length * 3
  const gapWeight = gapItems.reduce((sum, item) => {
    if (item.priority_tier === 'critical') return sum + 3
    if (item.priority_tier === 'important') return sum + 2
    return sum + 1
  }, 0)

  return Math.round((gapWeight / totalWeight) * 100)
}

async function generateRecommendations(
  gapItems: GapItem[],
  roleFamilyName: string,
  marketCode: string
): Promise<Map<string, GapRecommendation>> {
  const actionableItems = gapItems.filter(
    (i) => i.priority_tier === 'critical' || i.priority_tier === 'important'
  )

  if (actionableItems.length === 0) return new Map()

  const itemList = actionableItems
    .map((i) => `- ${i.signal_type}: "${i.signal_value}" (frequency: ${i.frequency_pct}%)`)
    .join('\n')

  const marketLabels: Record<string, string> = {
    nz: 'New Zealand',
    au: 'Australia',
    uk: 'United Kingdom',
    br: 'Brazil',
    us: 'United States',
  }
  const marketLabel = marketLabels[marketCode] ?? marketCode

  const llmResult = await callLLM({
    systemPrompt:
      'You are a career development advisor. For each skill/certification gap, provide a specific action, realistic time estimate, and a template phrase the candidate can use on their CV once they acquire it. Be concise and practical.',
    userPrompt: `Target role: ${roleFamilyName}\nTarget market: ${marketLabel}\n\nGaps to address (ordered by importance):\n${itemList}\n\nFor each gap, return:\n- recommended_action: a specific next step (e.g. "Complete AWS Solutions Architect Associate certification via official AWS training")\n- estimated_weeks_to_close: realistic weeks to address this gap (null if unknown)\n- resume_language_template: exact phrase for the CV once achieved (e.g. "AWS Certified Solutions Architect – Associate (2026)")`,
    modelCandidates: [OPENAI_MODEL_GAP, OPENAI_MODEL_GAP_FALLBACK],
    jsonSchema: GAP_RECOMMENDATIONS_SCHEMA,
    schemaName: 'gap_recommendations',
    temperature: 0.3,
    maxTokens: 1500,
    retryAttempts: 1,
    taskLabel: 'gap-matrix',
  })

  const parsed = JSON.parse(llmResult.rawContent)
  const map = new Map<string, GapRecommendation>()

  for (const rec of (parsed.recommendations ?? []) as GapRecommendation[]) {
    map.set(rec.signal_value.toLowerCase().trim(), rec)
  }

  return map
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
        script_name: 'generate-gap-matrix',
        log_level: level,
        message,
        request_id: requestId,
        metadata: { event_name: 'generate_gap_matrix.lifecycle', ...metadata },
      }),
    })
  } catch {
    // Telemetry must not block
  }
}

// ─── Serve ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!isOriginAllowed(origin)) {
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

  if (!supabaseUrl || !serviceKey || !Deno.env.get('OPENAI_API_KEY')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required env configuration' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Auth — extract user from JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userToken = authHeader.replace('Bearer ', '')

  // Parse request body
  let roleFamilyId: string
  let marketCode: string
  try {
    const body = await req.json()
    roleFamilyId = body.role_family_id
    marketCode = body.market_code
    if (!roleFamilyId || !marketCode) throw new Error('Missing role_family_id or market_code')
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request body: role_family_id and market_code required',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Use user-scoped client for user data reads; service client for writes
  const userClient = createClient(supabaseUrl, userToken)
  const serviceClient = createClient(supabaseUrl, serviceKey)

  // Validate user auth
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const requestId = `ggm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startedAt = Date.now()

  await logEvent(
    'INFO',
    'Gap matrix generation started',
    { user_id: user.id, role_family_id: roleFamilyId, market_code: marketCode },
    supabaseUrl,
    serviceKey,
    requestId
  )

  try {
    // ── 1. Fetch role family name ─────────────────────────────────────────
    const { data: roleFamily, error: rfError } = await serviceClient
      .from('sats_role_families')
      .select('id, name')
      .eq('id', roleFamilyId)
      .single()

    if (rfError || !roleFamily) {
      return new Response(JSON.stringify({ success: false, error: 'Role family not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Fetch latest market signals for this role/market ───────────────
    // Get the most recent window_end date first
    const { data: latestWindow } = await serviceClient
      .from('sats_market_signals')
      .select('window_end')
      .eq('role_family_id', roleFamilyId)
      .eq('market_code', marketCode)
      .order('window_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestWindow) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'No market signals available for this role and market. Connect your job alert emails in Settings to start ingesting real job postings.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: signalRows, error: signalError } = await serviceClient
      .from('sats_market_signals')
      .select('signal_type, signal_value, frequency_pct, window_end')
      .eq('role_family_id', roleFamilyId)
      .eq('market_code', marketCode)
      .eq('window_end', latestWindow.window_end)
      .order('frequency_pct', { ascending: false })

    if (signalError) throw signalError
    const signals = (signalRows ?? []) as MarketSignal[]

    // ── 3. Fetch user's skill profile ────────────────────────────────────
    const { data: skillRows, error: skillError } = await userClient
      .from('sats_skill_profiles')
      .select('skill_name, category, certification_status')
      .eq('user_id', user.id)

    if (skillError) throw skillError
    const skillProfiles = (skillRows ?? []) as SkillProfileRow[]

    // ── 4. Compute gap items ─────────────────────────────────────────────
    const gapItems: GapItem[] = []

    for (const signal of signals) {
      const candidateStatus = deriveCandidateStatus(
        signal.signal_value,
        signal.signal_type,
        skillProfiles
      )

      // 'held' skills are not gaps — skip them
      if (candidateStatus === 'held') continue

      const priorityTier = classifyPriority(signal.frequency_pct, candidateStatus)

      gapItems.push({
        signal_type: signal.signal_type,
        signal_value: signal.signal_value,
        frequency_pct: signal.frequency_pct,
        priority_tier: priorityTier,
        candidate_status: candidateStatus,
      })
    }

    // ── 5. LLM recommendations for critical + important gaps ─────────────
    const recommendations = await generateRecommendations(
      gapItems,
      (roleFamily as any).name,
      marketCode
    )

    // Merge recommendations into gap items
    for (const item of gapItems) {
      const rec = recommendations.get(item.signal_value.toLowerCase().trim())
      if (rec) {
        item.recommended_action = rec.recommended_action
        item.estimated_weeks_to_close = rec.estimated_weeks_to_close
        item.resume_language_template = rec.resume_language_template
      }
    }

    // ── 6. Compute summary stats ─────────────────────────────────────────
    const criticalCount = gapItems.filter((i) => i.priority_tier === 'critical').length
    const importantCount = gapItems.filter((i) => i.priority_tier === 'important').length
    const niceToHaveCount = gapItems.filter((i) => i.priority_tier === 'nice_to_have').length
    const overallGapScore = calculateOverallGapScore([
      ...gapItems,
      // Include held signals (not gaps) for denominator context
      ...signals
        .filter(
          (s) => deriveCandidateStatus(s.signal_value, s.signal_type, skillProfiles) === 'held'
        )
        .map((s) => ({
          signal_type: s.signal_type,
          signal_value: s.signal_value,
          frequency_pct: s.frequency_pct,
          priority_tier: 'nice_to_have' as PriorityTier,
          candidate_status: 'held' as CandidateStatus,
        })),
    ])

    const today = new Date().toISOString().split('T')[0]

    // ── 7. Upsert snapshot ───────────────────────────────────────────────
    const { data: snapshot, error: snapshotError } = await serviceClient
      .from('sats_gap_snapshots')
      .upsert(
        {
          user_id: user.id,
          role_family_id: roleFamilyId,
          market_code: marketCode,
          snapshot_date: today,
          overall_gap_score: overallGapScore,
          critical_gap_count: criticalCount,
          important_gap_count: importantCount,
          nice_to_have_gap_count: niceToHaveCount,
          market_signals_window_end: latestWindow.window_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role_family_id,market_code,snapshot_date', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (snapshotError) throw snapshotError

    // ── 8. Replace gap items for this snapshot ───────────────────────────
    // Delete old items first (snapshot refresh replaces all items)
    await serviceClient
      .from('sats_gap_items')
      .delete()
      .eq('snapshot_id', (snapshot as any).id)

    if (gapItems.length > 0) {
      const itemRows = gapItems.map((item) => ({
        snapshot_id: (snapshot as any).id,
        user_id: user.id,
        signal_type: item.signal_type,
        signal_value: item.signal_value,
        frequency_pct: item.frequency_pct,
        priority_tier: item.priority_tier,
        candidate_status: item.candidate_status,
        recommended_action: item.recommended_action ?? null,
        estimated_weeks_to_close: item.estimated_weeks_to_close ?? null,
        resume_language_template: item.resume_language_template ?? null,
      }))

      const { error: itemsError } = await serviceClient.from('sats_gap_items').insert(itemRows)

      if (itemsError) throw itemsError
    }

    const durationMs = Date.now() - startedAt

    await logEvent(
      'INFO',
      'Gap matrix generated',
      {
        user_id: user.id,
        snapshot_id: (snapshot as any).id,
        critical_gap_count: criticalCount,
        important_gap_count: importantCount,
        nice_to_have_gap_count: niceToHaveCount,
        duration_ms: durationMs,
      },
      supabaseUrl,
      serviceKey,
      requestId
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          snapshot_id: (snapshot as any).id,
          critical_gap_count: criticalCount,
          important_gap_count: importantCount,
          nice_to_have_gap_count: niceToHaveCount,
          overall_gap_score: overallGapScore,
          market_signals_date: latestWindow.window_end,
          duration_ms: durationMs,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await logEvent(
      'ERROR',
      'Gap matrix generation failed',
      { error: message, user_id: user.id },
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
