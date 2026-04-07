/**
 * UPDATE LOG
 * 2026-04-02 01:00:00 | P20 S4 — reset-profile-data edge function.
 *   Thin JWT-validated HTTP wrapper around the reset_career_data(user_id) RPC.
 *   Hard-deletes all career data for the authenticated user while preserving
 *   the account, auth, and settings. Uses _shared/ utilities.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (origin && !isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ success: false, error: 'Service misconfigured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Use the user's own JWT so RLS/SECURITY DEFINER auth.uid() works correctly
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? supabaseServiceKey,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )

  // Resolve the calling user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid authentication token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Invoke the RPC — auth.uid() inside the function will match user.id
  const { data, error } = await supabase.rpc('reset_career_data', {
    target_user_id: user.id,
  })

  if (error) {
    console.error('reset_career_data RPC error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
