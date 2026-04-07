/**
 * UPDATE LOG
 * 2026-04-05 20:30:00 | P26 S3-2 — TanStack Query hook for career goal profile fields.
 *   Manages target_market_codes and primary_target_role_family_id on the profiles table.
 *   Separated from useProfile to keep the career goals concern independent and avoid
 *   touching the complex reactivation logic in useProfile.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export interface CareerGoals {
  target_market_codes: string[]
  primary_target_role_family_id: string | null
}

export const useCareerGoals = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['career-goals', user?.id],
    queryFn: async (): Promise<CareerGoals> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .select('target_market_codes, primary_target_role_family_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      return {
        target_market_codes: (data as any)?.target_market_codes ?? [],
        primary_target_role_family_id: (data as any)?.primary_target_role_family_id ?? null,
      }
    },
    enabled: !!user,
  })
}

export const useSaveCareerGoals = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goals: CareerGoals): Promise<void> => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          target_market_codes: goals.target_market_codes,
          primary_target_role_family_id: goals.primary_target_role_family_id,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-goals', user?.id] })
      toast({ title: 'Career goals saved' })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save career goals',
        description: error.message,
      })
    },
  })
}
