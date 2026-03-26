---
name: new-edge-function
description: Scaffold a new Supabase Deno edge function following SmartATS conventions. Trigger when the user says "create edge function", "add a new function", "new edge function for X", or "scaffold function".
---

# New Edge Function Scaffold

## Step 1 — Determine the function name

Ask if not provided. Must be `kebab-case` (e.g. `score-resume`, `send-notification`).

## Step 2 — Create the directory and file

Path: `supabase/functions/<name>/index.ts`

## Step 3 — Write the file with this exact structure

```typescript
/**
 * UPDATE LOG
 * YYYY-MM-DD HH:MM:SS | Created — <one-line description of what this function does>
 */
import 'https://deno.land/x/xhr@0.1.0/mod.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'
import { getEnvNumber, getEnvBoolean } from '../_shared/env.ts'
import { callLLM, type LLMRequest } from '../_shared/llmProvider.ts'

// --- Env var validation (fail fast at startup, not at request time) ---
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req: Request) => {
  const origin = req.headers.get('origin')

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: buildCorsHeaders(origin) })
  }

  // Config guard — return 503 (not 500) for missing env vars
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 503,
      headers: { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' },
    })
  }

  // CORS origin check
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse request body
    const body = await req.json()

    // TODO: validate required fields from body

    // Supabase client (authenticated with user JWT for RLS)
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    // TODO: main logic — DB queries, callLLM(), etc.

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' },
    })
  } finally {
    // Telemetry — must never block or propagate errors to callers
    try {
      // await logEvent(...)
    } catch {
      // swallow telemetry errors
    }
  }
})
```

## Step 4 — Remind the user

Output these follow-up steps:

1. Fill in the `TODO` sections with the function's actual logic
2. If DB schema changes are needed, use the `migration-writer` agent first
3. Test locally: `supabase functions serve <name>`
4. Deploy: `supabase functions deploy <name>`
5. If the function needs to be registered locally, add it to `supabase/config.toml`

## Hard rules (never break these)

- No direct `fetch('https://api.openai.com/...')` calls — always use `callLLM()`
- No inline CORS headers — always use `buildCorsHeaders(origin)`
- Return `503` for missing/invalid env vars, not `500`
- All `logEvent()` / centralized-logging calls inside their own `try/catch`
- UPDATE LOG header at the top of every new file
