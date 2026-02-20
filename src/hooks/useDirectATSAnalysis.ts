/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed direct ATS analysis trigger updates and added timestamped file header tracking.
 * 2026-02-20 23:29:40 | P2: Added request_id propagation and duration tracking for ATS analysis trigger.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { createScriptLogger } from '@/lib/centralizedLogger'
import { createRequestId, getDurationMs } from '@/lib/requestContext'

export interface CreateATSAnalysisData {
  resume_id: string
  jd_id: string
}

export const useDirectATSAnalysis = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const logger = createScriptLogger('ats-analysis-client')

  return useMutation({
    mutationFn: async (data: CreateATSAnalysisData) => {
      if (!user) throw new Error('User not authenticated')
      const requestId = createRequestId('ats-trigger')
      const startedAt = Date.now()

      // Create the analysis record with queued status
      const { data: analysis, error } = await supabase
        .from('sats_analyses')
        .insert({
          user_id: user.id,
          resume_id: data.resume_id,
          jd_id: data.jd_id,
          status: 'queued',
          matched_skills: [],
          missing_skills: [],
          analysis_data: {
            request_id: requestId,
            queued_at: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to create ATS analysis row', {
          event_name: 'ats_analysis.create_failed',
          component: 'useDirectATSAnalysis',
          operation: 'create_analysis',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: error.message },
        })
        throw error
      }

      // Invoke edge function — returns 202 immediately; processing continues in background.
      // UI updates are driven by the real-time subscription in useATSAnalyses.
      const response = await supabase.functions.invoke('ats-analysis-direct', {
        body: {
          analysis_id: analysis.id,
          resume_id: data.resume_id,
          jd_id: data.jd_id,
          request_id: requestId,
        },
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        logger.error('Failed to queue ATS analysis in edge function', {
          event_name: 'ats_analysis.queue_failed',
          component: 'useDirectATSAnalysis',
          operation: 'invoke_edge_function',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: response.error.message, analysis_id: analysis.id },
        })
        throw new Error(response.error.message || 'Failed to queue analysis')
      }

      logger.info('ATS analysis queued successfully', {
        event_name: 'ats_analysis.queued',
        component: 'useDirectATSAnalysis',
        operation: 'queue_analysis',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
        details: {
          analysis_id: analysis.id,
          resume_id: data.resume_id,
          jd_id: data.jd_id,
        },
      })

      return analysis
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-analyses'] })
      toast({
        title: 'Analysis Queued',
        description: 'Your analysis is being processed. Results will appear on this page shortly.',
      })
    },
    onError: (error: any) => {
      console.error('Error queuing ATS analysis:', error)
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to queue ATS analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}
