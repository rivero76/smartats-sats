// src/components/FileUpload.tsx
import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  extractTextFromDocument,
  isProcessingError,
  ExtractedContent,
} from '@/services/documentProcessor'
import {
  fileUploadLogger,
  logFileMetadata,
  logProcessingStage,
  generateProcessingSessionId,
  logProcessingError,
} from '@/lib/documentLogger'
import { useResumeExtractionHandler } from '@/hooks/useResumeExtractionHandler'
import { useCreateResume } from '@/hooks/useResumes'

interface FileUploadProps {
  bucket: string
  accept?: Record<string, string[]>
  maxSize?: number
  onUpload: (url: string, fileName: string, extractedContent?: ExtractedContent) => void
  disabled?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024,
  onUpload,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { user } = useAuth()
  const { toast } = useToast()
  const { saveExtractionToSupabase } = useResumeExtractionHandler()
  const createResume = useCreateResume()

  // State for pre-upload name dialog
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [proposedName, setProposedName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [existingNames, setExistingNames] = useState<string[]>([])

  /**
   * Sanitise a resume name according to your rules:
   * - strip extension (if coming from a file)
   * - lowercase
   * - alphanumeric only
   * - max length 42
   */
  const sanitizeResumeNameFromFile = (fileName: string): string => {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '')
    const lower = withoutExt.toLowerCase()
    const alnumOnly = lower.replace(/[^a-z0-9]/g, '')
    const trimmed = alnumOnly.slice(0, 42)
    return trimmed
  }

  const sanitizeResumeNameFromInput = (raw: string): string => {
    const lower = raw.toLowerCase()
    const alnumOnly = lower.replace(/[^a-z0-9]/g, '')
    const trimmed = alnumOnly.slice(0, 42)
    return trimmed
  }

  /**
   * Ensure name is unique for this user by appending numeric suffix if needed.
   */
  const makeUniqueName = (base: string, existing: string[]): string => {
    if (!base) {
      base = 'resume'
    }

    if (!existing.includes(base)) return base

    let suffix = 2
    while (true) {
      const suffixStr = String(suffix)
      const allowedBaseLength = 42 - suffixStr.length
      const baseTrimmed = base.slice(0, allowedBaseLength > 0 ? allowedBaseLength : 0)
      const candidate = `${baseTrimmed}${suffixStr}`
      if (!existing.includes(candidate)) {
        return candidate
      }
      suffix++
    }
  }

  /**
   * After user drops a file, prepare the name dialog:
   * - store file + sessionId
   * - load existing resume names for user
   * - compute default suggested name
   * - open modal
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user || acceptedFiles.length === 0) {
        fileUploadLogger.debug('Upload cancelled: no user or files', {
          hasUser: !!user,
          fileCount: acceptedFiles.length,
        })
        return
      }

      const file = acceptedFiles[0]
      const sessionId = generateProcessingSessionId()

      try {
        // Load existing names for current user
        const { data: existing, error: existingError } = await supabase
          .from('sats_resumes')
          .select('name')
          .eq('user_id', user.id)

        if (existingError) {
          fileUploadLogger.error('Failed to load existing resume names', {
            sessionId,
            errorMessage: existingError.message,
          })
          toast({
            variant: 'destructive',
            title: 'Could not prepare upload',
            description: 'Failed to load existing resumes. Please try again.',
          })
          return
        }

        const names = (existing || []).map((row: any) => row.name as string)
        setExistingNames(names)

        const baseName = sanitizeResumeNameFromFile(file.name) || 'resume'
        const uniqueName = makeUniqueName(baseName, names)

        setPendingFile(file)
        setPendingSessionId(sessionId)
        setProposedName(uniqueName)
        setNameError(null)
        setShowNameDialog(true)
      } catch (error: any) {
        fileUploadLogger.error('Error preparing resume name dialog', {
          errorMessage: error.message,
        })
        toast({
          variant: 'destructive',
          title: 'Could not prepare upload',
          description: error.message || 'Unexpected error occurred',
        })
      }
    },
    [user, toast]
  )

  /**
   * Actually perform the upload + DB persistence once the user has confirmed the name.
   */
  const performUploadWithName = useCallback(
    async (file: File, sessionId: string, resumeName: string) => {
      if (!user) return

      logFileMetadata(sessionId, file, 'upload-initiated')
      setUploading(true)
      setProgress(0)

      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        logProcessingStage(sessionId, 'file-upload-preparation', 'completed', {
          fileName,
          filePath,
          fileExtension: fileExt,
        })

        setProgress(25)
        fileUploadLogger.info('Starting Supabase storage upload', { sessionId, bucket, filePath })

        const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

        if (error) {
          logProcessingError(sessionId, 'supabase-storage-upload', error)
          throw error
        }

        logProcessingStage(sessionId, 'supabase-storage-upload', 'completed', {
          uploadedPath: data.path,
        })
        setProgress(50)

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
        const publicUrl = urlData?.publicUrl
        fileUploadLogger.info('Public URL generated', { sessionId, publicUrl })
        setProgress(60)

        // Create resume record in DB with confirmed name + file_url
        fileUploadLogger.info('Creating resume record', { sessionId, resumeName })
        const resume = await createResume.mutateAsync({
          name: resumeName,
          file_url: publicUrl,
        })

        const resumeId = resume.id
        setProgress(70)

        // Start text extraction
        fileUploadLogger.info('Starting text extraction', { sessionId })
        let extractedContent: ExtractedContent | undefined

        try {
          extractedContent = await extractTextFromDocument(file, file.name)
          fileUploadLogger.info('Text extraction completed successfully', {
            sessionId,
            method: extractedContent.method,
            wordCount: extractedContent.wordCount,
            hasWarnings: extractedContent.warnings.length > 0,
          })

          if (extractedContent.warnings.length > 0) {
            toast({
              title: 'Extraction completed with warnings',
              description: extractedContent.warnings.join(' '),
              variant: 'default',
            })
          }

          // ✅ Save extracted content to Supabase linked to resumeId
          await saveExtractionToSupabase(resumeId, extractedContent)
        } catch (error) {
          if (isProcessingError(error)) {
            logProcessingError(sessionId, 'text-extraction', error)
          }
          fileUploadLogger.error('Extraction error', {
            sessionId,
            errorMessage: String(error),
          })
          throw error
        }

        onUpload(publicUrl, file.name, extractedContent)
        fileUploadLogger.info('Upload process completed successfully', {
          sessionId,
          fileName: file.name,
        })
        toast({
          title: 'File uploaded successfully',
          description: `${file.name} has been uploaded${
            extractedContent ? ` and ${extractedContent.wordCount} words extracted` : ''
          }.`,
        })

        setProgress(100)
      } catch (error: any) {
        logProcessingError(sessionId, 'file-upload-process', error)
        fileUploadLogger.error('Upload process failed', { sessionId, errorMessage: error.message })
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: error.message || 'Failed to upload file',
        })
      } finally {
        setUploading(true)
        setTimeout(() => {
          setUploading(false)
          setProgress(0)
        }, 500)
      }
    },
    [bucket, user, onUpload, toast, saveExtractionToSupabase, createResume]
  )

  /**
   * Handle user confirming the name in the dialog.
   */
  const handleConfirmName = async () => {
    if (!pendingFile || !pendingSessionId || !user) return

    const sanitized = sanitizeResumeNameFromInput(proposedName)
    if (!sanitized) {
      setNameError('Name must contain at least one letter or number.')
      return
    }

    if (sanitized.length > 42) {
      setNameError('Name must be at most 42 characters.')
      return
    }

    if (!/^[a-z0-9]+$/.test(sanitized)) {
      setNameError('Only lowercase letters and numbers are allowed.')
      return
    }

    if (existingNames.includes(sanitized)) {
      setNameError('You already have a resume with this name.')
      return
    }

    setShowNameDialog(false)
    setNameError(null)

    await performUploadWithName(pendingFile, pendingSessionId, sanitized)

    // Reset pending state
    setPendingFile(null)
    setPendingSessionId(null)
    setExistingNames([])
    setProposedName('')
  }

  const handleCancelNameDialog = () => {
    setShowNameDialog(false)
    setPendingFile(null)
    setPendingSessionId(null)
    setProposedName('')
    setNameError(null)
    setExistingNames([])
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || uploading,
  })

  return (
    <div className="space-y-4">
      {/* Upload dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {progress < 50
                  ? 'Uploading file...'
                  : progress < 75
                    ? 'Processing upload...'
                    : 'Extracting text content...'}
              </p>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop the file here' : 'Drop your file here'}
              </p>
              <p className="text-muted-foreground mt-1">
                or click to browse files from your computer
              </p>
            </div>
            <Button type="button" variant="outline" disabled={disabled}>
              Select File
            </Button>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, DOCX, HTML, TXT (Max {Math.round(maxSize / 1024 / 1024)}MB)
            </p>
          </div>
        )}
      </div>

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="text-sm text-destructive space-y-1">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>
                {file.name}: {errors.map((e) => e.message).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Simple modal dialog for resume name confirmation */}
      {showNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Name your resume</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll save this resume under a name derived from your file. You can adjust it
              before continuing.
            </p>
            <input
              type="text"
              value={proposedName}
              onChange={(e) => {
                setProposedName(e.target.value)
                setNameError(null)
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/40"
              maxLength={64}
            />
            <p className="text-xs text-muted-foreground">
              Only lowercase letters and numbers. Max 42 characters. We will normalise your input.
            </p>
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={handleCancelNameDialog}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmName}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
