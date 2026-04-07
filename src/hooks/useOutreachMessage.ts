/**
 * UPDATE LOG
 * 2026-04-08 00:00:00 | Initial creation — TanStack Query mutation for Knock Knock outreach
 *   message generation via the generate-outreach-message edge function.
 */
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { createScriptLogger } from '@/lib/centralizedLogger'
import { createRequestId, getDurationMs } from '@/lib/requestContext'

export interface OutreachPayload {
  jobTitle: string
  companyName: string
  matchedSkills: string[]
  userSummary?: string
}

interface OutreachClientError extends Error {
  request_id?: string
}

export const useGenerateOutreachMessage = () => {
  const { toast } = useToast()
  const logger = createScriptLogger('outreach-message-client')

  return useMutation({
    mutationFn: async (payload: OutreachPayload): Promise<string> => {
      const requestId = createRequestId('outreach')
      const startedAt = Date.now()

      const { data, error } = await supabase.functions.invoke('generate-outreach-message', {
        body: { ...payload, request_id: requestId },
      })

      if (error) {
        const errorName = typeof error.name === 'string' ? error.name : 'UnknownError'
        const maybeResponse = error.context instanceof Response ? error.context : undefined
        const statusCode = maybeResponse?.status
        let edgeMessage: string | null = null
        if (maybeResponse) {
          try {
            const body = await maybeResponse.clone().json()
            edgeMessage =
              typeof body?.error === 'string' && body.error.trim().length > 0 ? body.error : null
          } catch {
            edgeMessage = null
          }
        }

        logger.error('Outreach edge function invocation failed', {
          event_name: 'outreach.invoke_failed',
          component: 'useGenerateOutreachMessage',
          operation: 'invoke_edge_function',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: error.message, error_name: errorName, status_code: statusCode },
        })

        const wrappedError: OutreachClientError = new Error(
          edgeMessage || error.message || 'Failed to generate outreach message'
        )
        wrappedError.request_id = requestId
        throw wrappedError
      }

      if (!data?.success) {
        logger.error('Outreach function returned failure', {
          event_name: 'outreach.execution_failed',
          component: 'useGenerateOutreachMessage',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { data },
        })
        throw new Error(data?.error || 'Outreach generation failed')
      }

      logger.info('Outreach message received', {
        event_name: 'outreach.message_received',
        component: 'useGenerateOutreachMessage',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
      })

      return data.message as string
    },

    onError: (error: OutreachClientError) => {
      toast({
        variant: 'destructive',
        title: 'Unable to generate outreach message',
        description: error.message || 'Please try again.',
      })
    },
  })
}
