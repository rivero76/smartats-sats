/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added request_id propagation for enrichment flow correlation.
 * 2026-02-21 00:15:00 | Hardened provider error handling: avoid raw provider payload logging and return safe messages for 401/429/5xx.
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'gpt-4o-mini'

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
}

function mapProviderError(status: number): { safeMessage: string; errorType: string } {
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

  return {
    safeMessage: `AI provider request failed (${status}).`,
    errorType: 'provider_request_error',
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    await logEvent('INFO', 'Starting enrichment request', {
      analysis_id: payload.analysis_id,
      resume_id: payload.resume_id,
      jd_id: payload.jd_id,
    }, payload.request_id)

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
      await logEvent('ERROR', 'Resume fetch failed', { error: resumeResult.error.message }, payload.request_id)
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.15,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert career coach helping candidates enrich resume bullet points. Output strictly formatted JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const { safeMessage, errorType } = mapProviderError(response.status)
      // Consume response body for completeness without logging provider payload.
      await response.text()
      console.error('OpenAI API error status:', response.status)
      await logEvent('ERROR', 'OpenAI request failed', {
        status: response.status,
        safe_message: safeMessage,
        error_type: errorType,
      }, payload.request_id)
      throw new Error(safeMessage)
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content?.trim() || ''
    const suggestions = parseEnrichmentResponse(rawContent)

    await logEvent('INFO', 'Enrichment suggestions generated', {
      suggestion_count: suggestions.length,
      resume_id: payload.resume_id,
      jd_id: payload.jd_id,
    }, payload.request_id)

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        metadata: {
          model: MODEL,
          token_usage: data.usage,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Enrichment function error:', error)
    await logEvent('ERROR', 'Enrichment function error', {
      message: error instanceof Error ? error.message : String(error),
    }, payload.request_id)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
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
    await logEvent('ERROR', 'Resume content lookup failed', { resume_id: resumeId, error }, requestId)
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
  return `
You enhance resumes by inferring believable sub-skills and crafting quantifiable bullet points.

Rules:
- Only propose sub-skills that are strongly implied by the resume context.
- Use "skill_type": "explicit" if the skill already exists verbatim; otherwise use "inferred".
- Provide concise explanations telling the user why the skill is relevant.
- Bullet points must be action-oriented and, when possible, include metrics or scope.
- Output JSON with a top-level array "suggestions".

Context:
- Resume (${resumeName}):
${resumeContent.slice(0, 5000)}

- Job Description (${jobName}):
${jobContent.slice(0, 4000)}

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
      "derived_context": "Mention of PMP certification and leading multi-million dollar programs."
    }
  ]
}
`.trim()
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
      .map((item: any) => ({
        skill_name: String(item.skill_name || '').trim(),
        skill_type: item.skill_type === 'explicit' ? 'explicit' : 'inferred',
        confidence: clamp(Number(item.confidence ?? 0.5)),
        explanation: String(item.explanation || '').trim(),
        suggestion: String(item.suggestion || '').trim(),
        derived_context: item.derived_context ? String(item.derived_context) : undefined,
      }))
      .filter((item: EnrichmentSuggestion) => item.skill_name && item.suggestion)
  } catch (error) {
    console.error('Failed to parse enrichment response:', error, raw)
    return []
  }
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}
