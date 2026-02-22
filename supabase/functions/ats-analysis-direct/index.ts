/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed ATS direct edge function updates and added timestamped file header tracking.
 * 2026-02-20 23:22:57 | P1: Added centralized structured logging hooks for ATS analysis queue, completion, and failures.
 * 2026-02-20 23:29:40 | P2: Added request_id propagation for end-to-end ATS trace correlation.
 * 2026-02-21 03:07:10 | P1 config hardening: parameterized AI provider endpoint, model, temperature, and pricing via environment variables.
 * 2026-02-21 03:13:40 | SDLC P2 data-governance hardening: prompt/raw LLM persistence disabled by default with explicit env flags.
 * 2026-02-21 03:13:40 | SDLC P4 security hardening: replaced wildcard CORS with ALLOWED_ORIGINS allowlist enforcement.
 * 2026-02-22 10:00:00 | P10 execution start: added schema-locked ATS response contract, deterministic rubric prompt, and retry-on-invalid-output validation.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:8080'
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') || DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
)

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

function getEnvNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getEnvBoolean(name: string, fallback: boolean): boolean {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

const OPENAI_API_BASE_URL = (
  Deno.env.get('OPENAI_API_BASE_URL') || 'https://api.openai.com/v1'
).replace(/\/$/, '')
const OPENAI_CHAT_COMPLETIONS_URL = `${OPENAI_API_BASE_URL}/chat/completions`
const OPENAI_MODEL_ATS = Deno.env.get('OPENAI_MODEL_ATS') || 'gpt-4.1'
const OPENAI_MODEL_ATS_FALLBACK = Deno.env.get('OPENAI_MODEL_ATS_FALLBACK') || 'gpt-4o-mini'
const OPENAI_TEMPERATURE_ATS = getEnvNumber('OPENAI_TEMPERATURE_ATS', 0.1)
const OPENAI_MAX_TOKENS_ATS = Math.max(
  500,
  Math.floor(getEnvNumber('OPENAI_MAX_TOKENS_ATS', 1800))
)
const OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS = Math.max(
  0,
  Math.min(2, Math.floor(getEnvNumber('OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS', 1)))
)
const OPENAI_PRICE_INPUT_PER_MILLION = getEnvNumber('OPENAI_PRICE_INPUT_PER_MILLION', 0.15)
const OPENAI_PRICE_OUTPUT_PER_MILLION = getEnvNumber('OPENAI_PRICE_OUTPUT_PER_MILLION', 0.6)
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

const MODEL_PRICING_USD: Record<string, { input: number; output: number }> = {
  // Cost per 1M tokens (USD) based on OpenAI pricing
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

MODEL_PRICING_USD[OPENAI_MODEL_ATS] = {
  input: OPENAI_PRICE_INPUT_PER_MILLION,
  output: OPENAI_PRICE_OUTPUT_PER_MILLION,
}

function calculateLLMCost(
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined,
  model: string
): number | null {
  if (!tokenUsage || !model || !MODEL_PRICING_USD[model]) return null

  const pricing = MODEL_PRICING_USD[model]
  const promptTokens = tokenUsage.prompt_tokens || 0
  const completionTokens = tokenUsage.completion_tokens || 0

  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output

  return Number((inputCost + outputCost).toFixed(6))
}

interface ATSAnalysisRequest {
  analysis_id: string
  resume_id: string
  jd_id: string
  request_id?: string
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

  const { analysis_id, resume_id, jd_id, request_id } = requestBody

  if (!analysis_id || !resume_id || !jd_id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing required fields: analysis_id, resume_id, jd_id',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openAIApiKey) {
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
      status: 500,
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
      openAIApiKey,
      supabaseUrl,
      supabaseServiceKey,
      request_id
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
  openAIApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  requestId?: string
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

    // Build optimized prompt
    const prompt = buildATSPrompt(jobDescription.name, jobContent, resume.name, resumeContent)
    const systemPrompt =
      'You are a deterministic ATS evaluator. Return JSON that matches the provided schema exactly. Never invent resume evidence. If evidence is weak, lower confidence and explain with resume_warnings.'
    const promptsMetadata = {
      system: systemPrompt,
      user: prompt,
    }

    console.log('[processAnalysis] Calling OpenAI API with prompt length:', prompt.length)

    // Call OpenAI API with schema-locked output
    const startTime = Date.now()
    const llmResult = await runATSCompletionWithSchema(openAIApiKey, systemPrompt, prompt)
    const latencyMs = Date.now() - startTime
    const tokenUsage = llmResult.tokenUsage
    const costEstimateUsd = calculateLLMCost(tokenUsage, llmResult.modelUsed)
    const rawContent = llmResult.rawContent

    console.log('[processAnalysis] Raw OpenAI response:', rawContent)
    console.log('[processAnalysis] Token usage:', tokenUsage)
    const analysisResult = llmResult.analysisResult

    const llmStorageFlags = {
      store_llm_prompts: STORE_LLM_PROMPTS,
      store_llm_raw_response: STORE_LLM_RAW_RESPONSE,
    }

    // Store results in database
    const updateData = {
      status: 'completed',
      ats_score: Math.round(analysisResult.match_score * 100),
      matched_skills: analysisResult.keywords_found,
      missing_skills: analysisResult.keywords_missing,
      suggestions: analysisResult.recommendations.join('\n'),
      analysis_data: {
        processing_completed_at: new Date().toISOString(),
        processing_time_ms: latencyMs,
        token_usage: tokenUsage,
        model_used: llmResult.modelUsed,
        cost_estimate_usd: costEstimateUsd,
        prompt_characters: prompt.length,
        request_id: requestId || null,
        extracted_features: analysisResult.keywords_found,
        resume_warnings: analysisResult.resume_warnings,
        score_breakdown: analysisResult.score_breakdown,
        evidence_count: analysisResult.evidence.length,
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
        processing_time_ms: latencyMs,
        duration_ms: latencyMs,
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
// Helpers (unchanged from v2)
// ---------------------------------------------------------------------------

function buildATSPrompt(
  jdTitle: string,
  jdText: string,
  resumeTitle: string,
  resumeText: string
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
    priorityRegex: /(%|\$|led|managed|built|improved|reduced|increased|delivered|developed|implemented)/i,
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
${preparedResumeText}`.trim()
}

function buildSectionAwareContext(
  text: string,
  options: {
    maxChars: number
    headingKeywords: string[]
    priorityRegex: RegExp
  }
): string {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim()
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

  const allSections = sectionBuckets.length > 0 ? sectionBuckets : [`## general\n${lines.join('\n')}`]
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

async function runATSCompletionWithSchema(
  openAIApiKey: string,
  systemPrompt: string,
  prompt: string
): Promise<{
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null
  rawContent: string
  analysisResult: ATSAnalysisResult
  retryAttemptsUsed: number
  modelUsed: string
}> {
  let lastParseError: string | null = null
  const modelCandidates = [OPENAI_MODEL_ATS]
  if (OPENAI_MODEL_ATS_FALLBACK && OPENAI_MODEL_ATS_FALLBACK !== OPENAI_MODEL_ATS) {
    modelCandidates.push(OPENAI_MODEL_ATS_FALLBACK)
  }

  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt <= OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS; attempt++) {
      const retryHint =
        attempt === 0
          ? ''
          : '\n\nIMPORTANT: Your previous response was invalid. Return strict JSON that exactly matches schema keys and value types.'
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          temperature: OPENAI_TEMPERATURE_ATS,
          max_tokens: OPENAI_MAX_TOKENS_ATS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${prompt}${retryHint}` },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'ats_analysis_response',
              strict: true,
              schema: ATS_JSON_SCHEMA,
            },
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API error:', errorText)

        if (response.status === 429 && errorText.includes('rate_limit_exceeded')) {
          throw new Error('Request too large. Please try with a shorter resume or job description.')
        }

        if (response.status >= 500 || response.status === 429) {
          lastParseError = `Provider error on ${modelName}: ${response.status}`
          continue
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const tokenUsage = data.usage || {}
      const rawContent = data.choices?.[0]?.message?.content?.trim() || ''
      const parsed = parseATSResponseOrNull(rawContent)
      if (parsed) {
        return {
          tokenUsage,
          rawContent,
          analysisResult: parsed,
          retryAttemptsUsed: attempt,
          modelUsed: modelName,
        }
      }

      lastParseError = `Model response did not satisfy ATS schema contract on ${modelName}.`
    }
  }

  throw new Error(lastParseError || 'ATS response validation failed')
}

function parseATSResponse(rawResponse: string): ATSAnalysisResult {
  const parsed = parseATSResponseOrNull(rawResponse)
  if (parsed) return parsed

  console.error('Failed to parse ATS response')
  console.error('Raw response was:', rawResponse)
  return {
    match_score: 0.0,
    keywords_found: [],
    keywords_missing: [],
    resume_warnings: ['Failed to parse analysis response'],
    recommendations: ['Please retry the analysis'],
    score_breakdown: {
      skills_alignment: 0,
      experience_relevance: 0,
      domain_fit: 0,
      format_quality: 0,
    },
    evidence: [],
  }
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
              (item: { skill: string; jd_quote: string; resume_quote: string; reasoning: string }) =>
                item.skill && item.jd_quote && item.resume_quote && item.reasoning
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
