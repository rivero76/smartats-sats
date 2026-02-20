import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  JobDescriptionSession,
  logJobDescriptionCreation,
  logCompanyLocationOperation,
} from '@/lib/jobDescriptionLogger'

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
        .select(
          `
          *,
          company:sats_companies(*),
          location:sats_locations(*)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase.from('sats_companies').select('*').order('name')

      if (error) throw error
      return data || []
    },
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
    },
  })
}

export const useCreateJobDescription = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateJobDescriptionData): Promise<JobDescription> => {
      const session = new JobDescriptionSession()

      try {
        if (!user) throw new Error('Not authenticated')

        session.startProcess('job-description-creation', {
          inputData: {
            hasName: !!data.name,
            hasCompany: !!data.company_id,
            hasLocation: !!data.location_id,
            inputMethod: data.pasted_text ? 'text' : data.file_url ? 'file' : 'unknown',
          },
        })

        logJobDescriptionCreation(data, session.getSessionId())

        const { data: jobDescription, error } = await supabase
          .from('sats_job_descriptions')
          .insert({
            ...data,
            user_id: user.id,
          })
          .select(
            `
            *,
            company:sats_companies(*),
            location:sats_locations(*)
          `
          )
          .single()

        if (error) throw error

        session.completeProcess('job-description-creation', {
          resultId: jobDescription.id,
          finalData: jobDescription,
        })

        return jobDescription
      } catch (error) {
        session.errorProcess('job-description-creation', error as Error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      toast({
        title: 'Job description created',
        description: 'Your job description has been saved successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create job description',
        description: error.message,
      })
    },
  })
}

export const useUpdateJobDescription = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: UpdateJobDescriptionData & { id: string }): Promise<JobDescription> => {
      const { data: jobDescription, error } = await supabase
        .from('sats_job_descriptions')
        .update(data)
        .eq('id', id)
        .select(
          `
          *,
          company:sats_companies(*),
          location:sats_locations(*)
        `
        )
        .single()

      if (error) throw error
      return jobDescription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      toast({
        title: 'Job description updated',
        description: 'Your job description has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update job description',
        description: error.message,
      })
    },
  })
}

export const useDeleteJobDescription = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('sats_job_descriptions').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      toast({
        title: 'Job description deleted',
        description: 'Your job description has been deleted successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete job description',
        description: error.message,
      })
    },
  })
}

export const useCreateCompany = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      industry?: string
      website?: string
    }): Promise<Company> => {
      const session = new JobDescriptionSession()

      try {
        session.startProcess('company-creation', { companyName: data.name })

        // Check if company exists first
        const { data: existingCompany } = await supabase
          .from('sats_companies')
          .select('*')
          .ilike('name', `%${data.name}%`)
          .limit(1)

        if (existingCompany && existingCompany.length > 0) {
          logCompanyLocationOperation(
            'lookup',
            'company',
            data,
            existingCompany[0],
            session.getSessionId()
          )
          session.info('Company already exists, returning existing', {
            existingCompany: existingCompany[0],
          })
          return existingCompany[0]
        }

        const { data: company, error } = await supabase
          .from('sats_companies')
          .insert(data)
          .select()
          .single()

        if (error) throw error

        logCompanyLocationOperation('create', 'company', data, company, session.getSessionId())
        session.completeProcess('company-creation', { resultId: company.id })

        return company
      } catch (error) {
        session.errorProcess('company-creation', error as Error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast({
        title: 'Company created',
        description: 'New company has been added successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create company',
        description: error.message,
      })
    },
  })
}

export const useCreateLocation = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      city?: string
      state?: string
      country?: string
    }): Promise<Location> => {
      const session = new JobDescriptionSession()

      try {
        session.startProcess('location-creation', { locationData: data })

        // Check if similar location exists
        const { data: existingLocation } = await supabase
          .from('sats_locations')
          .select('*')
          .or(
            `city.ilike.%${data.city || ''}%,state.ilike.%${data.state || ''}%,country.ilike.%${data.country || ''}%`
          )
          .limit(1)

        if (existingLocation && existingLocation.length > 0) {
          logCompanyLocationOperation(
            'lookup',
            'location',
            data,
            existingLocation[0],
            session.getSessionId()
          )
          session.info('Location already exists, returning existing', {
            existingLocation: existingLocation[0],
          })
          return existingLocation[0]
        }

        const { data: location, error } = await supabase
          .from('sats_locations')
          .insert(data)
          .select()
          .single()

        if (error) throw error

        logCompanyLocationOperation('create', 'location', data, location, session.getSessionId())
        session.completeProcess('location-creation', { resultId: location.id })

        return location
      } catch (error) {
        session.errorProcess('location-creation', error as Error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast({
        title: 'Location created',
        description: 'New location has been added successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create location',
        description: error.message,
      })
    },
  })
}
