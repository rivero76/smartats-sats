import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/FileUpload'
import { useCreateResume, useUpdateResume, Resume } from '@/hooks/useResumes'
import { Plus, Edit, User } from 'lucide-react'
import { extractResumeInfo, generateResumeNameSuggestions } from '@/utils/contentExtraction'
import { useCreateDocumentExtraction } from '@/hooks/useDocumentExtractions'
import { ExtractedContent } from '@/services/documentProcessor'
import { useToast } from '@/hooks/use-toast'

interface ResumeModalProps {
  resume?: Resume
  trigger?: React.ReactNode
  onClose?: () => void
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ resume, trigger, onClose }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(resume?.name || '')
  const [fileUrl, setFileUrl] = useState(resume?.file_url || '')
  const [showExtracted, setShowExtracted] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const createResume = useCreateResume()
  const updateResume = useUpdateResume()
  const { toast } = useToast()

  const isEditing = !!resume
  const isLoading = createResume.isPending || updateResume.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    try {
      if (isEditing) {
        await updateResume.mutateAsync({
          id: resume.id,
          name: name.trim(),
          file_url: fileUrl || null
        })
      } else {
        await createResume.mutateAsync({
          name: name.trim(),
          file_url: fileUrl || null
        })
      }
      
      setOpen(false)
      setName('')
      setFileUrl('')
      onClose?.()
    } catch (error) {
      // Error handling is done in the hooks
    }
  }

  const processResumeContent = (content: string, fileName?: string) => {
    if (!content.trim()) return;
    
    try {
      const extracted = extractResumeInfo(content);
      setExtractedData(extracted);
      
      // Generate intelligent resume name suggestions
      const suggestions = generateResumeNameSuggestions(extracted, fileName || '');
      setNameSuggestions(suggestions);
      
      // Auto-populate name if available and not already set
      if (!name.trim() && suggestions.length > 0) {
        setName(suggestions[0]); // Use the best suggestion
        setShowSuggestions(true);
      }
      
      setShowExtracted(true);
      
      toast({
        title: "Resume Information Extracted",
        description: "Smart name suggestions generated! Click to use a suggestion.",
      });
    } catch (error) {
      console.error('Error extracting resume content:', error);
      toast({
        title: "Extraction Error",
        description: "Could not extract information. Please fill manually.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (url: string, fileName: string, extractedContent?: any) => {
    setFileUrl(url)
    
    // Process extracted text if available, otherwise generate suggestions from filename
    if (extractedContent?.text) {
      processResumeContent(extractedContent.text, fileName);
    } else {
      // Generate suggestions based on filename when no content is extracted
      const suggestions = generateResumeNameSuggestions(null, fileName);
      setNameSuggestions(suggestions);
      
      if (!name.trim() && suggestions.length > 0) {
        setName(suggestions[0]);
        setShowSuggestions(true);
      }
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setName(resume?.name || '')
      setFileUrl(resume?.file_url || '')
      setShowExtracted(false)
      setExtractedData(null)
      setNameSuggestions([])
      setShowSuggestions(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {isEditing ? (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Edit Resume
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                New Resume
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Resume' : 'Upload New Resume'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Resume Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setShowSuggestions(false)
              }}
              placeholder="Enter resume name"
              required
              disabled={isLoading}
            />
            
            {/* Smart Name Suggestions */}
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Suggested names:</p>
                <div className="flex flex-wrap gap-2">
                  {nameSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setName(suggestion)
                        setShowSuggestions(false)
                      }}
                      className="h-8 text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Resume File</Label>
            <FileUpload
              bucket="SATS_resumes"
              onUpload={handleFileUpload}
              disabled={isLoading}
            />
            {fileUrl && (
              <p className="text-sm text-muted-foreground">
                File uploaded successfully
              </p>
            )}
          </div>

          {/* Extracted Information Display */}
          {showExtracted && extractedData && (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Auto-Extracted Information
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExtracted(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="grid gap-2 text-sm">
                {extractedData.name && (
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span className="text-right">{extractedData.name}</span>
                  </div>
                )}
                {extractedData.email && (
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span className="text-right">{extractedData.email}</span>
                  </div>
                )}
                {extractedData.phone && (
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span className="text-right">{extractedData.phone}</span>
                  </div>
                )}
                {extractedData.location && (
                  <div className="flex justify-between">
                    <span className="font-medium">Location:</span>
                    <span className="text-right">{extractedData.location}</span>
                  </div>
                )}
                {extractedData.skills && extractedData.skills.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Skills Found:</span>
                    <span className="text-right text-xs">
                      {extractedData.skills.slice(0, 3).join(", ")}
                      {extractedData.skills.length > 3 && ` +${extractedData.skills.length - 3} more`}
                    </span>
                  </div>
                )}
                {extractedData.experience && (
                  <div className="flex justify-between">
                    <span className="font-medium">Experience:</span>
                    <span className="text-right text-xs">{extractedData.experience}</span>
                  </div>
                )}
                {extractedData.currentJobTitle && (
                  <div className="flex justify-between">
                    <span className="font-medium">Current Role:</span>
                    <span className="text-right text-xs">{extractedData.currentJobTitle}</span>
                  </div>
                )}
                {extractedData.recentJobTitles && extractedData.recentJobTitles.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Recent Roles:</span>
                    <span className="text-right text-xs">
                      {extractedData.recentJobTitles.slice(0, 2).join(", ")}
                      {extractedData.recentJobTitles.length > 2 && ` +${extractedData.recentJobTitles.length - 2} more`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Resume' : 'Create Resume'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}