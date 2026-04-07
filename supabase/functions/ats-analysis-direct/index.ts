/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed ATS direct edge function updates and added timestamped file header tracking.
 * 2026-02-20 23:22:57 | P1: Added centralized structured logging hooks for ATS analysis queue, completion, and failures.
 * 2026-02-20 23:29:40 | P2: Added request_id propagation for end-to-end ATS trace correlation.
 * 2026-02-21 03:07:10 | P1 config hardening: parameterized AI provider endpoint, model, temperature, and pricing via environment variables.
 * 2026-02-21 03:13:40 | SDLC P2 data-governance hardening: prompt/raw LLM persistence disabled by default with explicit env flags.
 * 2026-02-21 03:13:40 | SDLC P4 security hardening: replaced wildcard CORS with ALLOWED_ORIGINS allowlist enforcement.
 * 2026-02-22 10:00:00 | P10 execution start: added schema-locked ATS response contract, deterministic rubric prompt, and retry-on-invalid-output validation.
 * 2026-03-01 00:00:00 | P16 Story 0: Removed duplicated CORS, env, error-mapping, and OpenAI fetch loop; replaced with _shared/ imports and callLLM().
 * 2026-03-17 00:00:00 | P18 Story B (v1): CV Optimisation Score — single-call design (contaminated baseline). Reverted.
 * 2026-03-17 00:01:00 | P18 Story B (v2): Two-call isolation — baseline ATS call is pure (no enrichments);
 *   cv_optimisation_score computed in a separate second callLLM() after baseline completes.
 *   Eliminates context contamination that caused baseline score regression when enrichments present.
 * 2026-03-17 00:02:00 | P18 Story B (v2) complete: removed cv_optimisation fields from ATS_JSON_SCHEMA and
 *   ATSAnalysisResult; cleaned buildATSPrompt() of dead enrichments param; added CV_OPTIMISATION_JSON_SCHEMA,
 *   buildOptimisationPrompt(), and second callLLM() call in processAnalysis for isolated optimisation scoring.
 * 2026-03-17 00:15:00 | Model upgrade attempt: default switched to o4-mini; temperature→0; seed=42 added.
 * 2026-03-17 00:20:00 | Rollback: code default reverted to gpt-4.1 — o4-mini rejected by API (model not
 *   found / invalid ID). gpt-4.1 confirmed working. temperature:0 and seed:42 retained. Pricing defaults
 *   reverted to gpt-4.1 rates. o4-mini re-enablement requires confirming valid API model ID first.
 * 2026-03-18 00:00:00 | CR1-7: Add explanatory comment for temperature=0 + seed=42 determinism.
 * 2026-03-27 15:00:00 | P21 Tier 1 — renamed table enriched_experiences → sats_enriched_experiences.
 *   Also updated FK alias in PostgREST select to match new table name.
 * 2026-03-30 10:00:00 | P25 S4 — Weighted skill profile injection. When a sats_skill_profiles record
 *   exists for the requesting user, buildWeightedSkillBlock() reads the profile + sats_skill_decay_config,
 *   computes effective weights at call time (never stored), and injects the result as additive context
 *   into Call 1 (baseline ATS prompt). Falls back to flat extraction silently on any error.
 * 2026-03-30 11:00:00 | PROD-9–12 — Resume Intelligence (Call 3): added INTELLIGENCE_JSON_SCHEMA,
 *   IntelligenceResult type, buildIntelligencePrompt(), parseIntelligenceOrNull(), and target_country
 *   request field. Call 2 (CV Optimisation) and new Call 3 now run in parallel via Promise.allSettled().
 *   Results stored as format_audit, geography_passport, industry_lens, cultural_tone in analysis_data.
 * 2026-04-07 | WAF-fix: return 503 (not 500) when OPENAI_API_KEY is missing — 503 signals
 *   misconfiguration vs 500 which signals an unexpected runtime error.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber, getEnvBoolean } from '../_shared/env.ts'
import { callLLM } from '../_shared/llmProvider.ts'

const OPENAI_MODEL_ATS = Deno.env.get('OPENAI_MODEL_ATS') || 'gpt-4.1'
const OPENAI_MODEL_ATS_FALLBACK = Deno.env.get('OPENAI_MODEL_ATS_FALLBACK') || 'gpt-4o-mini'
// temperature=0 + seed=42: ensures deterministic output for regression testing and user trust.
// The same resume+JD pair must always yield the same score regardless of when it runs.
const OPENAI_TEMPERATURE_ATS = getEnvNumber('OPENAI_TEMPERATURE_ATS', 0)
const OPENAI_ATS_SEED = Math.floor(getEnvNumber('OPENAI_ATS_SEED', 42))
const OPENAI_MAX_TOKENS_ATS = Math.max(500, Math.floor(getEnvNumber('OPENAI_MAX_TOKENS_ATS', 1800)))
const OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS = Math.max(
  0,
  Math.min(2, Math.floor(getEnvNumber('OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS', 1)))
)
const OPENAI_PRICE_INPUT_PER_MILLION = getEnvNumber('OPENAI_PRICE_INPUT_PER_MILLION', 2.0)
const OPENAI_PRICE_OUTPUT_PER_MILLION = getEnvNumber('OPENAI_PRICE_OUTPUT_PER_MILLION', 8.0)
const OPENAI_MODEL_INTELLIGENCE = Deno.env.get('OPENAI_MODEL_INTELLIGENCE') || 'gpt-4.1-mini'
const STORE_LLM_PROMPTS = getEnvBoolean('STORE_LLM_PROMPTS', false)
const STORE_LLM_RAW_RESPONSE = getEnvBoolean('STORE_LLM_RAW_RESPONSE', false)

const ATS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'match_score',
    'keywords_found',
    'keywords_missing',
    'resume_warnings',
    'recommendations',
    'score_breakdown',
    'evidence',
  ],
  properties: {
    match_score: { type: 'number', minimum: 0, maximum: 1 },
    keywords_found: { type: 'array', items: { type: 'string' } },
    keywords_missing: { type: 'array', items: { type: 'string' } },
    resume_warnings: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    score_breakdown: {
      type: 'object',
      additionalProperties: false,
      required: ['skills_alignment', 'experience_relevance', 'domain_fit', 'format_quality'],
      properties: {
        skills_alignment: { type: 'number', minimum: 0, maximum: 1 },
        experience_relevance: { type: 'number', minimum: 0, maximum: 1 },
        domain_fit: { type: 'number', minimum: 0, maximum: 1 },
        format_quality: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skill', 'jd_quote', 'resume_quote', 'reasoning'],
        properties: {
          skill: { type: 'string' },
          jd_quote: { type: 'string' },
          resume_quote: { type: 'string' },
          reasoning: { type: 'string' },
        },
      },
    },
  },
}

// CV Optimisation Score — separate schema for the second isolated LLM call
const CV_OPTIMISATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cv_optimisation_score', 'cv_optimisation_improvements'],
  properties: {
    cv_optimisation_score: { type: 'number', minimum: 0, maximum: 1 },
    cv_optimisation_improvements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skill', 'impact', 'score_area'],
        properties: {
          skill: { type: 'string' },
          role: { type: 'string' },
          impact: { type: 'string' },
          score_area: { type: 'string' },
        },
      },
    },
  },
}

interface ATSAnalysisRequest {
  analysis_id: string
  resume_id: string
  jd_id: string
  request_id?: string
  target_country?: string
}

interface ATSAnalysisResult {
  match_score: number
  keywords_found: string[]
  keywords_missing: string[]
  resume_warnings: string[]
  recommendations: string[]
  score_breakdown: {
    skills_alignment: number
    experience_relevance: number
    domain_fit: number
    format_quality: number
  }
  evidence: Array<{
    skill: string
    jd_quote: string
    resume_quote: string
    reasoning: string
  }>
}

interface CVOptimisationResult {
  cv_optimisation_score: number
  cv_optimisation_improvements: Array<{
    skill: string
    role?: string
    impact: string
    score_area: string
  }>
}

// Resume Intelligence — PROD-9 through PROD-12
const INTELLIGENCE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['format_audit', 'geography_passport', 'industry_lens', 'cultural_tone'],
  properties: {
    format_audit: {
      type: 'object',
      additionalProperties: false,
      required: ['overall_health', 'pass', 'issues'],
      properties: {
        overall_health: { type: 'string', enum: ['good', 'fair', 'poor'] },
        pass: { type: 'boolean' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['category', 'severity', 'description'],
            properties: {
              category: {
                type: 'string',
                enum: [
                  'table_column',
                  'emoji_graphic',
                  'section_heading',
                  'missing_url',
                  'vague_bullet',
                  'length_mismatch',
                ],
              },
              severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
              description: { type: 'string' },
            },
          },
        },
      },
    },
    geography_passport: {
      type: 'object',
      additionalProperties: false,
      required: ['detected_country', 'country_code', 'detection_method', 'checklist'],
      properties: {
        detected_country: { type: 'string' },
        country_code: {
          type: 'string',
          enum: ['US', 'UK', 'DE', 'FR', 'BR', 'AU', 'NZ', 'JP', 'IN', 'OTHER'],
        },
        detection_method: {
          type: 'string',
          enum: ['user_override', 'jd_explicit', 'jd_inferred', 'hq_signal', 'unknown'],
        },
        checklist: {
          type: 'object',
          additionalProperties: false,
          required: [
            'photo_expected',
            'typical_page_length',
            'personal_details_norm',
            'date_format',
            'notes',
          ],
          properties: {
            photo_expected: { type: 'boolean' },
            typical_page_length: { type: 'string' },
            personal_details_norm: { type: 'string' },
            date_format: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
    industry_lens: {
      type: 'object',
      additionalProperties: false,
      required: ['vertical', 'confidence', 'expected_sections', 'missing_sections', 'notes'],
      properties: {
        vertical: {
          type: 'string',
          enum: [
            'Tech',
            'Finance',
            'Healthcare',
            'Legal',
            'Creative',
            'Academic',
            'Startup',
            'Operations',
            'Other',
          ],
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        expected_sections: { type: 'array', items: { type: 'string' } },
        missing_sections: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
    cultural_tone: {
      type: 'object',
      additionalProperties: false,
      required: ['detected_register', 'target_norm', 'mismatches', 'overall_alignment'],
      properties: {
        detected_register: {
          type: 'string',
          enum: ['first_person', 'third_person', 'functional', 'narrative', 'mixed'],
        },
        target_norm: { type: 'string' },
        mismatches: { type: 'array', items: { type: 'string' } },
        overall_alignment: {
          type: 'string',
          enum: ['aligned', 'minor_mismatch', 'significant_mismatch'],
        },
      },
    },
  },
}

interface IntelligenceResult {
  format_audit: {
    overall_health: 'good' | 'fair' | 'poor'
    pass: boolean
    issues: Array<{
      category: string
      severity: 'critical' | 'warning' | 'info'
      description: string
    }>
  }
  geography_passport: {
    detected_country: string
    country_code: string
    detection_method: string
    checklist: {
      photo_expected: boolean
      typical_page_length: string
      personal_details_norm: string
      date_format: string
      notes: string
    }
  }
  industry_lens: {
    vertical: string
    confidence: number
    expected_sections: string[]
    missing_sections: string[]
    notes: string
  }
  cultural_tone: {
    detected_register: string
    target_norm: string
    mismatches: string[]
    overall_alignment: string
  }
}

interface AcceptedEnrichment {
  skill_name: string
  suggestion: string
  skill_experience_id: string | null
  job_title: string | null
  company_name: string | null
}

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
  message: string,
  metadata: Record<string, unknown>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  requestId?: string
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
        script_name: 'ats-analysis-direct',
        log_level: level,
        message,
        metadata: {
          event_name: 'ats_analysis.lifecycle',
          component: 'ats-analysis-direct',
          operation: 'analysis_execution',
          outcome: level === 'ERROR' ? 'failure' : 'info',
          ...metadata,
        },
        request_id: requestId,
      }),
    })
  } catch (_error) {
    // Do not block ATS processing due to telemetry failures
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

  const FUNCTION_VERSION = '3.0.0-async'
  console.log(`ATS Analysis Direct Function v${FUNCTION_VERSION} - Request received`)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Parse request body
  let requestBody: ATSAnalysisRequest
  try {
    requestBody = await req.json()
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { analysis_id, resume_id, jd_id, request_id, target_country } = requestBody

  if (!analysis_id || !resume_id || !jd_id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing required fields: analysis_id, resume_id, jd_id',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Early validation — callLLM reads this from env, but we fail fast before queuing
  if (!Deno.env.get('OPENAI_API_KEY')) {
    console.error('OpenAI API key not configured')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    await logEvent(
      'ERROR',
      'OpenAI API key not configured',
      { operation: 'configuration_check' },
      supabaseUrl,
      supabaseServiceKey,
      request_id
    )
    return new Response(JSON.stringify({ success: false, error: 'Service not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  await logEvent(
    'INFO',
    'ATS analysis queued',
    {
      operation: 'analysis_queue',
      analysis_id,
      resume_id,
      jd_id,
    },
    supabaseUrl,
    supabaseServiceKey,
    request_id
  )

  console.log(`Queuing ATS analysis: ${analysis_id} for resume ${resume_id} vs job ${jd_id}`)

  // Kick off background processing and return 202 immediately.
  // EdgeRuntime.waitUntil keeps the isolate alive until processAnalysis resolves.
  // @ts-expect-error Supabase Edge runtime provides this global at execution time.
  EdgeRuntime.waitUntil(
    processAnalysis(
      analysis_id,
      resume_id,
      jd_id,
      supabase,
      supabaseUrl,
      supabaseServiceKey,
      request_id,
      target_country
    )
  )

  return new Response(JSON.stringify({ queued: true, analysis_id }), {
    status: 202,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// ---------------------------------------------------------------------------
// Background worker — all analysis logic runs here after 202 is returned
// ---------------------------------------------------------------------------

async function processAnalysis(
  analysis_id: string,
  resume_id: string,
  jd_id: string,
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  requestId?: string,
  targetCountry?: string
): Promise<void> {
  console.log(`[processAnalysis] Starting async processing: ${analysis_id}`)
  await logEvent(
    'INFO',
    'ATS analysis processing started',
    {
      operation: 'analysis_processing_start',
      analysis_id,
      resume_id,
      jd_id,
    },
    supabaseUrl,
    supabaseServiceKey,
    requestId
  )

  try {
    // Fetch resume and job description data
    const [resumeResult, jobResult] = await Promise.all([
      supabase.from('sats_resumes').select('*').eq('id', resume_id).single(),
      supabase
        .from('sats_job_descriptions')
        .select(
          `
          *,
          company:sats_companies!sats_job_descriptions_company_id_fkey (*),
          location:sats_locations!sats_job_descriptions_location_id_fkey (*)
        `
        )
        .eq('id', jd_id)
        .single(),
    ])

    if (resumeResult.error || jobResult.error) {
      console.error('Error fetching data:', resumeResult.error || jobResult.error)
      throw new Error('Failed to fetch resume or job description data')
    }

    const resume = resumeResult.data
    const jobDescription = jobResult.data

    // Update analysis status to processing
    await supabase
      .from('sats_analyses')
      .update({
        status: 'processing',
        analysis_data: {
          processing_started_at: new Date().toISOString(),
          request_id: requestId || null,
        },
      })
      .eq('id', analysis_id)

    // Get and optimize content
    const resumeContent = await getResumeContent(resume, supabase)
    const jobContent = jobDescription.pasted_text || ''

    // Fetch weighted skill context (P25 S4) — falls back silently if no profile exists
    const weightedSkillBlock = await buildWeightedSkillBlock(resume.user_id, supabase)

    // Build baseline prompt — NO enrichments; baseline must be pure
    const prompt = buildATSPrompt(
      jobDescription.name,
      jobContent,
      resume.name,
      resumeContent,
      weightedSkillBlock
    )
    const systemPrompt =
      'You are a deterministic ATS evaluator. Return JSON that matches the provided schema exactly. Never invent resume evidence. If evidence is weak, lower confidence and explain with resume_warnings.'
    const promptsMetadata = {
      system: systemPrompt,
      user: prompt,
    }

    console.log('[processAnalysis] Calling OpenAI API with prompt length:', prompt.length)

    // Call LLM via shared provider abstraction
    const modelCandidates = [OPENAI_MODEL_ATS]
    if (OPENAI_MODEL_ATS_FALLBACK && OPENAI_MODEL_ATS_FALLBACK !== OPENAI_MODEL_ATS) {
      modelCandidates.push(OPENAI_MODEL_ATS_FALLBACK)
    }

    const llmResult = await callLLM({
      systemPrompt,
      userPrompt: prompt,
      modelCandidates,
      jsonSchema: ATS_JSON_SCHEMA,
      schemaName: 'ats_analysis_response',
      temperature: OPENAI_TEMPERATURE_ATS,
      seed: OPENAI_ATS_SEED,
      maxTokens: OPENAI_MAX_TOKENS_ATS,
      retryAttempts: OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS,
      taskLabel: 'ats-scoring',
      pricingOverride: {
        input: OPENAI_PRICE_INPUT_PER_MILLION,
        output: OPENAI_PRICE_OUTPUT_PER_MILLION,
      },
    })

    const rawContent = llmResult.rawContent
    const tokenUsage = {
      prompt_tokens: llmResult.promptTokens,
      completion_tokens: llmResult.completionTokens,
      total_tokens: llmResult.promptTokens + llmResult.completionTokens,
    }
    const costEstimateUsd = llmResult.costEstimateUsd

    console.log('[processAnalysis] Raw OpenAI response:', rawContent)
    console.log('[processAnalysis] Token usage:', tokenUsage)

    const analysisResult = parseATSResponseOrNull(rawContent)
    if (!analysisResult) {
      throw new Error('ATS response validation failed: model output did not match schema contract')
    }

    const llmStorageFlags = {
      store_llm_prompts: STORE_LLM_PROMPTS,
      store_llm_raw_response: STORE_LLM_RAW_RESPONSE,
    }

    // Fetch accepted enrichments AFTER baseline call — no contamination risk
    const acceptedEnrichments = await getAcceptedEnrichments(resume.id, supabase)
    console.log(
      `[processAnalysis] Accepted enrichments for CV optimisation: ${acceptedEnrichments.length}`
    )

    // Call 2 (CV Optimisation) + Call 3 (Resume Intelligence) — run in parallel, isolated.
    // Neither failure corrupts the baseline result.
    let optimisationResult: CVOptimisationResult | null = null
    let intelligenceResult: IntelligenceResult | null = null

    const call2Promise: Promise<void> =
      acceptedEnrichments.length > 0
        ? (async () => {
            const optPrompt = buildOptimisationPrompt(
              jobDescription.name,
              jobContent,
              analysisResult.match_score,
              acceptedEnrichments
            )
            const optSystemPrompt =
              'You are a deterministic ATS evaluator. Return JSON that matches the provided schema exactly. Project only realistic, evidence-grounded score improvements.'
            const optLlmResult = await callLLM({
              systemPrompt: optSystemPrompt,
              userPrompt: optPrompt,
              modelCandidates,
              jsonSchema: CV_OPTIMISATION_JSON_SCHEMA,
              schemaName: 'cv_optimisation_response',
              temperature: OPENAI_TEMPERATURE_ATS,
              seed: OPENAI_ATS_SEED,
              maxTokens: 800,
              retryAttempts: 1,
              taskLabel: 'cv-optimisation-score',
              pricingOverride: {
                input: OPENAI_PRICE_INPUT_PER_MILLION,
                output: OPENAI_PRICE_OUTPUT_PER_MILLION,
              },
            })
            optimisationResult = parseCVOptimisationOrNull(optLlmResult.rawContent)
            console.log(
              '[processAnalysis] CV Optimisation Score:',
              optimisationResult?.cv_optimisation_score
            )
          })().catch((optError) => {
            console.warn('[processAnalysis] CV Optimisation call failed — skipping:', optError)
          })
        : Promise.resolve()

    const call3Promise: Promise<void> = (async () => {
      const intPrompt = buildIntelligencePrompt(
        jobDescription.name,
        jobContent,
        resumeContent,
        targetCountry ?? null
      )
      const intLlmResult = await callLLM({
        systemPrompt:
          'You are a résumé intelligence analyst. Return JSON matching the provided schema exactly.',
        userPrompt: intPrompt,
        modelCandidates: [OPENAI_MODEL_INTELLIGENCE, OPENAI_MODEL_ATS_FALLBACK],
        jsonSchema: INTELLIGENCE_JSON_SCHEMA,
        schemaName: 'intelligence_response',
        temperature: OPENAI_TEMPERATURE_ATS,
        seed: OPENAI_ATS_SEED,
        maxTokens: 1200,
        retryAttempts: 1,
        taskLabel: 'resume-intelligence',
      })
      intelligenceResult = parseIntelligenceOrNull(intLlmResult.rawContent)
      console.log(
        '[processAnalysis] Intelligence vertical:',
        intelligenceResult?.industry_lens?.vertical
      )
    })().catch((intError) => {
      console.warn('[processAnalysis] Resume Intelligence call failed — skipping:', intError)
    })

    await Promise.allSettled([call2Promise, call3Promise])

    // Store results in database
    const updateData = {
      status: 'completed',
      ats_score: Math.round(analysisResult.match_score * 100),
      matched_skills: analysisResult.keywords_found,
      missing_skills: analysisResult.keywords_missing,
      suggestions: analysisResult.recommendations.join('\n'),
      analysis_data: {
        processing_completed_at: new Date().toISOString(),
        processing_time_ms: llmResult.durationMs,
        token_usage: tokenUsage,
        model_used: llmResult.modelUsed,
        cost_estimate_usd: costEstimateUsd,
        prompt_characters: prompt.length,
        request_id: requestId || null,
        extracted_features: analysisResult.keywords_found,
        resume_warnings: analysisResult.resume_warnings,
        score_breakdown: analysisResult.score_breakdown,
        evidence_count: analysisResult.evidence.length,
        // CV Optimisation Score (P18) — from isolated Call 2
        cv_optimisation_score: optimisationResult?.cv_optimisation_score ?? null,
        cv_optimisation_improvements: optimisationResult?.cv_optimisation_improvements ?? [],
        enrichments_used_count: acceptedEnrichments.length,
        // Resume Intelligence (PROD-9–12) — from isolated Call 3; null for pre-feature analyses
        format_audit: intelligenceResult?.format_audit ?? null,
        geography_passport: intelligenceResult?.geography_passport ?? null,
        industry_lens: intelligenceResult?.industry_lens ?? null,
        cultural_tone: intelligenceResult?.cultural_tone ?? null,
        target_country_input: targetCountry ?? null,
        schema_retry_attempts_used: llmResult.retryAttemptsUsed,
        ...llmStorageFlags,
        ...(STORE_LLM_PROMPTS ? { prompts: promptsMetadata } : {}),
        ...(STORE_LLM_RAW_RESPONSE
          ? {
              raw_llm_response: {
                content: rawContent,
                parsed_result: analysisResult,
              },
            }
          : {}),
      },
    }

    console.log('[processAnalysis] Updating database with completed status')

    const { data: updateResult, error: updateError } = await supabase
      .from('sats_analyses')
      .update(updateData)
      .eq('id', analysis_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(`Failed to update analysis: ${updateError.message}`)
    }

    console.log(
      `[processAnalysis] Analysis completed successfully: ${analysis_id}, score: ${updateData.ats_score}%, db status: ${updateResult?.status}`
    )
    await logEvent(
      'INFO',
      'ATS analysis processing completed',
      {
        operation: 'analysis_processing_complete',
        outcome: 'success',
        analysis_id,
        resume_id,
        jd_id,
        ats_score: updateData.ats_score,
        processing_time_ms: llmResult.durationMs,
        duration_ms: llmResult.durationMs,
        model_used: llmResult.modelUsed,
        cost_estimate_usd: costEstimateUsd,
      },
      supabaseUrl,
      supabaseServiceKey,
      requestId
    )
  } catch (error) {
    console.error('[processAnalysis] Error during analysis:', error)
    await logEvent(
      'ERROR',
      'ATS analysis processing failed',
      {
        operation: 'analysis_processing_complete',
        outcome: 'failure',
        analysis_id,
        resume_id,
        jd_id,
        error:
          error instanceof Error
            ? { type: error.constructor.name, message: error.message }
            : { message: String(error) },
      },
      supabaseUrl,
      supabaseServiceKey,
      requestId
    )

    try {
      await supabase.from('error_logs').insert({
        error_source: 'ats_analysis_edge_function',
        error_type: 'analysis_failure',
        error_message: 'ATS analysis processing failed',
        error_details: {
          analysis_id,
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString(),
          safe_message: error instanceof Error ? error.message?.substring(0, 200) : String(error),
        },
      })

      await supabase
        .from('sats_analyses')
        .update({
          status: 'error',
          analysis_data: {
            error_timestamp: new Date().toISOString(),
            error_occurred: true,
            request_id: requestId || null,
          },
        })
        .eq('id', analysis_id)
    } catch (updateError) {
      console.error('[processAnalysis] Failed to update error status:', updateError)
    }
  }
}

// ---------------------------------------------------------------------------
// P25 S4 — Weighted skill profile block
// ---------------------------------------------------------------------------

/**
 * Reads the user's sats_skill_profiles and sats_skill_decay_config, computes
 * effective skill weights at call time (never persisted), and returns a
 * plain-text block for injection into the ATS prompt as additive context.
 *
 * Weight formula:
 *   effective_year = user_confirmed_last_used_year ?? ai_last_used_year
 *   weight = max(floor_weight, 1.0 - (decay_rate_pct/100) * max(0, (currentYear - effective_year - grace_years)))
 *
 * Transferable skills (from transferable_to[]) are injected at weight 1.0
 * regardless of the parent skill's decay.
 *
 * Returns empty string (silently) if the user has no profile or any error occurs.
 */
async function buildWeightedSkillBlock(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  try {
    const [profilesResult, decayResult] = await Promise.all([
      supabase
        .from('sats_skill_profiles')
        .select(
          'skill_name,category,depth,ai_last_used_year,user_confirmed_last_used_year,transferable_to,career_chapter,user_context'
        )
        .eq('user_id', userId),
      supabase
        .from('sats_skill_decay_config')
        .select('category,decay_rate_pct,grace_years,floor_weight'),
    ])

    if (profilesResult.error || decayResult.error) return ''
    const profiles = profilesResult.data ?? []
    if (profiles.length === 0) return ''

    // Index decay config by category
    const decayMap: Record<
      string,
      { decay_rate_pct: number; grace_years: number; floor_weight: number }
    > = {}
    for (const row of decayResult.data ?? []) {
      decayMap[row.category] = {
        decay_rate_pct: row.decay_rate_pct,
        grace_years: row.grace_years,
        floor_weight: row.floor_weight,
      }
    }

    const currentYear = new Date().getFullYear()
    const lines: string[] = []
    const transferableAccum: Set<string> = new Set()

    for (const skill of profiles) {
      const config = decayMap[skill.category] ?? {
        decay_rate_pct: 0,
        grace_years: 0,
        floor_weight: 1.0,
      }
      const effectiveYear =
        skill.user_confirmed_last_used_year ?? skill.ai_last_used_year ?? currentYear
      const yearsDecayed = Math.max(0, currentYear - effectiveYear - config.grace_years)
      const rawWeight = 1.0 - (config.decay_rate_pct / 100) * yearsDecayed
      const weight = Math.max(config.floor_weight, Math.min(1.0, rawWeight))

      lines.push(
        `- ${skill.skill_name} [${skill.category}/${skill.depth}, weight=${weight.toFixed(2)}${skill.career_chapter ? `, chapter=${skill.career_chapter}` : ''}${skill.user_context ? `, note: ${skill.user_context}` : ''}]`
      )

      // Transferable skills always at full weight
      for (const t of skill.transferable_to ?? []) {
        transferableAccum.add(t)
      }
    }

    const transferableLines = [...transferableAccum].map(
      (t) => `- ${t} [transferable, weight=1.00]`
    )

    return [
      'Candidate skill profile (AI-classified; use as additive context — do not override resume evidence):',
      ...lines,
      ...(transferableLines.length > 0 ? ['Transferable capabilities:', ...transferableLines] : []),
    ].join('\n')
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Helpers (unchanged from v2)
// ---------------------------------------------------------------------------

function buildATSPrompt(
  jdTitle: string,
  jdText: string,
  resumeTitle: string,
  resumeText: string,
  weightedSkillContext?: string
): string {
  const preparedJobText = buildSectionAwareContext(jdText, {
    maxChars: 12000,
    headingKeywords: [
      'responsibilities',
      'requirements',
      'required',
      'preferred',
      'qualifications',
      'must have',
      'skills',
      'experience',
    ],
    priorityRegex: /(must|required|responsib|qualif|skill|experience|certif|years|tool|stack)/i,
  })
  const preparedResumeText = buildSectionAwareContext(resumeText, {
    maxChars: 16000,
    headingKeywords: [
      'summary',
      'experience',
      'work history',
      'projects',
      'skills',
      'certifications',
      'education',
      'achievements',
    ],
    priorityRegex:
      /(%|\$|led|managed|built|improved|reduced|increased|delivered|developed|implemented)/i,
  })

  return `Task: Compare the resume against the job description using a deterministic ATS rubric.

Scoring rubric (0.0-1.0):
- skills_alignment (40%): overlap and depth of required skills.
- experience_relevance (30%): relevance of accomplishments to role scope and seniority.
- domain_fit (20%): industry/domain and tooling alignment.
- format_quality (10%): clarity, ATS readability, chronology, and specificity.

Output constraints:
- Return only valid JSON matching the required schema.
- Use evidence-grounded findings only.
- For each evidence item, include exact short quotes from JD and resume.
- If evidence is weak or ambiguous, add a warning and reduce confidence.

Job:
- title: ${jdTitle}
- content:
${preparedJobText}

Resume:
- title: ${resumeTitle}
- content:
${preparedResumeText}${weightedSkillContext ? `\n\n${weightedSkillContext}` : ''}`.trim()
}

function buildOptimisationPrompt(
  jdTitle: string,
  jdText: string,
  baselineScore: number,
  enrichments: AcceptedEnrichment[]
): string {
  const preparedJobText = buildSectionAwareContext(jdText, {
    maxChars: 8000,
    headingKeywords: [
      'responsibilities',
      'requirements',
      'required',
      'preferred',
      'qualifications',
      'skills',
      'experience',
    ],
    priorityRegex: /(must|required|responsib|qualif|skill|experience|certif|years|tool|stack)/i,
  })

  const enrichmentList = enrichments
    .map((e, i) => {
      const roleLabel =
        e.job_title && e.company_name
          ? ` (Role: ${e.job_title} @ ${e.company_name})`
          : e.job_title
            ? ` (Role: ${e.job_title})`
            : ''
      return `${i + 1}. Skill: ${e.skill_name}${roleLabel}\n   Enriched description: "${e.suggestion}"`
    })
    .join('\n')

  return `Task: Project the ATS match score if the candidate updates their CV with the enrichments below.

Current baseline ATS score: ${Math.round(baselineScore * 100)}% (${baselineScore.toFixed(3)})

Scoring rubric (0.0-1.0):
- skills_alignment (40%), experience_relevance (30%), domain_fit (20%), format_quality (10%)

Job: ${jdTitle}
${preparedJobText}

Accepted CV enrichments (candidate-approved improved descriptions):
${enrichmentList}

Output requirements:
- Set cv_optimisation_score to the projected score (0.0–1.0) if the candidate applied all enrichments above to their CV.
- For each enrichment that meaningfully improves a score dimension, add one entry to cv_optimisation_improvements with: skill, role (if known), impact (one sentence), score_area (skills_alignment|experience_relevance|domain_fit|format_quality).
- If enrichments produce no material improvement, set cv_optimisation_score equal to ${baselineScore.toFixed(3)} and return an empty cv_optimisation_improvements array.
- Return only valid JSON matching the required schema.`.trim()
}

function parseCVOptimisationOrNull(rawResponse: string): CVOptimisationResult | null {
  let text = rawResponse.trim()
  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/, '')
      .replace(/```\s*$/, '')
      .trim()
  }
  try {
    const data = JSON.parse(text)
    if (typeof data !== 'object' || data === null) return null
    return {
      cv_optimisation_score: clampScore(data.cv_optimisation_score),
      cv_optimisation_improvements: Array.isArray(data.cv_optimisation_improvements)
        ? data.cv_optimisation_improvements
            .map((item: any) => ({
              skill: String(item.skill || '').trim(),
              role: item.role ? String(item.role).trim() : undefined,
              impact: String(item.impact || '').trim(),
              score_area: String(item.score_area || '').trim(),
            }))
            .filter((item: any) => item.skill && item.impact && item.score_area)
        : [],
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Resume Intelligence helpers (PROD-9–12)
// ---------------------------------------------------------------------------

function buildIntelligencePrompt(
  jdTitle: string,
  jdText: string,
  resumeText: string,
  targetCountry: string | null
): string {
  const preparedJob = buildSectionAwareContext(jdText, {
    maxChars: 6000,
    headingKeywords: [
      'responsibilities',
      'requirements',
      'required',
      'preferred',
      'qualifications',
      'skills',
      'experience',
    ],
    priorityRegex: /(must|required|responsib|qualif|skill|experience|certif|years|tool|stack)/i,
  })
  const preparedResume = buildSectionAwareContext(resumeText, {
    maxChars: 6000,
    headingKeywords: [
      'summary',
      'experience',
      'work history',
      'projects',
      'skills',
      'certifications',
      'education',
      'publications',
    ],
    priorityRegex:
      /(%|\$|led|managed|built|improved|reduced|increased|delivered|developed|implemented)/i,
  })

  const geoInstruction = targetCountry
    ? `Target country (user-specified): ${targetCountry}. Set country_code accordingly and detection_method to "user_override".`
    : `Detect the target country from the JD text. Look for phrases like "authorised to work in X", explicit location mentions, or company HQ signals. Use country_code "OTHER" and detection_method "unknown" if undetectable.`

  return `Task: Analyse the resume and job description and return all four intelligence objects.

=== GEOGRAPHY CONTEXT ===
${geoInstruction}

=== COUNTRY FORMAT NORMS REFERENCE ===
US: photo=false, length="1p junior / 2p senior", personal_details="no DOB or address", date_format="Month YYYY"
UK: photo=false, length="2 pages standard", personal_details="no DOB expected", date_format="Month YYYY"
DE: photo=true (required), length="2 pages", personal_details="DOB and nationality common", date_format="MM.YYYY"
FR: photo=optional, length="1–2 pages", personal_details="DOB optional", date_format="MM/YYYY"
BR: photo=optional, length="1–2 pages", personal_details="standard personal details", date_format="MM/YYYY"
AU/NZ: photo=false, length="2–3 pages", personal_details="no DOB", date_format="Month YYYY"
JP: photo=true (required), length="1-sheet rirekisho or 2-page CV", personal_details="DOB and gender common on rirekisho", date_format="YYYY/MM"
IN: photo=optional, length="2–3 pages", personal_details="DOB sometimes included", date_format="Month YYYY"

=== FORMAT AUDIT (analyse resume text only) ===
Flag each issue found with its category, severity, and a one-sentence description.
- table_column: resume uses tables or multi-column layout that ATS parsers misread
- emoji_graphic: emojis or decorative graphics appear in the body text
- section_heading: non-standard headings (e.g. "My Story" instead of "Experience")
- missing_url: no LinkedIn URL or professional portfolio link present
- vague_bullet: bullet points describe duties without metrics or outcomes
- length_mismatch: resume length is inappropriate for the apparent years of experience
overall_health: "good" = 0 critical + ≤2 warnings; "fair" = 1 critical or 3–5 warnings; "poor" = 2+ critical or 6+ warnings.
pass = true when overall_health is "good".

=== INDUSTRY LENS (analyse JD text only) ===
Classify the JD by industry vertical. List the sections typically expected for that vertical.
Compare against sections present in the resume to identify missing_sections.

=== CULTURAL TONE (analyse resume text, compared against target country norm) ===
Classify the resume's writing register. Compare against the expected norm for the target country.
List specific mismatches as concise strings. Set overall_alignment based on mismatch count.

Job: ${jdTitle}
Job Description:
${preparedJob}

Resume:
${preparedResume}`.trim()
}

function parseIntelligenceOrNull(rawResponse: string): IntelligenceResult | null {
  let text = rawResponse.trim()
  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/, '')
      .replace(/```\s*$/, '')
      .trim()
  }
  try {
    const data = JSON.parse(text)
    if (
      typeof data !== 'object' ||
      data === null ||
      !data.format_audit ||
      !data.geography_passport ||
      !data.industry_lens ||
      !data.cultural_tone
    )
      return null
    return data as IntelligenceResult
  } catch {
    return null
  }
}

function buildSectionAwareContext(
  text: string,
  options: {
    maxChars: number
    headingKeywords: string[]
    priorityRegex: RegExp
  }
): string {
  const normalized = text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
  if (!normalized) return ''

  const lines = normalized.split('\n').map((line) => line.trim())
  const sectionBuckets: string[] = []
  let currentHeading = 'general'
  let activeLines: string[] = []

  const flushSection = () => {
    if (activeLines.length === 0) return
    sectionBuckets.push(`## ${currentHeading}\n${activeLines.join('\n')}`)
    activeLines = []
  }

  for (const rawLine of lines) {
    if (!rawLine) continue
    const line = rawLine.replace(/\s+/g, ' ').trim()
    const looksLikeHeading =
      line.length <= 80 &&
      !line.startsWith('-') &&
      !line.startsWith('*') &&
      !line.startsWith('•') &&
      /[A-Za-z]/.test(line)

    if (
      looksLikeHeading &&
      options.headingKeywords.some((keyword) => line.toLowerCase().includes(keyword))
    ) {
      flushSection()
      currentHeading = line
      continue
    }

    activeLines.push(line)
  }
  flushSection()

  const allSections =
    sectionBuckets.length > 0 ? sectionBuckets : [`## general\n${lines.join('\n')}`]
  const rankedLines = allSections
    .join('\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const highPriority = rankedLines.filter(
    (line) => line.startsWith('## ') || options.priorityRegex.test(line)
  )
  const mediumPriority = rankedLines.filter(
    (line) => !highPriority.includes(line) && (/^-|^\*|^•/.test(line) || line.length < 140)
  )
  const lowPriority = rankedLines.filter(
    (line) => !highPriority.includes(line) && !mediumPriority.includes(line)
  )

  const merged = [...highPriority, ...mediumPriority, ...lowPriority].join('\n')
  if (merged.length <= options.maxChars) return merged
  return `${merged.slice(0, options.maxChars)}...[compressed]`
}

function parseATSResponseOrNull(rawResponse: string): ATSAnalysisResult | null {
  let text = rawResponse.trim()

  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/, '')
      .replace(/```\s*$/, '')
      .trim()
  }

  try {
    const data = JSON.parse(text)

    if (typeof data !== 'object' || data === null) {
      throw new Error('Response must be a JSON object')
    }

    return {
      match_score: clampScore(data.match_score),
      keywords_found: coerceToStringArray(data.keywords_found),
      keywords_missing: coerceToStringArray(data.keywords_missing),
      resume_warnings: coerceToStringArray(data.resume_warnings),
      recommendations: coerceToStringArray(data.recommendations),
      score_breakdown: {
        skills_alignment: clampScore(data?.score_breakdown?.skills_alignment),
        experience_relevance: clampScore(data?.score_breakdown?.experience_relevance),
        domain_fit: clampScore(data?.score_breakdown?.domain_fit),
        format_quality: clampScore(data?.score_breakdown?.format_quality),
      },
      evidence: Array.isArray(data.evidence)
        ? data.evidence
            .map((item: unknown) => {
              const evidenceItem =
                typeof item === 'object' && item !== null
                  ? (item as Record<string, unknown>)
                  : ({} as Record<string, unknown>)
              return {
                skill: String(evidenceItem.skill || '').trim(),
                jd_quote: String(evidenceItem.jd_quote || '').trim(),
                resume_quote: String(evidenceItem.resume_quote || '').trim(),
                reasoning: String(evidenceItem.reasoning || '').trim(),
              }
            })
            .filter(
              (item: {
                skill: string
                jd_quote: string
                resume_quote: string
                reasoning: string
              }) => item.skill && item.jd_quote && item.resume_quote && item.reasoning
            )
        : [],
    }
  } catch (error) {
    console.error('Failed to parse ATS response:', error)
    return null
  }
}

function clampScore(value: unknown): number {
  try {
    const num = parseFloat(value)
    if (isNaN(num)) return 0.0
    return Math.max(0.0, Math.min(1.0, num))
  } catch {
    return 0.0
  }
}

function coerceToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String)
  }
  if (typeof value === 'string') {
    return [value]
  }
  return []
}

// ---------------------------------------------------------------------------
// CV Optimisation Score — fetch accepted enrichments for a resume
// ---------------------------------------------------------------------------
async function getAcceptedEnrichments(
  resumeId: string,
  supabase: ReturnType<typeof createClient>
): Promise<AcceptedEnrichment[]> {
  try {
    const { data, error } = await supabase
      .from('sats_enriched_experiences')
      .select(
        `
        skill_name,
        suggestion,
        skill_experience_id,
        skill_experience:sats_skill_experiences!sats_enriched_experiences_skill_experience_id_fkey (
          job_title,
          company:sats_companies!sats_skill_experiences_company_id_fkey ( name )
        )
      `
      )
      .eq('resume_id', resumeId)
      .eq('user_action', 'accepted')
      .is('deleted_at', null)

    if (error) {
      console.warn('[getAcceptedEnrichments] Query error — skipping enrichments:', error.message)
      return []
    }

    return (data ?? []).map((row: any) => ({
      skill_name: row.skill_name,
      suggestion: row.suggestion,
      skill_experience_id: row.skill_experience_id ?? null,
      job_title: row.skill_experience?.job_title ?? null,
      company_name: row.skill_experience?.company?.name ?? null,
    }))
  } catch (err) {
    console.warn('[getAcceptedEnrichments] Unexpected error — skipping enrichments:', err)
    return []
  }
}

async function getResumeContent(
  resume: { id: string; name: string; file_url?: string | null; user_id?: string | null },
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  console.log(`Checking for pre-extracted text for resume ${resume.id}`)

  const { data: extraction, error: extractionError } = await supabase
    .from('document_extractions')
    .select('extracted_text, warnings, word_count, extraction_method')
    .eq('resume_id', resume.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  console.log('Document extraction query result:', {
    found: !extractionError,
    textLength: extraction?.extracted_text?.length || 0,
    wordCount: extraction?.word_count || 0,
    method: extraction?.extraction_method || 'none',
    error: extractionError?.message || 'none',
  })

  if (
    !extractionError &&
    extraction?.extracted_text &&
    extraction.extracted_text.trim().length > 0
  ) {
    console.log(
      '✓ Using pre-extracted text, length:',
      extraction.extracted_text.length,
      'words:',
      extraction.word_count
    )
    return extraction.extracted_text
  }

  if (resume.file_url) {
    try {
      console.log('Attempting to fetch resume content from:', resume.file_url)
      const response = await fetch(resume.file_url)
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        console.log('Retrieved resume content, length:', buffer.byteLength)

        const extractedText = await extractTextFromBuffer(buffer, resume.name)

        try {
          await supabase.from('document_extractions').upsert({
            resume_id: resume.id,
            extracted_text: extractedText,
            extraction_method: 'edge-function',
            word_count: extractedText.split(/\s+/).filter((w: string) => w.length > 0).length,
            warnings: [],
          })
        } catch (storeError) {
          console.warn('Failed to store extracted text:', storeError)
        }

        return extractedText
      }
    } catch (error) {
      console.error('Failed to fetch resume content:', error)
      console.error('Resume details:', {
        id: resume.id,
        name: resume.name,
        file_url: resume.file_url,
        user_id: resume.user_id,
      })

      const { data: fallbackExtraction } = await supabase
        .from('document_extractions')
        .select('extracted_text')
        .eq('resume_id', resume.id)
        .order('created_at', { ascending: false })
        .maybeSingle()

      if (fallbackExtraction?.extracted_text) {
        console.log('✓ Using fallback pre-extracted text')
        return fallbackExtraction.extracted_text
      }

      const errorMessage = `Resume content is unreadable or corrupted. Error: ${error instanceof Error ? error.message : String(error)}`
      console.error('Returning error message:', errorMessage)
      return errorMessage
    }
  }

  return `Resume content for ${resume.name} could not be accessed.`
}

async function extractTextFromBuffer(buffer: ArrayBuffer, filename: string): Promise<string> {
  const uint8Array = new Uint8Array(buffer)
  const fileExtension = filename.split('.').pop()?.toLowerCase()

  console.log(
    `Extracting text from file: ${filename}, detected extension: ${fileExtension}, buffer size: ${buffer.byteLength}`
  )

  try {
    const magicBytes = uint8Array.slice(0, 8)
    const magicHex = Array.from(magicBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    console.log(`File magic bytes: ${magicHex}`)

    let detectedType = fileExtension

    if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4b) {
      console.log('Detected ZIP/DOCX format from magic bytes')
      detectedType = 'docx'
    } else if (
      magicBytes[0] === 0x25 &&
      magicBytes[1] === 0x50 &&
      magicBytes[2] === 0x44 &&
      magicBytes[3] === 0x46
    ) {
      console.log('Detected PDF format from magic bytes')
      detectedType = 'pdf'
    } else {
      const sample = uint8Array.slice(0, Math.min(1024, uint8Array.length))
      const textableBytes = sample.filter(
        (byte) =>
          (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13 || byte === 32
      )

      if (textableBytes.length / sample.length > 0.8) {
        console.log('Detected text format from content analysis')
        detectedType = 'txt'
      }
    }

    console.log(`Final detected type: ${detectedType}`)

    switch (detectedType) {
      case 'docx':
        return await extractFromDOCX(buffer)
      case 'pdf':
        return await extractFromPDF(buffer)
      case 'txt':
        return new TextDecoder('utf-8').decode(buffer)
      case 'html':
      case 'htm':
        return await extractFromHTML(buffer)
      default:
        console.log('Unknown file type, attempting fallback extractions...')

        try {
          console.log('Attempting DOCX extraction as fallback...')
          const docxResult = await extractFromDOCX(buffer)
          console.log('✓ DOCX fallback extraction successful')
          return docxResult
        } catch (docxError) {
          console.log(
            'DOCX fallback failed:',
            docxError instanceof Error ? docxError.message : String(docxError)
          )
        }

        try {
          console.log('Attempting PDF extraction as fallback...')
          const pdfResult = await extractFromPDF(buffer)
          console.log('✓ PDF fallback extraction successful')
          return pdfResult
        } catch (pdfError) {
          console.log(
            'PDF fallback failed:',
            pdfError instanceof Error ? pdfError.message : String(pdfError)
          )
        }

        try {
          console.log('Attempting text extraction as fallback...')
          const textResult = new TextDecoder('utf-8').decode(buffer)
          if (textResult.trim().length > 10) {
            console.log('✓ Text fallback extraction successful')
            return textResult
          }
        } catch (textError) {
          console.log(
            'Text fallback failed:',
            textError instanceof Error ? textError.message : String(textError)
          )
        }

        throw new Error(
          `Unsupported file format: ${filename}. Tried DOCX, PDF, and text extraction.`
        )
    }
  } catch (error) {
    console.error('Text extraction failed:', error)
    throw new Error(
      `Failed to extract text from ${filename}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function extractFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting DOCX extraction...')
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default

    const zip = await JSZip.loadAsync(buffer)
    console.log('ZIP loaded successfully, files:', Object.keys(zip.files))

    const documentXml = await zip.file('word/document.xml')?.async('text')

    if (!documentXml) {
      const availableFiles = Object.keys(zip.files)
      console.log('Available files in ZIP:', availableFiles)
      throw new Error(
        `Invalid DOCX file structure - no document.xml found. Available files: ${availableFiles.join(', ')}`
      )
    }

    console.log('document.xml found, length:', documentXml.length)

    const textElements = [
      /<w:t[^>]*>([^<]*)<\/w:t>/g,
      /<w:t>([^<]*)<\/w:t>/g,
      /<w:instrText[^>]*>([^<]*)<\/w:instrText>/g,
    ]

    let allText: string[] = []

    for (const regex of textElements) {
      let match
      while ((match = regex.exec(documentXml)) !== null) {
        if (match[1] && match[1].trim()) {
          allText.push(match[1].trim())
        }
      }
    }

    console.log('Extracted text elements:', allText.length)

    if (allText.length === 0) {
      const fallbackMatches = documentXml.match(/>([^<]+)</g)
      if (fallbackMatches) {
        allText = fallbackMatches
          .map((match) => match.substring(1, match.length - 1).trim())
          .filter((text) => text.length > 0 && !text.startsWith('xml') && !text.startsWith('w:'))
        console.log('Fallback extraction found:', allText.length, 'text elements')
      }
    }

    const extractedText = allText.join(' ').trim()

    if (!extractedText) {
      throw new Error('DOCX file appears to be empty or corrupted - no readable text found')
    }

    console.log('✓ DOCX extraction successful, text length:', extractedText.length)
    return extractedText
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error(
      `DOCX extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function extractFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfParse = (await import('https://esm.sh/pdf-parse@1.1.1')).default

    const data = await pdfParse(buffer)

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF file appears to be empty or contains only images')
    }

    return data.text.trim()
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function extractFromHTML(buffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8')
    const htmlContent = decoder.decode(buffer)

    const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
    const textContent = doc?.body?.textContent || doc?.documentElement?.textContent || ''

    if (!textContent.trim()) {
      throw new Error('HTML file appears to be empty')
    }

    return textContent.trim()
  } catch (error) {
    console.error('HTML extraction error:', error)
    throw new Error(
      `HTML extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
