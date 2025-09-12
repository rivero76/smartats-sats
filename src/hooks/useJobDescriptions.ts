import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export interface Company {
  id: string
  name: string
  industry: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  city: string | null
  state: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface JobDescription {
  id: string
  user_id: string
  name: string
  company_id: string | null
  location_id: string | null
  pasted_text: string | null
  file_url: string | null
  created_at: string
  updated_at: string
  company?: Company
  location?: Location
}

export interface CreateJobDescriptionData {
  name: string
  company_id?: string | null
  location_id?: string | null
  pasted_text?: string | null
  file_url?: string | null
}

export interface UpdateJobDescriptionData {
  name?: string
  company_id?: string | null
  location_id?: string | null
  pasted_text?: string | null
  file_url?: string | null
}

export const useJobDescriptions = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['job-descriptions', user?.id],
    queryFn: async (): Promise<JobDescription[]> => {
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('sats_job_descriptions')
        .select(`
          *,
          company:sats_companies(*),
          location:sats_locations(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })
}

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from('sats_companies')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    }
  })
}

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('sats_locations')
        .select('*')
        .order('country, state, city')
      
      if (error) throw error
      return data || []
    }
  })
}

export const useCreateJobDescription = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateJobDescriptionData): Promise<JobDescription> => {
      if (!user) throw new Error('Not authenticated')
      
      const { data: jobDescription, error } = await supabase
        .from('sats_job_descriptions')
        .insert({
          ...data,
          user_id: user.id
        })
        .select(`
          *,
          company:sats_companies(*),
          location:sats_locations(*)
        `)
        .single()
      
      if (error) throw error
      return jobDescription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      toast({
        title: "Job description created",
        description: "Your job description has been saved successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create job description",
        description: error.message
      })
    }
  })
}

export const useUpdateJobDescription = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateJobDescriptionData & { id: string }): Promise<JobDescription> => {
      const { data: jobDescription, error } = await supabase
        .from('sats_job_descriptions')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          company:sats_companies(*),
          location:sats_locations(*)
        `)
        .single()
      
      if (error) throw error
      return jobDescription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      toast({
        title: "Job description updated",
        description: "Your job description has been updated successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update job description",
        description: error.message
      })
    }
  })
}

export const useDeleteJobDescription = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('sats_job_descriptions')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      toast({
        title: "Job description deleted",
        description: "Your job description has been deleted successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete job description",
        description: error.message
      })
    }
  })
}

export const useCreateCompany = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string; industry?: string; website?: string }): Promise<Company> => {
      const { data: company, error } = await supabase
        .from('sats_companies')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast({
        title: "Company created",
        description: "New company has been added successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create company",
        description: error.message
      })
    }
  })
}

export const useCreateLocation = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { city?: string; state?: string; country?: string }): Promise<Location> => {
      const { data: location, error } = await supabase
        .from('sats_locations')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return location
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({
        title: "Location created",
        description: "New location has been added successfully."
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create location",
        description: error.message
      })
    }
  })
}