import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/FileUpload'
import { useCreateResume, useUpdateResume, Resume } from '@/hooks/useResumes'
import { Plus, Edit } from 'lucide-react'

interface ResumeModalProps {
  resume?: Resume
  trigger?: React.ReactNode
  onClose?: () => void
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ resume, trigger, onClose }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(resume?.name || '')
  const [fileUrl, setFileUrl] = useState(resume?.file_url || '')
  
  const createResume = useCreateResume()
  const updateResume = useUpdateResume()

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

  const handleFileUpload = (url: string, fileName: string) => {
    setFileUrl(url)
    if (!name.trim()) {
      // Auto-fill name from filename if not set
      const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '')
      setName(nameWithoutExtension)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when closing
      setName(resume?.name || '')
      setFileUrl(resume?.file_url || '')
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
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter resume name"
              required
              disabled={isLoading}
            />
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