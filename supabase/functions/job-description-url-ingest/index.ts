import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')

  const withLineBreaks = withoutScripts
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|section|article|li|h1|h2|h3|h4|h5|h6)\s*>/gi, '\n')

  const stripped = withLineBreaks.replace(/<[^>]+>/g, ' ')
  return decodeHtmlEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

  try {
    const body = await req.json()
    const rawUrl = String(body?.url || '').trim()

    if (!rawUrl) {
      return new Response(JSON.stringify({ success: false, error: 'url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only http(s) URLs are supported' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SmartATS-Ingestion/1.0 (+manual-single-url-fetch)',
        Accept: 'text/html, text/plain;q=0.9,*/*;q=0.5',
      },
    }).finally(() => clearTimeout(timeout))

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unable to fetch URL content (${response.status})`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const isLikelyHtmlOrText =
      contentType.includes('text/html') || contentType.includes('text/plain')

    const rawBody = await response.text()
    if (!rawBody.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'URL returned empty content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const titleMatch = rawBody.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const pageTitle = titleMatch ? htmlToText(titleMatch[1]) : null
    const extractedText = isLikelyHtmlOrText ? htmlToText(rawBody) : rawBody.trim()

    const boundedText =
      extractedText.length > 50_000 ? `${extractedText.slice(0, 50_000)}...[truncated]` : extractedText

    return new Response(
      JSON.stringify({
        success: true,
        url: parsedUrl.toString(),
        page_title: pageTitle,
        extracted_text: boundedText,
        content_length: boundedText.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ success: false, error: `URL ingestion failed: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
