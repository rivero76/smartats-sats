import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useResumes } from '@/hooks/useResumes'
import { useJobDescriptions } from '@/hooks/useJobDescriptions'
import { useCreateATSAnalysis } from '@/hooks/useATSAnalyses'

interface ATSAnalysisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ATSAnalysisModal = ({ open, onOpenChange }: ATSAnalysisModalProps) => {
  const [selectedResume, setSelectedResume] = useState<string>('')
  const [selectedJobDescription, setSelectedJobDescription] = useState<string>('')

  const { data: resumes, isLoading: resumesLoading } = useResumes()
  const { data: jobDescriptions, isLoading: jobDescriptionsLoading } = useJobDescriptions()
  const createAnalysis = useCreateATSAnalysis()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedResume || !selectedJobDescription) {
      return
    }

    createAnalysis.mutate(
      {
        resume_id: selectedResume,
        jd_id: selectedJobDescription,
      },
      {
        onSuccess: () => {
          setSelectedResume('')
          setSelectedJobDescription('')
          onOpenChange(false)
        },
      }
    )
  }

  const isLoading = resumesLoading || jobDescriptionsLoading || createAnalysis.isPending
  const isValid = selectedResume && selectedJobDescription

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Run ATS Analysis</DialogTitle>
          <DialogDescription>
            Select a resume and job description to analyze their compatibility and get improvement
            recommendations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume-select">Select Resume</Label>
            <Select value={selectedResume} onValueChange={setSelectedResume} disabled={isLoading}>
              <SelectTrigger id="resume-select">
                <SelectValue placeholder="Choose a resume..." />
              </SelectTrigger>
              <SelectContent>
                {resumes?.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {resumes?.length === 0 && !resumesLoading && (
              <p className="text-sm text-muted-foreground">
                No resumes found. Upload a resume first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-select">Select Job Description</Label>
            <Select
              value={selectedJobDescription}
              onValueChange={setSelectedJobDescription}
              disabled={isLoading}
            >
              <SelectTrigger id="job-select">
                <SelectValue placeholder="Choose a job description..." />
              </SelectTrigger>
              <SelectContent>
                {jobDescriptions?.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{job.name}</span>
                      {job.company?.name && (
                        <span className="text-sm text-muted-foreground">{job.company.name}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {jobDescriptions?.length === 0 && !jobDescriptionsLoading && (
              <p className="text-sm text-muted-foreground">
                No job descriptions found. Create a job description first.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAnalysis.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createAnalysis.isPending}>
              {createAnalysis.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                'Run ATS Analysis'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ATSAnalysisModal
