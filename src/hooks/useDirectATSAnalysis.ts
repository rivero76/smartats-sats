/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed direct ATS analysis trigger updates and added timestamped file header tracking.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

export interface CreateATSAnalysisData {
  resume_id: string
  jd_id: string
}

export const useDirectATSAnalysis = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateATSAnalysisData) => {
      if (!user) throw new Error('User not authenticated')

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
          analysis_data: {},
        })
        .select()
        .single()

      if (error) throw error

      // Invoke edge function — returns 202 immediately; processing continues in background.
      // UI updates are driven by the real-time subscription in useATSAnalyses.
      const response = await supabase.functions.invoke('ats-analysis-direct', {
        body: {
          analysis_id: analysis.id,
          resume_id: data.resume_id,
          jd_id: data.jd_id,
        },
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        throw new Error(response.error.message || 'Failed to queue analysis')
      }

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
