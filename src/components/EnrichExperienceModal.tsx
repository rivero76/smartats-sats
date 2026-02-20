/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed enrichment modal updates and added timestamped file header tracking.
 * 2026-02-21 00:40:00 | Implemented product/usability enhancements: evidence checklist, tone controls, batch actions, progress state, and metrics instrumentation.
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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Wand2,
  ShieldCheck,
  XCircle,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gauge,
} from 'lucide-react'
import { useATSAnalyses } from '@/hooks/useATSAnalyses'
import {
  EnrichmentSuggestion,
  useGenerateEnrichmentSuggestions,
  useSaveEnrichedExperience,
} from '@/hooks/useEnrichedExperiences'
import { createScriptLogger } from '@/lib/centralizedLogger'

type ToneMode = 'assertive' | 'balanced' | 'conservative'
type WorkflowState = 'input' | 'generating' | 'reviewing' | 'saved'
type DecisionReason =
  | 'not_relevant'
  | 'too_strong'
  | 'not_accurate'
  | 'duplicate'
  | 'other'

interface EnrichExperienceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAnalysisId?: string
}

interface SuggestionReviewState {
  text: string
  evidenceDone: boolean
  canExplain: boolean
  metricVerified: boolean
  metricWarningAcknowledged: boolean
  rejectReason: DecisionReason
  traceExpanded: boolean
  generatedAt: string
}

const logger = createScriptLogger('enrich-experiences-client')

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const getSuggestionKey = (suggestion: EnrichmentSuggestion): string =>
  `${suggestion.skill_name}::${suggestion.suggestion}::${suggestion.derived_context || ''}`

const hasNumericClaims = (text: string): boolean =>
  /\b\d+([.,]\d+)?\s?(%|k|m|b|x|users?|days?|hours?|months?|years?)\b/i.test(text)

const applyTone = (text: string, tone: ToneMode): string => {
  if (tone === 'assertive') return text

  let output = text
  if (tone === 'balanced') {
    output = output
      .replace(/\bLed\b/g, 'Collaborated to lead')
      .replace(/\bArchitected\b/g, 'Contributed to architecting')
      .replace(/\bDrove\b/g, 'Supported')
      .replace(/\bReduced\b/g, 'Helped reduce')
      .replace(/\bIncreased\b/g, 'Helped increase')
      .replace(/\bDelivered\b/g, 'Contributed to delivering')
    return output
  }

  output = output
    .replace(/\bLed\b/g, 'Supported')
    .replace(/\bArchitected\b/g, 'Contributed to architecture of')
    .replace(/\bDrove\b/g, 'Helped')
    .replace(/\bReduced\b/g, 'Contributed to reducing')
    .replace(/\bIncreased\b/g, 'Contributed to increasing')
    .replace(/\bDelivered\b/g, 'Assisted with delivering')

  if (hasNumericClaims(output)) {
    output = output.replace(/\b\d+([.,]\d+)?\s?(%|k|m|b|x|users?|days?|hours?|months?|years?)\b/gi, 'measurable outcomes')
  }

  return output
}

const buildInitialReviewState = (
  suggestions: EnrichmentSuggestion[]
): Record<string, SuggestionReviewState> => {
  const now = new Date().toISOString()
  return suggestions.reduce<Record<string, SuggestionReviewState>>((acc, suggestion) => {
    acc[getSuggestionKey(suggestion)] = {
      text: suggestion.suggestion,
      evidenceDone: suggestion.skill_type === 'explicit',
      canExplain: suggestion.skill_type === 'explicit',
      metricVerified: !hasNumericClaims(suggestion.suggestion),
      metricWarningAcknowledged: !hasNumericClaims(suggestion.suggestion),
      rejectReason: 'not_relevant',
      traceExpanded: false,
      generatedAt: now,
    }
    return acc
  }, {})
}

const getEvidenceStrength = (
  suggestion: EnrichmentSuggestion,
  reviewState: SuggestionReviewState | undefined
): number => {
  let score = suggestion.skill_type === 'explicit' ? 78 : 58
  if (suggestion.derived_context) score += 10
  if (suggestion.explanation) score += 8
  if (reviewState?.evidenceDone) score += 8
  if (reviewState?.canExplain) score += 8
  if (reviewState?.metricVerified || reviewState?.metricWarningAcknowledged) score += 6
  if (suggestion.skill_type === 'inferred' && hasNumericClaims(reviewState?.text || suggestion.suggestion)) {
    score -= 8
  }
  return clamp(score, 20, 99)
}

export const EnrichExperienceModal = ({ open, onOpenChange, initialAnalysisId }: EnrichExperienceModalProps) => {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('')
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([])
  const [reviewStates, setReviewStates] = useState<Record<string, SuggestionReviewState>>({})
  const [toneMode, setToneMode] = useState<ToneMode>('balanced')
  const [workflowState, setWorkflowState] = useState<WorkflowState>('input')
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [editedCount, setEditedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)

  const { toast } = useToast()
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
      setReviewStates({})
      setToneMode('balanced')
      setWorkflowState('input')
      setAcceptedCount(0)
      setEditedCount(0)
      setRejectedCount(0)
      generate.reset()
    }
  }, [open, generate])

  useEffect(() => {
    if (open && initialAnalysisId) {
      setSelectedAnalysisId(initialAnalysisId)
    }
  }, [open, initialAnalysisId])

  const setReviewState = (suggestion: EnrichmentSuggestion, next: Partial<SuggestionReviewState>) => {
    const key = getSuggestionKey(suggestion)
    setReviewStates((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {
          text: suggestion.suggestion,
          evidenceDone: false,
          canExplain: false,
          metricVerified: false,
          metricWarningAcknowledged: false,
          rejectReason: 'not_relevant',
          traceExpanded: false,
          generatedAt: new Date().toISOString(),
        }),
        ...next,
      },
    }))
  }

  const removeSuggestion = (suggestion: EnrichmentSuggestion) => {
    const suggestionKey = getSuggestionKey(suggestion)
    setSuggestions((prev) => prev.filter((item) => getSuggestionKey(item) !== suggestionKey))
  }

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedAnalysis) return

    setWorkflowState('generating')
    logger.info('Enrichment generation started from modal', {
      event_name: 'enrichment.generation_started',
      component: 'EnrichExperienceModal',
      operation: 'generate_suggestions',
      outcome: 'start',
      details: {
        analysis_id: selectedAnalysis.id,
        resume_id: selectedAnalysis.resume_id,
        jd_id: selectedAnalysis.jd_id,
      },
    })

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
          setReviewStates(buildInitialReviewState(result))
          setWorkflowState(result.length > 0 ? 'reviewing' : 'input')
        },
        onError: () => {
          setWorkflowState('input')
        },
      }
    )
  }

  const validateBeforeSave = (
    suggestion: EnrichmentSuggestion,
    reviewState: SuggestionReviewState | undefined,
    userAction: 'accepted' | 'edited'
  ): boolean => {
    const text = reviewState?.text || suggestion.suggestion
    const needsMetricGuard = hasNumericClaims(text)

    if (needsMetricGuard && !reviewState?.metricWarningAcknowledged) {
      toast({
        variant: 'destructive',
        title: 'Confirm metric accuracy first',
        description: 'Please acknowledge or verify numeric claims before saving.',
      })
      return false
    }

    if (suggestion.skill_type === 'inferred' && userAction !== 'rejected') {
      if (!reviewState?.evidenceDone || !reviewState?.canExplain || !reviewState?.metricVerified) {
        toast({
          variant: 'destructive',
          title: 'Evidence checklist incomplete',
          description: 'For inferred skills, complete all trust checks before saving.',
        })
        return false
      }
    }

    return true
  }

  const handleDecision = async (
    suggestion: EnrichmentSuggestion,
    action: 'accepted' | 'edited' | 'rejected'
  ) => {
    if (!selectedAnalysis) return

    const state = reviewStates[getSuggestionKey(suggestion)]
    const currentText = state?.text ?? suggestion.suggestion
    const finalText = currentText.trim()
    const userAction =
      action === 'rejected'
        ? 'rejected'
        : finalText !== suggestion.suggestion.trim()
          ? 'edited'
          : 'accepted'

    if (userAction !== 'rejected' && !validateBeforeSave(suggestion, state, userAction)) {
      return
    }

    try {
      await saveExperience.mutateAsync({
        analysis_id: selectedAnalysis.id,
        resume_id: selectedAnalysis.resume_id,
        jd_id: selectedAnalysis.jd_id,
        skill_name: suggestion.skill_name,
        skill_type: suggestion.skill_type,
        suggestion: finalText,
        explanation: suggestion.explanation,
        confidence_score: suggestion.confidence,
        user_action: userAction,
        source: {
          derived_context: suggestion.derived_context,
          tone_mode: toneMode,
          generated_at: state?.generatedAt,
          decision_reason: userAction === 'rejected' ? state?.rejectReason : null,
          evidence_checklist: {
            evidence_done: state?.evidenceDone || false,
            can_explain: state?.canExplain || false,
            metric_verified: state?.metricVerified || false,
            metric_warning_acknowledged: state?.metricWarningAcknowledged || false,
          },
          role_relevance_score: Math.round(clamp(suggestion.confidence * 100, 0, 100)),
          evidence_strength_score: getEvidenceStrength(suggestion, state),
          interview_safe: userAction === 'edited',
          has_numeric_claims: hasNumericClaims(finalText),
        },
      })

      if (userAction === 'accepted') setAcceptedCount((prev) => prev + 1)
      if (userAction === 'edited') setEditedCount((prev) => prev + 1)
      if (userAction === 'rejected') setRejectedCount((prev) => prev + 1)

      logger.info('Enrichment suggestion decision recorded', {
        event_name: 'enrichment.suggestion_decision',
        component: 'EnrichExperienceModal',
        operation: 'save_decision',
        outcome: 'success',
        details: {
          action: userAction,
          skill_name: suggestion.skill_name,
          skill_type: suggestion.skill_type,
          tone_mode: toneMode,
        },
      })

      removeSuggestion(suggestion)
    } catch {
      // Handled by hook toast.
    }
  }

  const handleBatchDecision = async (action: 'accepted' | 'rejected') => {
    if (!selectedAnalysis || suggestions.length === 0) return

    let processed = 0
    const queue = [...suggestions]
    for (const currentSuggestion of queue) {
      const state = reviewStates[getSuggestionKey(currentSuggestion)]
      if (
        action === 'accepted' &&
        !validateBeforeSave(
          currentSuggestion,
          state,
          state?.text.trim() !== currentSuggestion.suggestion.trim() ? 'edited' : 'accepted'
        )
      ) {
        continue
      }

      try {
        await handleDecision(currentSuggestion, action === 'accepted' ? 'accepted' : 'rejected')
        processed += 1
      } catch {
        // Individual failures already surfaced.
        continue
      }
    }

    if (processed > 0) {
      toast({
        title: 'Batch update complete',
        description: `Processed ${processed} suggestions.`,
      })
    }
  }

  const hasSuggestions = suggestions.length > 0
  const totalReviewed = acceptedCount + editedCount + rejectedCount

  useEffect(() => {
    if (!hasSuggestions && totalReviewed > 0) {
      setWorkflowState('saved')
    }
  }, [hasSuggestions, totalReviewed])

  const progressLabel =
    workflowState === 'generating'
      ? 'Generating'
      : workflowState === 'reviewing'
        ? 'Reviewing'
        : workflowState === 'saved'
          ? 'Saved'
          : 'Input'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>AI Experience Enrichment</DialogTitle>
          <DialogDescription>
            Select an ATS analysis and let the enrichment engine infer missing-yet-relevant
            experiences. Approve or edit each suggestion before saving it to your knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <span>Workflow status:</span>
            <Badge variant="outline">{progressLabel}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Reviewed: {totalReviewed} | Remaining: {suggestions.length}
          </div>
        </div>

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
                    {analysis.resume?.name || 'Untitled Resume'} {'->'}{' '}
                    {analysis.job_description?.name || 'Job Description'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sentence Tone</Label>
            <RadioGroup
              value={toneMode}
              onValueChange={(value) => setToneMode(value as ToneMode)}
              className="grid grid-cols-1 gap-2 md:grid-cols-3"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <RadioGroupItem value="assertive" />
                Assertive
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <RadioGroupItem value="balanced" />
                Balanced
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <RadioGroupItem value="conservative" />
                Conservative
              </Label>
            </RadioGroup>
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
              className="min-w-[190px]"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
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
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Review & Approve
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saveExperience.isPending}
                  onClick={() => handleBatchDecision('rejected')}
                >
                  Reject All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saveExperience.isPending}
                  onClick={() => handleBatchDecision('accepted')}
                >
                  Save All
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[360px] pr-4">
              <div className="space-y-4">
                {suggestions.map((suggestion) => {
                  const key = getSuggestionKey(suggestion)
                  const reviewState = reviewStates[key]
                  const textValue = reviewState?.text ?? suggestion.suggestion
                  const roleRelevance = Math.round(clamp(suggestion.confidence * 100, 0, 100))
                  const evidenceStrength = getEvidenceStrength(suggestion, reviewState)
                  const inferredNeedsChecklist = suggestion.skill_type === 'inferred'
                  const hasMetrics = hasNumericClaims(textValue)
                  const edited = textValue.trim() !== suggestion.suggestion.trim()

                  return (
                    <Card key={key}>
                      <CardHeader className="gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            {suggestion.skill_name}
                            <Badge variant="secondary">{suggestion.skill_type}</Badge>
                            {edited && <Badge variant="outline">Interview-safe check enabled</Badge>}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline">Role Relevance {roleRelevance}%</Badge>
                            <Badge variant="outline">Evidence Strength {evidenceStrength}%</Badge>
                          </div>
                        </div>
                        {suggestion.explanation && (
                          <CardDescription>{suggestion.explanation}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          value={textValue}
                          onChange={(event) =>
                            setReviewState(suggestion, { text: event.target.value })
                          }
                          className="min-h-[110px]"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReviewState(suggestion, {
                                text: applyTone(suggestion.suggestion, toneMode),
                              })
                            }
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Apply Tone
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReviewState(suggestion, {
                                text: applyTone(textValue, 'conservative'),
                              })
                            }
                          >
                            Soften Claim
                          </Button>
                        </div>

                        {hasMetrics && (
                          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                            <div className="mb-2 flex items-center gap-2 text-amber-800">
                              <AlertTriangle className="h-4 w-4" />
                              Numeric claims detected. Verify numbers before saving.
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`metric-warning-${key}`}
                                checked={reviewState?.metricWarningAcknowledged || false}
                                onCheckedChange={(checked) =>
                                  setReviewState(suggestion, {
                                    metricWarningAcknowledged: checked === true,
                                  })
                                }
                              />
                              <Label htmlFor={`metric-warning-${key}`}>
                                I verified or updated these numbers to be accurate.
                              </Label>
                            </div>
                          </div>
                        )}

                        {inferredNeedsChecklist && (
                          <div className="rounded-md border bg-muted/20 p-3">
                            <div className="mb-2 text-sm font-medium">Evidence Required (Inferred Skill)</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`done-${key}`}
                                  checked={reviewState?.evidenceDone || false}
                                  onCheckedChange={(checked) =>
                                    setReviewState(suggestion, { evidenceDone: checked === true })
                                  }
                                />
                                <Label htmlFor={`done-${key}`}>I have done this in real work.</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`explain-${key}`}
                                  checked={reviewState?.canExplain || false}
                                  onCheckedChange={(checked) =>
                                    setReviewState(suggestion, { canExplain: checked === true })
                                  }
                                />
                                <Label htmlFor={`explain-${key}`}>
                                  I can explain this clearly in an interview.
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`metric-${key}`}
                                  checked={reviewState?.metricVerified || false}
                                  onCheckedChange={(checked) =>
                                    setReviewState(suggestion, { metricVerified: checked === true })
                                  }
                                />
                                <Label htmlFor={`metric-${key}`}>
                                  Any metrics are verified, or replaced with honest scope.
                                </Label>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-md border bg-muted/20 p-3">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto p-0 text-sm"
                            onClick={() =>
                              setReviewState(suggestion, {
                                traceExpanded: !reviewState?.traceExpanded,
                              })
                            }
                          >
                            {reviewState?.traceExpanded ? (
                              <ChevronUp className="mr-1 h-4 w-4" />
                            ) : (
                              <ChevronDown className="mr-1 h-4 w-4" />
                            )}
                            Why this is suggested
                          </Button>
                          {reviewState?.traceExpanded && (
                            <div className="mt-2 text-sm text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium text-foreground">Explanation:</span>{' '}
                                {suggestion.explanation || 'No explicit explanation provided.'}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Evidence Trace:</span>{' '}
                                {suggestion.derived_context || 'Derived from ATS context and skill alignment.'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                          <Select
                            value={reviewState?.rejectReason || 'not_relevant'}
                            onValueChange={(value) =>
                              setReviewState(suggestion, { rejectReason: value as DecisionReason })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Rejection reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_relevant">Not relevant</SelectItem>
                              <SelectItem value="too_strong">Too strong of a claim</SelectItem>
                              <SelectItem value="not_accurate">Not accurate</SelectItem>
                              <SelectItem value="duplicate">Duplicate suggestion</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={saveExperience.isPending}
                            onClick={() => handleDecision(suggestion, 'rejected')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>

                          <Button
                            type="button"
                            disabled={saveExperience.isPending}
                            onClick={() => handleDecision(suggestion, edited ? 'edited' : 'accepted')}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            {edited ? 'Save Edited' : 'Save Experience'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {!hasSuggestions && !generate.isPending && (
          <div className="text-center text-sm text-muted-foreground border border-dashed rounded-md p-6">
            {workflowState === 'saved'
              ? 'All reviewed suggestions were saved. You can generate a new batch.'
              : 'Select an analysis and click "Generate Suggestions" to begin.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
