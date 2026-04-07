/**
 * UPDATE LOG
 * 2026-04-08 00:00:00 | Initial creation — Knock Knock outreach message generator.
 *   Generates a Bryan Creely-style 3-paragraph LinkedIn outreach message for a given
 *   job opportunity: genuine interest → specific observation → low-ask close.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llmProvider.ts'

const OPENAI_MODEL_ENRICH = Deno.env.get('OPENAI_MODEL_ENRICH') || 'gpt-4.1-mini'
const OPENAI_MODEL_ENRICH_FALLBACK = Deno.env.get('OPENAI_MODEL_ENRICH_FALLBACK') || 'gpt-4o-mini'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const functionsBaseUrl =
  Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
  supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
const loggingEndpoint = `${functionsBaseUrl}/functions/v1/centralized-logging`

interface OutreachRequest {
  jobTitle: string
  companyName: string
  matchedSkills: string[]
  userSummary?: string
  request_id?: string
}

async function logEvent(
  level: 'ERROR' | 'INFO' | 'DEBUG',
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
        script_name: 'generate-outreach-message',
        log_level: level,
        message,
        metadata,
        request_id: requestId,
      }),
    })
  } catch (err) {
    console.error('[generate-outreach-message] Failed to log event:', err)
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

  // Config validation — fail fast with 503
  if (!Deno.env.get('OPENAI_API_KEY')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Service misconfigured — missing OPENAI_API_KEY' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: OutreachRequest
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { jobTitle, companyName, matchedSkills = [], userSummary, request_id } = payload

  if (!jobTitle || !companyName) {
    return new Response(
      JSON.stringify({ success: false, error: 'jobTitle and companyName are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const requestId = request_id || crypto.randomUUID()

  try {
    await logEvent(
      'INFO',
      'Generating Knock Knock outreach message',
      { job_title: jobTitle, company_name: companyName, skills_count: matchedSkills.length },
      requestId
    )

    const topSkills = matchedSkills.slice(0, 3).join(', ') || 'relevant skills'
    const summaryLine = userSummary ? `\nUser background: ${userSummary}` : ''

    const systemPrompt = `You are a job search coach writing a LinkedIn outreach message following Bryan Creely's "Knock Knock" technique from A Life After Layoff.

The Knock Knock technique has three rules:
1. Do NOT ask for a job, referral, or anything of direct value in the first message.
2. Lead with genuine, specific interest in the company or the hiring manager's work — not generic flattery.
3. Close with a low-ask: a request for insight, perspective, or advice — not a favour.

Write a short, professional LinkedIn outreach message (150–200 words) in three paragraphs:
- Paragraph 1: Specific, genuine interest in the company or team (reference the role or industry naturally — no hollow phrases like "I was excited to see your posting").
- Paragraph 2: One specific observation about how your background connects to their work, grounded in 1–2 of the candidate's matched skills.
- Paragraph 3: A low-ask close — request for a brief insight or perspective on their team/industry. No "would you be open to referring me" or "I'd love to apply".

Do not include a subject line. Do not use "I hope this message finds you well." Do not use em-dashes. Write in first person. Sound human, not corporate.

Return ONLY the message text — no preamble, no explanation, no JSON wrapper.`

    const userPrompt = `Generate a Knock Knock outreach message for:
- Target role: ${jobTitle}
- Company: ${companyName}
- Candidate's top matched skills: ${topSkills}${summaryLine}`

    const llmResponse = await callLLM({
      systemPrompt,
      userPrompt,
      modelCandidates: [OPENAI_MODEL_ENRICH, OPENAI_MODEL_ENRICH_FALLBACK],
      temperature: 0.7,
      maxTokens: 400,
      retryAttempts: 1,
      taskLabel: 'knock-knock-outreach',
    })

    const message = llmResponse.rawContent.trim()

    try {
      await logEvent(
        'INFO',
        'Outreach message generated',
        {
          model_used: llmResponse.modelUsed,
          duration_ms: llmResponse.durationMs,
          cost_estimate_usd: llmResponse.costEstimateUsd,
        },
        requestId
      )
    } catch {
      // telemetry must not block
    }

    return new Response(JSON.stringify({ success: true, message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error'
    try {
      await logEvent(
        'ERROR',
        'Outreach message generation failed',
        { error: errorMessage },
        requestId
      )
    } catch {
      // telemetry must not block
    }
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to generate outreach message' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
