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
  source_type: 'text' | 'url' | 'file' | null
  source_url: string | null
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
  source_type?: 'text' | 'url' | 'file' | null
  source_url?: string | null
}

export interface UpdateJobDescriptionData {
  name?: string
  company_id?: string | null
  location_id?: string | null
  pasted_text?: string | null
  file_url?: string | null
  source_type?: 'text' | 'url' | 'file' | null
  source_url?: string | null
}

const normalizeField = (value: string | null | undefined): string | null => {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length ? cleaned : null
}

const normalizeCompanyInput = (value: string): string => {
  return normalizeField(value)?.replace(/\s+(inc\.?|llc|corp\.?|ltd\.?|co\.?)$/i, '') || value.trim()
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
            inputMethod: data.source_type || (data.pasted_text ? 'text' : data.file_url ? 'file' : 'unknown'),
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
        const normalizedName = normalizeCompanyInput(data.name)

        session.startProcess('company-creation', { companyName: normalizedName })

        // Check if company exists first
        const { data: existingCompany } = await supabase
          .from('sats_companies')
          .select('*')
          .ilike('name', normalizedName)
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
          .insert({
            ...data,
            name: normalizedName,
          })
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
        const normalized = {
          city: normalizeField(data.city),
          state: normalizeField(data.state),
          country: normalizeField(data.country),
        }

        session.startProcess('location-creation', { locationData: normalized })

        // Strict matching to avoid accidental matches from broad ilike/or queries.
        let locationQuery = supabase.from('sats_locations').select('*').limit(1)
        if (normalized.city) locationQuery = locationQuery.ilike('city', normalized.city)
        if (normalized.state) locationQuery = locationQuery.ilike('state', normalized.state)
        if (normalized.country) locationQuery = locationQuery.ilike('country', normalized.country)

        const { data: existingLocation } = await locationQuery

        if (existingLocation && existingLocation.length > 0) {
          logCompanyLocationOperation(
            'lookup',
            'location',
            normalized,
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
          .insert(normalized)
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

interface UrlIngestionResponse {
  success: boolean
  url: string
  page_title: string | null
  extracted_text: string
  content_length: number
}

const getUrlIngestionErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error || '')
  const lower = message.toLowerCase()

  if (
    lower.includes('failed to send a request to the edge function') ||
    lower.includes('networkerror') ||
    lower.includes('failed to fetch')
  ) {
    return 'Could not reach URL ingestion service. Refresh your session and try again. If it still fails, use Paste Text or Upload File.'
  }

  if (lower.includes('unable to fetch url content (403)') || lower.includes('(404)')) {
    return 'The source page blocked or did not return accessible content. Use Paste Text or Upload File.'
  }

  if (lower.includes('origin not allowed')) {
    return 'This app origin is not allowed for URL ingestion. Contact your admin or use Paste Text.'
  }

  return 'Could not fetch URL content. Try Paste Text or Upload File.'
}

export const useIngestJobDescriptionUrl = () => {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (url: string): Promise<UrlIngestionResponse> => {
      const trimmed = url.trim()
      if (!trimmed) throw new Error('URL is required')

      const { data, error } = await supabase.functions.invoke('job-description-url-ingest', {
        body: { url: trimmed },
      })

      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.error || 'Could not ingest URL content')
      }

      return data as UrlIngestionResponse
    },
    onError: (error: unknown) => {
      toast({
        variant: 'destructive',
        title: 'URL ingestion failed',
        description: getUrlIngestionErrorMessage(error),
      })
    },
  })
}
