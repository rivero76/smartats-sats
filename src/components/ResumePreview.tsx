import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Eye, AlertCircle, Loader2 } from "lucide-react"
import { useResumes, Resume } from '@/hooks/useResumes'
import { useToast } from '@/hooks/use-toast'

interface ParsedContent {
  content: string
  fileName: string
  fileType: string
}

export const ResumePreview = () => {
  const { data: resumes = [] } = useResumes()
  const { toast } = useToast()
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleParseResume = async () => {
    if (!selectedResumeId) {
      toast({
        variant: "destructive",
        title: "No resume selected",
        description: "Please select a resume to preview."
      })
      return
    }

    const selectedResume = resumes.find(r => r.id === selectedResumeId)
    if (!selectedResume?.file_url) {
      toast({
        variant: "destructive",
        title: "No file found",
        description: "The selected resume does not have a file attached."
      })
      return
    }

    setIsLoading(true)
    setParsedContent(null)

    try {
      // Download the file first
      const response = await fetch(selectedResume.file_url)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      const blob = await response.blob()
      const fileName = selectedResume.name
      const fileType = blob.type || 'unknown'
      
      // Determine file extension from URL or content type
      const fileExtension = selectedResume.file_url.split('.').pop()?.toLowerCase() || ''
      
      let content = ''

      // Handle different file types
      if (fileType.includes('text/') || fileExtension === 'txt' || fileExtension === 'md') {
        // Plain text files
        content = await blob.text()
      } else if (fileType.includes('application/pdf') || fileExtension === 'pdf' || 
                 fileType.includes('application/msword') || fileExtension === 'doc' || fileExtension === 'docx' ||
                 fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        // For binary documents, try to create a temporary file and parse it
        try {
          // Create a temporary file URL for parsing
          const tempFileName = `temp_resume_${Date.now()}.${fileExtension}`
          
          // Create a File object from the blob
          const file = new File([blob], tempFileName, { type: fileType })
          
          // For now, we'll indicate that parsing is available but requires implementation
          // In a real scenario, you would use a document parsing service here
          content = `[${fileExtension.toUpperCase()} file detected - File size: ${Math.round(blob.size / 1024)}KB]
[This is a binary document that requires specialized parsing]
[File name: ${fileName}]
[Content type: ${fileType}]
[To properly extract text from this file, implement document parsing service integration]

Note: For PDF and Word documents, consider using:
- PDF parsing libraries (pdf-parse, pdf2pic)
- Document conversion services  
- OCR services for scanned documents
- Microsoft Graph API for Office documents

The file is ready to be processed when parsing capabilities are added.`
        } catch (parseError) {
          content = `[Error parsing ${fileExtension} file: ${parseError}]`
        }
      } else {
        // Try to read as text for other file types
        try {
          content = await blob.text()
        } catch {
          content = `[Binary file detected - Cannot display content as text]
[File type: ${fileType}]
[File size: ${Math.round(blob.size / 1024)}KB]`
        }
      }

      setParsedContent({
        content,
        fileName,
        fileType
      })

      toast({
        title: "Resume parsed successfully",
        description: `Extracted content from ${fileName}`
      })

    } catch (error) {
      console.error('Error parsing resume:', error)
      toast({
        variant: "destructive",
        title: "Failed to parse resume",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getDisplayLines = () => {
    if (!parsedContent?.content) return []
    return parsedContent.content.split('\n').slice(0, 40)
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
            onClick={handleParseResume}
            disabled={!selectedResumeId || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {isLoading ? 'Parsing...' : 'Preview Content'}
          </Button>
        </div>

        {parsedContent && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Showing first 40 lines of {parsedContent.fileName} ({parsedContent.fileType})</span>
            </div>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <ScrollArea className="h-96 w-full">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {getDisplayLines().map((line, index) => (
                      <div key={index} className="border-l-2 border-transparent hover:border-primary/20 hover:bg-accent/50 px-2 py-0.5">
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
              Total content length: {parsedContent.content.length} characters
              ({parsedContent.content.split('\n').length} lines)
            </div>
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