import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface FileUploadProps {
  bucket: string
  accept?: Record<string, string[]>
  maxSize?: number
  onUpload: (url: string, fileName: string) => void
  disabled?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  onUpload,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { user } = useAuth()
  const { toast } = useToast()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setUploading(true)
    setProgress(0)

    try {
      // Create unique file path with user ID
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onUpload(publicUrl, file.name)
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded.`
      })

      setProgress(100)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload file"
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [bucket, user, onUpload, toast])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || uploading
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading file...</p>
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
              Supported: PDF, DOC, DOCX (Max {Math.round(maxSize / 1024 / 1024)}MB)
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
                {file.name}: {errors.map(e => e.message).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}