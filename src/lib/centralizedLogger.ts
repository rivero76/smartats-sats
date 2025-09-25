import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE';

interface LogOptions {
  script_name: string;
  user_id?: string;
  session_id?: string;
  request_id?: string;
  metadata?: any;
}

class CentralizedLogger {
  private readonly projectId = 'nkgscksbgmzhizohobhg';
  private readonly baseUrl = `https://${this.projectId}.functions.supabase.co/functions/v1/centralized-logging`;

  async log(level: LogLevel, message: string, options: LogOptions): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZ3Nja3NiZ216aGl6b2hvYmhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Nzk4NDcsImV4cCI6MjA3MzA1NTg0N30.KQl_psbpASttYH5FbqwUe1_xSF60_PPUPhidmF_pQD0'}`,
        },
        body: JSON.stringify({
          script_name: options.script_name,
          log_level: level,
          message,
          metadata: options.metadata,
          user_id: options.user_id,
          session_id: options.session_id,
          request_id: options.request_id,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send log to centralized logging service:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending log to centralized logging service:', error);
    }
  }

  error(message: string, options: LogOptions): Promise<void> {
    return this.log('ERROR', message, options);
  }

  info(message: string, options: LogOptions): Promise<void> {
    return this.log('INFO', message, options);
  }

  debug(message: string, options: LogOptions): Promise<void> {
    return this.log('DEBUG', message, options);
  }

  trace(message: string, options: LogOptions): Promise<void> {
    return this.log('TRACE', message, options);
  }
}

export const centralizedLogger = new CentralizedLogger();

// Helper function to create a logger instance for a specific script
export function createScriptLogger(scriptName: string, options?: { userId?: string; sessionId?: string }) {
  return {
    error: (message: string, metadata?: any) => 
      centralizedLogger.error(message, { 
        script_name: scriptName, 
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata 
      }),
    
    info: (message: string, metadata?: any) => 
      centralizedLogger.info(message, { 
        script_name: scriptName, 
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata 
      }),
    
    debug: (message: string, metadata?: any) => 
      centralizedLogger.debug(message, { 
        script_name: scriptName, 
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata 
      }),
    
    trace: (message: string, metadata?: any) => 
      centralizedLogger.trace(message, { 
        script_name: scriptName, 
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata 
      }),
      
    warn: (message: string, metadata?: any) => 
      centralizedLogger.info(message, { 
        script_name: scriptName, 
        user_id: options?.userId,
        session_id: options?.sessionId,
        metadata 
      }),
  };
}