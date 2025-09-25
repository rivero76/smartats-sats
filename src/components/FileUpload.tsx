import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { extractTextFromDocument, isProcessingError, ExtractedContent } from '@/services/documentProcessor'
import { 
  fileUploadLogger, 
  logFileMetadata, 
  logProcessingStage,
  generateProcessingSessionId,
  logProcessingError 
} from '@/lib/documentLogger'

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
    if (!user || acceptedFiles.length === 0) {
      fileUploadLogger.debug('Upload cancelled: no user or files', { 
        hasUser: !!user, 
        fileCount: acceptedFiles.length 
      });
      return;
    }

    const file = acceptedFiles[0];
    const sessionId = generateProcessingSessionId();
    
    // Log file upload initiation
    logFileMetadata(sessionId, file, 'upload-initiated');
    
    setUploading(true);
    setProgress(0);

    try {
      // Create unique file path with user ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      logProcessingStage(sessionId, 'file-upload-preparation', 'completed', {
        fileName,
        filePath,
        fileExtension: fileExt,
      });

      setProgress(25);

      // Upload file to Supabase Storage
      fileUploadLogger.info('Starting Supabase storage upload', { 
        sessionId, 
        bucket, 
        filePath 
      });
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logProcessingError(sessionId, 'supabase-storage-upload', error);
        throw error;
      }

      logProcessingStage(sessionId, 'supabase-storage-upload', 'completed', {
        uploadedPath: data.path,
      });

      setProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      fileUploadLogger.info('Public URL generated', { sessionId, publicUrl });

      setProgress(75);

      // Extract text content using document processor
      fileUploadLogger.info('Starting text extraction', { sessionId });
      let extractedContent: ExtractedContent | undefined;
      try {
        extractedContent = await extractTextFromDocument(file, file.name);
        
        fileUploadLogger.info('Text extraction completed successfully', {
          sessionId,
          method: extractedContent.method,
          wordCount: extractedContent.wordCount,
          hasWarnings: extractedContent.warnings.length > 0,
        });
        
        // Show warnings if any
        if (extractedContent.warnings.length > 0) {
          fileUploadLogger.debug('Extraction warnings', { 
            sessionId, 
            warnings: extractedContent.warnings 
          });
          toast({
            title: "Extraction completed with warnings",
            description: extractedContent.warnings.join(' '),
            variant: "default",
          });
        }
      } catch (error) {
        logProcessingError(sessionId, 'text-extraction', error);
        
        if (isProcessingError(error)) {
          // Handle known processing errors
          fileUploadLogger.error('Known processing error during extraction', {
            sessionId,
            errorCode: error.code,
            errorMessage: error.message,
          });
          
          // Enhanced error messages for better user experience
          let errorTitle = "Text extraction failed";
          let errorDescription = error.message;
          let shouldAllowUpload = false;
          
          if (error.code === 'EXTRACTION_FAILED' && file.type === 'application/pdf') {
            errorTitle = "PDF processing issue";
            errorDescription = "There was an issue processing your PDF. This could be due to network connectivity or the PDF format. You can still upload the file and add content manually, or try converting it to Word/Text format.";
            shouldAllowUpload = true;
          } else if (error.code === 'EXTRACTION_FAILED') {
            errorDescription = error.message + " You can still upload the file and add content manually.";
            shouldAllowUpload = true;
          } else if (error.code === 'UNSUPPORTED_FORMAT') {
            errorDescription = error.message + " The file will be uploaded but you'll need to add content manually.";
            shouldAllowUpload = true;
            extractedContent = undefined;
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: shouldAllowUpload ? "default" : "destructive",
          });
          
          if (!shouldAllowUpload) {
            throw error; // Re-throw critical errors that should stop the upload
          }
        } else {
          // Handle unexpected errors
          fileUploadLogger.error('Unexpected extraction error', { 
            sessionId, 
            error: error instanceof Error ? error.message : String(error) 
          });
          
          toast({
            title: "Text extraction failed",
            description: "An unexpected error occurred during text extraction",
            variant: "destructive",
          });
        }
      }

      // Store extracted content globally for later use
      if (extractedContent) {
        (window as any).__lastExtractedContent = extractedContent;
        fileUploadLogger.debug('Extracted content stored globally', { sessionId });
      }

      onUpload(publicUrl, file.name, extractedContent);
      
      fileUploadLogger.info('Upload process completed successfully', {
        sessionId,
        fileName: file.name,
        hasExtraction: !!extractedContent,
        wordCount: extractedContent?.wordCount || 0,
      });
      
      // Show success message only if we haven't already shown an error/warning message
      const hasWarningsOrErrors = extractedContent?.warnings && extractedContent.warnings.length > 0;
      if (!hasWarningsOrErrors) {
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded${extractedContent ? ` and ${extractedContent.wordCount} words extracted` : ''}.`
        });
      }

      setProgress(100);
    } catch (error: any) {
      logProcessingError(sessionId, 'file-upload-process', error);
      
      fileUploadLogger.error('Upload process failed', {
        sessionId,
        errorMessage: error.message || 'Unknown error',
        errorType: error.constructor?.name || 'UnknownError',
      });
      
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload file"
      });
    } finally {
      setUploading(true)
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 500)
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
              <p className="text-sm font-medium">
                {progress < 50 ? 'Uploading file...' : 
                 progress < 75 ? 'Processing upload...' : 
                 'Extracting text content...'}
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