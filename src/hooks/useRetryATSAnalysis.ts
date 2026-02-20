/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed ATS retry flow updates and added timestamped file header tracking.
 * 2026-02-20 23:29:40 | P2: Added request_id propagation and duration tracking for ATS retry flow.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { createScriptLogger } from '@/lib/centralizedLogger'
import { createRequestId, getDurationMs } from '@/lib/requestContext'

export const useRetryATSAnalysis = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const logger = createScriptLogger('ats-analysis-client')

  return useMutation({
    mutationFn: async (analysisId: string) => {
      if (!user) throw new Error('User not authenticated')
      const requestId = createRequestId('ats-retry')
      const startedAt = Date.now()

      // First, get the existing analysis to get resume_id and jd_id
      const { data: existingAnalysis, error: fetchError } = await supabase
        .from('sats_analyses')
        .select('id, resume_id, jd_id, user_id')
        .eq('id', analysisId)
        .single()

      if (fetchError) throw new Error('Failed to fetch analysis details')
      if (existingAnalysis.user_id !== user.id)
        throw new Error('Cannot retry analysis of another user')

      // Reset the analysis back to queued state
      const { error: updateError } = await supabase
        .from('sats_analyses')
        .update({
          status: 'queued',
          ats_score: null,
          matched_skills: [],
          missing_skills: [],
          suggestions: null,
          analysis_data: {
            retry_requested_at: new Date().toISOString(),
            request_id: requestId,
          },
        })
        .eq('id', analysisId)

      if (updateError) {
        logger.error('Failed to reset ATS analysis for retry', {
          event_name: 'ats_analysis.retry_reset_failed',
          component: 'useRetryATSAnalysis',
          operation: 'reset_analysis',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: updateError.message, analysis_id: analysisId },
        })
        throw updateError
      }

      // Invoke edge function — returns 202 immediately; processing continues in background.
      const response = await supabase.functions.invoke('ats-analysis-direct', {
        body: {
          analysis_id: analysisId,
          resume_id: existingAnalysis.resume_id,
          jd_id: existingAnalysis.jd_id,
          request_id: requestId,
        },
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        logger.error('Failed to queue ATS retry in edge function', {
          event_name: 'ats_analysis.retry_queue_failed',
          component: 'useRetryATSAnalysis',
          operation: 'invoke_edge_function',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: response.error.message, analysis_id: analysisId },
        })
        throw new Error(response.error.message || 'Failed to queue analysis retry')
      }

      logger.info('ATS retry queued successfully', {
        event_name: 'ats_analysis.retry_queued',
        component: 'useRetryATSAnalysis',
        operation: 'queue_retry',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
        details: { analysis_id: analysisId },
      })

      return { analysis_id: analysisId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-analyses'] })
      toast({
        title: 'Analysis Queued',
        description: 'Retry queued — results will appear shortly.',
      })
    },
    onError: (error: any) => {
      console.error('Error retrying ATS analysis:', error)
      toast({
        title: 'Retry Failed',
        description: error.message || 'Failed to retry ATS analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}
