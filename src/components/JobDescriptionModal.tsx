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
import { useToast } from '@/hooks/use-toast'
import { extractJobDescriptionInfo } from '@/utils/contentExtraction'
import { JobDescriptionSession } from '@/lib/jobDescriptionLogger'

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
  
  // Auto-population states
  const [showExtracted, setShowExtracted] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [session] = useState(() => new JobDescriptionSession())
  
  const createJobDescription = useCreateJobDescription()
  const updateJobDescription = useUpdateJobDescription()
  const createCompany = useCreateCompany()
  const createLocation = useCreateLocation()
  const { toast } = useToast()
  
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

  const processContent = (content: string) => {
    if (!content.trim()) return;
    
    session.info('Processing content for extraction', {
      contentLength: content.length,
      inputMethod: inputMethod
    });

    try {
      const extracted = extractJobDescriptionInfo(content, session.getSessionId());
      setExtractedData(extracted);
      
      // Auto-populate fields
      if (extracted.title) setName(extracted.title);
      
      if (extracted.company) {
        // Try to find existing company or suggest creating new one
        const existingCompany = companies.find(c => 
          c.name.toLowerCase().includes(extracted.company!.toLowerCase())
        );
        if (existingCompany) {
          setCompanyId(existingCompany.id);
        } else {
          setNewCompanyName(extracted.company);
          setShowNewCompany(true);
        }
      }
      
      if (extracted.location) {
        // Try to find existing location
        const locationStr = [extracted.location.city, extracted.location.state, extracted.location.country]
          .filter(Boolean).join(", ");
        const existingLocation = locations.find(l => 
          formatLocationName(l).toLowerCase().includes(locationStr.toLowerCase())
        );
        if (existingLocation) {
          setLocationId(existingLocation.id);
        } else if (locationStr) {
          setNewLocationData({
            city: extracted.location.city || '',
            state: extracted.location.state || '',
            country: extracted.location.country || ''
          });
          setShowNewLocation(true);
        }
      }
      
      setShowExtracted(true);
      
      toast({
        title: "Information Extracted",
        description: "Job information auto-populated! Please review and adjust as needed.",
      });
    } catch (error) {
      console.error('Error extracting content:', error);
      toast({
        title: "Extraction Error",
        description: "Could not extract information. Please fill manually.",
        variant: "destructive",
      });
    }
  };

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
    setShowExtracted(false)
    setExtractedData(null)
    onClose?.()
  }

  const handleFileUpload = (url: string, fileName: string, extractedContent?: any) => {
    setFileUrl(url);
    
    // Auto-populate job title from filename if it's empty
    if (!name.trim() && fileName) {
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      const cleanName = nameWithoutExt.replace(/[-_]/g, " ");
      setName(cleanName);
    }

    // Process extracted text immediately
    if (extractedContent?.text) {
      processContent(extractedContent.text);
    }
  };

  const handleTextPaste = (text: string) => {
    setPastedText(text);
    if (text.trim().length > 20) {
      processContent(text);
    }
  };

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
                  onChange={(e) => handleTextPaste(e.target.value)}
                  placeholder="Paste job description text here..."
                  className="min-h-[200px]"
                  disabled={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Extracted Information Display */}
          {showExtracted && extractedData && (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Auto-Extracted Information</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExtracted(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="grid gap-2 text-sm">
                {extractedData.title && (
                  <div className="flex justify-between">
                    <span className="font-medium">Job Title:</span>
                    <span className="text-right">{extractedData.title}</span>
                  </div>
                )}
                {extractedData.company && (
                  <div className="flex justify-between">
                    <span className="font-medium">Company:</span>
                    <span className="text-right">{extractedData.company}</span>
                  </div>
                )}
                {extractedData.location && (
                  <div className="flex justify-between">
                    <span className="font-medium">Location:</span>
                    <span className="text-right">
                      {[extractedData.location.city, extractedData.location.state, extractedData.location.country]
                        .filter(Boolean).join(", ")}
                    </span>
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
              </div>
              <p className="text-xs text-muted-foreground">
                Information has been auto-populated above. You can edit any fields before saving.
              </p>
            </div>
          )}

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