import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, AlertCircle, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useResumes, Resume } from '@/hooks/useResumes'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useDocumentExtraction, useCreateDocumentExtraction } from '@/hooks/useDocumentExtractions'
import { extractTextFromDocument, isProcessingError } from '@/services/documentProcessor'

interface ParsedContent {
  content: string
  fileName: string
  fileType: string
}

export const ResumePreview = () => {
  const { data: resumes = [] } = useResumes()
  const { toast } = useToast()
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [isExtracting, setIsExtracting] = useState(false)

  const { data: extraction, isLoading: extractionLoading } = useDocumentExtraction(
    selectedResumeId || null
  )
  const createExtraction = useCreateDocumentExtraction()

  const selectedResume = resumes.find((r) => r.id === selectedResumeId)

  const handleExtractText = async () => {
    if (!selectedResumeId) {
      toast({
        variant: 'destructive',
        title: 'No resume selected',
        description: 'Please select a resume to extract text from.',
      })
      return
    }

    const selectedResume = resumes.find((r) => r.id === selectedResumeId)
    if (!selectedResume?.file_url) {
      toast({
        variant: 'destructive',
        title: 'No file found',
        description: 'The selected resume does not have a file attached.',
      })
      return
    }

    setIsExtracting(true)

    try {
      // Extract the file path from the full URL
      const urlParts = selectedResume.file_url.split('/storage/v1/object/public/SATS_resumes/')
      if (urlParts.length !== 2) {
        throw new Error('Invalid file URL format')
      }
      const filePath = urlParts[1]

      // Download the file using authenticated Supabase client
      const { data, error } = await supabase.storage.from('SATS_resumes').download(filePath)

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`)
      }

      // Extract text using document processor
      const extractedContent = await extractTextFromDocument(data, selectedResume.name)

      // Save extraction to database
      await createExtraction.mutateAsync({
        resume_id: selectedResumeId,
        extracted_text: extractedContent.text,
        word_count: extractedContent.wordCount,
        extraction_method: extractedContent.method,
        warnings: extractedContent.warnings,
        metadata: extractedContent.metadata || {},
      })

      toast({
        title: 'Text extraction completed',
        description: `Extracted ${extractedContent.wordCount} words using ${extractedContent.method}.`,
      })
    } catch (error) {
      console.error('Error extracting text:', error)

      if (isProcessingError(error)) {
        toast({
          variant: 'destructive',
          title: 'Text extraction failed',
          description: error.message,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to extract text',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        })
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const getDisplayLines = () => {
    if (!extraction?.extracted_text) return []
    return extraction.extracted_text.split('\n').slice(0, 40)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume Content Preview
        </CardTitle>
        <CardDescription>
          Parse and preview resume content to verify text quality before sending to N8N.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Resume</label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a resume to preview" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleExtractText}
            disabled={!selectedResumeId || isExtracting || extractionLoading}
            className="flex items-center gap-2"
          >
            {isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : extraction ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {isExtracting ? 'Extracting...' : extraction ? 'Re-extract Text' : 'Extract Text'}
          </Button>
        </div>

        {extraction && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                Text extracted using <Badge variant="outline">{extraction.extraction_method}</Badge>
              </span>
              <span className="text-muted-foreground">• {extraction.word_count} words</span>
            </div>

            {extraction.warnings && extraction.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Extraction Warnings:
                  </p>
                  <ul className="mt-1 space-y-1 text-yellow-700 dark:text-yellow-300">
                    {extraction.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <ScrollArea className="h-96 w-full">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {getDisplayLines().map((line, index) => (
                      <div
                        key={index}
                        className="border-l-2 border-transparent hover:border-primary/20 hover:bg-accent/50 px-2 py-0.5"
                      >
                        <span className="text-muted-foreground/60 mr-3 select-none">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {line || ' '}
                      </div>
                    ))}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              Total content: {extraction.extracted_text.length} characters (
              {extraction.extracted_text.split('\n').length} lines)
            </div>
          </div>
        )}

        {selectedResumeId && !extraction && !extractionLoading && !isExtracting && (
          <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium mb-2">No text extraction available</p>
            <p className="text-sm text-muted-foreground mb-4">
              Extract text from this resume to preview its content.
            </p>
            <Button onClick={handleExtractText} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Extract Text Now
            </Button>
          </div>
        )}

        {resumes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No resumes available to preview.</p>
            <p className="text-sm">Upload a resume first to use this feature.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
