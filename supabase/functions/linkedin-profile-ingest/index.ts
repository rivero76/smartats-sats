/**
 * UPDATE LOG
 * 2026-02-25 17:20:00 | P13 Story 1: Added LinkedIn profile ingest edge function with mock provider payload and schema-locked LLM normalization.
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
const OPENAI_MODEL_LINKEDIN_INGEST = Deno.env.get('OPENAI_MODEL_LINKEDIN_INGEST') || 'gpt-4.1-mini'
const OPENAI_MODEL_LINKEDIN_INGEST_FALLBACK =
  Deno.env.get('OPENAI_MODEL_LINKEDIN_INGEST_FALLBACK') || 'gpt-4o-mini'
const OPENAI_TEMPERATURE_LINKEDIN_INGEST = getEnvNumber('OPENAI_TEMPERATURE_LINKEDIN_INGEST', 0.1)
const OPENAI_MAX_TOKENS_LINKEDIN_INGEST = Math.max(
  800,
  Math.floor(getEnvNumber('OPENAI_MAX_TOKENS_LINKEDIN_INGEST', 2400))
)

interface LinkedinIngestRequest {
  linkedin_url: string
  request_id?: string
}

interface MockLinkedinProfile {
  profile: {
    full_name: string
    headline: string
    location: string
    summary: string
  }
  skills: string[]
  experiences: Array<{
    title: string
    company: string
    location?: string
    start_date?: string
    end_date?: string | null
    description: string
    skills_used?: string[]
  }>
}

interface NormalizedLinkedinData {
  normalized_skills: Array<{
    skill_name: string
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | null
    years_of_experience: number | null
    last_used_date: string | null
    notes: string | null
    source: 'linkedin'
    import_date: string
  }>
  normalized_skill_experiences: Array<{
    skill_name: string
    job_title: string | null
    company_name: string | null
    description: string
    keywords: string[]
    source: 'linkedin'
    import_date: string
  }>
}

class LinkedinIngestConfigError extends Error {
  code: string

  constructor(message: string, code = 'CONFIG_ERROR') {
    super(message)
    this.name = 'LinkedinIngestConfigError'
    this.code = code
  }
}

const LINKEDIN_NORMALIZATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['normalized_skills', 'normalized_skill_experiences'],
  properties: {
    normalized_skills: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'skill_name',
          'proficiency_level',
          'years_of_experience',
          'last_used_date',
          'notes',
          'source',
          'import_date',
        ],
        properties: {
          skill_name: { type: 'string' },
          proficiency_level: {
            anyOf: [
              { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              { type: 'null' },
            ],
          },
          years_of_experience: { anyOf: [{ type: 'number', minimum: 0, maximum: 50 }, { type: 'null' }] },
          last_used_date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          source: { type: 'string', enum: ['linkedin'] },
          import_date: { type: 'string' },
        },
      },
    },
    normalized_skill_experiences: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'skill_name',
          'job_title',
          'company_name',
          'description',
          'keywords',
          'source',
          'import_date',
        ],
        properties: {
          skill_name: { type: 'string' },
          job_title: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          company_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { type: 'string' },
          keywords: {
            type: 'array',
            items: { type: 'string' },
          },
          source: { type: 'string', enum: ['linkedin'] },
          import_date: { type: 'string' },
        },
      },
    },
  },
}

function mockLinkedinProviderPayload(linkedinUrl: string): MockLinkedinProfile {
  void linkedinUrl
  return {
    profile: {
      full_name: 'Avery Johnson',
      headline: 'Senior Product Engineer | React, TypeScript, Node.js',
      location: 'Austin, TX',
      summary:
        'Product-minded full-stack engineer focused on user-centered web experiences and data-informed experimentation.',
    },
    skills: [
      'React',
      'React.js',
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'A/B Testing',
      'Product Analytics',
    ],
    experiences: [
      {
        title: 'Senior Product Engineer',
        company: 'Northstar Labs',
        location: 'Austin, TX',
        start_date: '2022-03-01',
        end_date: null,
        description:
          'Led development of growth experiments, improved conversion funnel performance, and collaborated with design + PM teams.',
        skills_used: ['React', 'TypeScript', 'A/B Testing', 'Product Analytics'],
      },
      {
        title: 'Software Engineer',
        company: 'Beacon Systems',
        location: 'Remote',
        start_date: '2019-01-01',
        end_date: '2022-02-28',
        description:
          'Built internal tools and API integrations, improved observability, and optimized backend query performance.',
        skills_used: ['Node.js', 'PostgreSQL', 'TypeScript'],
      },
    ],
  }
}

function buildNormalizationPrompt(input: {
  linkedinUrl: string
  importDateIso: string
  rawPayload: MockLinkedinProfile
}): string {
  return `
You are a strict data normalization engine for SmartATS.

Goal:
Normalize LinkedIn-like profile data into preview payloads compatible with downstream insertion into:
- sats_user_skills
- sats_skill_experiences

Rules:
- Return strict JSON only.
- Preserve meaning from source data; do not invent employers or skills.
- Normalize duplicate skill variants where obvious (e.g., "React.js" -> "React").
- Keep descriptions concise but specific.
- Set "source" to "linkedin" for every row.
- Set "import_date" to "${input.importDateIso}" for every row.
- Provide at least 1 skill and 1 skill-experience row.
- Prefer evidence-grounded skill_name values.

Input LinkedIn URL:
${input.linkedinUrl}

Raw provider payload:
${JSON.stringify(input.rawPayload, null, 2)}
`.trim()
}

function parseNormalizedResponse(raw: string): NormalizedLinkedinData {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  }

  const parsed = JSON.parse(text) as Partial<NormalizedLinkedinData>
  if (!Array.isArray(parsed.normalized_skills) || !Array.isArray(parsed.normalized_skill_experiences)) {
    throw new Error('LLM response missing normalized arrays')
  }

  const normalizedSkills = parsed.normalized_skills
    .map((row) => {
      const skillName = String(row?.skill_name || '').trim()
      if (!skillName) return null
      const proficiencyRaw = row?.proficiency_level
      const proficiency =
        proficiencyRaw === 'beginner' || proficiencyRaw === 'intermediate' || proficiencyRaw === 'advanced'
          ? proficiencyRaw
          : null
      const yearsRaw = row?.years_of_experience
      const years =
        typeof yearsRaw === 'number' && Number.isFinite(yearsRaw) && yearsRaw >= 0
          ? Math.round(yearsRaw * 10) / 10
          : null
      return {
        skill_name: skillName,
        proficiency_level: proficiency,
        years_of_experience: years,
        last_used_date: row?.last_used_date ? String(row.last_used_date) : null,
        notes: row?.notes ? String(row.notes) : null,
        source: 'linkedin' as const,
        import_date: String(row?.import_date || new Date().toISOString()),
      }
    })
    .filter((row): row is NormalizedLinkedinData['normalized_skills'][number] => row !== null)

  const normalizedExperiences = parsed.normalized_skill_experiences
    .map((row) => {
      const skillName = String(row?.skill_name || '').trim()
      const description = String(row?.description || '').trim()
      if (!skillName || !description) return null
      return {
        skill_name: skillName,
        job_title: row?.job_title ? String(row.job_title) : null,
        company_name: row?.company_name ? String(row.company_name) : null,
        description,
        keywords: Array.isArray(row?.keywords)
          ? row.keywords.map((keyword) => String(keyword).trim()).filter((keyword) => keyword.length > 0)
          : [],
        source: 'linkedin' as const,
        import_date: String(row?.import_date || new Date().toISOString()),
      }
    })
    .filter((row): row is NormalizedLinkedinData['normalized_skill_experiences'][number] => row !== null)

  if (normalizedSkills.length === 0 || normalizedExperiences.length === 0) {
    throw new Error('LLM normalization returned empty results')
  }

  return {
    normalized_skills: normalizedSkills,
    normalized_skill_experiences: normalizedExperiences,
  }
}

async function runNormalizationWithSchema(
  openAIApiKey: string,
  prompt: string
): Promise<{ normalized: NormalizedLinkedinData; modelUsed: string; tokenUsage?: Record<string, unknown> }> {
  const modelsToTry = [OPENAI_MODEL_LINKEDIN_INGEST, OPENAI_MODEL_LINKEDIN_INGEST_FALLBACK]
  let lastError = 'Unknown normalization error'

  for (const model of modelsToTry) {
    const completionResponse = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: OPENAI_TEMPERATURE_LINKEDIN_INGEST,
        max_tokens: OPENAI_MAX_TOKENS_LINKEDIN_INGEST,
        messages: [
          {
            role: 'system',
            content:
              'You are a strict JSON normalizer. Output must conform exactly to the provided schema.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'linkedin_ingest_normalized_output',
            strict: true,
            schema: LINKEDIN_NORMALIZATION_SCHEMA,
          },
        },
      }),
    })

    if (!completionResponse.ok) {
      const providerBody = await completionResponse.text()
      lastError = `OpenAI request failed (${completionResponse.status}): ${providerBody}`
      continue
    }

    const completionJson = await completionResponse.json()
    const rawContent = completionJson?.choices?.[0]?.message?.content
    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      lastError = 'OpenAI returned empty completion content'
      continue
    }

    try {
      const normalized = parseNormalizedResponse(rawContent)
      return {
        normalized,
        modelUsed: model,
        tokenUsage: completionJson?.usage,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  throw new Error(lastError)
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

  let payload: LinkedinIngestRequest | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new LinkedinIngestConfigError(
        'Missing required Supabase environment variables for linkedin-profile-ingest',
        'MISSING_SUPABASE_ENV'
      )
    }

    if (!openAIApiKey) {
      throw new LinkedinIngestConfigError(
        'Missing required secret OPENAI_API_KEY for linkedin-profile-ingest',
        'MISSING_OPENAI_API_KEY'
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      payload = (await req.json()) as LinkedinIngestRequest
    } catch (_error) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const linkedinUrl = String(payload?.linkedin_url || '').trim()
    if (!linkedinUrl) {
      return new Response(JSON.stringify({ success: false, error: 'linkedin_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      const parsed = new URL(linkedinUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('invalid protocol')
      }
    } catch (_error) {
      return new Response(JSON.stringify({ success: false, error: 'linkedin_url must be a valid http(s) URL' }), {
        status: 400,
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

    const importDateIso = new Date().toISOString()
    const rawProviderPayload = mockLinkedinProviderPayload(linkedinUrl)
    const prompt = buildNormalizationPrompt({
      linkedinUrl,
      importDateIso,
      rawPayload: rawProviderPayload,
    })

    const normalizationResult = await runNormalizationWithSchema(openAIApiKey, prompt)

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'preview_only',
        request_id: payload?.request_id || null,
        user_id: user.id,
        linkedin_url: linkedinUrl,
        provider_payload: rawProviderPayload,
        normalized_preview: normalizationResult.normalized,
        metadata: {
          model: normalizationResult.modelUsed,
          token_usage: normalizationResult.tokenUsage || null,
          note: 'No database inserts were performed. This payload is for HITL review.',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code =
      error instanceof LinkedinIngestConfigError
        ? error.code
        : error instanceof Error
          ? error.name
          : 'UNKNOWN'
    const statusCode = error instanceof LinkedinIngestConfigError ? 503 : 500

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        code,
        request_id: payload?.request_id || null,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
