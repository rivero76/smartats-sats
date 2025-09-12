import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export interface Resume {
  id: string
  user_id: string
  name: string
  file_url: string | null
  created_at: string
  updated_at: string
}

export interface CreateResumeData {
  name: string
  file_url: string | null
}

export interface UpdateResumeData {
  name?: string
  file_url?: string | null
}

export const useResumes = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async (): Promise<Resume[]> => {
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('sats_resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })
}

export const useCreateResume = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateResumeData): Promise<Resume> => {
      if (!user) throw new Error('Not authenticated')
      
      const { data: resume, error } = await supabase
        .from('sats_resumes')
        .insert({
          ...data,
          user_id: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      return resume
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast({
        title: "Resume created",
        description: "Your resume has been saved successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create resume",
        description: error.message
      })
    }
  })
}

export const useUpdateResume = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateResumeData & { id: string }): Promise<Resume> => {
      const { data: resume, error } = await supabase
        .from('sats_resumes')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return resume
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast({
        title: "Resume updated",
        description: "Your resume has been updated successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update resume",
        description: error.message
      })
    }
  })
}

export const useDeleteResume = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('sats_resumes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast({
        title: "Resume deleted",
        description: "Your resume has been deleted successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete resume",
        description: error.message
      })
    }
  })
}