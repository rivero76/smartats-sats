/**
 * UPDATE LOG
 * 2026-02-25 16:55:00 | P15 Story 3: Added roadmap + milestone data hooks and completion toggle mutation.
 * 2026-04-05 22:30:00 | P26 S5-1 — Add source_gap_snapshot_id to LearningRoadmap type;
 *   add useGenerateRoadmap mutation that accepts gap_snapshot_id as an optional input.
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
  source_gap_snapshot_id: string | null
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

// ─── Generate Roadmap Mutation ────────────────────────────────────────────────

interface GenerateRoadmapPayload {
  missing_skills?: string[]
  target_role?: string
  source_ats_analysis_id?: string | null
  /** P26 S5-1: Drive roadmap from a gap snapshot instead of manual skill list */
  gap_snapshot_id?: string | null
}

interface GenerateRoadmapResponse {
  roadmap_id: string
  milestones_count: number
}

export const useGenerateRoadmap = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: GenerateRoadmapPayload): Promise<GenerateRoadmapResponse> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('No active session')

      const supabaseUrl = (supabase as any).supabaseUrl as string
      const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')

      const response = await fetch(`${functionsUrl}/functions/v1/generate-upskill-roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Roadmap generation failed (${response.status})`)
      }

      return { roadmap_id: data.roadmap_id, milestones_count: data.milestones_count }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-roadmaps'] })
      toast({
        title: 'Roadmap generated',
        description: 'Your personalised upskilling roadmap is ready.',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Roadmap generation failed',
        description: error.message,
      })
    },
  })
}

// ─── Toggle Milestone ─────────────────────────────────────────────────────────

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
