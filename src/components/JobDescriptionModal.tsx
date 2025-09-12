import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/FileUpload'
import { 
  useCreateJobDescription, 
  useUpdateJobDescription, 
  useCompanies, 
  useLocations,
  useCreateCompany,
  useCreateLocation,
  JobDescription 
} from '@/hooks/useJobDescriptions'
import { Plus, Edit, Building, MapPin } from 'lucide-react'

interface JobDescriptionModalProps {
  jobDescription?: JobDescription
  trigger?: React.ReactNode
  onClose?: () => void
}

export const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({ 
  jobDescription, 
  trigger, 
  onClose 
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(jobDescription?.name || '')
  const [companyId, setCompanyId] = useState(jobDescription?.company_id || '')
  const [locationId, setLocationId] = useState(jobDescription?.location_id || '')
  const [pastedText, setPastedText] = useState(jobDescription?.pasted_text || '')
  const [fileUrl, setFileUrl] = useState(jobDescription?.file_url || '')
  const [inputMethod, setInputMethod] = useState<'file' | 'text'>('file')
  
  // Company creation
  const [newCompanyName, setNewCompanyName] = useState('')
  const [showNewCompany, setShowNewCompany] = useState(false)
  
  // Location creation
  const [newLocationData, setNewLocationData] = useState({ city: '', state: '', country: '' })
  const [showNewLocation, setShowNewLocation] = useState(false)
  
  const createJobDescription = useCreateJobDescription()
  const updateJobDescription = useUpdateJobDescription()
  const createCompany = useCreateCompany()
  const createLocation = useCreateLocation()
  
  const { data: companies = [] } = useCompanies()
  const { data: locations = [] } = useLocations()

  const isEditing = !!jobDescription
  const isLoading = createJobDescription.isPending || updateJobDescription.isPending || 
                    createCompany.isPending || createLocation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    try {
      let finalCompanyId = companyId
      let finalLocationId = locationId

      // Create new company if needed
      if (showNewCompany && newCompanyName.trim()) {
        const company = await createCompany.mutateAsync({ name: newCompanyName.trim() })
        finalCompanyId = company.id
      }

      // Create new location if needed
      if (showNewLocation && (newLocationData.city || newLocationData.state || newLocationData.country)) {
        const location = await createLocation.mutateAsync(newLocationData)
        finalLocationId = location.id
      }

      const data = {
        name: name.trim(),
        company_id: finalCompanyId || null,
        location_id: finalLocationId || null,
        pasted_text: inputMethod === 'text' ? pastedText || null : null,
        file_url: inputMethod === 'file' ? fileUrl || null : null
      }

      if (isEditing) {
        await updateJobDescription.mutateAsync({ id: jobDescription.id, ...data })
      } else {
        await createJobDescription.mutateAsync(data)
      }
      
      handleClose()
    } catch (error) {
      // Error handling is done in the hooks
    }
  }

  const handleClose = () => {
    setOpen(false)
    setName(jobDescription?.name || '')
    setCompanyId(jobDescription?.company_id || '')
    setLocationId(jobDescription?.location_id || '')
    setPastedText(jobDescription?.pasted_text || '')
    setFileUrl(jobDescription?.file_url || '')
    setInputMethod('file')
    setNewCompanyName('')
    setShowNewCompany(false)
    setNewLocationData({ city: '', state: '', country: '' })
    setShowNewLocation(false)
    onClose?.()
  }

  const handleFileUpload = (url: string, fileName: string) => {
    setFileUrl(url)
    if (!name.trim()) {
      const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '')
      setName(nameWithoutExtension)
    }
  }

  const formatLocationName = (location: any) => {
    const parts = [location.city, location.state, location.country].filter(Boolean)
    return parts.join(', ')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {isEditing ? (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Edit Job Description
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                New Job Description
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Job Description' : 'Create New Job Description'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Job Title *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter job title"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Company Selection */}
              <div className="space-y-2">
                <Label>Company</Label>
                {showNewCompany ? (
                  <div className="space-y-2">
                    <Input
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Enter company name"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewCompany(false)
                        setNewCompanyName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCompany(true)}
                      className="w-full"
                    >
                      <Building className="mr-2 h-4 w-4" />
                      Add New Company
                    </Button>
                  </div>
                )}
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label>Location</Label>
                {showNewLocation ? (
                  <div className="space-y-2">
                    <Input
                      value={newLocationData.city}
                      onChange={(e) => setNewLocationData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      disabled={isLoading}
                    />
                    <Input
                      value={newLocationData.state}
                      onChange={(e) => setNewLocationData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State/Province"
                      disabled={isLoading}
                    />
                    <Input
                      value={newLocationData.country}
                      onChange={(e) => setNewLocationData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="Country"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewLocation(false)
                        setNewLocationData({ city: '', state: '', country: '' })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {formatLocationName(location)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewLocation(true)}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Add New Location
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Job Description Input */}
          <div className="space-y-2">
            <Label>Job Description</Label>
            <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'file' | 'text')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4">
                <FileUpload
                  bucket="SATS_job_documents"
                  onUpload={handleFileUpload}
                  disabled={isLoading}
                />
                {fileUrl && (
                  <p className="text-sm text-muted-foreground">
                    File uploaded successfully
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="text" className="space-y-4">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste job description text here..."
                  className="min-h-[200px]"
                  disabled={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Job Description' : 'Create Job Description'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}