// UPDATE LOG
// 2026-03-17 12:00:00 | P16 Story 1: hook for sats_resume_personas CRUD

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface ResumePersona {
  id: string
  user_id: string
  linked_resume_id: string | null
  persona_name: string
  target_role_family: string
  custom_summary: string | null
  skill_weights: Record<string, unknown>
  keyword_highlights: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreatePersonaData {
  persona_name: string
  target_role_family: string
  custom_summary?: string | null
  linked_resume_id?: string | null
  skill_weights?: Record<string, unknown>
  keyword_highlights?: string[]
}

export interface UpdatePersonaData {
  persona_name?: string
  target_role_family?: string
  custom_summary?: string | null
  skill_weights?: Record<string, unknown>
  keyword_highlights?: string[]
}

export const useResumePersonas = () => {
  return useQuery({
    queryKey: ['resume-personas'],
    queryFn: async (): Promise<ResumePersona[]> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sats_resume_personas')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as ResumePersona[]) || []
    },
  })
}

export const useCreatePersona = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePersonaData): Promise<ResumePersona> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sats_resume_personas')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data as ResumePersona
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-personas'] })
      toast({ title: 'Profile created', description: 'Your resume profile has been created.' })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create profile',
        description: error.message,
      })
    },
  })
}

export const useUpdatePersona = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdatePersonaData & { id: string }): Promise<ResumePersona> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sats_resume_personas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as ResumePersona
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-personas'] })
      toast({ title: 'Profile updated', description: 'Your resume profile has been updated.' })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update profile',
        description: error.message,
      })
    },
  })
}

export const useDeletePersona = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('sats_resume_personas')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-personas'] })
      toast({ title: 'Profile deleted', description: 'Your resume profile has been removed.' })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete profile',
        description: error.message,
      })
    },
  })
}
