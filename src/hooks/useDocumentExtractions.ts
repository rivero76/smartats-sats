import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export interface DocumentExtraction {
  id: string
  resume_id: string
  extracted_text: string
  word_count: number
  extraction_method: string
  warnings: string[]
  metadata: {
    fileSize?: number
    detectedMimeType?: string
    pages?: number
  }
  created_at: string
  updated_at: string
  user_id?: string // Added to comply with RLS
}

interface CreateExtractionData {
  resume_id: string
  extracted_text: string
  word_count: number
  extraction_method: string
  warnings?: string[]
  metadata?: any
}

// Fetch document extraction for a specific resume
export function useDocumentExtraction(resumeId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-extraction', resumeId],
    queryFn: async () => {
      if (!resumeId) return null

      const { data, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('resume_id', resumeId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "not found"
        throw error
      }

      return data as DocumentExtraction | null
    },
    enabled: !!user && !!resumeId,
  })
}

// Create document extraction (insert or upsert)
export function useCreateDocumentExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateExtractionData) => {
      // Retrieve current authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error('User not authenticated. Please sign in again.')
      }

      // Merge user_id into payload (required for RLS)
      const payload = {
        ...data,
        user_id: userData.user.id,
      }

      console.info('[DEBUG] Inserting document extraction payload:', payload)

      const { data: result, error } = await supabase
        .from('document_extractions')
        .upsert([payload], {
          onConflict: 'resume_id',
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) {
        console.error('[ERROR] Supabase upsert failed:', error.message)
        throw error
      }

      console.info('[INFO] Document extraction inserted successfully:', result)
      return result as DocumentExtraction
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['document-extraction', result.resume_id],
      })
      queryClient.invalidateQueries({ queryKey: ['document-extractions'] })
      toast({
        title: 'Success',
        description: 'Document text extracted successfully',
      })
    },

    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to save extraction: ${error.message}`,
        variant: 'destructive',
      })
      console.error('[ERROR] Extraction mutation failed:', error)
    },
  })
}

// Update document extraction
export function useUpdateDocumentExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocumentExtraction> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('document_extractions')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as DocumentExtraction
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['document-extraction', result.resume_id],
      })
      queryClient.invalidateQueries({ queryKey: ['document-extractions'] })
      toast({
        title: 'Success',
        description: 'Extraction updated successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update extraction: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Delete document extraction
export function useDeleteDocumentExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_extractions').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-extraction'] })
      queryClient.invalidateQueries({ queryKey: ['document-extractions'] })
      toast({
        title: 'Success',
        description: 'Extraction deleted successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete extraction: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
