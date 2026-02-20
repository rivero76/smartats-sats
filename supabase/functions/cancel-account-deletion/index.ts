/**
 * UPDATE LOG
 * 2026-02-20 23:22:57 | P1: Integrated centralized structured logging for account deletion cancellation events.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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
            script_name: 'cancel-account-deletion',
            log_level: level,
            message,
            metadata: {
              event_name: 'account_deletion_cancellation.lifecycle',
              component: 'cancel-account-deletion',
              operation: 'cancel_account_delete',
              outcome: level === 'ERROR' ? 'failure' : 'info',
              ...metadata,
            },
          }),
        })
      } catch (_error) {
        // Do not break cancellation flow due to logging failures
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
      await logEvent('ERROR', 'Invalid authentication token for deletion cancellation', {
        operation: 'auth_validation',
      })
      throw new Error('Invalid authentication token')
    }

    await logEvent('INFO', 'Cancel account deletion request received', {
      operation: 'request_received',
      user_id: user.id,
    })

    console.log('Cancel account deletion request for user:', user.id)

    // Get client IP for audit logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Call the cancel deletion function
    const { data: cancellationResult, error: cancellationError } = await supabase.rpc(
      'cancel_account_deletion',
      {
        target_user_id: user.id,
      }
    )

    if (cancellationError) {
      console.error('Cancel deletion function error:', cancellationError)
      await logEvent('ERROR', 'Cancel deletion RPC failed', {
        operation: 'cancel_deletion',
        user_id: user.id,
        details: { error: cancellationError.message },
      })
      throw new Error(`Failed to cancel account deletion: ${cancellationError.message}`)
    }

    console.log('Account deletion cancelled successfully:', cancellationResult)
    await logEvent('INFO', 'Account deletion cancelled successfully', {
      operation: 'cancel_deletion',
      outcome: 'success',
      user_id: user.id,
    })

    // Log additional audit information
    await supabase.from('account_deletion_logs').insert({
      user_id: user.id,
      action: 'cancelled',
      ip_address: clientIP,
      user_agent: userAgent,
      data_deleted: {
        cancellation_method: 'user_requested',
        timestamp: new Date().toISOString(),
      },
    })

    // TODO: Send cancellation confirmation email
    console.log('TODO: Send cancellation confirmation email to:', user.email)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion cancelled successfully',
        restored_at: new Date().toISOString(),
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
    console.error('Cancel account deletion error:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel account deletion'

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
