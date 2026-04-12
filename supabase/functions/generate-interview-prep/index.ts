/**
 * UPDATE LOG
 * 2026-04-12 00:00:00 | P-INTERVIEW S1+S2 — generate-interview-prep edge function.
 *   3-call sequential LLM pipeline:
 *     Call 1: Company Research (WebFetch → gpt-4.1-mini → company_dossier)
 *     Call 2: Role Expectation Decode (JD text + dossier → gpt-4.1-mini → role_decoder)
 *     Call 3: Question Bank + STAR Scaffolds (full bundle → gpt-4.1 → questions[])
 *   S1 categories: behavioural, gap_bridge, role_specific
 *   S2 categories: + company_values, technical_deep_dive (all 5 shipped together)
 *   Graceful degradation: company scrape failure → JD-only mode (never blocks generation).
 *   Rate limit: 1 regeneration per 24h per analysis_id (checked before LLM calls).
 *   Results stored in sats_interview_prep_sessions (upsert on regen, session_version++).
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber, getEnvBoolean } from '../_shared/env.ts'
import { callLLM } from '../_shared/llmProvider.ts'

// ── Env ──────────────────────────────────────────────────────────────────────

const OPENAI_MODEL_INTERVIEW_RESEARCH =
  Deno.env.get('OPENAI_MODEL_INTERVIEW_RESEARCH') || 'gpt-4.1-mini'
const OPENAI_MODEL_INTERVIEW_QUESTIONS =
  Deno.env.get('OPENAI_MODEL_INTERVIEW_QUESTIONS') || 'gpt-4.1'
const OPENAI_MODEL_INTERVIEW_FALLBACK =
  Deno.env.get('OPENAI_MODEL_INTERVIEW_FALLBACK') || 'gpt-4o-mini'
const OPENAI_TEMPERATURE_INTERVIEW_RESEARCH = getEnvNumber(
  'OPENAI_TEMPERATURE_INTERVIEW_RESEARCH',
  0.1
)
const OPENAI_TEMPERATURE_INTERVIEW_DECODE = getEnvNumber(
  'OPENAI_TEMPERATURE_INTERVIEW_DECODE',
  0.15
)
const OPENAI_TEMPERATURE_INTERVIEW_QUESTIONS = getEnvNumber(
  'OPENAI_TEMPERATURE_INTERVIEW_QUESTIONS',
  0.3
)
const COMPANY_RESEARCH_MINIMUM_WORDS = getEnvNumber('COMPANY_RESEARCH_MINIMUM_WORDS', 60)
const INTERVIEW_PREP_RATE_LIMIT_HOURS = getEnvNumber('INTERVIEW_PREP_RATE_LIMIT_HOURS', 24)

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const functionsBaseUrl =
  Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
  (supabaseUrl ? supabaseUrl.replace('.supabase.co', '.functions.supabase.co') : '')
const loggingEndpoint = `${functionsBaseUrl}/functions/v1/centralized-logging`

// ── Logging ──────────────────────────────────────────────────────────────────

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
  message: string,
  metadata?: Record<string, unknown>,
  requestId?: string
) {
  if (!supabaseServiceKey || !loggingEndpoint || !functionsBaseUrl) return
  try {
    await fetch(loggingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        script_name: 'generate-interview-prep',
        log_level: level,
        message,
        metadata,
        request_id: requestId,
      }),
    })
  } catch {
    // Never block generation on telemetry failures.
  }
}

// ── Config error ─────────────────────────────────────────────────────────────

class InterviewPrepConfigError extends Error {
  code: string
  constructor(message: string, code = 'CONFIG_ERROR') {
    super(message)
    this.name = 'InterviewPrepConfigError'
    this.code = code
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GenerateInterviewPrepRequest {
  analysis_id: string
  force_regenerate?: boolean
  request_id?: string
}

interface CompanyDossier {
  stated_values: string[]
  cultural_keywords: string[]
  strategic_themes: string[]
  hiring_language_style: 'formal' | 'collaborative' | 'entrepreneurial' | 'corporate'
  red_flags: string[]
}

interface RoleDecoder {
  implicit_seniority: string
  primary_deliverables: string[]
  reporting_level: string
  team_scope: string
  soft_skill_priorities: string[]
  candidate_risk_areas: string[]
}

interface StarScaffold {
  situation: string
  task: string
  action: string
  result: string
  risk_flag: 'green' | 'amber' | 'red'
  risk_note: string | null
}

interface InterviewQuestion {
  id: string
  category:
    | 'behavioural'
    | 'gap_bridge'
    | 'role_specific'
    | 'company_values'
    | 'technical_deep_dive'
  question: string
  why_asked: string
  difficulty: 'standard' | 'tough' | 'curveball'
  source_evidence_skill: string | null
  star_scaffold: StarScaffold | null
}

// ── JSON Schemas ──────────────────────────────────────────────────────────────

const COMPANY_DOSSIER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'stated_values',
    'cultural_keywords',
    'strategic_themes',
    'hiring_language_style',
    'red_flags',
  ],
  properties: {
    stated_values: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    cultural_keywords: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    strategic_themes: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    hiring_language_style: {
      type: 'string',
      enum: ['formal', 'collaborative', 'entrepreneurial', 'corporate'],
    },
    red_flags: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
}

const ROLE_DECODER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implicit_seniority',
    'primary_deliverables',
    'reporting_level',
    'team_scope',
    'soft_skill_priorities',
    'candidate_risk_areas',
  ],
  properties: {
    implicit_seniority: { type: 'string' },
    primary_deliverables: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    reporting_level: { type: 'string' },
    team_scope: { type: 'string' },
    soft_skill_priorities: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    candidate_risk_areas: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
}

const QUESTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      minItems: 5,
      maxItems: 15,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'category',
          'question',
          'why_asked',
          'difficulty',
          'source_evidence_skill',
          'star_scaffold',
        ],
        properties: {
          id: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'behavioural',
              'gap_bridge',
              'role_specific',
              'company_values',
              'technical_deep_dive',
            ],
          },
          question: { type: 'string' },
          why_asked: { type: 'string' },
          difficulty: { type: 'string', enum: ['standard', 'tough', 'curveball'] },
          source_evidence_skill: { type: ['string', 'null'] },
          star_scaffold: {
            oneOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['situation', 'task', 'action', 'result', 'risk_flag', 'risk_note'],
                properties: {
                  situation: { type: 'string' },
                  task: { type: 'string' },
                  action: { type: 'string' },
                  result: { type: 'string' },
                  risk_flag: { type: 'string', enum: ['green', 'amber', 'red'] },
                  risk_note: { type: ['string', 'null'] },
                },
              },
            ],
          },
        },
      },
    },
  },
}

// ── Company research ──────────────────────────────────────────────────────────

async function scrapeCompanyWebsite(websiteUrl: string): Promise<string> {
  try {
    const url = new URL(websiteUrl)
    const base = `${url.protocol}//${url.host}`

    // Try multiple pages: about, careers, values
    const pagePaths = ['', '/about', '/about-us', '/company', '/careers', '/culture', '/values']
    const pageTexts: string[] = []

    for (const path of pagePaths.slice(0, 3)) {
      try {
        const res = await fetch(`${base}${path}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SmartATS/1.0; +https://smartats.io)',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(6000),
        })

        if (!res.ok) continue
        const html = await res.text()

        // Detect SPA shell (very little text content)
        const stripped = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (stripped.length > 200) {
          pageTexts.push(stripped.slice(0, 2000))
        }
      } catch {
        // Individual page fetch failure — continue to next
      }
    }

    return pageTexts.join('\n\n').slice(0, 4000)
  } catch {
    return ''
  }
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildCompanyResearchPrompt(websiteText: string, companyName: string): string {
  return `You are analysing the public website of "${companyName}" to extract company intelligence for an interview candidate.

Website content:
---
${websiteText}
---

Extract only what is explicitly stated or strongly implied by the text above. Do NOT invent company positions, values, or culture signals not present in the source.

Return strict JSON matching the schema.`.trim()
}

function buildRoleDecodePrompt(
  jdText: string,
  companyDossier: CompanyDossier | null,
  positionTitle: string
): string {
  const dossierSection = companyDossier
    ? `\nCompany context:
${JSON.stringify(companyDossier, null, 2)}\n`
    : ''

  return `You are decoding implicit expectations in a job description for the role "${positionTitle}".
${dossierSection}
Job Description:
---
${jdText.slice(0, 4200)}
---

Identify:
- implicit_seniority: decoded from language signals (e.g. "define", "own", "drive" = senior operator)
- primary_deliverables: what success looks like in the first 90 days
- reporting_level: who they report to (inferred from language)
- team_scope: team size / budget ownership signals
- soft_skill_priorities: top soft skills emphasised in the JD language
- candidate_risk_areas: topics where an interviewer is likely to probe (gaps, transition, scale)

Return strict JSON matching the schema.`.trim()
}

function buildQuestionsPrompt(params: {
  positionTitle: string
  companyName: string
  jdText: string
  matchedSkills: string[]
  missingSkills: string[]
  evidencePairs: Array<{ jd_quote: string; resume_quote: string; skill?: string }>
  resumeText: string
  enrichedBullets: Array<{ bullet: string; interview_safe: boolean | null; confidence: number }>
  skillProfile: Array<{ skill: string; last_used_year: number | null; depth: string }>
  companyDossier: CompanyDossier | null
  roleDecoder: RoleDecoder | null
}): string {
  const evidenceSample = params.evidencePairs.slice(0, 8)
  const enrichedSample = params.enrichedBullets
    .filter((b) => b.interview_safe !== false)
    .slice(0, 5)
  const staleSkills = params.skillProfile
    .filter((s) => s.last_used_year && s.last_used_year < new Date().getFullYear() - 3)
    .map((s) => s.skill)

  return `You are an expert interview preparation coach for senior IT professionals in Australia and New Zealand.

Your task: Generate a targeted interview preparation question bank for a candidate applying for "${params.positionTitle}" at ${params.companyName}.

## Candidate Data

**Matched skills** (ATS confirmed): ${params.matchedSkills.slice(0, 15).join(', ') || 'none'}
**Missing skills** (gaps to bridge): ${params.missingSkills.slice(0, 10).join(', ') || 'none'}
**Skills not used in 3+ years**: ${staleSkills.slice(0, 5).join(', ') || 'none'}

**Evidence pairs** (JD requirement → resume claim, these are direct interview probe points):
${evidenceSample.map((e, i) => `${i + 1}. JD: "${e.jd_quote}" | CV: "${e.resume_quote}"${e.skill ? ` [${e.skill}]` : ''}`).join('\n')}

**Resume excerpt** (use for STAR scaffolds — only reference content that is present here):
---
${params.resumeText.slice(0, 2500)}
---

**Interview-safe experience bullets** (accepted enrichments):
${enrichedSample.map((b, i) => `${i + 1}. ${b.bullet} [confidence: ${Math.round(b.confidence * 100)}%]`).join('\n') || 'none'}

## Company & Role Context

${
  params.companyDossier
    ? `**Company values**: ${params.companyDossier.stated_values.join(', ')}
**Cultural style**: ${params.companyDossier.hiring_language_style}`
    : '**Company data**: not available — use JD language only'
}

${
  params.roleDecoder
    ? `**Role decoder**:
- Implicit seniority: ${params.roleDecoder.implicit_seniority}
- Primary deliverables: ${params.roleDecoder.primary_deliverables.join('; ')}
- Risk areas: ${params.roleDecoder.candidate_risk_areas.join('; ')}`
    : ''
}

## Instructions

Generate 10–15 interview questions across these categories:
- **behavioural**: Each must be anchored to a specific evidence pair above. Reference the exact skill or claim.
- **gap_bridge**: For each missing skill, generate a question that helps the candidate bridge or pre-empt the gap. Include "suggested angle" in why_asked.
- **role_specific**: Based on decoded role expectations. These reveal hidden expectations the candidate must be ready for.
- **company_values**: One question per stated company value (max 3). If no company data available, skip this category.
- **technical_deep_dive**: For matched skills that are high-weight but may need depth validation, especially if last_used_year > 3 years ago.

**Hard rules**:
1. Every question MUST reference a specific skill, company name, evidence pair, or resume content — no generic questions.
2. why_asked must explain the interviewer's underlying concern in one sentence.
3. STAR scaffold: populate ONLY with content present in the resume excerpt or enriched bullets above. If no resume evidence supports the question, set star_scaffold to null.
4. risk_flag: "green" = explicit skill + interview_safe, "amber" = inferred or medium confidence, "red" = low confidence or inferred — do not use verbatim.
5. Generate question IDs as "q1", "q2", etc.

Return strict JSON matching the schema.`.trim()
}

// ── SHA-256 hash ──────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Main handler ──────────────────────────────────────────────────────────────

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

  let payload: GenerateInterviewPrepRequest | null = null

  try {
    // ── Config validation (fail fast with 503) ────────────────────────────
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new InterviewPrepConfigError(
        'Missing required Supabase environment variables for generate-interview-prep',
        'MISSING_SUPABASE_ENV'
      )
    }
    if (!Deno.env.get('OPENAI_API_KEY')) {
      throw new InterviewPrepConfigError(
        'Missing required secret OPENAI_API_KEY for generate-interview-prep',
        'MISSING_OPENAI_API_KEY'
      )
    }

    try {
      payload = await req.json()
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { analysis_id, force_regenerate = false, request_id: requestId } = payload!

    if (!analysis_id) {
      return new Response(JSON.stringify({ success: false, error: 'analysis_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // ── Load analysis + related data ─────────────────────────────────────
    const { data: analysis, error: analysisError } = await userSupabase
      .from('sats_analyses')
      .select(
        `
        id,
        ats_score,
        matched_skills,
        missing_skills,
        analysis_data,
        job_description_id,
        resume_id,
        sats_job_descriptions (
          id,
          name,
          pasted_text,
          sats_companies ( name, website )
        ),
        sats_resumes ( id, name, extracted_text )
      `
      )
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ success: false, error: 'Analysis not found or not accessible' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (analysis.status === 'queued' || analysis.status === 'processing') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Analysis is still processing. Please wait for it to complete.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Rate limit: 1 regen per 24h unless force_regenerate ──────────────
    const { data: existingSession } = await userSupabase
      .from('sats_interview_prep_sessions')
      .select('id, generated_at, session_version')
      .eq('user_id', user.id)
      .eq('analysis_id', analysis_id)
      .maybeSingle()

    if (existingSession && !force_regenerate) {
      const ageHours = (Date.now() - new Date(existingSession.generated_at).getTime()) / 3_600_000
      if (ageHours < INTERVIEW_PREP_RATE_LIMIT_HOURS) {
        // Return existing session — no regeneration needed
        return new Response(
          JSON.stringify({
            success: true,
            session_id: existingSession.id,
            cached: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const jd = (analysis as any).sats_job_descriptions
    const resume = (analysis as any).sats_resumes
    const company = jd?.sats_companies

    const positionTitle = jd?.name || 'this role'
    const companyName = company?.name || 'the company'
    const jdText = jd?.pasted_text || ''
    const resumeText = resume?.extracted_text || ''
    const analysisData = (analysis.analysis_data as any) || {}
    const evidencePairs: Array<{ jd_quote: string; resume_quote: string; skill?: string }> =
      analysisData.evidence || []

    // Compute pasted_text_hash for future cache key
    const pastedTextHash = jdText ? await sha256(jdText.trim().toLowerCase()) : null

    // Load enriched experiences (interview_safe ones only)
    const { data: enrichedRows } = await userSupabase
      .from('sats_enriched_experiences')
      .select('bullet_text, interview_safe, confidence_score, user_action')
      .eq('user_id', user.id)
      .in('user_action', ['accepted', 'edited'])
      .order('confidence_score', { ascending: false })
      .limit(10)

    const enrichedBullets = (enrichedRows || []).map((r: any) => ({
      bullet: r.bullet_text || '',
      interview_safe: r.interview_safe,
      confidence: r.confidence_score ?? 0.5,
    }))

    // Load skill profile
    const { data: skillProfileRow } = await userSupabase
      .from('sats_skill_profiles')
      .select('profile_data')
      .eq('user_id', user.id)
      .maybeSingle()

    const skillProfile: Array<{ skill: string; last_used_year: number | null; depth: string }> = (
      (skillProfileRow?.profile_data as any)?.skills || []
    )
      .slice(0, 20)
      .map((s: any) => ({
        skill: s.skill_name || s.name || '',
        last_used_year: s.last_used_year ?? null,
        depth: s.depth || 'aware',
      }))

    await logEvent(
      'INFO',
      'Starting interview prep generation',
      {
        user_id: user.id,
        analysis_id,
        company: companyName,
        position: positionTitle,
        has_jd_text: jdText.length > 0,
        has_resume: resumeText.length > 0,
        evidence_count: evidencePairs.length,
        force_regenerate,
      },
      requestId
    )

    // ── Call 1: Company Research ──────────────────────────────────────────
    let companyDossier: CompanyDossier | null = null
    let scrapeStatus: 'success' | 'partial' | 'failed' = 'success'

    const companyWebsite = company?.website
    if (companyWebsite) {
      const websiteText = await scrapeCompanyWebsite(companyWebsite)

      if (countWords(websiteText) >= COMPANY_RESEARCH_MINIMUM_WORDS) {
        try {
          const call1Result = await callLLM({
            systemPrompt:
              'You are a company intelligence analyst. Extract structured company data from website text. Return strict JSON only.',
            userPrompt: buildCompanyResearchPrompt(websiteText, companyName),
            modelCandidates: [OPENAI_MODEL_INTERVIEW_RESEARCH, OPENAI_MODEL_INTERVIEW_FALLBACK],
            jsonSchema: COMPANY_DOSSIER_SCHEMA,
            schemaName: 'company_dossier',
            temperature: OPENAI_TEMPERATURE_INTERVIEW_RESEARCH,
            maxTokens: 600,
            retryAttempts: 1,
            taskLabel: 'interview-company-research',
          })
          companyDossier = JSON.parse(call1Result.rawContent)
        } catch {
          scrapeStatus = 'partial'
          await logEvent(
            'INFO',
            'Company dossier generation failed — proceeding JD-only',
            {
              user_id: user.id,
              analysis_id,
            },
            requestId
          )
        }
      } else {
        scrapeStatus = 'partial'
        await logEvent(
          'INFO',
          'Company website text below minimum threshold — JD-only mode',
          {
            user_id: user.id,
            analysis_id,
            word_count: countWords(websiteText),
          },
          requestId
        )
      }
    } else {
      scrapeStatus = 'partial'
    }

    // ── Call 2: Role Expectation Decode ───────────────────────────────────
    let roleDecoder: RoleDecoder | null = null

    if (jdText.length > 50) {
      try {
        const call2Result = await callLLM({
          systemPrompt:
            'You are a senior hiring expert decoding implicit expectations in job descriptions. Return strict JSON only.',
          userPrompt: buildRoleDecodePrompt(jdText, companyDossier, positionTitle),
          modelCandidates: [OPENAI_MODEL_INTERVIEW_RESEARCH, OPENAI_MODEL_INTERVIEW_FALLBACK],
          jsonSchema: ROLE_DECODER_SCHEMA,
          schemaName: 'role_decoder',
          temperature: OPENAI_TEMPERATURE_INTERVIEW_DECODE,
          maxTokens: 800,
          retryAttempts: 1,
          taskLabel: 'interview-role-decode',
        })
        roleDecoder = JSON.parse(call2Result.rawContent)
      } catch {
        // Role decode failure is non-fatal — questions still generated from evidence pairs
        await logEvent(
          'INFO',
          'Role decode failed — continuing without role decoder',
          {
            user_id: user.id,
            analysis_id,
          },
          requestId
        )
      }
    }

    // ── Call 3: Question Bank + STAR Scaffolds ────────────────────────────
    const call3Result = await callLLM({
      systemPrompt:
        'You are an expert interview preparation coach for senior IT professionals in Australia and New Zealand. Generate highly specific, evidence-grounded interview questions. Return strict JSON only.',
      userPrompt: buildQuestionsPrompt({
        positionTitle,
        companyName,
        jdText,
        matchedSkills: analysis.matched_skills || [],
        missingSkills: analysis.missing_skills || [],
        evidencePairs,
        resumeText,
        enrichedBullets,
        skillProfile,
        companyDossier,
        roleDecoder,
      }),
      modelCandidates: [OPENAI_MODEL_INTERVIEW_QUESTIONS, OPENAI_MODEL_INTERVIEW_FALLBACK],
      jsonSchema: QUESTIONS_SCHEMA,
      schemaName: 'interview_questions',
      temperature: OPENAI_TEMPERATURE_INTERVIEW_QUESTIONS,
      maxTokens: 2400,
      retryAttempts: 1,
      taskLabel: 'interview-questions',
    })

    let questions: InterviewQuestion[] = []
    try {
      const parsed = JSON.parse(call3Result.rawContent)
      questions = parsed.questions || []
    } catch {
      throw new Error('Failed to parse question bank from LLM response')
    }

    if (questions.length === 0) {
      throw new Error('LLM returned no questions — generation failed')
    }

    const costEstimate = call3Result.costEstimateUsd ?? 0

    // ── Persist / upsert session ──────────────────────────────────────────
    const sessionVersion = existingSession ? existingSession.session_version + 1 : 1
    const sessionPayload = {
      user_id: user.id,
      analysis_id,
      job_description_id: analysis.job_description_id ?? null,
      pasted_text_hash: pastedTextHash,
      generated_at: new Date().toISOString(),
      company_dossier: companyDossier,
      role_decoder: roleDecoder,
      questions,
      model_used: call3Result.modelUsed,
      cost_estimate_usd: costEstimate,
      scrape_status: scrapeStatus,
      session_version: sessionVersion,
    }

    let sessionId: string

    if (existingSession) {
      const { error: updateError } = await userSupabase
        .from('sats_interview_prep_sessions')
        .update(sessionPayload)
        .eq('id', existingSession.id)

      if (updateError) throw new Error(`Failed to update session: ${updateError.message}`)
      sessionId = existingSession.id
    } else {
      const { data: insertedRow, error: insertError } = await userSupabase
        .from('sats_interview_prep_sessions')
        .insert(sessionPayload)
        .select('id')
        .single()

      if (insertError || !insertedRow) {
        throw new Error(`Failed to insert session: ${insertError?.message || 'No row returned'}`)
      }
      sessionId = insertedRow.id
    }

    await logEvent(
      'INFO',
      'Interview prep session generated and persisted',
      {
        user_id: user.id,
        session_id: sessionId,
        analysis_id,
        question_count: questions.length,
        scrape_status: scrapeStatus,
        model_used: call3Result.modelUsed,
        cost_estimate_usd: costEstimate,
        session_version: sessionVersion,
      },
      requestId
    )

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        cached: false,
        question_count: questions.length,
        scrape_status: scrapeStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode =
      error instanceof InterviewPrepConfigError
        ? error.code
        : error instanceof Error
          ? error.name
          : 'UNKNOWN'
    const statusCode = error instanceof InterviewPrepConfigError ? 503 : 500

    try {
      await logEvent(
        'ERROR',
        'Interview prep generation failed',
        {
          message: errorMessage,
          code: errorCode,
        },
        payload?.request_id
      )
    } catch {
      // Telemetry must not block error response
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage, code: errorCode }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
