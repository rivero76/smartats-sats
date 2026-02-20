import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface LogSetting {
  id: string
  script_name: string
  description: string | null
  logging_enabled: boolean
  debug_enabled: boolean
  trace_enabled: boolean
  log_level: 'OFF' | 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE'
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface LogEntry {
  id: string
  script_name: string
  log_level: string
  message: string
  metadata: any
  user_id: string | null
  session_id: string | null
  request_id: string | null
  timestamp: string
  created_at: string
}

export const useLogSettings = () => {
  return useQuery({
    queryKey: ['log-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('log_settings').select('*').order('script_name')

      if (error) throw error
      return data as LogSetting[]
    },
  })
}

export const useUpdateLogSetting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LogSetting> }) => {
      const { error } = await supabase.from('log_settings').update(updates).eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-settings'] })
      toast.success('Log settings updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update log settings: ' + error.message)
    },
  })
}

export const useLogEntries = (filters?: {
  script?: string
  level?: string
  search?: string
  limit?: number
}) => {
  return useQuery({
    queryKey: ['log-entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('log_entries')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(filters?.limit || 100)

      if (filters?.script && filters.script !== 'all') {
        query = query.eq('script_name', filters.script)
      }

      if (filters?.level && filters.level !== 'all') {
        query = query.eq('log_level', filters.level)
      }

      if (filters?.search) {
        query = query.ilike('message', `%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as LogEntry[]
    },
  })
}

export const useDeleteLogs = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ script, days }: { script: string; days: number }) => {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase.from('log_entries').delete().lt('created_at', cutoffDate)

      if (script !== 'all') {
        query = query.eq('script_name', script)
      }

      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] })
      queryClient.invalidateQueries({ queryKey: ['log-stats'] })
      toast.success('Logs deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete logs: ' + error.message)
    },
  })
}

export const useDeleteAllLogs = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('log_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] })
      queryClient.invalidateQueries({ queryKey: ['log-stats'] })
      toast.success('All logs deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete all logs: ' + error.message)
    },
  })
}
