import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAccountRequest {
  password: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log('Delete account request for user:', user.id);

    // Parse request body
    const { password, reason }: DeleteAccountRequest = await req.json();

    if (!password) {
      throw new Error('Password is required for account deletion');
    }

    // Verify password by attempting to sign in
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password
    });

    if (passwordError) {
      console.error('Password verification failed:', passwordError);
      throw new Error('Invalid password provided');
    }

    console.log('Password verified successfully');

    // Get client IP and user agent for audit logging
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Call the soft delete function
    const { data: deletionResult, error: deletionError } = await supabase.rpc(
      'soft_delete_user', 
      {
        target_user_id: user.id,
        deletion_reason: reason || 'User requested account deletion'
      }
    );

    if (deletionError) {
      console.error('Soft delete function error:', deletionError);
      throw new Error(`Failed to delete account: ${deletionError.message}`);
    }

    console.log('Account soft delete successful:', deletionResult);

    // Log additional audit information
    await supabase.from('account_deletion_logs').insert({
      user_id: user.id,
      action: 'confirmed',
      ip_address: clientIP,
      user_agent: userAgent,
      deletion_reason: reason,
      data_deleted: {
        deletion_method: 'user_requested',
        timestamp: new Date().toISOString()
      }
    });

    // Revoke all user sessions
    const { error: signOutError } = await supabase.auth.admin.signOut(user.id, 'global');
    
    if (signOutError) {
      console.error('Failed to sign out user globally:', signOutError);
      // Don't throw here as the account is already soft deleted
    } else {
      console.log('User sessions revoked successfully');
    }

    // TODO: Send confirmation email (implement email service)
    console.log('TODO: Send deletion confirmation email to:', user.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account scheduled for deletion',
        deletion_date: deletionResult.deletion_date,
        permanent_deletion_date: deletionResult.permanent_deletion_date,
        grace_period_days: 30
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Delete account error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to delete account',
        success: false
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});