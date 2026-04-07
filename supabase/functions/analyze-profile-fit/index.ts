/**
 * UPDATE LOG
 * 2026-04-07 00:00:00 | P28 S2 — analyze-profile-fit edge function.
 * 2026-04-07 01:00:00 | Fix: user client initialization — use anonKey + Authorization header
 *   (not userToken as API key) to match the pattern in linkedin-profile-ingest.
 *   Compares user's sats_skill_profiles against sats_market_signals for a
 *   (role_family_id, market_code) pair. Computes a 0-100 Profile Fit Score
 *   deterministically, then calls LLM for score_rationale and per-gap
 *   recommended_action + estimated_weeks_to_close. Optionally runs a second
 *   reconciliation LLM call when resume_id is provided. Persists result to
 *   sats_profile_fit_reports. Returns 503 on missing env, 404 on no signals,
 *   401 on bad JWT.
 * 2026-04-07 23:50:00 | WAF REL-1 — Add fallback model candidate to both callLLM() calls so
 *   a transient error on gpt-4.1-mini falls through to gpt-4o-mini instead of failing.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llmProvider.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityTier = 'critical' | 'important' | 'nice_to_have'
type CandidateStatus = 'missing' | 'in_progress' | 'held'

interface MarketSignal {
  signal_type: string
  signal_value: string
  frequency_pct: number
  window_end: string
}

interface SkillProfileRow {
  skill_name: string
  category: string
  certification_status: string | null
}

interface GapItem {
  signal_type: string
  signal_value: string
  frequency_pct: number
  priority_tier: PriorityTier
  candidate_status: CandidateStatus
  recommended_action?: string
  estimated_weeks_to_close?: number | null
}

interface ReconciliationConflict {
  field: string
  linkedin_value: string
  resume_value: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CRITICAL_THRESHOLD = 50
const IMPORTANT_THRESHOLD = 20

const PROFILE_FIT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fit_score', 'score_rationale', 'gap_items'],
  properties: {
    fit_score: { type: 'integer', minimum: 0, maximum: 100 },
    score_rationale: { type: 'string' },
    gap_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'signal_value',
          'signal_type',
          'priority_tier',
          'candidate_status',
          'recommended_action',
          'estimated_weeks_to_close',
        ],
        properties: {
          signal_value: { type: 'string' },
          signal_type: { type: 'string' },
          priority_tier: {
            type: 'string',
            enum: ['critical', 'important', 'nice_to_have'],
          },
          candidate_status: {
            type: 'string',
            enum: ['missing', 'in_progress', 'held'],
          },
          recommended_action: { type: 'string' },
          estimated_weeks_to_close: {
            anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
          },
        },
      },
    },
  },
}

const RECONCILIATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['conflicts'],
  properties: {
    conflicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'linkedin_value', 'resume_value', 'severity'],
        properties: {
          field: { type: 'string' },
          linkedin_value: { type: 'string' },
          resume_value: { type: 'string' },
          severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        },
      },
    },
  },
}

const MARKET_LABELS: Record<string, string> = {
  nz: 'New Zealand',
  au: 'Australia',
  uk: 'United Kingdom',
  br: 'Brazil',
  us: 'United States',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyPriority(frequencyPct: number, status: CandidateStatus): PriorityTier {
  if (status === 'in_progress') return 'nice_to_have'
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
    if (
      normalizedSkill === normalizedSignal ||
      normalizedSkill.includes(normalizedSignal) ||
      normalizedSignal.includes(normalizedSkill)
    ) {
      if (sp.category === 'certification' && signalType === 'certification') {
        if (sp.certification_status === 'in_progress') return 'in_progress'
        if (sp.certification_status === 'planned') return 'in_progress'
        return 'held'
      }
      return 'held'
    }
  }
  return 'missing'
}

/**
 * Fit score = weighted coverage of signals the candidate holds.
 * critical=3pts, important=2pts, nice_to_have=1pt.
 * Score = sum(held_weights) / sum(all_weights) * 100
 */
function calculateFitScore(
  signals: MarketSignal[],
  skillProfiles: SkillProfileRow[]
): { fitScore: number; gapItems: GapItem[] } {
  if (signals.length === 0) return { fitScore: 0, gapItems: [] }

  let totalWeight = 0
  let heldWeight = 0
  const gapItems: GapItem[] = []

  for (const signal of signals) {
    const status = deriveCandidateStatus(signal.signal_value, signal.signal_type, skillProfiles)
    const tier = classifyPriority(signal.frequency_pct, status)

    const weight = tier === 'critical' ? 3 : tier === 'important' ? 2 : 1
    totalWeight += weight
    if (status === 'held') {
      heldWeight += weight
    } else {
      gapItems.push({
        signal_type: signal.signal_type,
        signal_value: signal.signal_value,
        frequency_pct: signal.frequency_pct,
        priority_tier: tier,
        candidate_status: status,
      })
    }
  }

  const fitScore = totalWeight === 0 ? 0 : Math.round((heldWeight / totalWeight) * 100)
  return { fitScore, gapItems }
}

async function callProfileFitLLM(
  fitScore: number,
  gapItems: GapItem[],
  roleFamilyName: string,
  marketCode: string,
  skillProfiles: SkillProfileRow[],
  modelName: string
): Promise<{ score_rationale: string; enrichedGapItems: GapItem[] }> {
  const marketLabel = MARKET_LABELS[marketCode] ?? marketCode
  const heldSkills = skillProfiles.map((s) => s.skill_name).slice(0, 30)

  const gapSummary = gapItems
    .slice(0, 20)
    .map(
      (g) =>
        `- [${g.priority_tier}] ${g.signal_type}: "${g.signal_value}" (market frequency: ${g.frequency_pct.toFixed(0)}%, status: ${g.candidate_status})`
    )
    .join('\n')

  const llmResult = await callLLM({
    systemPrompt:
      "You are a career advisor for SmartATS. Given a candidate's profile fit score and their gap list, write a concise score rationale and provide specific recommended actions for each gap. Be practical and direct.",
    userPrompt: `Target role: ${roleFamilyName}
Target market: ${marketLabel}
Pre-computed fit score: ${fitScore}/100
Candidate holds: ${heldSkills.length > 0 ? heldSkills.join(', ') : 'no classified skills yet'}

Gaps to address (top 20 by priority):
${gapSummary || 'No gaps — candidate holds all tracked signals.'}

For each gap return:
- recommended_action: specific next step
- estimated_weeks_to_close: realistic weeks (null if unknown)

Also write a score_rationale: 2-3 sentences explaining what the ${fitScore}/100 score means for this candidate targeting ${roleFamilyName} roles in ${marketLabel}. Be honest but constructive.`,
    modelCandidates: [modelName, modelFallback],
    jsonSchema: PROFILE_FIT_JSON_SCHEMA,
    schemaName: 'profile_fit_result',
    temperature: 0.3,
    maxTokens: 2000,
    retryAttempts: 1,
    taskLabel: 'profile-fit',
  })

  const parsed = JSON.parse(llmResult.rawContent)
  const llmGapItems = (parsed.gap_items ?? []) as Array<{
    signal_value: string
    signal_type: string
    priority_tier: PriorityTier
    candidate_status: CandidateStatus
    recommended_action: string
    estimated_weeks_to_close: number | null
  }>

  // Merge LLM recommendations back into our code-computed gap items
  const llmMap = new Map(llmGapItems.map((g) => [g.signal_value.toLowerCase().trim(), g]))

  const enrichedGapItems: GapItem[] = gapItems.map((item) => {
    const llmItem = llmMap.get(item.signal_value.toLowerCase().trim())
    return {
      ...item,
      recommended_action: llmItem?.recommended_action ?? undefined,
      estimated_weeks_to_close: llmItem?.estimated_weeks_to_close ?? null,
    }
  })

  return {
    score_rationale: String(parsed.score_rationale ?? ''),
    enrichedGapItems,
  }
}

async function callReconciliationLLM(
  skillProfiles: SkillProfileRow[],
  resumeText: string,
  modelName: string
): Promise<ReconciliationConflict[]> {
  const profileSummary = skillProfiles
    .slice(0, 30)
    .map((s) => `${s.skill_name} (${s.category})`)
    .join(', ')

  const llmResult = await callLLM({
    systemPrompt:
      "You are a career data auditor. Compare a candidate's LinkedIn-derived skill profile with their resume text. Identify factual discrepancies in: job titles, company names, employment dates, skill claims, or years of experience. Only report genuine conflicts, not minor phrasing differences. Return an empty conflicts array if no real discrepancies exist.",
    userPrompt: `LinkedIn skill profile (extracted):
${profileSummary}

Resume text (first 3000 chars):
${resumeText.slice(0, 3000)}

Identify any real conflicts between what the LinkedIn profile signals and what the resume states. For each conflict:
- field: what is conflicting (e.g. "job_title", "company", "employment_dates", "skill_claim", "years_experience")
- linkedin_value: what the LinkedIn data shows
- resume_value: what the resume says
- severity: HIGH (factual contradiction that could hurt credibility), MEDIUM (notable difference), LOW (minor inconsistency)`,
    modelCandidates: [modelName, modelFallback],
    jsonSchema: RECONCILIATION_JSON_SCHEMA,
    schemaName: 'reconciliation_result',
    temperature: 0.1,
    maxTokens: 1000,
    retryAttempts: 1,
    taskLabel: 'profile-fit-reconciliation',
  })

  const parsed = JSON.parse(llmResult.rawContent)
  return (parsed.conflicts ?? []) as ReconciliationConflict[]
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
        script_name: 'analyze-profile-fit',
        log_level: level,
        message,
        request_id: requestId,
        metadata: { event_name: 'analyze_profile_fit.lifecycle', ...metadata },
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

  // ── Env validation — fail fast ────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')

  if (!supabaseUrl || !serviceKey || !openAiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required environment configuration' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const modelName = Deno.env.get('OPENAI_MODEL_PROFILE_FIT') || 'gpt-4.1-mini'
  const modelFallback = Deno.env.get('OPENAI_MODEL_ATS_FALLBACK') || 'gpt-4o-mini'

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userToken = authHeader.replace('Bearer ', '')

  // ── Parse body ────────────────────────────────────────────────────────────
  let roleFamilyId: string
  let marketCode: string
  let resumeId: string | undefined
  try {
    const body = await req.json()
    roleFamilyId = body.target_role_family_id
    marketCode = body.target_market_code
    resumeId = body.resume_id ?? undefined
    if (!roleFamilyId || !marketCode) throw new Error('missing required fields')
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request body: target_role_family_id and target_market_code required',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const serviceClient = createClient(supabaseUrl, serviceKey)

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

  const requestId = `apf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startedAt = Date.now()

  await logEvent(
    'INFO',
    'Profile fit analysis started',
    {
      user_id: user.id,
      role_family_id: roleFamilyId,
      market_code: marketCode,
      has_resume: !!resumeId,
    },
    supabaseUrl,
    serviceKey,
    requestId
  )

  try {
    // ── 1. Fetch role family ──────────────────────────────────────────────
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

    // ── 2. Fetch latest market signals ───────────────────────────────────
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
          error: 'no_market_signals',
          message:
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

    // ── 3. Fetch user skill profile ──────────────────────────────────────
    const { data: skillRows, error: skillError } = await userClient
      .from('sats_skill_profiles')
      .select('skill_name, category, certification_status')
      .eq('user_id', user.id)

    if (skillError) throw skillError
    const skillProfiles = (skillRows ?? []) as SkillProfileRow[]

    // If no skills at all, return fit_score=0 with a rationale — do not error
    if (skillProfiles.length === 0) {
      const { data: inserted, error: insertError } = await serviceClient
        .from('sats_profile_fit_reports')
        .insert({
          user_id: user.id,
          target_role_family_id: roleFamilyId,
          target_market_code: marketCode,
          fit_score: 0,
          score_rationale:
            'No skill profile data found. Import your LinkedIn profile or classify your skills in Settings to get a meaningful fit score.',
          gap_items: [],
          model_used: modelName,
          cost_estimate_usd: 0,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            report_id: (inserted as any).id,
            fit_score: 0,
            score_rationale:
              'No skill profile data found. Import your LinkedIn profile or classify your skills in Settings to get a meaningful fit score.',
            gap_items: [],
            reconciliation_conflicts: null,
            duration_ms: Date.now() - startedAt,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Compute fit score + gap items (deterministic) ─────────────────
    const { fitScore, gapItems } = calculateFitScore(signals, skillProfiles)

    // ── 5. LLM call — rationale + recommendations ────────────────────────
    const { score_rationale, enrichedGapItems } = await callProfileFitLLM(
      fitScore,
      gapItems,
      (roleFamily as any).name,
      marketCode,
      skillProfiles,
      modelName
    )

    // ── 6. Optional reconciliation LLM call ──────────────────────────────
    let reconciliationConflicts: ReconciliationConflict[] | null = null

    if (resumeId) {
      const { data: extractionRow } = await userClient
        .from('document_extractions')
        .select('extracted_text')
        .eq('resume_id', resumeId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (extractionRow?.extracted_text) {
        try {
          reconciliationConflicts = await callReconciliationLLM(
            skillProfiles,
            extractionRow.extracted_text,
            modelName
          )
        } catch {
          // Reconciliation failure is non-fatal; proceed without it
          reconciliationConflicts = null
        }
      }
    }

    // ── 7. Persist report ────────────────────────────────────────────────
    const { data: inserted, error: insertError } = await serviceClient
      .from('sats_profile_fit_reports')
      .insert({
        user_id: user.id,
        target_role_family_id: roleFamilyId,
        target_market_code: marketCode,
        fit_score: fitScore,
        score_rationale,
        gap_items: enrichedGapItems,
        resume_id: resumeId ?? null,
        reconciliation_conflicts: reconciliationConflicts,
        model_used: modelName,
        cost_estimate_usd: null,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    const durationMs = Date.now() - startedAt

    await logEvent(
      'INFO',
      'Profile fit analysis complete',
      {
        user_id: user.id,
        report_id: (inserted as any).id,
        fit_score: fitScore,
        gap_count: enrichedGapItems.length,
        has_reconciliation: reconciliationConflicts !== null,
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
          report_id: (inserted as any).id,
          fit_score: fitScore,
          score_rationale,
          gap_items: enrichedGapItems,
          reconciliation_conflicts: reconciliationConflicts,
          duration_ms: durationMs,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await logEvent(
      'ERROR',
      'Profile fit analysis failed',
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
