// src/pages/MyResumes.tsx
import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FileText, Download, Trash2, Plus, Edit } from 'lucide-react'
import { useResumes, useDeleteResume } from '@/hooks/useResumes'
import { ResumeModal } from '@/components/ResumeModal'
import { ResumePreview } from '@/components/ResumePreview'
import { Skeleton } from '@/components/ui/skeleton'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { FileUpload } from '@/components/FileUpload'

const MyResumes = () => {
  const { data: resumes = [], isLoading, error } = useResumes()
  const deleteResume = useDeleteResume()
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('resumes')

  // Controls the simple "Upload Resume" dialog that wraps FileUpload
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleDelete = async (id: string) => {
    try {
      await deleteResume.mutateAsync(id)
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const uploadDialog = (
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload New Resume</DialogTitle>
        </DialogHeader>
        <FileUpload
          bucket="SATS_resumes"
          onUpload={() => {
            // FileUpload handles resume + extraction creation.
            // Closing the dialog is enough; react-query will refresh the list.
            setUploadOpen(false)
          }}
          disabled={false}
        />
      </DialogContent>
    </Dialog>
  )

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
            <p className="text-muted-foreground">
              Upload, manage, and optimize your resumes for ATS compatibility.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Use new upload flow instead of ResumeModal for creation */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Upload New Resume</DialogTitle>
                </DialogHeader>
                <FileUpload
                  bucket="SATS_resumes"
                  onUpload={() => {
                    setUploadOpen(false)
                  }}
                  disabled={false}
                />
              </DialogContent>
            </Dialog>

            {helpContent && (
              <HelpButton
                onClick={() => setShowHelp(true)}
                tooltip="Learn how to manage your resumes effectively"
              />
            )}
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-destructive">Failed to load resumes</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload button + Help */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
          <p className="text-muted-foreground">
            Upload, manage, and optimize your resumes for ATS compatibility.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* New upload flow using FileUpload in a simple dialog */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Resume
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Upload New Resume</DialogTitle>
              </DialogHeader>
              <FileUpload
                bucket="SATS_resumes"
                onUpload={() => {
                  setUploadOpen(false)
                }}
                disabled={false}
              />
            </DialogContent>
          </Dialog>

          {helpContent && (
            <HelpButton
              onClick={() => setShowHelp(true)}
              tooltip="Learn how to manage your resumes effectively"
            />
          )}
        </div>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Resumes</CardTitle>
              <CardDescription>
                Manage your uploaded resumes and view ATS compatibility scores.
              </CardDescription>
            </div>
            {helpContent && (
              <HelpButton
                onClick={() => setShowHelp(true)}
                size="icon"
                variant="ghost"
                tooltip="Get help with resume management"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No resumes uploaded yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first resume to get started with ATS analysis and optimization.
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Your First Resume
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <HelpTooltip content="Descriptive name you gave to this resume version">
                      Name
                    </HelpTooltip>
                  </TableHead>
                  <TableHead>
                    <HelpTooltip content="Date when this resume was uploaded to the system">
                      Created
                    </HelpTooltip>
                  </TableHead>
                  <TableHead>
                    <HelpTooltip content="Download the original file you uploaded">
                      File
                    </HelpTooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HelpTooltip content="Edit resume details or delete from your collection">
                      Actions
                    </HelpTooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumes.map((resume) => (
                  <TableRow key={resume.id}>
                    <TableCell className="font-medium">{resume.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(resume.created_at)}
                    </TableCell>
                    <TableCell>
                      {resume.file_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(resume.file_url!, resume.name)}
                          className="p-0 h-auto font-normal text-primary hover:underline"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No file</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Edit-only modal now */}
                        <ResumeModal
                          resume={resume}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          }
                        />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Resume</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{resume.name}&quot;? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(resume.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ResumePreview />

      {/* Help Modal */}
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}

      {/* Shared upload dialog instance (for direct state control) */}
      {uploadDialog}
    </div>
  )
}

export default MyResumes
