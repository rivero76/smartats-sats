/**
 * UPDATE LOG
 * 2026-02-24 19:40:00 | P14 Story 2: Added async scorer worker for staged jobs with skills-first baseline and ATS schema-compatible scoring output.
 * 2026-03-01 00:00:00 | P16 Story 0: Removed duplicated CORS, env, and OpenAI fetch loop; replaced with _shared/ imports and callLLM(). Added cost tracking.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber } from '../_shared/env.ts'
import { callLLM } from '../_shared/llmProvider.ts'

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
const SCORER_BATCH_JOBS = Math.max(
  1,
  Math.min(50, Math.floor(getEnvNumber('ASYNC_ATS_SCORER_BATCH_JOBS', 8)))
)

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
  description_raw: string
}

type ResumeRow = {
  id: string
  user_id: string
  name: string
  created_at: string
}

function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) return 0.6
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

function buildPrompt(jobTitle: string, jobText: string, baselineText: string): string {
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
${baselineText}`.trim()
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
): Promise<{ analysisResult: ATSAnalysisResult; modelUsed: string; costEstimateUsd: number | null }> {
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

async function getGlobalThresholdDefault(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from('sats_runtime_settings')
    .select('value')
    .eq('key', 'proactive_match_threshold_default')
    .maybeSingle()

  if (error) throw error
  return parseThreshold(data?.value, 0.6)
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
    const threshold = parseThreshold((row as { proactive_match_threshold: number | null }).proactive_match_threshold, 0.6)
    map.set((row as { user_id: string }).user_id, threshold)
  }

  return map
}

async function buildUserBaseline(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  resumeId: string
): Promise<{ baselineText: string | null; baselineType: 'skills_profile' | 'resume_extraction' | 'none' }> {
  const [{ data: userSkills, error: userSkillsError }, { data: skillExperiences, error: expError }] =
    await Promise.all([
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
    return new Response(JSON.stringify({ success: false, error: 'Missing required env configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
      .select('id, source, source_url, title, company_name, description_raw')
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
    const globalThreshold = await getGlobalThresholdDefault(supabase)
    const userThresholdMap = await getUserThresholdMap(
      supabase,
      Array.from(new Set(latestResumes.map((resume) => resume.user_id)))
    )

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

          const systemPrompt =
            'You are a deterministic ATS evaluator. Return JSON matching schema exactly. Never invent candidate evidence.'
          const userPrompt = buildPrompt(jobName, job.description_raw, baseline.baselineText)
          const { analysisResult: result, modelUsed, costEstimateUsd } = await runATSCompletionWithSchema(systemPrompt, userPrompt)

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
          lastError = error instanceof Error ? error.message : String(error)
        }
      }

      processedJobs += 1

      const { error: stageUpdateError } = await supabase
        .from('sats_staged_jobs')
        .update({
          status: jobFailed && jobScoreCount === 0 ? 'error' : 'processed',
          error_message:
            jobFailed && jobScoreCount === 0
              ? `No analyses produced. Last error: ${lastError || 'unknown error'}`
              : null,
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
