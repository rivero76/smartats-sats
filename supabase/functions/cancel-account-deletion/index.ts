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
      throw new Error('Invalid authentication token')
    }

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
      throw new Error(`Failed to cancel account deletion: ${cancellationError.message}`)
    }

    console.log('Account deletion cancelled successfully:', cancellationResult)

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
  } catch (error: any) {
    console.error('Cancel account deletion error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to cancel account deletion',
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
