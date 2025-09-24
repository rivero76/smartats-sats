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
      
      // Create the analysis record first
      const { data: analysis, error } = await supabase
        .from('sats_analyses')
        .insert({
          user_id: user.id,
          resume_id: data.resume_id,
          jd_id: data.jd_id,
          status: 'initial',
          matched_skills: [],
          missing_skills: [],
          analysis_data: {}
        })
        .select()
        .single()
      
      if (error) throw error

      // Call the edge function for direct OpenAI processing
      const response = await supabase.functions.invoke('ats-analysis-direct', {
        body: {
          analysis_id: analysis.id,
          resume_id: data.resume_id,
          jd_id: data.jd_id
        }
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        throw new Error(response.error.message || 'Analysis failed')
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Analysis processing failed')
      }

      return {
        ...analysis,
        processing_result: response.data
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ats-analyses'] })
      toast({
        title: 'Analysis Complete',
        description: `Analysis completed with ${result.processing_result.ats_score}% match score.`,
      })
    },
    onError: (error: any) => {
      console.error('Error creating direct ATS analysis:', error)
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to process ATS analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}