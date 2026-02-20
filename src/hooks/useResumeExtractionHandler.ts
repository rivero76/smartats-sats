// src/hooks/useResumeExtractionHandler.ts
import { useCreateDocumentExtraction } from '@/hooks/useDocumentExtractions'
import { fileUploadLogger } from '@/lib/documentLogger'

/**
 * Handles persistence of extracted resume text to Supabase
 * with full logging and error safety.
 */
export function useResumeExtractionHandler() {
  const createExtraction = useCreateDocumentExtraction()

  /**
   * Save extracted resume text to Supabase table `document_extractions`
   */
  const saveExtractionToSupabase = async (
    resumeId: string,
    extractedContent: {
      text: string
      wordCount: number
      method: string
      warnings: string[]
      metadata?: Record<string, any>
    }
  ) => {
    try {
      if (!extractedContent?.text || extractedContent.wordCount === 0) {
        fileUploadLogger.warn('No extracted text to save', { resumeId })
        return
      }

      fileUploadLogger.info('Saving extracted text to Supabase', {
        resumeId,
        wordCount: extractedContent.wordCount,
      })

      await createExtraction.mutateAsync({
        resume_id: resumeId,
        extracted_text: extractedContent.text,
        word_count: extractedContent.wordCount,
        extraction_method: extractedContent.method,
        warnings: extractedContent.warnings || [],
        metadata: extractedContent.metadata || {},
      })

      fileUploadLogger.info('Extraction saved successfully', { resumeId })
    } catch (error: any) {
      fileUploadLogger.error('Failed to save extracted text', {
        resumeId,
        errorMessage: error.message,
      })
    }
  }

  return { saveExtractionToSupabase }
}
