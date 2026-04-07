/**
 * UPDATE LOG
 * 2026-02-24 19:40:00 | P14 Story 2: Added async scorer worker for staged jobs with skills-first baseline and ATS schema-compatible scoring output.
 * 2026-03-01 00:00:00 | P16 Story 0: Removed duplicated CORS, env, and OpenAI fetch loop; replaced with _shared/ imports and callLLM(). Added cost tracking.
 * 2026-03-18 | CR1-1: Config error response changed from 500 → 503 (CLAUDE.md §3.2 compliance).
 * 2026-03-18 | CR1-3: Extract proactive match threshold 0.6 to DEFAULT_PROACTIVE_MATCH_THRESHOLD constant; override via SATS_PROACTIVE_MATCH_THRESHOLD env var.
 * 2026-03-28 | Fix: serialize PostgrestError objects properly (they are not Error instances, so String(error) returned "[object Object]").
 * 2026-03-29 | Fix: getUserThresholdMap only populates map for users with explicit per-user threshold. Previously it stored DEFAULT_PROACTIVE_MATCH_THRESHOLD (0.6) for null-threshold users, making globalThreshold from sats_runtime_settings unreachable.
 * 2026-04-05 01:00:00 | Fix: populate company_id and location_id on sats_job_descriptions when
 *   creating JD rows from staged jobs. Previously these were left null, causing /jobs to show
 *   "No company / No location" for email-ingested jobs. Now upserts company by name into
 *   sats_companies and parses location_raw into sats_locations before JD insert.
 * 2026-03-30 10:00:00 | P25 S5 — Weighted skill context injection. Batch-reads sats_skill_profiles +
 *   sats_skill_decay_config once per scorer run. Per-user weighted text block appended to buildPrompt()
 *   via weightedSkillContext param. Falls back silently when no profile exists for a user.
 * 2026-03-30 11:00:00 | PROD-9–12 note: Resume Intelligence (Call 3) runs only in ats-analysis-direct
 *   (interactive flow). Batch-scored analyses intentionally store null for format_audit,
 *   geography_passport, industry_lens, and cultural_tone to preserve batch throughput.
 * 2026-04-05 19:00:00 | P26 S1-1 — Add extractJobSignals() step. After per-user scoring, each
 *   staged job is LLM-parsed (gpt-4.1-mini) for certifications, tools, methodologies, seniority_band,
 *   and salary. market_code is derived from location_raw via keyword matching. role_family_id is
 *   matched from the job title against the sats_role_families aliases lookup table. Results are
 *   merged into the sats_staged_jobs status update. Idempotent: skipped if structured_extracted_at
 *   is already set.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber } from '../_shared/env.ts'
import { callLLM } from '../_shared/llmProvider.ts'
import {
  buildWeightedSkillText,
  type SkillProfileRow,
  type DecayConfigRow,
} from '../_shared/skillDecay.ts'

const OPENAI_MODEL_ATS = Deno.env.get('OPENAI_MODEL_ATS') || 'gpt-4.1'
// Cheap model for structured extraction — one call per staged job
const OPENAI_MODEL_EXTRACTION = Deno.env.get('OPENAI_MODEL_ENRICH') || 'gpt-4.1-mini'
const OPENAI_MODEL_ATS_FALLBACK = Deno.env.get('OPENAI_MODEL_ATS_FALLBACK') || 'gpt-4o-mini'
const OPENAI_TEMPERATURE_ATS = getEnvNumber('OPENAI_TEMPERATURE_ATS', 0.1)
const OPENAI_MAX_TOKENS_ATS = Math.max(500, Math.floor(getEnvNumber('OPENAI_MAX_TOKENS_ATS', 1800)))
const OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS = Math.max(
  0,
  Math.min(2, Math.floor(getEnvNumber('OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS', 1)))
)
const SCORER_BATCH_JOBS = Math.max(
  1,
  Math.min(50, Math.floor(getEnvNumber('ASYNC_ATS_SCORER_BATCH_JOBS', 8)))
)
// Minimum ATS score (0–1) for triggering a proactive match notification.
// Overridable per-user via profiles.proactive_match_threshold; globally via SATS_PROACTIVE_MATCH_THRESHOLD env var.
const DEFAULT_PROACTIVE_MATCH_THRESHOLD = getEnvNumber('SATS_PROACTIVE_MATCH_THRESHOLD', 0.6)

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

type ATSAnalysisResult = {
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

type StagedJob = {
  id: string
  source: string
  source_url: string
  title: string
  company_name: string | null
  location_raw: string | null
  description_raw: string
  structured_extracted_at: string | null
}

// ─── Job Signal Extraction (P26 S1-1) ────────────────────────────────────────

const JOB_SIGNALS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'certifications',
    'tools',
    'methodologies',
    'seniority_band',
    'salary_min',
    'salary_max',
    'salary_currency',
  ],
  properties: {
    certifications: { type: 'array', items: { type: 'string' } },
    tools: { type: 'array', items: { type: 'string' } },
    methodologies: { type: 'array', items: { type: 'string' } },
    seniority_band: {
      anyOf: [
        { type: 'string', enum: ['junior', 'mid', 'senior', 'lead', 'director', 'executive'] },
        { type: 'null' },
      ],
    },
    salary_min: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    salary_max: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    salary_currency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
}

type JobSignals = {
  certifications: string[]
  tools: string[]
  methodologies: string[]
  seniority_band: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
}

type RoleFamily = {
  id: string
  name: string
  aliases: string[]
}

/** Derive a 2-letter market code from a raw location string using keyword matching. */
function deriveMarketCode(locationRaw: string | null): string | null {
  if (!locationRaw) return null
  const loc = locationRaw.toLowerCase()

  // Order matters: more specific terms before broader country names
  if (/\b(auckland|wellington|christchurch|hamilton|dunedin|new zealand|nz)\b/.test(loc))
    return 'nz'
  if (/\b(sydney|melbourne|brisbane|perth|adelaide|canberra|australia|aus)\b/.test(loc)) return 'au'
  if (
    /\b(london|manchester|birmingham|leeds|edinburgh|glasgow|united kingdom|uk|england|scotland|wales)\b/.test(
      loc
    )
  )
    return 'uk'
  if (/\b(são paulo|sao paulo|rio de janeiro|belo horizonte|curitiba|brasil|brazil|br)\b/.test(loc))
    return 'br'
  if (
    /\b(new york|san francisco|los angeles|chicago|seattle|boston|austin|usa|united states)\b/.test(
      loc
    )
  )
    return 'us'

  return null
}

/** Match a job title to a role family using alias containment (case-insensitive). */
function matchRoleFamily(title: string, families: RoleFamily[]): string | null {
  const titleLower = title.toLowerCase()
  for (const family of families) {
    for (const alias of family.aliases) {
      const aliasLower = alias.toLowerCase()
      // Match if the title contains the alias OR the alias contains the title
      if (titleLower.includes(aliasLower) || aliasLower.includes(titleLower)) {
        return family.id
      }
    }
  }
  return null
}

/** Fetch all role families for client-side title matching. Called once per scorer run. */
async function fetchRoleFamilies(supabase: ReturnType<typeof createClient>): Promise<RoleFamily[]> {
  const { data, error } = await supabase.from('sats_role_families').select('id, name, aliases')

  if (error) {
    console.warn('[async-ats-scorer] Failed to fetch role families:', String(error))
    return []
  }
  return (data ?? []) as RoleFamily[]
}

/**
 * Extract structured signals from a staged job using gpt-4.1-mini.
 * Returns null if extraction fails — caller decides whether to surface the error.
 * Idempotent guard: caller should check structured_extracted_at before calling.
 */
async function extractJobSignals(
  job: StagedJob,
  roleFamilies: RoleFamily[]
): Promise<(JobSignals & { market_code: string | null; role_family_id: string | null }) | null> {
  try {
    const llmResult = await callLLM({
      systemPrompt:
        'You are a job posting parser. Extract structured requirements from job descriptions. Return JSON only. For salary, extract numeric values and currency code. For seniority, map to: junior, mid, senior, lead, director, or executive. Return null for missing fields.',
      userPrompt: `Job title: ${job.title}\n\nJob description:\n${job.description_raw.slice(0, 8000)}`,
      modelCandidates: [OPENAI_MODEL_EXTRACTION],
      jsonSchema: JOB_SIGNALS_JSON_SCHEMA,
      schemaName: 'job_signals',
      temperature: 0,
      maxTokens: 800,
      retryAttempts: 1,
      taskLabel: 'job-signal-extraction',
    })

    const parsed: JobSignals = JSON.parse(llmResult.rawContent)
    const marketCode = deriveMarketCode(job.location_raw)
    const roleFamilyId = matchRoleFamily(job.title, roleFamilies)

    return {
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      methodologies: Array.isArray(parsed.methodologies) ? parsed.methodologies : [],
      seniority_band: parsed.seniority_band ?? null,
      salary_min: parsed.salary_min ?? null,
      salary_max: parsed.salary_max ?? null,
      salary_currency: parsed.salary_currency ?? null,
      market_code: marketCode,
      role_family_id: roleFamilyId,
    }
  } catch (err) {
    console.warn(`[async-ats-scorer] extractJobSignals failed for job ${job.id}:`, String(err))
    return null
  }
}

type ResumeRow = {
  id: string
  user_id: string
  name: string
  created_at: string
}

function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PROACTIVE_MATCH_THRESHOLD
  return Math.max(0, Math.min(1, value))
}

function parseThreshold(value: unknown, fallback: number): number {
  if (typeof value === 'number') return clampThreshold(value)
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return clampThreshold(parsed)
  }
  return clampThreshold(fallback)
}

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
  message: string,
  metadata: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
  requestId: string
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
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        script_name: 'async-ats-scorer',
        log_level: level,
        message,
        request_id: requestId,
        metadata: {
          event_name: 'async_ats_scorer.lifecycle',
          component: 'async-ats-scorer',
          operation: 'score_staged_jobs',
          outcome: level === 'ERROR' ? 'failure' : 'info',
          ...metadata,
        },
      }),
    })
  } catch (_error) {
    // Telemetry failures should not block scorer.
  }
}

function buildPrompt(
  jobTitle: string,
  jobText: string,
  baselineText: string,
  weightedSkillContext?: string
): string {
  return `Task: Compare candidate baseline against job description using deterministic ATS rubric.

Scoring rubric (0.0-1.0):
- skills_alignment (40%)
- experience_relevance (30%)
- domain_fit (20%)
- format_quality (10%)

Output constraints:
- Return JSON matching schema.
- Use evidence-grounded findings only.
- Include concise evidence quotes.

Job:
- title: ${jobTitle}
- content:
${jobText}

Candidate baseline profile:
${baselineText}${weightedSkillContext ? `\n\n${weightedSkillContext}` : ''}`.trim()
}

function buildSkillsProfileBaseline(
  skills: Array<{
    name: string
    proficiency_level: string | null
    years_of_experience: number | null
    notes: string | null
  }>,
  experiences: Array<{
    skill_name: string
    job_title: string | null
    description: string | null
    keywords: string[] | null
  }>
): string {
  const skillLines = skills.map(
    (s) =>
      `- ${s.name} | proficiency=${s.proficiency_level || 'unspecified'} | years=${s.years_of_experience ?? 'unknown'}${s.notes ? ` | notes=${s.notes}` : ''}`
  )

  const expLines = experiences.slice(0, 20).map((e) => {
    const kw = e.keywords?.length ? ` | keywords=${e.keywords.join(', ')}` : ''
    const desc = e.description ? ` | evidence=${e.description}` : ''
    return `- skill=${e.skill_name}${e.job_title ? ` | role=${e.job_title}` : ''}${kw}${desc}`
  })

  return [`Skills:`, ...skillLines, '', 'Experience Evidence:', ...expLines].join('\n').trim()
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function parseATSResult(rawContent: string): ATSAnalysisResult {
  const parsed = JSON.parse(rawContent)
  return {
    match_score: clamp01(Number(parsed?.match_score ?? 0)),
    keywords_found: safeArray<string>(parsed?.keywords_found),
    keywords_missing: safeArray<string>(parsed?.keywords_missing),
    resume_warnings: safeArray<string>(parsed?.resume_warnings),
    recommendations: safeArray<string>(parsed?.recommendations),
    score_breakdown: {
      skills_alignment: clamp01(Number(parsed?.score_breakdown?.skills_alignment ?? 0)),
      experience_relevance: clamp01(Number(parsed?.score_breakdown?.experience_relevance ?? 0)),
      domain_fit: clamp01(Number(parsed?.score_breakdown?.domain_fit ?? 0)),
      format_quality: clamp01(Number(parsed?.score_breakdown?.format_quality ?? 0)),
    },
    evidence: safeArray<{
      skill: string
      jd_quote: string
      resume_quote: string
      reasoning: string
    }>(parsed?.evidence),
  }
}

async function runATSCompletionWithSchema(
  systemPrompt: string,
  userPrompt: string
): Promise<{
  analysisResult: ATSAnalysisResult
  modelUsed: string
  costEstimateUsd: number | null
}> {
  const models = [OPENAI_MODEL_ATS]
  if (OPENAI_MODEL_ATS_FALLBACK && OPENAI_MODEL_ATS_FALLBACK !== OPENAI_MODEL_ATS) {
    models.push(OPENAI_MODEL_ATS_FALLBACK)
  }

  const llmResult = await callLLM({
    systemPrompt,
    userPrompt,
    modelCandidates: models,
    jsonSchema: ATS_JSON_SCHEMA,
    schemaName: 'ats_analysis',
    temperature: OPENAI_TEMPERATURE_ATS,
    maxTokens: OPENAI_MAX_TOKENS_ATS,
    retryAttempts: OPENAI_SCHEMA_RETRY_ATTEMPTS_ATS,
    taskLabel: 'ats-scoring-batch',
  })

  const analysisResult = parseATSResult(llmResult.rawContent)
  return {
    analysisResult,
    modelUsed: llmResult.modelUsed,
    costEstimateUsd: llmResult.costEstimateUsd,
  }
}

async function getLatestResumesByUser(
  supabase: ReturnType<typeof createClient>
): Promise<ResumeRow[]> {
  const { data, error } = await supabase
    .from('sats_resumes')
    .select('id, user_id, name, created_at')
    .is('deleted_at', null)
    .order('user_id', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  const result: ResumeRow[] = []
  const seen = new Set<string>()
  for (const row of (data || []) as ResumeRow[]) {
    if (seen.has(row.user_id)) continue
    seen.add(row.user_id)
    result.push(row)
  }

  return result
}

async function getGlobalThresholdDefault(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const { data, error } = await supabase
    .from('sats_runtime_settings')
    .select('value')
    .eq('key', 'proactive_match_threshold_default')
    .maybeSingle()

  if (error) throw error
  return parseThreshold(data?.value, DEFAULT_PROACTIVE_MATCH_THRESHOLD)
}

async function getUserThresholdMap(
  supabase: ReturnType<typeof createClient>,
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (userIds.length === 0) return map

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, proactive_match_threshold')
    .in('user_id', userIds)

  if (error) throw error

  for (const row of data || []) {
    const raw = (row as { proactive_match_threshold: number | null }).proactive_match_threshold
    // Only populate map for users with an explicit per-user threshold.
    // Users without one fall back to globalThreshold via the ?? operator in the caller.
    if (raw !== null && raw !== undefined) {
      map.set(
        (row as { user_id: string }).user_id,
        parseThreshold(raw, DEFAULT_PROACTIVE_MATCH_THRESHOLD)
      )
    }
  }

  return map
}

async function buildUserBaseline(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  resumeId: string
): Promise<{
  baselineText: string | null
  baselineType: 'skills_profile' | 'resume_extraction' | 'none'
}> {
  const [
    { data: userSkills, error: userSkillsError },
    { data: skillExperiences, error: expError },
  ] = await Promise.all([
    supabase
      .from('sats_user_skills')
      .select('proficiency_level, years_of_experience, notes, skill:sats_skills(name)')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('sats_skill_experiences')
      .select('job_title, description, keywords, skill:sats_skills(name)')
      .eq('user_id', userId)
      .is('deleted_at', null),
  ])

  if (userSkillsError) throw userSkillsError
  if (expError) throw expError

  const skills = (userSkills || []).map((row: any) => ({
    name: row?.skill?.name || 'unknown skill',
    proficiency_level: row?.proficiency_level || null,
    years_of_experience: row?.years_of_experience ?? null,
    notes: row?.notes || null,
  }))

  const exps = (skillExperiences || []).map((row: any) => ({
    skill_name: row?.skill?.name || 'unknown skill',
    job_title: row?.job_title || null,
    description: row?.description || null,
    keywords: safeArray<string>(row?.keywords),
  }))

  if (skills.length > 0) {
    return {
      baselineText: buildSkillsProfileBaseline(skills, exps),
      baselineType: 'skills_profile',
    }
  }

  const { data: extraction, error: extractionError } = await supabase
    .from('document_extractions')
    .select('extracted_text')
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (extractionError) throw extractionError

  if (extraction?.extracted_text) {
    return {
      baselineText: extraction.extracted_text,
      baselineType: 'resume_extraction',
    }
  }

  return {
    baselineText: null,
    baselineType: 'none',
  }
}

async function fetchSkillDecayConfig(
  supabase: ReturnType<typeof createClient>
): Promise<DecayConfigRow[]> {
  const { data, error } = await supabase
    .from('sats_skill_decay_config')
    .select('category,decay_rate_pct,grace_years,floor_weight')
  if (error) {
    console.warn(
      '[async-ats-scorer] Failed to fetch skill decay config, falling back to no decay:',
      String(error)
    )
    return []
  }
  return (data ?? []) as DecayConfigRow[]
}

async function fetchSkillProfilesByUser(
  supabase: ReturnType<typeof createClient>,
  userIds: string[]
): Promise<Map<string, SkillProfileRow[]>> {
  const map = new Map<string, SkillProfileRow[]>()
  if (userIds.length === 0) return map

  const { data, error } = await supabase
    .from('sats_skill_profiles')
    .select(
      'user_id,skill_name,category,depth,ai_last_used_year,user_confirmed_last_used_year,transferable_to,career_chapter,user_context'
    )
    .in('user_id', userIds)

  if (error) {
    console.warn(
      '[async-ats-scorer] Failed to fetch skill profiles, weighted context will be skipped:',
      String(error)
    )
    return map
  }

  for (const row of (data ?? []) as Array<SkillProfileRow & { user_id: string }>) {
    const existing = map.get(row.user_id) ?? []
    existing.push(row)
    map.set(row.user_id, existing)
  }

  return map
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey || !Deno.env.get('OPENAI_API_KEY')) {
    // 503 = misconfigured service (not a transient server error); allows correct client retry behaviour
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required env configuration' }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const requestId = `p14s2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const supabase = createClient(supabaseUrl, serviceKey)

  const startedAt = Date.now()
  let processedJobs = 0
  let scoredAnalyses = 0
  let failedJobs = 0
  let notificationsTriggered = 0

  await logEvent(
    'INFO',
    'Async ATS scorer started',
    { batch_jobs_limit: SCORER_BATCH_JOBS },
    supabaseUrl,
    serviceKey,
    requestId
  )

  try {
    const { data: queuedJobs, error: jobsError } = await supabase
      .from('sats_staged_jobs')
      .select(
        'id, source, source_url, title, company_name, location_raw, description_raw, structured_extracted_at'
      )
      .eq('status', 'queued')
      .order('fetched_at', { ascending: true })
      .limit(SCORER_BATCH_JOBS)

    if (jobsError) throw jobsError

    const jobs = (queuedJobs || []) as StagedJob[]
    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            request_id: requestId,
            message: 'No queued staged jobs found',
            processed_jobs: 0,
            scored_analyses: 0,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const latestResumes = await getLatestResumesByUser(supabase)
    const [globalThreshold, skillDecayConfigs, roleFamilies] = await Promise.all([
      getGlobalThresholdDefault(supabase),
      fetchSkillDecayConfig(supabase),
      fetchRoleFamilies(supabase),
    ])
    const userIds = Array.from(new Set(latestResumes.map((resume) => resume.user_id)))
    const [userThresholdMap, skillProfilesByUser] = await Promise.all([
      getUserThresholdMap(supabase, userIds),
      fetchSkillProfilesByUser(supabase, userIds),
    ])

    for (const job of jobs) {
      let jobScoreCount = 0
      let jobFailed = false
      let lastError: string | null = null

      for (const resume of latestResumes) {
        try {
          const effectiveThreshold = userThresholdMap.get(resume.user_id) ?? globalThreshold
          const baseline = await buildUserBaseline(supabase, resume.user_id, resume.id)
          if (!baseline.baselineText || baseline.baselineType === 'none') {
            continue
          }

          const jobName = `${job.title}${job.company_name ? ` @ ${job.company_name}` : ''}`

          // Resolve company FK — upsert by lowercase name
          let companyId: string | null = null
          if (job.company_name && job.company_name !== 'Unknown') {
            const { data: existingCompany } = await supabase
              .from('sats_companies')
              .select('id')
              .ilike('name', job.company_name)
              .limit(1)
              .single()

            if (existingCompany) {
              companyId = existingCompany.id
            } else {
              const { data: newCompany } = await supabase
                .from('sats_companies')
                .insert({ name: job.company_name })
                .select('id')
                .single()
              companyId = newCompany?.id ?? null
            }
          }

          // Resolve location FK — parse "City, State (WorkType)" or "City, Country"
          let locationId: string | null = null
          if (job.location_raw) {
            // Strip work type suffix: "(Hybrid)", "(On-site)", "(Remote)", "(Contract)"
            const rawClean = job.location_raw.replace(/\s*\([^)]+\)\s*$/, '').trim()
            const parts = rawClean
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            const city = parts[0] ?? null
            const second = parts[1] ?? null
            // Heuristic: if second part is 2-3 chars it's a state code, otherwise it's a country
            const isStateCode = second && second.length <= 3
            const state = isStateCode ? second : null
            const country = isStateCode ? null : second

            const { data: existingLoc } = await supabase
              .from('sats_locations')
              .select('id')
              .eq('city', city ?? '')
              .is(state ? 'state' : 'country', state ?? country)
              .limit(1)
              .single()

            if (existingLoc) {
              locationId = existingLoc.id
            } else {
              const { data: newLoc } = await supabase
                .from('sats_locations')
                .insert({ city, state, country })
                .select('id')
                .single()
              locationId = newLoc?.id ?? null
            }
          }

          const { data: jdRow, error: jdError } = await supabase
            .from('sats_job_descriptions')
            .upsert(
              {
                user_id: resume.user_id,
                name: jobName,
                pasted_text: job.description_raw,
                source_type: 'url',
                source_url: job.source_url,
                proactive_staged_job_id: job.id,
                company_id: companyId,
                location_id: locationId,
              },
              {
                onConflict: 'user_id,proactive_staged_job_id',
                ignoreDuplicates: false,
              }
            )
            .select('id')
            .single()

          if (jdError) throw jdError

          const { data: analysisSeed, error: analysisSeedError } = await supabase
            .from('sats_analyses')
            .upsert(
              {
                user_id: resume.user_id,
                resume_id: resume.id,
                jd_id: jdRow.id,
                status: 'processing',
                proactive_staged_job_id: job.id,
                matched_skills: [],
                missing_skills: [],
                analysis_data: {
                  request_id: requestId,
                  source: 'proactive_staged_job',
                  staged_job_id: job.id,
                  baseline_type: baseline.baselineType,
                  processing_started_at: new Date().toISOString(),
                },
              },
              {
                onConflict: 'user_id,proactive_staged_job_id',
                ignoreDuplicates: false,
              }
            )
            .select('id')
            .single()

          if (analysisSeedError) throw analysisSeedError

          const userSkillProfiles = skillProfilesByUser.get(resume.user_id) ?? []
          const weightedSkillContext = buildWeightedSkillText(userSkillProfiles, skillDecayConfigs)

          const systemPrompt =
            'You are a deterministic ATS evaluator. Return JSON matching schema exactly. Never invent candidate evidence.'
          const userPrompt = buildPrompt(
            jobName,
            job.description_raw,
            baseline.baselineText,
            weightedSkillContext || undefined
          )
          const {
            analysisResult: result,
            modelUsed,
            costEstimateUsd,
          } = await runATSCompletionWithSchema(systemPrompt, userPrompt)

          const { error: updateError } = await supabase
            .from('sats_analyses')
            .update({
              status: 'completed',
              ats_score: Math.round(result.match_score * 100),
              matched_skills: result.keywords_found,
              missing_skills: result.keywords_missing,
              suggestions: result.recommendations.join('\n'),
              analysis_data: {
                request_id: requestId,
                source: 'proactive_staged_job',
                staged_job_id: job.id,
                baseline_type: baseline.baselineType,
                threshold_used: effectiveThreshold,
                processing_completed_at: new Date().toISOString(),
                score_breakdown: result.score_breakdown,
                evidence_count: result.evidence.length,
                resume_warnings: result.resume_warnings,
                model_used: modelUsed,
                cost_estimate_usd: costEstimateUsd,
                // Resume Intelligence keys (PROD-9–12) are null for batch analyses.
                // Call 3 only runs in the interactive ats-analysis-direct flow.
                format_audit: null,
                geography_passport: null,
                industry_lens: null,
                cultural_tone: null,
              },
            })
            .eq('id', analysisSeed.id)

          if (updateError) throw updateError

          jobScoreCount += 1
          scoredAnalyses += 1

          if (result.match_score > effectiveThreshold) {
            const scorePercent = Math.round(result.match_score * 100)
            const notificationType = 'proactive_match_found'
            const dedupeKey = `staged_job:${job.id}`
            const { error: notificationError } = await supabase
              .from('sats_user_notifications')
              .upsert(
                {
                  user_id: resume.user_id,
                  type: notificationType,
                  title: `New ${scorePercent}% match found`,
                  message: `${jobName} matched your profile with a ${scorePercent}% ATS score.`,
                  dedupe_key: dedupeKey,
                  payload: {
                    staged_job_id: job.id,
                    analysis_id: analysisSeed.id,
                    match_score: result.match_score,
                    threshold_used: effectiveThreshold,
                    source_url: job.source_url,
                    source: job.source,
                    job_title: job.title,
                    company_name: job.company_name,
                  },
                },
                {
                  onConflict: 'user_id,type,dedupe_key',
                  ignoreDuplicates: true,
                }
              )

            if (notificationError) {
              await logEvent(
                'ERROR',
                'Failed to create proactive notification',
                {
                  user_id: resume.user_id,
                  staged_job_id: job.id,
                  analysis_id: analysisSeed.id,
                  error: notificationError.message,
                },
                supabaseUrl,
                serviceKey,
                requestId
              )
            } else {
              notificationsTriggered += 1
            }
          }
        } catch (error) {
          jobFailed = true
          if (error instanceof Error) {
            lastError = error.message
          } else if (typeof error === 'object' && error !== null) {
            const e = error as Record<string, unknown>
            lastError = (e.message as string) || JSON.stringify(error)
          } else {
            lastError = String(error)
          }
        }
      }

      processedJobs += 1

      // ── Structured signal extraction (P26 S1-1) ──────────────────────────
      // Run once per job, after all user analyses are scored.
      // Skipped if already extracted (idempotent). Failure is non-fatal.
      let extractedSignals: Awaited<ReturnType<typeof extractJobSignals>> = null
      if (!job.structured_extracted_at) {
        extractedSignals = await extractJobSignals(job, roleFamilies)
      }

      const { error: stageUpdateError } = await supabase
        .from('sats_staged_jobs')
        .update({
          status: jobFailed && jobScoreCount === 0 ? 'error' : 'processed',
          error_message:
            jobFailed && jobScoreCount === 0
              ? `No analyses produced. Last error: ${lastError || 'unknown error'}`
              : null,
          // Include extraction fields if extraction succeeded this run
          ...(extractedSignals !== null
            ? {
                certifications: extractedSignals.certifications,
                tools: extractedSignals.tools,
                methodologies: extractedSignals.methodologies,
                seniority_band: extractedSignals.seniority_band,
                salary_min: extractedSignals.salary_min,
                salary_max: extractedSignals.salary_max,
                salary_currency: extractedSignals.salary_currency,
                market_code: extractedSignals.market_code,
                role_family_id: extractedSignals.role_family_id,
                structured_extracted_at: new Date().toISOString(),
              }
            : {}),
        })
        .eq('id', job.id)

      if (stageUpdateError) {
        failedJobs += 1
      }

      if (jobFailed && jobScoreCount === 0) {
        failedJobs += 1
      }
    }

    const durationMs = Date.now() - startedAt

    await logEvent(
      failedJobs > 0 ? 'ERROR' : 'INFO',
      'Async ATS scorer completed',
      {
        processed_jobs: processedJobs,
        scored_analyses: scoredAnalyses,
        failed_jobs: failedJobs,
        notifications_triggered: notificationsTriggered,
        duration_ms: durationMs,
      },
      supabaseUrl,
      serviceKey,
      requestId
    )

    return new Response(
      JSON.stringify({
        success: failedJobs === 0,
        data: {
          request_id: requestId,
          processed_jobs: processedJobs,
          scored_analyses: scoredAnalyses,
          failed_jobs: failedJobs,
          notifications_triggered: notificationsTriggered,
          duration_ms: durationMs,
        },
      }),
      {
        status: failedJobs > 0 ? 207 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    await logEvent(
      'ERROR',
      'Async ATS scorer failed unexpectedly',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      supabaseUrl,
      serviceKey,
      requestId
    )

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected scorer failure',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
