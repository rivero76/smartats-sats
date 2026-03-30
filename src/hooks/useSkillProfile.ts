/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S3 — TanStack Query hook for sats_skill_profiles CRUD.
 *   Provides useSkillProfile (query), useSaveSkillProfiles (upsert mutation),
 *   and useDeleteSkillProfile (delete mutation).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillProfile {
  id: string
  user_id: string
  skill_name: string
  category: 'technical' | 'soft' | 'leadership' | 'domain' | 'certification' | 'methodology'
  depth: 'awareness' | 'practitioner' | 'expert' | 'trainer'
  ai_last_used_year: number | null
  user_confirmed_last_used_year: number | null
  transferable_to: string[]
  career_chapter: string | null
  user_context: string | null
  source_experience_ids: string[]
  ai_classification_version: string | null
  created_at: string
  updated_at: string
}

export interface SkillOverride {
  skill_name: string
  /** 'active' → user confirmed they still use this skill */
  override_type: 'active' | 'foundation' | 'context'
  user_confirmed_last_used_year?: number
  user_context?: string
}

export interface SaveSkillProfileInput {
  skill_name: string
  category: SkillProfile['category']
  depth: SkillProfile['depth']
  ai_last_used_year: number
  transferable_to: string[]
  career_chapter: string | null
  ai_classification_version: string
  source_experience_ids?: string[]
  // Merged from override
  user_confirmed_last_used_year?: number | null
  user_context?: string | null
}

// ---------------------------------------------------------------------------
// Query — load all skill profiles for the current user
// ---------------------------------------------------------------------------

export const useSkillProfile = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['skill-profiles', user?.id],
    queryFn: async (): Promise<SkillProfile[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sats_skill_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('career_chapter', { ascending: true })
        .order('skill_name', { ascending: true })

      if (error) throw error
      return (data || []) as SkillProfile[]
    },
    enabled: !!user,
  })
}

// ---------------------------------------------------------------------------
// Mutation — upsert skill profiles (called after transparency report confirm)
// ---------------------------------------------------------------------------

export const useSaveSkillProfiles = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: SaveSkillProfileInput[]): Promise<void> => {
      if (!user) throw new Error('Not authenticated')

      const rows = inputs.map((s) => ({
        user_id: user.id,
        skill_name: s.skill_name.toLowerCase().trim(),
        category: s.category,
        depth: s.depth,
        ai_last_used_year: s.ai_last_used_year,
        user_confirmed_last_used_year: s.user_confirmed_last_used_year ?? null,
        transferable_to: s.transferable_to,
        career_chapter: s.career_chapter,
        user_context: s.user_context ?? null,
        source_experience_ids: s.source_experience_ids ?? [],
        ai_classification_version: s.ai_classification_version,
      }))

      const { error } = await supabase
        .from('sats_skill_profiles')
        .upsert(rows, { onConflict: 'user_id,skill_name' })

      if (error) throw error
    },
    onSuccess: (_, inputs) => {
      queryClient.invalidateQueries({ queryKey: ['skill-profiles', user?.id] })
      toast({
        title: 'Skill profile saved',
        description: `${inputs.length} skill${inputs.length !== 1 ? 's' : ''} recorded successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save skill profile',
        description: error.message,
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation — delete a single skill profile row
// ---------------------------------------------------------------------------

export const useDeleteSkillProfile = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (skillName: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('sats_skill_profiles')
        .delete()
        .eq('user_id', user.id)
        .eq('skill_name', skillName.toLowerCase().trim())

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-profiles', user?.id] })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Could not remove skill',
        description: error.message,
      })
    },
  })
}
