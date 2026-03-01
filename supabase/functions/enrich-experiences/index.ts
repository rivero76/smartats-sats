/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added request_id propagation for enrichment flow correlation.
 * 2026-02-21 00:15:00 | Hardened provider error handling: avoid raw provider payload logging and return safe messages for 401/429/5xx.
 * 2026-02-21 03:07:10 | P1 config hardening: parameterized AI provider endpoint, model, and temperature via environment variables.
 * 2026-02-21 03:13:40 | SDLC P4 security hardening: replaced wildcard CORS with ALLOWED_ORIGINS allowlist enforcement.
 * 2026-02-22 10:00:00 | P10 execution start: added schema-locked enrichment contract, grounded prompt constraints, and retry-on-invalid-output validation.
 * 2026-03-01 00:00:00 | P16 Story 0: Removed duplicated CORS, env, mapProviderError, isSchemaUnsupportedError, and OpenAI fetch loop; replaced with _shared/ imports and callLLM().
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber } from '../_shared/env.ts'
import { callLLM } from '../_shared/llmProvider.ts'

const OPENAI_MODEL_ENRICH = Deno.env.get('OPENAI_MODEL_ENRICH') || 'gpt-4.1-mini'
const OPENAI_MODEL_ENRICH_FALLBACK = Deno.env.get('OPENAI_MODEL_ENRICH_FALLBACK') || 'gpt-4o-mini'
const OPENAI_TEMPERATURE_ENRICH = getEnvNumber('OPENAI_TEMPERATURE_ENRICH', 0.25)
const OPENAI_MAX_TOKENS_ENRICH = Math.max(
  500,
  Math.floor(getEnvNumber('OPENAI_MAX_TOKENS_ENRICH', 1800))
)
const OPENAI_SCHEMA_RETRY_ATTEMPTS_ENRICH = Math.max(
  0,
  Math.min(2, Math.floor(getEnvNumber('OPENAI_SCHEMA_RETRY_ATTEMPTS_ENRICH', 1)))
)

const ENRICHMENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'skill_name',
          'skill_type',
          'confidence',
          'explanation',
          'suggestion',
          'source_resume_evidence',
          'risk_flag',
        ],
        properties: {
          skill_name: { type: 'string' },
          skill_type: { type: 'string', enum: ['explicit', 'inferred'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          explanation: { type: 'string' },
          suggestion: { type: 'string' },
          derived_context: { type: 'string' },
          source_resume_evidence: { type: 'string' },
          risk_flag: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
  },
}

interface EnrichmentRequest {
  analysis_id?: string
  resume_id: string
  jd_id?: string
  matched_skills?: string[]
  missing_skills?: string[]
  master_skills?: string[]
  request_id?: string
}

interface EnrichmentSuggestion {
  skill_name: string
  skill_type: 'explicit' | 'inferred'
  confidence: number
  explanation: string
  suggestion: string
  derived_context?: string
  source_resume_evidence: string
  risk_flag: 'low' | 'medium' | 'high'
}

class EnrichmentConfigError extends Error {
  code: string
  constructor(message: string, code = 'CONFIG_ERROR') {
    super(message)
    this.name = 'EnrichmentConfigError'
    this.code = code
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const functionsBaseUrl =
  Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
  supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
const loggingEndpoint = `${functionsBaseUrl}/functions/v1/centralized-logging`

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
  message: string,
  metadata?: Record<string, unknown>,
  requestId?: string
) {
  try {
    await fetch(loggingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        script_name: 'enrich-experiences',
        log_level: level,
        message,
        metadata,
        request_id: requestId,
      }),
    })
  } catch (error) {
    console.error('[enrich-experiences] Failed to record log:', error)
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

  let payload: EnrichmentRequest
  try {
    payload = await req.json()
  } catch (_error) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!payload?.resume_id) {
    return new Response(JSON.stringify({ success: false, error: 'resume_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!Deno.env.get('OPENAI_API_KEY')) {
      throw new EnrichmentConfigError(
        'Missing required secret OPENAI_API_KEY for enrich-experiences',
        'MISSING_OPENAI_API_KEY'
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    await logEvent(
      'INFO',
      'Starting enrichment request',
      {
        analysis_id: payload.analysis_id,
        resume_id: payload.resume_id,
        jd_id: payload.jd_id,
      },
      payload.request_id
    )

    const [resumeResult, jobResult] = await Promise.all([
      supabase
        .from('sats_resumes')
        .select('id, name, user_id')
        .eq('id', payload.resume_id)
        .single(),
      payload.jd_id
        ? supabase
            .from('sats_job_descriptions')
            .select(
              `
          id,
          name,
          pasted_text,
          company:sats_companies(name)
        `
            )
            .eq('id', payload.jd_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (resumeResult.error) {
      await logEvent(
        'ERROR',
        'Resume fetch failed',
        { error: resumeResult.error.message },
        payload.request_id
      )
      throw new Error(resumeResult.error.message)
    }

    const resume = resumeResult.data
    const job = jobResult.data

    const resumeContent = await fetchResumeContent(supabase, payload.resume_id, payload.request_id)
    const jobContent = job?.pasted_text || ''

    const prompt = buildEnrichmentPrompt({
      resumeName: resume?.name || 'Candidate Resume',
      resumeContent,
      jobName: job?.name || 'Target Role',
      jobContent,
      matchedSkills: payload.matched_skills || [],
      missingSkills: payload.missing_skills || [],
      masterSkills: payload.master_skills || [],
    })

    const systemPrompt =
      'You are an expert resume enrichment assistant. Return JSON that exactly matches schema. Never fabricate evidence: every suggestion must cite a supporting phrase from the resume.'

    const modelCandidates = [OPENAI_MODEL_ENRICH]
    if (OPENAI_MODEL_ENRICH_FALLBACK && OPENAI_MODEL_ENRICH_FALLBACK !== OPENAI_MODEL_ENRICH) {
      modelCandidates.push(OPENAI_MODEL_ENRICH_FALLBACK)
    }

    const llmResult = await callLLM({
      systemPrompt,
      userPrompt: prompt,
      modelCandidates,
      jsonSchema: ENRICHMENT_JSON_SCHEMA,
      schemaName: 'enrichment_response',
      temperature: OPENAI_TEMPERATURE_ENRICH,
      maxTokens: OPENAI_MAX_TOKENS_ENRICH,
      retryAttempts: OPENAI_SCHEMA_RETRY_ATTEMPTS_ENRICH,
      taskLabel: 'enrichment',
    })

    const suggestions = parseEnrichmentResponse(llmResult.rawContent)
    if (suggestions.length === 0) {
      throw new Error('Failed to produce schema-valid enrichment suggestions')
    }

    await logEvent(
      'INFO',
      'Enrichment suggestions generated',
      {
        suggestion_count: suggestions.length,
        resume_id: payload.resume_id,
        jd_id: payload.jd_id,
        schema_retry_attempts_used: llmResult.retryAttemptsUsed,
      },
      payload.request_id
    )

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        metadata: {
          model: llmResult.modelUsed,
          token_usage: {
            prompt_tokens: llmResult.promptTokens,
            completion_tokens: llmResult.completionTokens,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Enrichment function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode =
      error instanceof EnrichmentConfigError
        ? error.code
        : error instanceof Error
          ? error.name
          : 'UNKNOWN'
    const statusCode = error instanceof EnrichmentConfigError ? 503 : 500

    await logEvent(
      'ERROR',
      'Enrichment function error',
      {
        message: errorMessage,
        code: errorCode,
      },
      payload.request_id
    )
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: errorCode,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function fetchResumeContent(
  supabase: ReturnType<typeof createClient>,
  resumeId: string,
  requestId?: string
) {
  const { data, error } = await supabase
    .from('document_extractions')
    .select('extracted_text')
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch resume extraction:', error)
    await logEvent(
      'ERROR',
      'Resume content lookup failed',
      { resume_id: resumeId, error },
      requestId
    )
    throw new Error('Unable to load resume content for enrichment')
  }

  if (!data?.extracted_text) {
    await logEvent('ERROR', 'Resume extraction missing text', { resume_id: resumeId }, requestId)
    throw new Error('Resume content unavailable. Please re-upload the resume.')
  }

  return data.extracted_text
}

function buildEnrichmentPrompt({
  resumeName,
  resumeContent,
  jobName,
  jobContent,
  matchedSkills,
  missingSkills,
  masterSkills,
}: {
  resumeName: string
  resumeContent: string
  jobName: string
  jobContent: string
  matchedSkills: string[]
  missingSkills: string[]
  masterSkills: string[]
}) {
  const preparedResumeText = buildSectionAwareContext(resumeContent, {
    maxChars: 5200,
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
  const preparedJobText = buildSectionAwareContext(jobContent, {
    maxChars: 4200,
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

  return `
You enhance resumes by inferring believable sub-skills and crafting quantifiable bullet points.

Rules:
- Only propose sub-skills that are strongly implied by the resume context.
- Use "skill_type": "explicit" if the skill already exists verbatim; otherwise use "inferred".
- Provide concise explanations telling the user why the skill is relevant.
- Bullet points must be action-oriented and, when possible, include metrics or scope.
- Every suggestion must include source_resume_evidence as a direct short quote from the resume.
- Use risk_flag:
  - low: explicit skill + clear evidence
  - medium: inferred skill with strong evidence
  - high: inferred skill with limited evidence
- Do not invent claims, employers, tools, metrics, or certifications not grounded in resume content.
- Output strict JSON with a top-level array "suggestions" only.

Context:
- Resume (${resumeName}):
${preparedResumeText}

- Job Description (${jobName}):
${preparedJobText}

- Matched Skills: ${matchedSkills.join(', ') || 'None'}
- Missing Skills: ${missingSkills.join(', ') || 'None'}
- Master Skills: ${masterSkills.join(', ') || 'None'}

JSON schema:
{
  "suggestions": [
    {
      "skill_name": "Budget Forecasting",
      "skill_type": "inferred",
      "confidence": 0.82,
      "explanation": "PMP certification and ownership of cross-functional delivery imply budgeting expertise.",
      "suggestion": "Directed quarterly budget forecasts for a $1.2M portfolio, reallocating funds to accelerate launches by 15%.",
      "derived_context": "Mention of PMP certification and leading multi-million dollar programs.",
      "source_resume_evidence": "Led multi-million dollar programs and held PMP certification",
      "risk_flag": "medium"
    }
  ]
}
`.trim()
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

function parseEnrichmentResponse(raw: string): EnrichmentSuggestion[] {
  let jsonText = raw.trim()

  if (jsonText.startsWith('```')) {
    jsonText = jsonText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
  }

  try {
    const parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed.suggestions)) {
      throw new Error('Missing suggestions array')
    }

    return parsed.suggestions
      .map((item: unknown) => {
        const row =
          typeof item === 'object' && item !== null
            ? (item as Record<string, unknown>)
            : ({} as Record<string, unknown>)
        return {
          skill_name: String(row.skill_name || '').trim(),
          skill_type: row.skill_type === 'explicit' ? 'explicit' : 'inferred',
          confidence: clamp(Number(row.confidence ?? 0.5)),
          explanation: String(row.explanation || '').trim(),
          suggestion: String(row.suggestion || '').trim(),
          derived_context: row.derived_context ? String(row.derived_context) : undefined,
          source_resume_evidence: String(row.source_resume_evidence || '').trim(),
          risk_flag: mapRiskFlag(row.risk_flag),
        }
      })
      .filter(
        (item: EnrichmentSuggestion) =>
          item.skill_name &&
          item.suggestion &&
          item.source_resume_evidence &&
          item.explanation
      )
  } catch (error) {
    console.error('Failed to parse enrichment response:', error, raw)
    return []
  }
}

function mapRiskFlag(value: unknown): 'low' | 'medium' | 'high' {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized
  }
  return 'medium'
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}
