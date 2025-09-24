import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogRequest {
  script_name: string;
  log_level: 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE';
  message: string;
  metadata?: any;
  user_id?: string;
  session_id?: string;
  request_id?: string;
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const logRequest: LogRequest = await req.json();
    
    // Validate required fields
    if (!logRequest.script_name || !logRequest.log_level || !logRequest.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: script_name, log_level, message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if logging is enabled for this script
    const { data: logSettings, error: settingsError } = await supabase
      .from('log_settings')
      .select('logging_enabled, debug_enabled, trace_enabled, log_level')
      .eq('script_name', logRequest.script_name)
      .single();

    if (settingsError) {
      console.error('Failed to fetch log settings:', settingsError);
      // If no settings found, default to disabled
      return new Response(
        JSON.stringify({ success: true, message: 'Logging disabled for script' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if logging is enabled and meets level requirements
    const shouldLog = checkLogLevel(logSettings, logRequest.log_level);
    
    if (!shouldLog) {
      return new Response(
        JSON.stringify({ success: true, message: 'Log level disabled' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert log entry
    const { error: insertError } = await supabase
      .from('log_entries')
      .insert({
        script_name: logRequest.script_name,
        log_level: logRequest.log_level,
        message: logRequest.message,
        metadata: logRequest.metadata || {},
        user_id: logRequest.user_id,
        session_id: logRequest.session_id,
        request_id: logRequest.request_id,
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to insert log entry:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert log entry' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Log entry created' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Centralized logging error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process log request' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function checkLogLevel(settings: any, requestLevel: string): boolean {
  // Check if general logging is enabled
  if (!settings.logging_enabled) {
    return false;
  }

  // Check specific toggles
  if (requestLevel === 'DEBUG' && !settings.debug_enabled) {
    return false;
  }
  
  if (requestLevel === 'TRACE' && !settings.trace_enabled) {
    return false;
  }

  // Check log level hierarchy
  const levelHierarchy = ['OFF', 'ERROR', 'INFO', 'DEBUG', 'TRACE'];
  const settingsLevelIndex = levelHierarchy.indexOf(settings.log_level);
  const requestLevelIndex = levelHierarchy.indexOf(requestLevel);
  
  // If settings is OFF, don't log anything
  if (settingsLevelIndex === 0) {
    return false;
  }
  
  // Only log if request level is at or above settings level
  return requestLevelIndex <= settingsLevelIndex && requestLevelIndex > 0;
}