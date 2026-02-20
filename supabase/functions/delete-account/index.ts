/**
 * UPDATE LOG
 * 2026-02-20 23:22:57 | P1: Integrated centralized structured logging for account deletion lifecycle events.
 * 2026-02-21 03:13:40 | SDLC P4 security hardening: replaced wildcard CORS with ALLOWED_ORIGINS allowlist enforcement.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
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

interface DeleteAccountRequest {
  password: string
  reason?: string
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const functionsBaseUrl =
      Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
      supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
    const loggingEndpoint = `${functionsBaseUrl}/functions/v1/centralized-logging`

    const logEvent = async (
      level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE',
      message: string,
      metadata: Record<string, unknown> = {}
    ) => {
      try {
        await fetch(loggingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            script_name: 'delete-account',
            log_level: level,
            message,
            metadata: {
              event_name: 'account_deletion.lifecycle',
              component: 'delete-account',
              operation: 'account_delete',
              outcome: level === 'ERROR' ? 'failure' : 'info',
              ...metadata,
            },
          }),
        })
      } catch (_error) {
        // Do not break deletion flow due to logging failures
      }
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      await logEvent('ERROR', 'Invalid authentication token for account deletion', {
        operation: 'auth_validation',
      })
      throw new Error('Invalid authentication token')
    }

    await logEvent('INFO', 'Delete account request received', {
      operation: 'request_received',
      user_id: user.id,
    })

    console.log('Delete account request for user:', user.id)

    // Parse request body
    const { password, reason }: DeleteAccountRequest = await req.json()

    if (!password) {
      await logEvent('ERROR', 'Password missing in account deletion request', {
        operation: 'input_validation',
        user_id: user.id,
      })
      throw new Error('Password is required for account deletion')
    }

    // Verify password by attempting to sign in
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    })

    if (passwordError) {
      console.error('Password verification failed:', passwordError)
      await logEvent('ERROR', 'Password verification failed', {
        operation: 'password_verification',
        user_id: user.id,
        details: { error: passwordError.message },
      })
      throw new Error('Invalid password provided')
    }

    console.log('Password verified successfully')

    // Get client IP and user agent for audit logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // CRITICAL: Revoke all user sessions BEFORE deletion
    // This ensures the token is still valid when we revoke sessions
    console.log('Revoking user sessions before account deletion...')
    const { error: signOutError } = await supabase.auth.admin.signOut(user.id, 'global')

    if (signOutError) {
      console.error('Failed to sign out user globally:', signOutError)
      await logEvent('ERROR', 'Failed to revoke user sessions', {
        operation: 'session_revocation',
        user_id: user.id,
        details: { error: signOutError.message },
      })
      throw new Error(`Failed to revoke sessions: ${signOutError.message}`)
    }

    console.log('User sessions revoked successfully')

    // Now call the soft delete function
    const { data: deletionResult, error: deletionError } = await supabase.rpc('soft_delete_user', {
      target_user_id: user.id,
      deletion_reason: reason || 'User requested account deletion',
    })

    if (deletionError) {
      console.error('Soft delete function error:', deletionError)
      await logEvent('ERROR', 'Soft delete RPC failed', {
        operation: 'soft_delete',
        user_id: user.id,
        details: { error: deletionError.message },
      })
      throw new Error(`Failed to delete account: ${deletionError.message}`)
    }

    console.log('Account soft delete successful:', deletionResult)

    // Phase 2: HARD DELETE from auth.users to allow re-signup with same email
    // This must be done AFTER soft delete and session revocation
    console.log('Performing hard delete from auth.users to allow re-signup...')
    const { error: hardDeleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (hardDeleteError) {
      console.error('Hard delete from auth.users failed:', hardDeleteError)
      await logEvent('ERROR', 'Hard delete from auth.users failed', {
        operation: 'hard_delete',
        user_id: user.id,
        details: { error: hardDeleteError.message },
      })
      // Log the error but don't fail the entire deletion process
      // The soft delete already succeeded
      await supabase.from('account_deletion_logs').insert({
        user_id: user.id,
        action: 'hard_delete_failed',
        ip_address: clientIP,
        user_agent: userAgent,
        deletion_reason: reason,
        data_deleted: {
          error: hardDeleteError.message,
          timestamp: new Date().toISOString(),
        },
      })
    } else {
      console.log('Hard delete from auth.users successful')
      await logEvent('INFO', 'Hard delete from auth.users completed', {
        operation: 'hard_delete',
        outcome: 'success',
        user_id: user.id,
      })
      // Log successful hard deletion
      await supabase.from('account_deletion_logs').insert({
        user_id: user.id,
        action: 'hard_deleted',
        ip_address: clientIP,
        user_agent: userAgent,
        deletion_reason: reason,
        data_deleted: {
          deletion_method: 'complete_user_deletion',
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Log additional audit information
    await supabase.from('account_deletion_logs').insert({
      user_id: user.id,
      action: 'confirmed',
      ip_address: clientIP,
      user_agent: userAgent,
      deletion_reason: reason,
      data_deleted: {
        deletion_method: 'user_requested',
        timestamp: new Date().toISOString(),
      },
    })

    // TODO: Send confirmation email (implement email service)
    console.log('TODO: Send deletion confirmation email to:', user.email)
    await logEvent('INFO', 'Account deletion workflow completed', {
      operation: 'account_delete',
      outcome: 'success',
      user_id: user.id,
      details: {
        grace_period_days: 30,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account scheduled for deletion',
        deletion_date: deletionResult.deletion_date,
        permanent_deletion_date: deletionResult.permanent_deletion_date,
        grace_period_days: 30,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error: unknown) {
    console.error('Delete account error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete account'

    return new Response(
      JSON.stringify({
        error: message,
        success: false,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})
