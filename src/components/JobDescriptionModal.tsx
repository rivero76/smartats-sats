/**
 * UPDATE LOG
 * 2026-03-18 00:00:00 | CR1-5: Extract auto-apply confidence cutoff 0.78 to AUTO_APPLY_CONFIDENCE_THRESHOLD named constant.
 * 2026-04-01 00:00:00 | UX-FILE-1: Handle SPA shell pages from employer direct URLs — show warning banner, use URL slug title_hint, add warning variant to UrlFailureDetails.
 */
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { JobDescriptionFileUpload } from '@/components/JobDescriptionFileUpload'
import {
  useCreateJobDescription,
  useUpdateJobDescription,
  useCompanies,
  useLocations,
  useCreateCompany,
  useCreateLocation,
  useIngestJobDescriptionUrl,
  JobDescription,
  JsonLdJob,
} from '@/hooks/useJobDescriptions'
import { Plus, Edit, Building, MapPin, Info, Link2, ClipboardPaste, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { extractJobDescriptionInfo } from '@/utils/content-extraction'
import { JobDescriptionSession } from '@/lib/jobDescriptionLogger'

// Minimum overall extraction confidence (0–1) required to auto-apply extracted fields.
// Below this threshold the user is prompted to review before saving.
const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.78

interface JobDescriptionModalProps {
  jobDescription?: JobDescription
  trigger?: React.ReactNode
  onClose?: () => void
}

interface UrlFailureDetails {
  title: string
  reason: string
  action: string
  variant?: 'destructive' | 'warning'
}

interface ExtractionMetaView {
  confidence?: {
    title: number
    company: number
    location: number
    overall: number
  }
  rules?: string[]
  warnings?: string[]
}

const normalizeField = (value: string | null | undefined): string => {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

const sanitizeLocationField = (value: string | null | undefined): string => {
  return (value || '').replace(/\s+/g, ' ').trim()
}

export const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({
  jobDescription,
  trigger,
  onClose,
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(jobDescription?.name || '')
  const [companyId, setCompanyId] = useState(jobDescription?.company_id || '')
  const [locationId, setLocationId] = useState(jobDescription?.location_id || '')
  const [pastedText, setPastedText] = useState(jobDescription?.pasted_text || '')
  const [fileUrl, setFileUrl] = useState(jobDescription?.file_url || '')
  const [sourceUrl, setSourceUrl] = useState(jobDescription?.source_url || '')
  const [inputMethod, setInputMethod] = useState<'file' | 'text' | 'url'>(
    (jobDescription?.source_type as 'file' | 'text' | 'url' | undefined) ||
      (jobDescription?.file_url ? 'file' : jobDescription?.source_url ? 'url' : 'text')
  )

  // Company creation
  const [newCompanyName, setNewCompanyName] = useState('')
  const [showNewCompany, setShowNewCompany] = useState(false)

  // Location creation
  const [newLocationData, setNewLocationData] = useState({ city: '', state: '', country: '' })
  const [showNewLocation, setShowNewLocation] = useState(false)

  // Auto-population states
  const [showExtracted, setShowExtracted] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [pendingApply, setPendingApply] = useState(false)
  const [urlFailure, setUrlFailure] = useState<UrlFailureDetails | null>(null)
  const [session] = useState(() => new JobDescriptionSession())

  const createJobDescription = useCreateJobDescription()
  const updateJobDescription = useUpdateJobDescription()
  const createCompany = useCreateCompany()
  const createLocation = useCreateLocation()
  const ingestUrl = useIngestJobDescriptionUrl()
  const { toast } = useToast()
  const { satsUser } = useAuth()

  const { data: companies = [] } = useCompanies()
  const { data: locations = [] } = useLocations()

  const isEditing = !!jobDescription
  const isAdmin = satsUser?.role === 'admin'
  const isLoading =
    createJobDescription.isPending ||
    updateJobDescription.isPending ||
    createCompany.isPending ||
    createLocation.isPending ||
    ingestUrl.isPending

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
      if (
        showNewLocation &&
        (newLocationData.city || newLocationData.state || newLocationData.country)
      ) {
        const location = await createLocation.mutateAsync(newLocationData)
        finalLocationId = location.id
      }

      const data = {
        name: name.trim(),
        company_id: finalCompanyId || null,
        location_id: finalLocationId || null,
        pasted_text: inputMethod === 'text' || inputMethod === 'url' ? pastedText || null : null,
        file_url: inputMethod === 'file' ? fileUrl || null : null,
        source_type: inputMethod,
        source_url: inputMethod === 'url' ? sourceUrl || null : null,
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

  const applyExtractedData = (extracted: any) => {
    if (!extracted) return

    if (extracted.title) setName(extracted.title)

    if (extracted.company) {
      const normalizedExtractedCompany = normalizeField(extracted.company)
      const existingCompany = companies.find(
        (c) => normalizeField(c.name) === normalizedExtractedCompany
      )
      if (existingCompany) {
        setCompanyId(existingCompany.id)
      } else {
        setNewCompanyName(extracted.company.trim())
        setShowNewCompany(true)
      }
    }

    if (extracted.location) {
      const normalizedExtractedLocation = {
        city: sanitizeLocationField(extracted.location.city),
        state: sanitizeLocationField(extracted.location.state),
        country: sanitizeLocationField(extracted.location.country),
      }

      const locationStr = [
        normalizedExtractedLocation.city,
        normalizedExtractedLocation.state,
        normalizedExtractedLocation.country,
      ]
        .filter(Boolean)
        .join(', ')

      const existingLocation = locations.find(
        (l) =>
          normalizeField(l.city) === normalizeField(normalizedExtractedLocation.city) &&
          normalizeField(l.state) === normalizeField(normalizedExtractedLocation.state) &&
          normalizeField(l.country) === normalizeField(normalizedExtractedLocation.country)
      )
      if (existingLocation) {
        setLocationId(existingLocation.id)
      } else if (locationStr) {
        setNewLocationData({
          city: normalizedExtractedLocation.city || '',
          state: normalizedExtractedLocation.state || '',
          country: normalizedExtractedLocation.country || '',
        })
        setShowNewLocation(true)
      }
    }
  }

  /**
   * Apply JSON-LD JobPosting structured data directly to the form.
   * Higher priority than heuristic extraction — called after processContent() to override.
   */
  const applyExtractedDataFromJsonLd = (jsonLd: JsonLdJob) => {
    if (jsonLd.title) setName(jsonLd.title)

    if (jsonLd.company) {
      const normalizedCompany = normalizeField(jsonLd.company)
      const existingCompany = companies.find((c) => normalizeField(c.name) === normalizedCompany)
      if (existingCompany) {
        setCompanyId(existingCompany.id)
        setShowNewCompany(false)
      } else {
        setNewCompanyName(jsonLd.company.trim())
        setShowNewCompany(true)
      }
    }

    if (jsonLd.location) {
      const loc = {
        city: sanitizeLocationField(jsonLd.location.city),
        state: sanitizeLocationField(jsonLd.location.state),
        country: sanitizeLocationField(jsonLd.location.country),
      }
      const locationStr = [loc.city, loc.state, loc.country].filter(Boolean).join(', ')
      const existingLocation = locations.find(
        (l) =>
          normalizeField(l.city) === normalizeField(loc.city) &&
          normalizeField(l.state) === normalizeField(loc.state) &&
          normalizeField(l.country) === normalizeField(loc.country)
      )
      if (existingLocation) {
        setLocationId(existingLocation.id)
        setShowNewLocation(false)
      } else if (locationStr) {
        setNewLocationData({
          city: loc.city || '',
          state: loc.state || '',
          country: loc.country || '',
        })
        setShowNewLocation(true)
      }
    }
  }

  const processContent = (content: string) => {
    if (!content.trim()) return

    session.info('Processing content for extraction', {
      contentLength: content.length,
      inputMethod: inputMethod,
    })

    try {
      const extracted = extractJobDescriptionInfo(content, session.getSessionId())
      setExtractedData(extracted)
      const meta = (extracted?.extractionMeta || {}) as ExtractionMetaView
      const overallConfidence = meta.confidence?.overall || 0
      const shouldAutoApply =
        overallConfidence >= AUTO_APPLY_CONFIDENCE_THRESHOLD && !(meta.warnings || []).length

      if (shouldAutoApply) {
        applyExtractedData(extracted)
        setPendingApply(false)
      } else {
        setPendingApply(true)
      }

      session.info('Extraction decision', {
        extractionRules: meta.rules || [],
        extractionWarnings: meta.warnings || [],
        extractionConfidence: meta.confidence || null,
        autoApplied: shouldAutoApply,
      })

      setShowExtracted(true)

      toast({
        title: shouldAutoApply ? 'Information Auto-Applied' : 'Information Extracted',
        description: shouldAutoApply
          ? 'Job information was auto-populated. Please review before saving.'
          : 'Review extracted fields and click Apply Extracted Fields.',
      })
    } catch (error) {
      console.error('Error extracting content:', error)
      toast({
        title: 'Extraction Error',
        description: 'Could not extract information. Please fill manually.',
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    setOpen(false)
    setName(jobDescription?.name || '')
    setCompanyId(jobDescription?.company_id || '')
    setLocationId(jobDescription?.location_id || '')
    setPastedText(jobDescription?.pasted_text || '')
    setFileUrl(jobDescription?.file_url || '')
    setSourceUrl(jobDescription?.source_url || '')
    setInputMethod(
      (jobDescription?.source_type as 'file' | 'text' | 'url' | undefined) ||
        (jobDescription?.file_url ? 'file' : jobDescription?.source_url ? 'url' : 'text')
    )
    setNewCompanyName('')
    setShowNewCompany(false)
    setNewLocationData({ city: '', state: '', country: '' })
    setShowNewLocation(false)
    setShowExtracted(false)
    setExtractedData(null)
    setPendingApply(false)
    onClose?.()
  }

  const handleFileUpload = (
    url: string,
    fileName: string,
    extractedContent?: { text?: string }
  ) => {
    setFileUrl(url)

    // Auto-populate job title from filename if it's empty
    if (!name.trim() && fileName) {
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
      const cleanName = nameWithoutExt.replace(/[-_]/g, ' ')
      setName(cleanName)
    }

    // Process extracted text immediately
    if (extractedContent?.text) {
      processContent(extractedContent.text)
    }
  }

  const handleTextPaste = (text: string) => {
    setPastedText(text)
    if (text.trim().length > 20) {
      processContent(text)
    }
  }

  /**
   * Sites known to block automated fetches. Keyed by hostname substring.
   * When the edge function returns blocked_host, we match against these for friendlier copy.
   */
  const KNOWN_BLOCKED_SITES: Array<{ host: string; name: string; hint: string }> = [
    {
      host: 'seek.com',
      name: 'Seek',
      hint: 'Seek actively blocks automated access. Open the job page, copy all the text, and paste it using Paste Text.',
    },
    {
      host: 'indeed.com',
      name: 'Indeed',
      hint: 'Indeed blocks automated fetch. Open the job page, copy all the text, and paste it using Paste Text.',
    },
    {
      host: 'glassdoor.com',
      name: 'Glassdoor',
      hint: 'Glassdoor blocks automated fetch. Open the job page, copy all the text, and paste it using Paste Text.',
    },
  ]

  const buildUrlFailureDetails = (error: unknown): UrlFailureDetails => {
    const message = error instanceof Error ? error.message : String(error || '')
    const lower = message.toLowerCase()
    // The edge function injects blocked_host into the error data via the hook
    const blockedHost: string =
      (error as any)?.blocked_host || (error as any)?.data?.blocked_host || ''

    if (lower.includes('(403)')) {
      const known = KNOWN_BLOCKED_SITES.find((s) => blockedHost.includes(s.host))
      return {
        title: known ? `${known.name} blocks automated access` : 'URL blocked by source site',
        reason: known
          ? `${known.name} denies automated fetch requests.`
          : 'The source site denied automated fetch access (HTTP 403).',
        action: known ? known.hint : 'Use Paste Text or Upload File.',
      }
    }

    if (lower.includes('(404)')) {
      return {
        title: 'URL not accessible',
        reason: 'The job URL returned not found (HTTP 404).',
        action: 'Verify the URL is correct, or use Paste Text.',
      }
    }

    if (
      lower.includes('failed to send a request to the edge function') ||
      lower.includes('networkerror') ||
      lower.includes('failed to fetch')
    ) {
      return {
        title: 'Service/network issue',
        reason: 'Smart ATS could not reach the ingestion service.',
        action: 'Refresh session and retry, then use Paste Text if it persists.',
      }
    }

    if (lower.includes('origin not allowed')) {
      return {
        title: 'Environment restriction',
        reason: 'Current app origin is not allowed for URL ingestion.',
        action: 'Contact your admin or switch to Paste Text.',
      }
    }

    return {
      title: 'URL ingestion failed',
      reason: 'The source content could not be retrieved or parsed for this URL.',
      action: 'Use Paste Text or Upload File.',
    }
  }

  const handleIngestFromUrl = async () => {
    if (!sourceUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'URL required',
        description: 'Enter a valid job description URL.',
      })
      return
    }

    setUrlFailure(null)

    try {
      const result = await ingestUrl.mutateAsync(sourceUrl)
      setPastedText(result.extracted_text)

      const hasJsonLd = !!result.jsonld_job

      // --- Determine job title for the Name field ---
      if (!name.trim()) {
        if (result.jsonld_job?.title) {
          setName(result.jsonld_job.title)
        } else if (result.is_spa_shell && result.title_hint) {
          setName(result.title_hint)
        } else if (result.page_title) {
          setName(result.page_title)
        }
      }

      // --- Warn only when SPA shell AND no JSON-LD fallback ---
      if (result.is_spa_shell && !hasJsonLd) {
        setUrlFailure({
          title: 'Partial content — page uses JavaScript rendering',
          reason:
            'This employer career page loads content via JavaScript, so only the page shell was fetched. Fields may be incomplete.',
          action: 'Copy the job description text and use Paste Text for best results.',
          variant: 'warning',
        })
      } else {
        setUrlFailure(null)
      }

      // SPA shell with no JSON-LD = pure navigation/footer garbage.
      // Running heuristic extraction on it produces wrong title/company/location —
      // skip it entirely and leave the slug title_hint already set above.
      if (!result.is_spa_shell || hasJsonLd) {
        // Run heuristic extraction (sets extractedData, extracts skills, shows panel)
        processContent(result.extracted_text)
      }

      // --- If JSON-LD is present, override form fields with structured data ---
      // This runs after processContent so it wins over heuristic extraction.
      if (hasJsonLd) {
        applyExtractedDataFromJsonLd(result.jsonld_job!)
      }

      toast({
        title: hasJsonLd
          ? 'Job data extracted from structured schema'
          : result.is_spa_shell
            ? 'Partial content fetched'
            : 'URL ingested',
        description: hasJsonLd
          ? "Title, company, and location were read from the page's JobPosting schema. Review before saving."
          : result.is_spa_shell
            ? 'Page uses JavaScript rendering — review fields carefully or switch to Paste Text.'
            : 'Job content was fetched and extracted. Review fields before saving.',
      })
    } catch (error) {
      setUrlFailure(buildUrlFailureDetails(error))
      setInputMethod('text')
    }
  }

  const formatLocationName = (location: any) => {
    const parts = [location.city, location.state, location.country].filter(Boolean)
    return parts.join(', ')
  }

  const getAppliedCompanyName = () => {
    if (companyId) {
      const selected = companies.find((c) => c.id === companyId)
      if (selected) return selected.name
    }
    if (showNewCompany && newCompanyName.trim()) return newCompanyName.trim()
    return ''
  }

  const getAppliedLocationName = () => {
    if (locationId) {
      const selected = locations.find((l) => l.id === locationId)
      if (selected) return formatLocationName(selected)
    }
    if (showNewLocation) {
      return [newLocationData.city, newLocationData.state, newLocationData.country]
        .filter(Boolean)
        .join(', ')
    }
    return ''
  }

  const handleCopyDebugPayload = async () => {
    if (!extractedData) return

    const payload = {
      timestamp: new Date().toISOString(),
      source_url: sourceUrl || null,
      input_method: inputMethod,
      raw_extracted: {
        title: extractedData.title || null,
        company: extractedData.company || null,
        location: {
          city: extractedData.location?.city || null,
          state: extractedData.location?.state || null,
          country: extractedData.location?.country || null,
        },
        rules: extractedData.extractionMeta?.rules || [],
        warnings: extractedData.extractionMeta?.warnings || [],
        confidence: extractedData.extractionMeta?.confidence || null,
      },
      applied_form: {
        title: name || null,
        company: getAppliedCompanyName() || null,
        location: getAppliedLocationName() || null,
        pending_apply: pendingApply,
      },
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      toast({
        title: 'Debug payload copied',
        description: 'Extraction debug JSON copied to clipboard.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Could not copy debug payload to clipboard.',
      })
    }
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
                      onChange={(e) =>
                        setNewLocationData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="City"
                      disabled={isLoading}
                    />
                    <Input
                      value={newLocationData.state}
                      onChange={(e) =>
                        setNewLocationData((prev) => ({ ...prev, state: e.target.value }))
                      }
                      placeholder="State/Province"
                      disabled={isLoading}
                    />
                    <Input
                      value={newLocationData.country}
                      onChange={(e) =>
                        setNewLocationData((prev) => ({ ...prev, country: e.target.value }))
                      }
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
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Before You Ingest</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 text-xs">
                  <p>
                    Use <strong>Paste Text</strong> first for best reliability, especially for
                    login-gated pages (for example LinkedIn).
                  </p>
                  <p>
                    Use <strong>URL</strong> only for direct public job pages. Single-page fetch
                    only, no crawler behavior.
                  </p>
                  <p>
                    If URL ingestion fails, switch to <strong>Paste Text</strong> or{' '}
                    <strong>Upload File</strong>.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
            <Tabs
              value={inputMethod}
              onValueChange={(value) => setInputMethod(value as 'file' | 'text' | 'url')}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
                <TabsTrigger value="url">Use URL</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Upload PDF/DOC/DOCX job files exported by recruiters or ATS tools.
                </p>
                <JobDescriptionFileUpload
                  bucket="SATS_job_documents"
                  onUpload={handleFileUpload}
                  disabled={isLoading}
                />
                {fileUrl && (
                  <p className="text-sm text-muted-foreground">File uploaded successfully</p>
                )}
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Recommended for protected pages. Paste the full job summary, responsibilities, and
                  requirements.
                </p>
                <Textarea
                  value={pastedText}
                  onChange={(e) => handleTextPaste(e.target.value)}
                  placeholder="Paste job description text here..."
                  className="min-h-[200px]"
                  disabled={isLoading}
                />
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5" />
                  Use only direct public URLs. If blocked, Smart ATS will not bypass login or
                  anti-bot controls.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="source-url">Job Description URL</Label>
                  <Input
                    id="source-url"
                    value={sourceUrl}
                    onChange={(e) => {
                      setSourceUrl(e.target.value)
                      if (urlFailure) setUrlFailure(null)
                    }}
                    placeholder="https://example.com/jobs/role"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleIngestFromUrl}
                    disabled={isLoading || !sourceUrl.trim()}
                  >
                    {ingestUrl.isPending ? 'Fetching...' : 'Fetch and Extract'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Single URL fetch only. No crawler behavior.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setInputMethod('text')}
                    disabled={isLoading}
                  >
                    Switch to Paste Text
                  </Button>
                </div>
                {pastedText && (
                  <div className="space-y-2">
                    <Label>Fetched Content Preview</Label>
                    <Textarea value={pastedText} readOnly className="min-h-[140px]" />
                  </div>
                )}
                {urlFailure && (
                  <Alert
                    variant={urlFailure.variant === 'warning' ? 'default' : 'destructive'}
                    className={`py-3 ${urlFailure.variant === 'warning' ? 'border-amber-400 bg-amber-50 text-amber-900' : ''}`}
                  >
                    <Info className="h-4 w-4" />
                    <AlertTitle className="text-sm">{urlFailure.title}</AlertTitle>
                    <AlertDescription className="text-xs space-y-1">
                      <p>{urlFailure.reason}</p>
                      <p className="font-medium">Recommended: {urlFailure.action}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Extracted Information Display */}
          {showExtracted && extractedData && (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Auto-Extracted Information</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowExtracted(false)}>
                  ✕
                </Button>
              </div>
              <div className="grid gap-2 text-sm">
                {(extractedData.extractionMeta?.warnings || []).length > 0 && (
                  <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                    {(extractedData.extractionMeta.warnings as string[]).join(' ')}
                  </div>
                )}
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
                      {[
                        extractedData.location.city,
                        extractedData.location.state,
                        extractedData.location.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {extractedData.skills && extractedData.skills.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Skills Found:</span>
                    <span className="text-right text-xs">
                      {extractedData.skills.slice(0, 3).join(', ')}
                      {extractedData.skills.length > 3 &&
                        ` +${extractedData.skills.length - 3} more`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Confidence:</span>
                  <span>
                    {Math.round(
                      ((extractedData.extractionMeta?.confidence?.overall as number | undefined) ||
                        0) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Applied Rules:</span>
                  <span className="text-right">
                    {((extractedData.extractionMeta?.rules as string[] | undefined) || []).join(
                      ', '
                    ) || 'none'}
                  </span>
                </div>
              </div>
              {pendingApply && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    applyExtractedData(extractedData)
                    setPendingApply(false)
                  }}
                >
                  Apply Extracted Fields
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {pendingApply
                  ? 'Extraction confidence is medium/low. Review and apply fields manually.'
                  : 'Information has been auto-populated above. You can edit any fields before saving.'}
              </p>
            </div>
          )}

          {isAdmin && showExtracted && extractedData && (
            <div className="rounded-lg border border-dashed p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Debug: Raw Extracted vs Applied Fields</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Admin only</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCopyDebugPayload}
                  >
                    Copy Debug Payload
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 text-xs">
                <div className="grid grid-cols-3 gap-2 font-medium text-muted-foreground">
                  <span>Field</span>
                  <span>Raw Extracted</span>
                  <span>Applied (Current Form)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium">Title</span>
                  <span className="font-mono break-words">{extractedData.title || '-'}</span>
                  <span className="font-mono break-words">{name || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium">Company</span>
                  <span className="font-mono break-words">{extractedData.company || '-'}</span>
                  <span className="font-mono break-words">{getAppliedCompanyName() || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium">Location</span>
                  <span className="font-mono break-words">
                    {[
                      extractedData.location?.city,
                      extractedData.location?.state,
                      extractedData.location?.country,
                    ]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </span>
                  <span className="font-mono break-words">{getAppliedLocationName() || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium">Rules</span>
                  <span className="font-mono break-words">
                    {((extractedData.extractionMeta?.rules as string[] | undefined) || []).join(
                      ', '
                    ) || '-'}
                  </span>
                  <span className="font-mono break-words">
                    {pendingApply ? 'pending_manual_apply' : 'applied_or_manual_edit'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading
                ? 'Saving...'
                : isEditing
                  ? 'Update Job Description'
                  : 'Create Job Description'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
