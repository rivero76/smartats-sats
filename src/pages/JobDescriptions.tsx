import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Building,
  MapPin,
  File,
  Type,
  ExternalLink,
  Link,
} from 'lucide-react'
import {
  useJobDescriptions,
  useDeleteJobDescription,
  JobDescription,
} from '@/hooks/useJobDescriptions'
import { JobDescriptionModal } from '@/components/JobDescriptionModal'
import { Skeleton } from '@/components/ui/skeleton'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'
import { HelpTooltip } from '@/components/help/HelpTooltip'

const JobDescriptions = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: jobDescriptions = [], isLoading, error } = useJobDescriptions()
  const deleteJobDescription = useDeleteJobDescription()
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('jobDescriptions')

  const filteredJobDescriptions = jobDescriptions.filter(
    (jd) =>
      jd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jd.company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    try {
      await deleteJobDescription.mutateAsync(id)
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Descriptions</h1>
            <p className="text-muted-foreground">
              Create and manage job descriptions for ATS analysis.
            </p>
          </div>
          <JobDescriptionModal />
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-destructive">Failed to load job descriptions</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Descriptions</h1>
          <p className="text-muted-foreground">
            Create and manage job descriptions for ATS analysis.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <JobDescriptionModal />
          {helpContent && (
            <HelpButton
              onClick={() => setShowHelp(true)}
              tooltip="Learn how to create and manage job descriptions"
            />
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
          <CardDescription>Find job descriptions by title or company name.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search job descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Descriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Job Descriptions</CardTitle>
          <CardDescription>
            Manage your job descriptions and analyze ATS compatibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredJobDescriptions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No matching job descriptions' : 'No job descriptions created yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search terms.'
                  : 'Create your first job description to get started with ATS analysis.'}
              </p>
              {!searchQuery && (
                <JobDescriptionModal
                  trigger={
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Job Description
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <HelpTooltip content="The job title or position name for this role">
                      Job Title
                    </HelpTooltip>
                  </TableHead>
                  <TableHead>
                    <HelpTooltip content="Company or organization offering this position">
                      Company
                    </HelpTooltip>
                  </TableHead>
                  <TableHead>
                    <HelpTooltip content="Geographic location for this job">Location</HelpTooltip>
                  </TableHead>
                  <TableHead>
                    <HelpTooltip content="How this job description was ingested (text, URL, or file)">
                      Type
                    </HelpTooltip>
                  </TableHead>
                  <TableHead>
                    <HelpTooltip content="When this job description was created">
                      Created
                    </HelpTooltip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HelpTooltip content="Edit job details, download files, or delete from your collection">
                      Actions
                    </HelpTooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobDescriptions.map((jd) => (
                  <TableRow key={jd.id}>
                    <TableCell className="font-medium">{jd.name}</TableCell>
                    <TableCell>
                      {jd.company ? (
                        <div className="flex items-center space-x-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{jd.company.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No company</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {jd.location ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {[jd.location.city, jd.location.state, jd.location.country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No location</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {jd.source_type === 'url' || jd.source_url ? (
                        <Badge variant="secondary" className="text-xs">
                          <Link className="mr-1 h-3 w-3" />
                          URL
                        </Badge>
                      ) : jd.file_url ? (
                        <Badge variant="secondary" className="text-xs">
                          <File className="mr-1 h-3 w-3" />
                          File
                        </Badge>
                      ) : jd.pasted_text ? (
                        <Badge variant="outline" className="text-xs">
                          <Type className="mr-1 h-3 w-3" />
                          Text
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs opacity-50">
                          Empty
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(jd.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {jd.file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(jd.file_url!, jd.name)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}

                        <JobDescriptionModal
                          jobDescription={jd}
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
                              <AlertDialogTitle>Delete Job Description</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{jd.name}"? This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(jd.id)}
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

      {/* Help Modal */}
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
    </div>
  )
}

export default JobDescriptions
