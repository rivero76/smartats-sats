/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed enrichment modal updates and added timestamped file header tracking.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Wand2, ShieldCheck, XCircle } from 'lucide-react'
import { useATSAnalyses } from '@/hooks/useATSAnalyses'
import {
  EnrichmentSuggestion,
  useGenerateEnrichmentSuggestions,
  useSaveEnrichedExperience,
} from '@/hooks/useEnrichedExperiences'

interface EnrichExperienceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAnalysisId?: string
}

export const EnrichExperienceModal = ({ open, onOpenChange, initialAnalysisId }: EnrichExperienceModalProps) => {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('')
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([])
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const { data: analyses, isLoading: analysesLoading } = useATSAnalyses()
  const generate = useGenerateEnrichmentSuggestions()
  const saveExperience = useSaveEnrichedExperience()

  const selectedAnalysis = useMemo(
    () => analyses?.find((analysis) => analysis.id === selectedAnalysisId),
    [analyses, selectedAnalysisId]
  )

  useEffect(() => {
    if (!open) {
      setSelectedAnalysisId('')
      setSuggestions([])
      setDrafts({})
      generate.reset()
    }
  }, [open, generate])

  useEffect(() => {
    if (open && initialAnalysisId) {
      setSelectedAnalysisId(initialAnalysisId)
    }
  }, [open, initialAnalysisId])

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedAnalysis) return

    generate.mutate(
      {
        analysis_id: selectedAnalysis.id,
        resume_id: selectedAnalysis.resume_id,
        jd_id: selectedAnalysis.jd_id,
        matched_skills: selectedAnalysis.matched_skills || [],
        missing_skills: selectedAnalysis.missing_skills || [],
      },
      {
        onSuccess: (result) => {
          setSuggestions(result)
          const nextDrafts = result.reduce<Record<number, string>>((acc, suggestion, index) => {
            acc[index] = suggestion.suggestion
            return acc
          }, {})
          setDrafts(nextDrafts)
        },
      }
    )
  }

  const handleDecision = (
    suggestion: EnrichmentSuggestion,
    index: number,
    action: 'accepted' | 'edited' | 'rejected'
  ) => {
    if (!selectedAnalysis) return

    const finalText = drafts[index] ?? suggestion.suggestion
    const userAction =
      action === 'rejected'
        ? 'rejected'
        : finalText.trim() !== suggestion.suggestion.trim()
          ? 'edited'
          : 'accepted'

    saveExperience.mutate(
      {
        analysis_id: selectedAnalysis.id,
        resume_id: selectedAnalysis.resume_id,
        jd_id: selectedAnalysis.jd_id,
        skill_name: suggestion.skill_name,
        skill_type: suggestion.skill_type,
        suggestion: finalText.trim(),
        explanation: suggestion.explanation,
        confidence_score: suggestion.confidence,
        user_action: userAction,
        source: {
          derived_context: suggestion.derived_context,
        },
      },
      {
        onSuccess: () => {
          setSuggestions((prev) => prev.filter((_, idx) => idx !== index))
          setDrafts((prev) => {
            const next = { ...prev }
            delete next[index]
            return next
          })
        },
      }
    )
  }

  const hasSuggestions = suggestions.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI Experience Enrichment</DialogTitle>
          <DialogDescription>
            Select an ATS analysis and let the enrichment engine infer missing-yet-relevant
            experiences. Approve or edit each suggestion before saving it to your knowledge base.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-select">Choose an ATS Analysis</Label>
            <Select value={selectedAnalysisId} onValueChange={setSelectedAnalysisId}>
              <SelectTrigger id="analysis-select" disabled={analysesLoading || generate.isPending}>
                <SelectValue placeholder="Select resume + job pairing" />
              </SelectTrigger>
              <SelectContent>
                {analyses?.map((analysis) => (
                  <SelectItem key={analysis.id} value={analysis.id}>
                    {analysis.resume?.name || 'Untitled Resume'} →{' '}
                    {analysis.job_description?.name || 'Job Description'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Context Summary
                </CardTitle>
                <CardDescription>{selectedAnalysis.job_description?.name}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>
                  <span className="font-medium text-foreground">Matched Skills:</span>{' '}
                  {selectedAnalysis.matched_skills.join(', ') || 'None detected'}
                </div>
                <div>
                  <span className="font-medium text-foreground">Missing Skills:</span>{' '}
                  {selectedAnalysis.missing_skills.join(', ') || 'None detected'}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="flex-row justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              The enrichment engine uses GPT-4o with traceable explanations. Nothing is saved until
              you approve it.
            </div>
            <Button
              type="submit"
              disabled={!selectedAnalysis || generate.isPending}
              className="min-w-[170px]"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Suggestions...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        {hasSuggestions && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Review & Approve
            </h3>
            <ScrollArea className="max-h-[320px] pr-4">
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <Card key={`${suggestion.skill_name}-${index}`}>
                    <CardHeader className="gap-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {suggestion.skill_name}
                          <Badge variant="secondary">{suggestion.skill_type}</Badge>
                        </CardTitle>
                        <Badge variant="outline">
                          Confidence {(suggestion.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      {suggestion.explanation && (
                        <CardDescription>{suggestion.explanation}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={drafts[index] ?? suggestion.suggestion}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [index]: event.target.value }))
                        }
                        className="min-h-[110px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saveExperience.isPending}
                          onClick={() => handleDecision(suggestion, index, 'rejected')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          type="button"
                          disabled={saveExperience.isPending}
                          onClick={() => handleDecision(suggestion, index, 'accepted')}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Save Experience
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!hasSuggestions && !generate.isPending && (
          <div className="text-center text-sm text-muted-foreground border border-dashed rounded-md p-6">
            Select an analysis and click “Generate Suggestions” to begin.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
