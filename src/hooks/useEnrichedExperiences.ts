import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { createScriptLogger } from '@/lib/centralizedLogger'

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
  approved_at?: string | null
  created_at: string
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
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as EnrichedExperience[]) || []
    },
  })
}

export const useGenerateEnrichmentSuggestions = () => {
  const { toast } = useToast()
  const logger = createScriptLogger('enrich-experiences-client')

  return useMutation({
    mutationFn: async (payload: GeneratePayload): Promise<EnrichmentSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke('enrich-experiences', {
        body: payload,
      })

      if (error) {
        console.error('Enrichment function error:', error)
        logger.error('Edge function invocation failed', { error, payload })
        throw new Error(error.message || 'Failed to generate suggestions')
      }

      if (!data?.success) {
        logger.error('Enrichment function returned failure', { payload, data })
        throw new Error(data?.error || 'Enrichment failed')
      }

      logger.info('Enrichment suggestions received', { count: data.suggestions?.length || 0 })
      return data.suggestions as EnrichmentSuggestion[]
    },
    onError: (error: any) => {
      logger.error('Unable to generate enrichment suggestions', { message: error.message })
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

  return useMutation({
    mutationFn: async (payload: SavePayload) => {
      if (!user) throw new Error('Not authenticated')

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

      if (error) throw error
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
