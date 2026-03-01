/**
 * UPDATE LOG
 * 2026-02-25 16:55:00 | P15 Story 3: Added roadmap + milestone data hooks and completion toggle mutation.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export interface LearningRoadmap {
  id: string
  user_id: string
  target_role: string
  source_ats_analysis_id: string | null
  status: 'active' | 'archived' | 'completed'
  created_at: string
  updated_at: string
}

export interface RoadmapMilestone {
  id: string
  roadmap_id: string
  skill_name: string
  milestone_type: 'course' | 'project' | 'interview_prep'
  description: string
  is_completed: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export const useLearningRoadmaps = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['learning-roadmaps', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LearningRoadmap[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sats_learning_roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as LearningRoadmap[]) || []
    },
  })
}

export const useRoadmapMilestones = (roadmapIds: string[]) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['roadmap-milestones', user?.id, roadmapIds],
    enabled: !!user && roadmapIds.length > 0,
    queryFn: async (): Promise<RoadmapMilestone[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sats_roadmap_milestones')
        .select('*')
        .in('roadmap_id', roadmapIds)
        .order('order_index', { ascending: true })

      if (error) throw error
      return (data as RoadmapMilestone[]) || []
    },
  })
}

interface ToggleMilestonePayload {
  milestoneId: string
  isCompleted: boolean
}

export const useToggleRoadmapMilestone = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ milestoneId, isCompleted }: ToggleMilestonePayload) => {
      const { data, error } = await supabase
        .from('sats_roadmap_milestones')
        .update({ is_completed: isCompleted })
        .eq('id', milestoneId)
        .select()
        .single()

      if (error) throw error
      return data as RoadmapMilestone
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-milestones'] })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Unable to update milestone',
        description: error.message || 'Please try again.',
      })
    },
  })
}
