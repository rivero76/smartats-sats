import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { useDirectATSAnalysis } from '@/hooks/useDirectATSAnalysis'

export interface ATSAnalysis {
  id: string
  user_id: string
  resume_id: string
  jd_id: string
  status: 'initial' | 'processing' | 'complete' | 'error'
  ats_score?: number
  matched_skills: string[]
  missing_skills: string[]
  suggestions?: string
  analysis_data: Record<string, any>
  enriched_by_user: boolean
  created_at: string
  updated_at: string
  // Joined data
  resume?: {
    id: string
    name: string
  }
  job_description?: {
    id: string
    name: string
    company_id?: string
    company?: {
      name: string
    }
  }
}

export interface CreateATSAnalysisData {
  resume_id: string
  jd_id: string
}

export interface ATSAnalysisStats {
  totalAnalyses: number
  averageScore: number
  highMatches: number
  needImprovement: number
}

// Fetch all ATS analyses for the current user
export const useATSAnalyses = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['ats-analyses'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      
      const { data, error } = await supabase
        .from('sats_analyses')
        .select(`
          *,
          resume:sats_resumes!sats_analyses_resume_id_fkey (
            id,
            name
          ),
          job_description:sats_job_descriptions!sats_analyses_jd_id_fkey (
            id,
            name,
            company_id,
            company:sats_companies!sats_job_descriptions_company_id_fkey (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as ATSAnalysis[]
    },
    enabled: !!user,
  })
}

// Calculate statistics for ATS analyses
export const useATSAnalysisStats = () => {
  const { data: analyses } = useATSAnalyses()
  
  return useQuery({
    queryKey: ['ats-analysis-stats', analyses?.length],
    queryFn: async (): Promise<ATSAnalysisStats> => {
      if (!analyses || analyses.length === 0) {
        return {
          totalAnalyses: 0,
          averageScore: 0,
          highMatches: 0,
          needImprovement: 0
        }
      }
      
      const completedAnalyses = analyses.filter(a => a.status === 'complete' && a.ats_score !== null)
      const totalAnalyses = analyses.length
      
      let averageScore = 0
      let highMatches = 0
      let needImprovement = 0
      
      if (completedAnalyses.length > 0) {
        const totalScore = completedAnalyses.reduce((sum, analysis) => sum + (analysis.ats_score || 0), 0)
        averageScore = Math.round(totalScore / completedAnalyses.length)
        
        highMatches = completedAnalyses.filter(a => (a.ats_score || 0) > 80).length
        needImprovement = completedAnalyses.filter(a => (a.ats_score || 0) < 60).length
      }
      
      return {
        totalAnalyses,
        averageScore,
        highMatches,
        needImprovement
      }
    },
    enabled: !!analyses,
  })
}

// Create a new ATS analysis using direct OpenAI integration
export const useCreateATSAnalysis = useDirectATSAnalysis

// Delete an ATS analysis
export const useDeleteATSAnalysis = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sats_analyses')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-analyses'] })
      toast({
        title: 'Analysis Deleted',
        description: 'The ATS analysis has been deleted successfully.',
      })
    },
    onError: (error: any) => {
      console.error('Error deleting ATS analysis:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}