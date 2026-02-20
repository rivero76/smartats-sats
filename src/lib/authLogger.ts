import { createScriptLogger } from './centralizedLogger'
import { supabase } from '@/integrations/supabase/client'

type AuthMetadata = Record<string, unknown>

function toRecord(value: unknown): AuthMetadata {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as AuthMetadata)
    : {}
}

function getErrorDetails(error: unknown): { message?: string; code?: string; details: unknown } {
  if (error instanceof Error) {
    const withCode = error as Error & { code?: unknown }
    return {
      message: error.message,
      code: typeof withCode.code === 'string' ? withCode.code : undefined,
      details: {
        name: error.name,
        stack: error.stack,
      },
    }
  }

  const asRecord = toRecord(error)
  return {
    message: typeof asRecord.message === 'string' ? asRecord.message : String(error),
    code: typeof asRecord.code === 'string' ? asRecord.code : undefined,
    details: error,
  }
}

// Create specialized loggers for different authentication aspects
export const authFrontendLogger = createScriptLogger('authentication-frontend')
export const authSessionLogger = createScriptLogger('authentication-session')
export const authUILogger = createScriptLogger('authentication-ui')

// Enhanced logging helper for authentication events
export const logAuthEvent = async (
  category: 'frontend' | 'session' | 'ui',
  level: 'error' | 'info' | 'debug' | 'trace',
  event: string,
  details: {
    action?: string
    email?: string
    userId?: string
    sessionId?: string
    errorMessage?: string
    errorCode?: string
    tokenInfo?: unknown
    metadata?: AuthMetadata
  }
) => {
  const logger =
    category === 'frontend'
      ? authFrontendLogger
      : category === 'session'
        ? authSessionLogger
        : authUILogger

  // Get current session for context
  let currentUser: string | undefined
  let currentSession: string | undefined

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    currentUser = session?.user?.id || details.userId
    currentSession = session?.access_token?.substring(0, 20) + '...' || details.sessionId
  } catch (e) {
    // Don't let logging errors break auth flow
  }

  const logData: AuthMetadata = {
    event,
    action: details.action,
    user_id: currentUser,
    session_id: currentSession,
    email: details.email,
    error_message: details.errorMessage,
    error_code: details.errorCode,
    token_info: details.tokenInfo,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    url: window.location.href,
    ...toRecord(details.metadata),
  }

  const message = `${event}: ${details.action || 'N/A'}${details.errorMessage ? ` - ${details.errorMessage}` : ''}`

  switch (level) {
    case 'error':
      await logger.error(message, logData)
      break
    case 'info':
      await logger.info(message, logData)
      break
    case 'debug':
      await logger.debug(message, logData)
      break
    case 'trace':
      await logger.trace(message, logData)
      break
  }
}

// Specific auth event loggers
export const authEvents = {
  signUpAttempt: (email: string, metadata?: AuthMetadata) =>
    logAuthEvent('frontend', 'info', 'SIGNUP_ATTEMPT', {
      action: 'signup_initiated',
      email,
      metadata,
    }),

  signUpSuccess: (userId: string, email: string, isReactivation?: boolean) =>
    logAuthEvent('frontend', 'info', 'SIGNUP_SUCCESS', {
      action: 'signup_completed',
      userId,
      email,
      metadata: { is_reactivation: isReactivation },
    }),

  signUpError: (email: string, error: unknown) => {
    const parsedError = getErrorDetails(error)
    return logAuthEvent('frontend', 'error', 'SIGNUP_ERROR', {
      action: 'signup_failed',
      email,
      errorMessage: parsedError.message,
      errorCode: parsedError.code,
      metadata: { error_details: parsedError.details },
    })
  },

  signInAttempt: (email: string) =>
    logAuthEvent('frontend', 'info', 'SIGNIN_ATTEMPT', { action: 'signin_initiated', email }),

  signInSuccess: (userId: string, email: string) =>
    logAuthEvent('frontend', 'info', 'SIGNIN_SUCCESS', {
      action: 'signin_completed',
      userId,
      email,
    }),

  signInError: (email: string, error: unknown) => {
    const parsedError = getErrorDetails(error)
    return logAuthEvent('frontend', 'error', 'SIGNIN_ERROR', {
      action: 'signin_failed',
      email,
      errorMessage: parsedError.message,
      errorCode: parsedError.code,
      metadata: { error_details: parsedError.details },
    })
  },

  signOutAttempt: (userId?: string) =>
    logAuthEvent('frontend', 'info', 'SIGNOUT_ATTEMPT', { action: 'signout_initiated', userId }),

  signOutSuccess: (userId?: string) =>
    logAuthEvent('frontend', 'info', 'SIGNOUT_SUCCESS', { action: 'signout_completed', userId }),

  signOutError: (userId: string | undefined, error: unknown) => {
    const parsedError = getErrorDetails(error)
    return logAuthEvent('frontend', 'error', 'SIGNOUT_ERROR', {
      action: 'signout_failed',
      userId,
      errorMessage: parsedError.message,
      metadata: { error_details: parsedError.details },
    })
  },

  passwordResetAttempt: (email: string) =>
    logAuthEvent('frontend', 'info', 'PASSWORD_RESET_ATTEMPT', {
      action: 'password_reset_initiated',
      email,
    }),

  passwordResetSuccess: (email: string) =>
    logAuthEvent('frontend', 'info', 'PASSWORD_RESET_SUCCESS', {
      action: 'password_reset_sent',
      email,
    }),

  passwordResetError: (email: string, error: unknown) => {
    const parsedError = getErrorDetails(error)
    return logAuthEvent('frontend', 'error', 'PASSWORD_RESET_ERROR', {
      action: 'password_reset_failed',
      email,
      errorMessage: parsedError.message,
      metadata: { error_details: parsedError.details },
    })
  },

  resendConfirmationAttempt: (email: string) =>
    logAuthEvent('frontend', 'info', 'RESEND_CONFIRMATION_ATTEMPT', {
      action: 'confirmation_resend_initiated',
      email,
    }),

  resendConfirmationSuccess: (email: string) =>
    logAuthEvent('frontend', 'info', 'RESEND_CONFIRMATION_SUCCESS', {
      action: 'confirmation_resent',
      email,
    }),

  resendConfirmationError: (email: string, error: unknown) => {
    const parsedError = getErrorDetails(error)
    return logAuthEvent('frontend', 'error', 'RESEND_CONFIRMATION_ERROR', {
      action: 'confirmation_resend_failed',
      email,
      errorMessage: parsedError.message,
      metadata: { error_details: parsedError.details },
    })
  },

  sessionStateChange: (event: string, userId?: string, sessionData?: unknown) =>
    logAuthEvent('session', 'debug', 'SESSION_STATE_CHANGE', {
      action: `session_${event.toLowerCase()}`,
      userId,
      metadata: { auth_event: event, session_data: sessionData },
    }),

  tokenRefresh: (userId: string, success: boolean, error?: unknown) => {
    const parsedError = error ? getErrorDetails(error) : undefined
    return logAuthEvent('session', success ? 'debug' : 'error', 'TOKEN_REFRESH', {
      action: success ? 'token_refreshed' : 'token_refresh_failed',
      userId,
      errorMessage: parsedError?.message,
      metadata: { success, error_details: parsedError?.details },
    })
  },

  sessionRecovery: (userId?: string, success?: boolean, error?: unknown) => {
    const parsedError = error ? getErrorDetails(error) : undefined
    return logAuthEvent('session', success ? 'info' : 'error', 'SESSION_RECOVERY', {
      action: success ? 'session_recovered' : 'session_recovery_failed',
      userId,
      errorMessage: parsedError?.message,
      metadata: { success, error_details: parsedError?.details },
    })
  },

  userReactivation: (userId: string, success: boolean, error?: unknown) => {
    const parsedError = error ? getErrorDetails(error) : undefined
    return logAuthEvent('frontend', success ? 'info' : 'error', 'USER_REACTIVATION', {
      action: success ? 'user_reactivated' : 'user_reactivation_failed',
      userId,
      errorMessage: parsedError?.message,
      metadata: { success, error_details: parsedError?.details },
    })
  },

  satsUserFetch: (userId: string, success: boolean, retry: boolean = false, error?: unknown) => {
    const parsedError = error ? getErrorDetails(error) : undefined
    return logAuthEvent('frontend', success ? 'debug' : 'error', 'SATS_USER_FETCH', {
      action: success ? 'sats_user_fetched' : 'sats_user_fetch_failed',
      userId,
      errorMessage: parsedError?.message,
      metadata: { success, is_retry: retry, error_details: parsedError?.details },
    })
  },

  // UI interaction events
  formSubmission: (formType: 'signup' | 'signin', email: string, validationErrors?: string[]) =>
    logAuthEvent('ui', 'info', 'FORM_SUBMISSION', {
      action: `${formType}_form_submitted`,
      email,
      metadata: { form_type: formType, validation_errors: validationErrors },
    }),

  tabSwitch: (fromTab: string, toTab: string) =>
    logAuthEvent('ui', 'debug', 'TAB_SWITCH', {
      action: 'tab_changed',
      metadata: { from_tab: fromTab, to_tab: toTab },
    }),

  toastShown: (type: 'success' | 'error' | 'info', message: string, context: string) =>
    logAuthEvent('ui', 'debug', 'TOAST_SHOWN', {
      action: 'toast_displayed',
      metadata: { toast_type: type, message, context },
    }),
}
