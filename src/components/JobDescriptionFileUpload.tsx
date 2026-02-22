import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ExtractedContent, extractTextFromDocument } from '@/services/documentProcessor'

interface JobDescriptionFileUploadProps {
  bucket: string
  onUpload: (url: string, fileName: string, extractedContent?: ExtractedContent) => void
  disabled?: boolean
  maxSize?: number
}

export const JobDescriptionFileUpload: React.FC<JobDescriptionFileUploadProps> = ({
  bucket,
  onUpload,
  disabled = false,
  maxSize = 10 * 1024 * 1024,
}) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { user } = useAuth()
  const { toast } = useToast()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user || acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      setUploading(true)
      setProgress(10)

      try {
        const fileExt = file.name.split('.').pop() || 'bin'
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `${user.id}/job_descriptions/${fileName}`

        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (uploadError) throw uploadError

        setProgress(55)
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
        const publicUrl = urlData.publicUrl

        let extractedContent: ExtractedContent | undefined
        try {
          extractedContent = await extractTextFromDocument(file, file.name)
        } catch {
          extractedContent = undefined
        }

        setProgress(90)
        onUpload(publicUrl, file.name, extractedContent)

        toast({
          title: 'Job description file uploaded',
          description: extractedContent
            ? `${file.name} uploaded and content extracted.`
            : `${file.name} uploaded.`,
        })
        setProgress(100)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Could not upload file',
        })
      } finally {
        setTimeout(() => {
          setUploading(false)
          setProgress(0)
        }, 500)
      }
    },
    [bucket, onUpload, toast, user]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxSize,
    multiple: false,
    disabled: disabled || uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  })

  return (
    <div className="space-y-4">
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
                {progress < 55 ? 'Uploading job description...' : 'Extracting content...'}
              </p>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop the file here' : 'Drop a job description file'}
              </p>
              <p className="text-muted-foreground mt-1">or click to browse files</p>
            </div>
            <Button type="button" variant="outline" disabled={disabled}>
              Select File
            </Button>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, DOC, DOCX, TXT (Max {Math.round(maxSize / 1024 / 1024)}MB)
            </p>
          </div>
        )}
      </div>

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
    </div>
  )
}
