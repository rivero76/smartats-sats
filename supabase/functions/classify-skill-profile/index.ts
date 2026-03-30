/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S2 — classify-skill-profile edge function.
 *   Schema-locked LLM classification (temperature=0, seed=42) with career chapter
 *   inference, diff mode for re-ingestion, and graceful fallback on any failure.
 *   Never throws an unhandled error — always returns HTTP 200 with success:false on failure.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llmProvider.ts'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENAI_MODEL_SKILL_CLASSIFY = Deno.env.get('OPENAI_MODEL_SKILL_CLASSIFY') || 'gpt-4.1-mini'
const OPENAI_MODEL_SKILL_CLASSIFY_FALLBACK =
  Deno.env.get('OPENAI_MODEL_SKILL_CLASSIFY_FALLBACK') || 'gpt-4o-mini'

const CLASSIFICATION_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// JSON Schema — schema-locked output for deterministic classification
// ---------------------------------------------------------------------------

const SKILL_CLASSIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['skills', 'career_chapters'],
  properties: {
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'skill_name',
          'category',
          'depth',
          'last_used_year',
          'transferable_to',
          'career_chapter',
        ],
        properties: {
          skill_name: { type: 'string' },
          category: {
            type: 'string',
            enum: ['technical', 'soft', 'leadership', 'domain', 'certification', 'methodology'],
          },
          depth: { type: 'string', enum: ['awareness', 'practitioner', 'expert', 'trainer'] },
          last_used_year: { type: 'integer' },
          transferable_to: { type: 'array', items: { type: 'string' } },
          career_chapter: { type: 'string' },
        },
      },
    },
    career_chapters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'start_year', 'end_year'],
        properties: {
          label: { type: 'string' },
          start_year: { type: 'integer' },
          end_year: { type: ['integer', 'null'] },
        },
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface DateRange {
  start: string
  end: string | null
}

interface ExistingSkill {
  skill_name: string
  category: string
  depth: string
  ai_last_used_year: number | null
  transferable_to: string[]
  career_chapter: string | null
}

interface ClassifyRequest {
  user_id: string
  experience_text: string
  experience_date_range: DateRange
  existing_profile?: ExistingSkill[]
  user_context?: string // optional extra context for re-classification
}

interface ClassifiedSkill {
  skill_name: string
  category: string
  depth: string
  last_used_year: number
  transferable_to: string[]
  career_chapter: string
}

interface CareerChapter {
  label: string
  start_year: number
  end_year: number | null
}

interface ClassifyResponse {
  success: boolean
  skills?: ClassifiedSkill[]
  career_chapters?: CareerChapter[]
  diff?: {
    new_skills: ClassifiedSkill[]
    updated_skills: ClassifiedSkill[]
    unchanged_skills: ClassifiedSkill[]
  }
  error?: string
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name.toLowerCase().trim()
}

function computeDiff(
  incoming: ClassifiedSkill[],
  existing: ExistingSkill[]
): {
  new_skills: ClassifiedSkill[]
  updated_skills: ClassifiedSkill[]
  unchanged_skills: ClassifiedSkill[]
} {
  const existingMap = new Map(existing.map((s) => [normalizeName(s.skill_name), s]))

  const new_skills: ClassifiedSkill[] = []
  const updated_skills: ClassifiedSkill[] = []
  const unchanged_skills: ClassifiedSkill[] = []

  for (const skill of incoming) {
    const key = normalizeName(skill.skill_name)
    const prev = existingMap.get(key)

    if (!prev) {
      new_skills.push(skill)
    } else if (
      prev.category !== skill.category ||
      prev.depth !== skill.depth ||
      prev.ai_last_used_year !== skill.last_used_year ||
      JSON.stringify(prev.transferable_to) !== JSON.stringify(skill.transferable_to) ||
      prev.career_chapter !== skill.career_chapter
    ) {
      updated_skills.push(skill)
    } else {
      unchanged_skills.push(skill)
    }
  }

  return { new_skills, updated_skills, unchanged_skills }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = buildCorsHeaders(origin)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Validate origin
  if (origin && !isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate env — 503 for misconfiguration per edge function error rules
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ success: false, error: 'Service misconfigured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: ClassifyRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Required field validation
  if (!body.user_id || !body.experience_text) {
    return new Response(
      JSON.stringify({ success: false, error: 'user_id and experience_text are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Graceful fallback wrapper — classification errors must never block CV save
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const endYear = body.experience_date_range.end ?? 'present'
    const contextBlock = body.user_context
      ? `\n\nAdditional context from the user:\n${body.user_context}`
      : ''

    const systemPrompt = `You are a career intelligence assistant. Your job is to classify professional skills from CV experience text.

For each distinct skill found, produce:
- skill_name: normalized, human-readable skill name
- category: one of technical | soft | leadership | domain | certification | methodology
- depth: one of awareness | practitioner | expert | trainer
- last_used_year: the last calendar year this skill was actively used (infer from date range)
- transferable_to: array of soft/leadership skills this role implicitly demonstrates (e.g. Oracle DBA → ["SLA management","incident response","ITIL operations"])
- career_chapter: a short label for the career phase this experience belongs to (e.g. "Technical Foundation", "Architecture & Delivery", "Leadership & Strategy")

Also infer career_chapters from the experience text as a whole, ordered chronologically.

Rules:
- Use only evidence from the text. Do not invent skills not demonstrated by the experience.
- transferable_to must be non-empty for technical roles — they always demonstrate soft skills.
- career_chapter labels should be consistent across skills from the same era.
- last_used_year must be an integer (use end year of experience, or current year if still active).`

    const userPrompt = `Experience text:\n${body.experience_text}\n\nDate range: ${body.experience_date_range.start} to ${endYear}${contextBlock}`

    const llmResult = await callLLM({
      systemPrompt,
      userPrompt,
      modelCandidates: [OPENAI_MODEL_SKILL_CLASSIFY, OPENAI_MODEL_SKILL_CLASSIFY_FALLBACK],
      jsonSchema: SKILL_CLASSIFICATION_SCHEMA,
      schemaName: 'skill_classification',
      temperature: 0,
      maxTokens: 2000,
      retryAttempts: 1,
      seed: 42,
      taskLabel: 'skill-classification',
      logContext: { userId: body.user_id, functionName: 'classify-skill-profile' },
    })

    const parsed = JSON.parse(llmResult.rawContent) as {
      skills: ClassifiedSkill[]
      career_chapters: CareerChapter[]
    }

    const response: ClassifyResponse = {
      success: true,
      skills: parsed.skills,
      career_chapters: parsed.career_chapters,
    }

    // Compute diff if existing profile provided
    if (body.existing_profile && body.existing_profile.length > 0) {
      response.diff = computeDiff(parsed.skills, body.existing_profile)
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Graceful fallback — never 5xx; never block CV save
    const message = err instanceof Error ? err.message : 'Classification unavailable'
    const fallback: ClassifyResponse = {
      success: false,
      error: message,
      skills: [],
      career_chapters: [],
    }
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
