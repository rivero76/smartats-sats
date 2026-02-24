/**
 * UPDATE LOG
 * 2026-02-25 01:10:00 | P15 Story 2: Added generate-upskill-roadmap edge function with schema-locked LLM output and DB persistence.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const OPENAI_API_BASE_URL = (
  Deno.env.get('OPENAI_API_BASE_URL') || 'https://api.openai.com/v1'
).replace(/\/$/, '')
const OPENAI_CHAT_COMPLETIONS_URL = `${OPENAI_API_BASE_URL}/chat/completions`
const OPENAI_MODEL_UPSKILL_ROADMAP = Deno.env.get('OPENAI_MODEL_UPSKILL_ROADMAP') || 'gpt-4.1-mini'
const OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK =
  Deno.env.get('OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK') || 'gpt-4o-mini'
const OPENAI_TEMPERATURE_UPSKILL_ROADMAP = getEnvNumber('OPENAI_TEMPERATURE_UPSKILL_ROADMAP', 0.2)
const OPENAI_MAX_TOKENS_UPSKILL_ROADMAP = Math.max(
  600,
  Math.floor(getEnvNumber('OPENAI_MAX_TOKENS_UPSKILL_ROADMAP', 2200))
)
const OPENAI_SCHEMA_RETRY_ATTEMPTS_UPSKILL_ROADMAP = Math.max(
  0,
  Math.min(2, Math.floor(getEnvNumber('OPENAI_SCHEMA_RETRY_ATTEMPTS_UPSKILL_ROADMAP', 1)))
)

const ROADMAP_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['milestones'],
  properties: {
    milestones: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skill_name', 'milestone_type', 'title', 'description', 'estimated_weeks', 'deliverable'],
        properties: {
          skill_name: { type: 'string' },
          milestone_type: { type: 'string', enum: ['course', 'project', 'interview_prep'] },
          title: { type: 'string' },
          description: { type: 'string' },
          estimated_weeks: { type: 'integer', minimum: 1, maximum: 16 },
          deliverable: { type: 'string' },
        },
      },
    },
  },
}

interface GenerateUpskillRoadmapRequest {
  missing_skills: string[]
  target_role: string
  source_ats_analysis_id?: string | null
  request_id?: string
}

interface GeneratedMilestone {
  skill_name: string
  milestone_type: 'course' | 'project' | 'interview_prep'
  title: string
  description: string
  estimated_weeks: number
  deliverable: string
}

class RoadmapConfigError extends Error {
  code: string

  constructor(message: string, code = 'CONFIG_ERROR') {
    super(message)
    this.name = 'RoadmapConfigError'
    this.code = code
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const functionsBaseUrl =
  Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
  (supabaseUrl ? supabaseUrl.replace('.supabase.co', '.functions.supabase.co') : '')
const loggingEndpoint = `${functionsBaseUrl}/functions/v1/centralized-logging`

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
  message: string,
  metadata?: Record<string, unknown>,
  requestId?: string
) {
  if (!supabaseServiceKey || !loggingEndpoint || !functionsBaseUrl) {
    return
  }

  try {
    await fetch(loggingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        script_name: 'generate-upskill-roadmap',
        log_level: level,
        message,
        metadata,
        request_id: requestId,
      }),
    })
  } catch (_error) {
    // Never block roadmap generation on telemetry failures.
  }
}

function mapProviderError(
  status: number,
  providerBody?: string
): { safeMessage: string; errorType: string } {
  if (status === 401 || status === 403) {
    return {
      safeMessage: 'AI provider key misconfigured. Please contact support.',
      errorType: 'provider_auth_error',
    }
  }

  if (status === 429) {
    return {
      safeMessage: 'AI provider rate limit reached. Please retry shortly.',
      errorType: 'provider_rate_limited',
    }
  }

  if (status >= 500) {
    return {
      safeMessage: 'AI provider temporarily unavailable. Please retry shortly.',
      errorType: 'provider_unavailable',
    }
  }

  if (status === 400) {
    const normalizedBody = (providerBody || '').toLowerCase()
    if (
      normalizedBody.includes('response_format') ||
      normalizedBody.includes('json_schema') ||
      normalizedBody.includes('schema')
    ) {
      return {
        safeMessage: 'AI model does not support required structured output settings.',
        errorType: 'provider_model_capability_error',
      }
    }
  }

  return {
    safeMessage: `AI provider request failed (${status}).`,
    errorType: 'provider_request_error',
  }
}

function isSchemaUnsupportedError(providerBody: string): boolean {
  const normalizedBody = providerBody.toLowerCase()
  return (
    (normalizedBody.includes('response_format') || normalizedBody.includes('json_schema')) &&
    (normalizedBody.includes('unsupported') ||
      normalizedBody.includes('not support') ||
      normalizedBody.includes('invalid'))
  )
}

function normalizeMissingSkills(skills: unknown): string[] {
  if (!Array.isArray(skills)) return []

  const unique = new Set<string>()
  for (const item of skills) {
    const normalized = String(item || '').trim()
    if (!normalized) continue
    unique.add(normalized)
  }
  return Array.from(unique)
}

function buildRoadmapPrompt(input: { targetRole: string; missingSkills: string[] }): string {
  const skillList = input.missingSkills.join(', ')

  return `
You are a senior career coach building an actionable upskilling roadmap.

Objective:
Generate a sequenced roadmap for a candidate targeting the role "${input.targetRole}".

Missing skills to close:
${skillList}

Constraints:
- Return strict JSON only.
- Build milestones in logical order (fundamentals before advanced execution).
- Use milestone_type values only from: course, project, interview_prep.
- Include at least one "project" milestone that is portfolio-ready and has a concrete deliverable.
- Keep each milestone practical and measurable.
- Avoid generic filler text.

Schema reminder:
{
  "milestones": [
    {
      "skill_name": "Stakeholder Management",
      "milestone_type": "course",
      "title": "Master Stakeholder Mapping",
      "description": "Complete a targeted module and apply a stakeholder matrix to a real project scenario.",
      "estimated_weeks": 2,
      "deliverable": "Completed stakeholder matrix and communication plan artifact"
    }
  ]
}
`.trim()
}

function parseRoadmapResponse(raw: string): GeneratedMilestone[] {
  let jsonText = raw.trim()

  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim()
  }

  try {
    const parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed?.milestones)) {
      return []
    }

    const mapped = parsed.milestones
      .map((row: unknown): GeneratedMilestone | null => {
        if (typeof row !== 'object' || row === null) return null
        const item = row as Record<string, unknown>

        const skillName = String(item.skill_name || '').trim()
        const title = String(item.title || '').trim()
        const description = String(item.description || '').trim()
        const deliverable = String(item.deliverable || '').trim()
        const estimatedWeeks = Number(item.estimated_weeks ?? 0)
        const milestoneType = String(item.milestone_type || '').trim()

        if (!skillName || !title || !description || !deliverable) return null
        if (!['course', 'project', 'interview_prep'].includes(milestoneType)) return null

        return {
          skill_name: skillName,
          milestone_type: milestoneType as GeneratedMilestone['milestone_type'],
          title,
          description,
          estimated_weeks: Math.max(1, Math.min(16, Number.isFinite(estimatedWeeks) ? Math.round(estimatedWeeks) : 1)),
          deliverable,
        }
      })
      .filter((item: GeneratedMilestone | null): item is GeneratedMilestone => !!item)

    return mapped
  } catch (_error) {
    return []
  }
}

function ensureProjectMilestone(
  milestones: GeneratedMilestone[],
  targetRole: string,
  missingSkills: string[]
): GeneratedMilestone[] {
  const hasProject = milestones.some((item) => item.milestone_type === 'project')
  if (hasProject) return milestones

  const anchorSkill = missingSkills[0] || 'Core Role Skill'
  return [
    ...milestones,
    {
      skill_name: anchorSkill,
      milestone_type: 'project',
      title: `Portfolio Project: ${targetRole} Capability Demo`,
      description:
        `Build an end-to-end project demonstrating ${anchorSkill} and publish the process, outcomes, and tradeoffs.`,
      estimated_weeks: 3,
      deliverable: 'Public case study (repo or slide deck) with problem statement, implementation, and measurable outcomes',
    },
  ]
}

async function runRoadmapCompletionWithSchema(
  openAIApiKey: string,
  prompt: string,
  requestId?: string
): Promise<{
  milestones: GeneratedMilestone[]
  tokenUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null
  retryAttemptsUsed: number
  modelUsed: string
}> {
  let lastError: string | null = null

  const modelCandidates = [OPENAI_MODEL_UPSKILL_ROADMAP]
  if (
    OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK &&
    OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK !== OPENAI_MODEL_UPSKILL_ROADMAP
  ) {
    modelCandidates.push(OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK)
  }

  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt <= OPENAI_SCHEMA_RETRY_ATTEMPTS_UPSKILL_ROADMAP; attempt++) {
      const retryHint =
        attempt === 0
          ? ''
          : '\n\nIMPORTANT: previous response was invalid. Return strict JSON only with exact keys and valid enum values.'

      const userContent = `${prompt}${retryHint}`
      const buildBody = (useSchemaResponse: boolean) => ({
        model: modelName,
        temperature: OPENAI_TEMPERATURE_UPSKILL_ROADMAP,
        max_tokens: OPENAI_MAX_TOKENS_UPSKILL_ROADMAP,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert learning roadmap planner. Always return strict JSON matching the requested schema.',
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        ...(useSchemaResponse
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'upskill_roadmap_response',
                  strict: true,
                  schema: ROADMAP_JSON_SCHEMA,
                },
              },
            }
          : {}),
      })

      let response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildBody(true)),
      })

      if (!response.ok) {
        let providerBody = await response.text()

        if (response.status === 400 && isSchemaUnsupportedError(providerBody)) {
          await logEvent(
            'INFO',
            'Schema output unsupported; retrying without schema mode',
            { model: modelName, attempt },
            requestId
          )

          response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildBody(false)),
          })

          if (!response.ok) {
            providerBody = await response.text()
          } else {
            providerBody = ''
          }
        }

        if (!response.ok) {
          const { safeMessage, errorType } = mapProviderError(response.status, providerBody)

          if (response.status >= 500 || response.status === 429) {
            lastError = `Provider error on ${modelName}: ${response.status}`
            continue
          }

          await logEvent(
            'ERROR',
            'OpenAI request failed',
            {
              status: response.status,
              safe_message: safeMessage,
              error_type: errorType,
            },
            requestId
          )

          throw new Error(safeMessage)
        }
      }

      const data = await response.json()
      const rawContent = data.choices?.[0]?.message?.content?.trim() || ''
      const milestones = parseRoadmapResponse(rawContent)

      if (milestones.length > 0) {
        return {
          milestones,
          tokenUsage: data.usage,
          retryAttemptsUsed: attempt,
          modelUsed: modelName,
        }
      }

      lastError = `Roadmap output did not satisfy schema requirements on ${modelName}`
    }
  }

  throw new Error(lastError || 'Failed to produce schema-valid upskilling roadmap')
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

  let payload: GenerateUpskillRoadmapRequest | null = null

  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new RoadmapConfigError(
        'Missing required Supabase environment variables for generate-upskill-roadmap',
        'MISSING_SUPABASE_ENV'
      )
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new RoadmapConfigError(
        'Missing required secret OPENAI_API_KEY for generate-upskill-roadmap',
        'MISSING_OPENAI_API_KEY'
      )
    }

    try {
      payload = await req.json()
    } catch (_error) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requestId = payload?.request_id
    const targetRole = String(payload?.target_role || '').trim()
    const missingSkills = normalizeMissingSkills(payload?.missing_skills)

    if (!targetRole) {
      return new Response(JSON.stringify({ success: false, error: 'target_role is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (missingSkills.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'missing_skills must contain at least one skill' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sourceAnalysisId = payload?.source_ats_analysis_id || null
    if (sourceAnalysisId) {
      const { data: analysisRow, error: analysisError } = await userSupabase
        .from('sats_analyses')
        .select('id')
        .eq('id', sourceAnalysisId)
        .maybeSingle()

      if (analysisError) {
        throw new Error(`Failed to validate source analysis ownership: ${analysisError.message}`)
      }

      if (!analysisRow) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'source_ats_analysis_id not found for current user',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    await logEvent(
      'INFO',
      'Starting roadmap generation request',
      {
        user_id: user.id,
        target_role: targetRole,
        missing_skill_count: missingSkills.length,
        source_ats_analysis_id: sourceAnalysisId,
      },
      requestId
    )

    const prompt = buildRoadmapPrompt({
      targetRole,
      missingSkills,
    })

    const llmResult = await runRoadmapCompletionWithSchema(openAIApiKey, prompt, requestId)
    const milestones = ensureProjectMilestone(llmResult.milestones, targetRole, missingSkills)

    const { data: roadmapRow, error: roadmapError } = await userSupabase
      .from('sats_learning_roadmaps')
      .insert({
        user_id: user.id,
        target_role: targetRole,
        source_ats_analysis_id: sourceAnalysisId,
        status: 'active',
      })
      .select('id')
      .single()

    if (roadmapError || !roadmapRow) {
      throw new Error(`Failed to persist learning roadmap: ${roadmapError?.message || 'No row returned'}`)
    }

    const rows = milestones.map((milestone, index) => ({
      roadmap_id: roadmapRow.id,
      skill_name: milestone.skill_name,
      milestone_type: milestone.milestone_type,
      description: `${milestone.title}: ${milestone.description} Deliverable: ${milestone.deliverable}`,
      is_completed: false,
      order_index: index + 1,
    }))

    const { error: milestonesError } = await userSupabase
      .from('sats_roadmap_milestones')
      .insert(rows)

    if (milestonesError) {
      await userSupabase.from('sats_learning_roadmaps').delete().eq('id', roadmapRow.id)
      throw new Error(`Failed to persist roadmap milestones: ${milestonesError.message}`)
    }

    await logEvent(
      'INFO',
      'Roadmap generated and persisted',
      {
        user_id: user.id,
        roadmap_id: roadmapRow.id,
        milestone_count: rows.length,
        schema_retry_attempts_used: llmResult.retryAttemptsUsed,
        model_used: llmResult.modelUsed,
      },
      requestId
    )

    return new Response(
      JSON.stringify({
        success: true,
        roadmap_id: roadmapRow.id,
        milestones_count: rows.length,
        metadata: {
          model: llmResult.modelUsed,
          token_usage: llmResult.tokenUsage,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode =
      error instanceof RoadmapConfigError
        ? error.code
        : error instanceof Error
          ? error.name
          : 'UNKNOWN'
    const statusCode = error instanceof RoadmapConfigError ? 503 : 500

    await logEvent(
      'ERROR',
      'Roadmap function error',
      {
        message: errorMessage,
        code: errorCode,
      },
      payload?.request_id
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
