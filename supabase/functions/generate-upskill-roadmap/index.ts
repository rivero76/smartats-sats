/**
 * UPDATE LOG
 * 2026-02-25 01:10:00 | P15 Story 2: Added generate-upskill-roadmap edge function with schema-locked LLM output and DB persistence.
 * 2026-03-01 00:00:00 | P16 Story 0: Removed duplicated CORS, env, mapProviderError, isSchemaUnsupportedError, and OpenAI fetch loop; replaced with _shared/ imports and callLLM().
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber } from '../_shared/env.ts'
import { callLLM } from '../_shared/llmProvider.ts'

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

    if (!Deno.env.get('OPENAI_API_KEY')) {
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

    const prompt = buildRoadmapPrompt({ targetRole, missingSkills })

    const modelCandidates = [OPENAI_MODEL_UPSKILL_ROADMAP]
    if (
      OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK &&
      OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK !== OPENAI_MODEL_UPSKILL_ROADMAP
    ) {
      modelCandidates.push(OPENAI_MODEL_UPSKILL_ROADMAP_FALLBACK)
    }

    const llmResult = await callLLM({
      systemPrompt:
        'You are an expert learning roadmap planner. Always return strict JSON matching the requested schema.',
      userPrompt: prompt,
      modelCandidates,
      jsonSchema: ROADMAP_JSON_SCHEMA,
      schemaName: 'upskill_roadmap_response',
      temperature: OPENAI_TEMPERATURE_UPSKILL_ROADMAP,
      maxTokens: OPENAI_MAX_TOKENS_UPSKILL_ROADMAP,
      retryAttempts: OPENAI_SCHEMA_RETRY_ATTEMPTS_UPSKILL_ROADMAP,
      taskLabel: 'upskill-roadmap',
    })

    const parsedMilestones = parseRoadmapResponse(llmResult.rawContent)
    if (parsedMilestones.length === 0) {
      throw new Error('Failed to produce schema-valid upskilling roadmap')
    }

    const milestones = ensureProjectMilestone(parsedMilestones, targetRole, missingSkills)

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
          token_usage: {
            prompt_tokens: llmResult.promptTokens,
            completion_tokens: llmResult.completionTokens,
          },
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
