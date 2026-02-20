// src/components/ResumeModal.tsx
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateResume, Resume } from '@/hooks/useResumes'
import { Edit } from 'lucide-react'

interface ResumeModalProps {
  resume?: Resume
  trigger?: React.ReactNode
  onClose?: () => void
}

/**
 * Edit-only modal for existing resumes.
 *
 * All creation, file upload, and extraction is now handled by FileUpload.tsx.
 * This modal only updates existing resume metadata (currently: name).
 */
export const ResumeModal: React.FC<ResumeModalProps> = ({ resume, trigger, onClose }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(resume?.name || '')
  const updateResume = useUpdateResume()

  const isEditing = !!resume
  const isLoading = updateResume.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resume) return
    if (!name.trim()) return

    try {
      await updateResume.mutateAsync({
        id: resume.id,
        name: name.trim(),
      })

      setOpen(false)
      onClose?.()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen && resume) {
      // Reset form when closing
      setName(resume.name || '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled>
            <Edit className="mr-2 h-4 w-4" />
            Edit Resume
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Resume' : 'Resume'}</DialogTitle>
        </DialogHeader>

        {!resume ? (
          <div className="text-sm text-muted-foreground">
            This dialog is now used only for editing existing resumes. New resumes are created via
            the Upload Resume flow.
          </div>
        ) : (
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

            {resume.file_url && (
              <div className="space-y-1 text-sm">
                <Label>Current File</Label>
                <a
                  href={resume.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  Open stored resume file
                </a>
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
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
