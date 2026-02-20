/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added request_id propagation and duration tracking for enrichment generation.
 * 2026-02-21 00:05:00 | Added full enrich-experiences-client coverage for save workflow logging.
 * 2026-02-21 00:15:00 | Hardened invoke failure telemetry with error name/context/status and request_id propagation.
 * 2026-02-21 00:54:21 | P5: Added enriched experience update/delete lifecycle support and active-record filtering.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { createScriptLogger } from '@/lib/centralizedLogger'
import { createRequestId, getDurationMs } from '@/lib/requestContext'

export type SkillType = 'explicit' | 'inferred'
export type UserAction = 'pending' | 'accepted' | 'edited' | 'rejected'

export interface EnrichedExperience {
  id: string
  user_id: string
  analysis_id?: string | null
  resume_id: string
  jd_id?: string | null
  skill_name: string
  skill_type: SkillType
  suggestion: string
  explanation?: string | null
  confidence_score?: number | null
  user_action: UserAction
  source?: Record<string, unknown> | null
  deleted_at?: string | null
  deleted_reason?: string | null
  edited_by_user?: boolean | null
  approved_at?: string | null
  created_at: string
  updated_at?: string
  resume?: {
    id: string
    name: string
  }
  job?: {
    id: string
    name: string
    company?: {
      name: string | null
    }
  }
}

export interface EnrichmentSuggestion {
  skill_name: string
  skill_type: SkillType
  suggestion: string
  explanation?: string
  confidence: number
  derived_context?: string
}

interface GeneratePayload {
  analysis_id?: string
  resume_id: string
  jd_id?: string | null
  matched_skills?: string[]
  missing_skills?: string[]
  master_skills?: string[]
  request_id?: string
}

interface SavePayload {
  analysis_id?: string
  resume_id: string
  jd_id?: string | null
  skill_name: string
  skill_type: SkillType
  suggestion: string
  explanation?: string
  confidence_score?: number | null
  user_action: Exclude<UserAction, 'pending'>
  source?: Record<string, unknown>
}

interface UpdatePayload {
  id: string
  suggestion: string
  user_action?: Extract<UserAction, 'accepted' | 'edited'>
  source?: Record<string, unknown> | null
}

interface DeletePayload {
  id: string
  reason?: string
}

interface EnrichmentClientError extends Error {
  request_id?: string
  original_name?: string
  status_code?: number
}

export const useEnrichedExperiences = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['enriched-experiences', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<EnrichedExperience[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('enriched_experiences')
        .select(
          `
          *,
          resume:sats_resumes(id, name),
          job:sats_job_descriptions(
            id,
            name,
            company:sats_companies(name)
          )
        `
        )
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as EnrichedExperience[]) || []
    },
  })
}

export const useUpdateEnrichedExperience = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const logger = createScriptLogger('enrich-experiences-client')

  return useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      if (!user) throw new Error('Not authenticated')
      const requestId = createRequestId('enrich-update')
      const startedAt = Date.now()

      const { data, error } = await supabase
        .from('enriched_experiences')
        .update({
          suggestion: payload.suggestion.trim(),
          user_action: payload.user_action || 'edited',
          approved_at: new Date().toISOString(),
          edited_by_user: true,
          source: payload.source || null,
        })
        .eq('id', payload.id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update enriched experience', {
          event_name: 'enrichment.update_failed',
          component: 'useUpdateEnrichedExperience',
          operation: 'update_enriched_experience',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: error.message, enriched_experience_id: payload.id },
        })
        throw error
      }

      logger.info('Enriched experience updated', {
        event_name: 'enrichment.updated',
        component: 'useUpdateEnrichedExperience',
        operation: 'update_enriched_experience',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
        details: { enriched_experience_id: payload.id },
      })

      return data as EnrichedExperience
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enriched-experiences'] })
      toast({
        title: 'Experience updated',
        description: 'Your enriched experience has been updated.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to update experience',
        description: error.message || 'Please try again.',
      })
    },
  })
}

export const useDeleteEnrichedExperience = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const logger = createScriptLogger('enrich-experiences-client')

  return useMutation({
    mutationFn: async (payload: DeletePayload) => {
      if (!user) throw new Error('Not authenticated')
      const requestId = createRequestId('enrich-delete')
      const startedAt = Date.now()

      const { data, error } = await supabase
        .from('enriched_experiences')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: payload.reason || 'user_deleted',
        })
        .eq('id', payload.id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .select()
        .single()

      if (error) {
        logger.error('Failed to delete enriched experience', {
          event_name: 'enrichment.delete_failed',
          component: 'useDeleteEnrichedExperience',
          operation: 'delete_enriched_experience',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { error: error.message, enriched_experience_id: payload.id },
        })
        throw error
      }

      logger.info('Enriched experience deleted', {
        event_name: 'enrichment.deleted',
        component: 'useDeleteEnrichedExperience',
        operation: 'delete_enriched_experience',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
        details: {
          enriched_experience_id: payload.id,
          reason: payload.reason || 'user_deleted',
        },
      })

      return data as EnrichedExperience
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enriched-experiences'] })
      toast({
        title: 'Experience deleted',
        description: 'The enriched experience was removed from your list.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to delete experience',
        description: error.message || 'Please try again.',
      })
    },
  })
}

export const useGenerateEnrichmentSuggestions = () => {
  const { toast } = useToast()
  const logger = createScriptLogger('enrich-experiences-client')

  return useMutation({
    mutationFn: async (payload: GeneratePayload): Promise<EnrichmentSuggestion[]> => {
      const requestId = payload.request_id || createRequestId('enrich')
      const startedAt = Date.now()
      const { data, error } = await supabase.functions.invoke('enrich-experiences', {
        body: {
          ...payload,
          request_id: requestId,
        },
      })

      if (error) {
        console.error('Enrichment function error:', error)
        const errorName = typeof error.name === 'string' ? error.name : 'UnknownError'
        const maybeResponse = error.context instanceof Response ? error.context : undefined
        const statusCode = maybeResponse?.status
        logger.error('Edge function invocation failed', {
          event_name: 'enrichment.invoke_failed',
          component: 'useGenerateEnrichmentSuggestions',
          operation: 'invoke_edge_function',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: {
            error: error.message,
            error_name: errorName,
            status_code: statusCode,
            error_context_present: !!error.context,
            payload,
          },
        })

        const wrappedError: EnrichmentClientError = new Error(
          error.message || 'Failed to generate suggestions'
        )
        wrappedError.request_id = requestId
        wrappedError.original_name = errorName
        wrappedError.status_code = statusCode
        throw wrappedError
      }

      if (!data?.success) {
        logger.error('Enrichment function returned failure', {
          event_name: 'enrichment.execution_failed',
          component: 'useGenerateEnrichmentSuggestions',
          operation: 'generate_suggestions',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: { payload, data },
        })
        throw new Error(data?.error || 'Enrichment failed')
      }

      logger.info('Enrichment suggestions received', {
        event_name: 'enrichment.suggestions_received',
        component: 'useGenerateEnrichmentSuggestions',
        operation: 'generate_suggestions',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
        details: { count: data.suggestions?.length || 0 },
      })
      return data.suggestions as EnrichmentSuggestion[]
    },
    onError: (error: EnrichmentClientError) => {
      logger.error('Unable to generate enrichment suggestions', {
        event_name: 'enrichment.invoke_ui_error',
        component: 'useGenerateEnrichmentSuggestions',
        operation: 'show_error_toast',
        outcome: 'failure',
        request_id: error.request_id,
        details: {
          message: error.message,
          error_name: error.original_name,
          status_code: error.status_code,
        },
      })
      toast({
        variant: 'destructive',
        title: 'Unable to generate suggestions',
        description: error.message || 'Please try again in a moment.',
      })
    },
  })
}

export const useSaveEnrichedExperience = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const logger = createScriptLogger('enrich-experiences-client')

  return useMutation({
    mutationFn: async (payload: SavePayload) => {
      if (!user) throw new Error('Not authenticated')
      const requestId = createRequestId('enrich-save')
      const startedAt = Date.now()

      const { data, error } = await supabase
        .from('enriched_experiences')
        .insert({
          user_id: user.id,
          analysis_id: payload.analysis_id || null,
          resume_id: payload.resume_id,
          jd_id: payload.jd_id || null,
          skill_name: payload.skill_name,
          skill_type: payload.skill_type,
          suggestion: payload.suggestion,
          explanation: payload.explanation || null,
          confidence_score: payload.confidence_score ?? null,
          user_action: payload.user_action,
          approved_at:
            payload.user_action === 'accepted' || payload.user_action === 'edited'
              ? new Date().toISOString()
              : null,
          source: payload.source || null,
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to save enriched experience', {
          event_name: 'enrichment.save_failed',
          component: 'useSaveEnrichedExperience',
          operation: 'save_enriched_experience',
          outcome: 'failure',
          request_id: requestId,
          duration_ms: getDurationMs(startedAt),
          details: {
            error: error.message,
            resume_id: payload.resume_id,
            analysis_id: payload.analysis_id,
            user_action: payload.user_action,
          },
        })
        throw error
      }

      logger.info('Enriched experience saved', {
        event_name: 'enrichment.saved',
        component: 'useSaveEnrichedExperience',
        operation: 'save_enriched_experience',
        outcome: 'success',
        request_id: requestId,
        duration_ms: getDurationMs(startedAt),
        details: {
          enriched_experience_id: data.id,
          resume_id: payload.resume_id,
          analysis_id: payload.analysis_id,
          user_action: payload.user_action,
        },
      })
      return data as EnrichedExperience
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enriched-experiences'] })
      toast({
        title: 'Experience saved',
        description: 'Your enrichment decision has been recorded.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to save experience',
        description: error.message || 'Please try again.',
      })
    },
  })
}
