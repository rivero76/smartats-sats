import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

export const useRetryATSAnalysis = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (analysisId: string) => {
      if (!user) throw new Error('User not authenticated')
      
      // First, get the existing analysis to get resume_id and jd_id
      const { data: existingAnalysis, error: fetchError } = await supabase
        .from('sats_analyses')
        .select('id, resume_id, jd_id, user_id')
        .eq('id', analysisId)
        .single()
      
      if (fetchError) throw new Error('Failed to fetch analysis details')
      if (existingAnalysis.user_id !== user.id) throw new Error('Cannot retry analysis of another user')

      // Reset the analysis status to initial
      const { error: updateError } = await supabase
        .from('sats_analyses')
        .update({
          status: 'initial',
          ats_score: null,
          matched_skills: [],
          missing_skills: [],
          suggestions: null,
          analysis_data: { retry_requested_at: new Date().toISOString() }
        })
        .eq('id', analysisId)

      if (updateError) throw updateError

      // Call the edge function for direct OpenAI processing
      const response = await supabase.functions.invoke('ats-analysis-direct', {
        body: {
          analysis_id: analysisId,
          resume_id: existingAnalysis.resume_id,
          jd_id: existingAnalysis.jd_id
        }
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        throw new Error(response.error.message || 'Analysis retry failed')
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Analysis processing failed')
      }

      return {
        analysis_id: analysisId,
        processing_result: response.data
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ats-analyses'] })
      toast({
        title: 'Analysis Retry Complete',
        description: `Analysis completed with ${result.processing_result.ats_score}% match score.`,
      })
    },
    onError: (error: any) => {
      console.error('Error retrying ATS analysis:', error)
      toast({
        title: 'Analysis Retry Failed',
        description: error.message || 'Failed to retry ATS analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}