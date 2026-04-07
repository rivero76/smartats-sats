/**
 * UPDATE LOG
 * 2026-04-02 01:00:00 | P20 S4 — useCareerDataReset hook. Calls the reset-profile-data
 *   edge function and invalidates all user-scoped TanStack Query caches on success.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ResetResult {
  success: boolean
  message: string
  rows_deleted: Record<string, number>
}

export function useCareerDataReset() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<ResetResult, Error>({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const fnUrl = `${supabaseUrl}/functions/v1/reset-profile-data`

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Reset failed')
      }
      return json as ResetResult
    },
    onSuccess: () => {
      // Invalidate all user-scoped caches so the UI reflects empty state
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
      queryClient.invalidateQueries({ queryKey: ['enriched-experiences'] })
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] })
      queryClient.invalidateQueries({ queryKey: ['skill-profile'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
