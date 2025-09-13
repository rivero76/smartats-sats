import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { useN8NWebhook, type N8NWebhookPayload } from '@/hooks/useN8NWebhook'

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

// Create a new ATS analysis
export const useCreateATSAnalysis = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { sendWebhook } = useN8NWebhook()
  
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

      // Fetch full resume and job description data for webhook
      const [resumeResult, jobResult] = await Promise.all([
        supabase
          .from('sats_resumes')
          .select('*')
          .eq('id', data.resume_id)
          .single(),
        supabase
          .from('sats_job_descriptions')
          .select(`
            *,
            company:sats_companies!sats_job_descriptions_company_id_fkey (*),
            location:sats_locations!sats_job_descriptions_location_id_fkey (*)
          `)
          .eq('id', data.jd_id)
          .single()
      ])

      if (resumeResult.error || jobResult.error) {
        console.error('Error fetching data for webhook:', resumeResult.error || jobResult.error)
      }

      // Prepare webhook payload
      const webhookPayload: N8NWebhookPayload = {
        analysis_id: analysis.id,
        user_id: user.id,
        resume_data: {
          id: resumeResult.data?.id || data.resume_id,
          name: resumeResult.data?.name || 'Unknown Resume',
          file_url: resumeResult.data?.file_url
        },
        job_description_data: {
          id: jobResult.data?.id || data.jd_id,
          name: jobResult.data?.name || 'Unknown Job',
          content: jobResult.data?.pasted_text,
          company: jobResult.data?.company ? {
            id: jobResult.data.company.id,
            name: jobResult.data.company.name
          } : undefined,
          location: jobResult.data?.location ? {
            id: jobResult.data.location.id,
            name: `${jobResult.data.location.city}, ${jobResult.data.location.state}`
          } : undefined
        },
        timestamp: new Date().toISOString(),
        request_id: `req-${analysis.id}-${Date.now()}`
      }

      // Update status to processing and send webhook
      await supabase
        .from('sats_analyses')
        .update({ status: 'processing' })
        .eq('id', analysis.id)

      // Send to N8N webhook - Use try/catch for better error handling
      try {
        console.log('Sending webhook with data:', webhookPayload)
        const webhookResult = await sendWebhook.mutateAsync(webhookPayload)
        console.log('Webhook response received:', webhookResult)
        
        // Update analysis with webhook results
        if (webhookResult.success) {
          const updateData: any = {
            status: 'complete',
            analysis_data: { webhook_response: JSON.parse(JSON.stringify(webhookResult)) }
          }
          
          if (webhookResult.ats_score !== undefined) {
            updateData.ats_score = webhookResult.ats_score
          }
          if (webhookResult.matched_skills) {
            updateData.matched_skills = webhookResult.matched_skills
          }
          if (webhookResult.missing_skills) {
            updateData.missing_skills = webhookResult.missing_skills
          }
          if (webhookResult.suggestions) {
            updateData.suggestions = webhookResult.suggestions
          }
          
          await supabase
            .from('sats_analyses')
            .update(updateData)
            .eq('id', analysis.id)
            
          toast({
            title: 'Analysis Complete',
            description: 'Your ATS analysis has been completed successfully.',
          })
        } else {
          // Update analysis with error status
          await supabase
            .from('sats_analyses')
            .update({
              status: 'error',
              analysis_data: { 
                webhook_error: webhookResult.error || 'Webhook processing failed',
                webhook_response: JSON.parse(JSON.stringify(webhookResult))
              }
            })
            .eq('id', analysis.id)
            
          toast({
            title: 'Analysis Error',
            description: `Analysis failed: ${webhookResult.error || 'Unknown error'}`,
            variant: 'destructive',
          })
        }
      } catch (webhookError) {
        console.error('Webhook request failed:', webhookError)
        
        // Update analysis with webhook error
        await supabase
          .from('sats_analyses')
          .update({
            status: 'error',
            analysis_data: { 
              webhook_error: webhookError instanceof Error ? webhookError.message : 'Webhook request failed',
              webhook_failed: true,
              error_timestamp: new Date().toISOString()
            }
          })
          .eq('id', analysis.id)
        
        toast({
          title: 'Webhook Error',
          description: `Failed to process analysis: ${webhookError instanceof Error ? webhookError.message : 'Unknown error'}`,
          variant: 'destructive',
        })
      }
      
      return analysis
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-analyses'] })
      toast({
        title: 'Analysis Started',
        description: 'Your ATS analysis has been queued for processing.',
      })
    },
    onError: (error: any) => {
      console.error('Error creating ATS analysis:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to start ATS analysis. Please try again.',
        variant: 'destructive',
      })
    },
  })
}

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