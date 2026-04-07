/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added request_id visibility for log correlation in ATS debug modal.
 * 2026-03-17 00:10:00 | P18 trace: added score_breakdown, enrichments_used_count, and cv_optimisation_score
 *   to Overview tab so score regressions are diagnosable without querying the DB directly.
 * 2026-04-07 18:30:00 | UIUX redesign: feature gating (Pro/Max), renamed AI Output + Usage tabs,
 *   score-coloured breakdown bars, removed Warning N labels, Retry always visible,
 *   Model Details gated to byok (Max+), Score Breakdown gated to ats_score_breakdown (Pro+),
 *   CV Optimisation gated to cv_optimisation (Pro+).
 */
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  Loader2,
  Timer,
  DollarSign,
  Sparkles,
  Lock,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ATSAnalysis } from '@/hooks/useATSAnalyses'
import { useRetryATSAnalysis } from '@/hooks/useRetryATSAnalysis'
import { usePlanFeature } from '@/hooks/usePlanFeature'
import { format } from 'date-fns'

interface ATSDebugModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: ATSAnalysis | null
}

// ─── Private sub-components ───────────────────────────────────────────────────

function LockedTabContent({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="max-w-xs">
        <p className="font-medium text-sm mb-1">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
        Upgrade
      </Button>
    </div>
  )
}

function LockedPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative rounded-lg border border-dashed text-center overflow-hidden min-h-[140px] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 z-10">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground max-w-[180px]">{description}</p>
        <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
          Upgrade
        </Button>
      </div>
    </div>
  )
}

function LockedTabTrigger({
  value,
  locked,
  children,
}: {
  value: string
  locked: boolean
  children: React.ReactNode
}) {
  return (
    <TabsTrigger value={value} className="flex items-center gap-1">
      {locked && <Lock className="h-3 w-3 shrink-0 opacity-60" />}
      {children}
    </TabsTrigger>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ATSDebugModal({ open, onOpenChange, analysis }: ATSDebugModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const retryAnalysis = useRetryATSAnalysis()
  const { hasFeature } = usePlanFeature()

  if (!analysis) return null

  const canSeeBreakdown = hasFeature('ats_score_breakdown')
  const canSeeCvOpt = hasFeature('cv_optimisation')
  const canSeeEngineeringData = hasFeature('byok')

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast({ title: 'Copied to clipboard', description: `${fieldName} copied successfully` })
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  const analysisData = analysis.analysis_data || {}
  const rawLLMResponse = analysisData.raw_llm_response || {}
  const tokenUsage = analysisData.token_usage || {}
  const resumeWarnings: string[] = analysisData.resume_warnings || []
  const prompts = analysisData.prompts || {}
  const promptCharacters = analysisData.prompt_characters
  const costEstimate = analysisData.cost_estimate_usd
  const requestId = analysisData.request_id
  const scoreBreakdown = analysisData.score_breakdown || null
  const enrichmentsUsedCount: number = analysisData.enrichments_used_count ?? 0
  const cvOptimisationScore: number | null = analysisData.cv_optimisation_score ?? null
  const extractedFeatures: string[] =
    (Array.isArray(analysisData.extracted_features)
      ? analysisData.extracted_features
      : rawLLMResponse?.parsed_result?.keywords_found) || analysis.matched_skills

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
    if (value === 0) return '$0.0000'
    return `$${value < 0.01 ? value.toFixed(4) : value.toFixed(2)}`
  }

  const formatJSON = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  // Score bar colour keyed to value (0–1 scale)
  const breakdownBarColour = (value: number) => {
    const pct = Math.round(value * 100)
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 60) return 'bg-amber-400'
    return 'bg-red-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ATS Analysis Debug: {analysis.resume?.name} vs {analysis.job_description?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <LockedTabTrigger value="prompts" locked={!canSeeEngineeringData}>
              Prompts
            </LockedTabTrigger>
            <LockedTabTrigger value="output" locked={!canSeeEngineeringData}>
              AI Output
            </LockedTabTrigger>
            <LockedTabTrigger value="usage" locked={!canSeeEngineeringData}>
              Usage
            </LockedTabTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            {/* ── Overview ── */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Analysis Status — always visible */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Analysis Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status:</span>
                      <Badge
                        variant={
                          analysis.status === 'completed'
                            ? 'secondary'
                            : analysis.status === 'error'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {analysis.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Score:</span>
                      <span className="font-mono text-lg">{analysis.ats_score}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Created:</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(analysis.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {analysisData.processing_time_ms && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Processing Time:</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(analysisData.processing_time_ms / 1000)}s
                        </span>
                      </div>
                    )}
                    {resumeWarnings.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Warnings:</span>
                        <Badge variant="destructive" className="text-xs">
                          {resumeWarnings.length}
                        </Badge>
                      </div>
                    )}
                    {/* Retry always accessible regardless of plan */}
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryAnalysis.mutate(analysis.id)}
                        disabled={retryAnalysis.isPending}
                        className="w-full"
                      >
                        {retryAnalysis.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Retry Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Model Details — Max+ only (engineering metadata) */}
                {canSeeEngineeringData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Model Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisData.model_used && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Model:</span>
                          <span className="font-mono text-xs">{analysisData.model_used}</span>
                        </div>
                      )}
                      {requestId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Request ID:</span>
                          <span className="font-mono text-[10px] text-muted-foreground break-all text-right max-w-[200px]">
                            {requestId}
                          </span>
                        </div>
                      )}
                      {costEstimate !== undefined && costEstimate !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            Est. Cost:
                          </span>
                          <span className="font-mono text-xs">{formatCurrency(costEstimate)}</span>
                        </div>
                      )}
                      {analysisData.processing_completed_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-1">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            Completed:
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(analysisData.processing_completed_at),
                              'MMM dd, yyyy HH:mm:ss'
                            )}
                          </span>
                        </div>
                      )}
                      {tokenUsage.total_tokens && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Tokens:</span>
                          <span className="font-mono text-xs">
                            {tokenUsage.total_tokens.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Score Breakdown + CV Optimisation — Pro+ */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {canSeeBreakdown ? (
                      scoreBreakdown ? (
                        <div className="space-y-2">
                          {(
                            [
                              ['Skills Alignment (40%)', scoreBreakdown.skills_alignment],
                              ['Experience Relevance (30%)', scoreBreakdown.experience_relevance],
                              ['Domain Fit (20%)', scoreBreakdown.domain_fit],
                              ['Format Quality (10%)', scoreBreakdown.format_quality],
                            ] as [string, number][]
                          ).map(([label, value]) => (
                            <div key={label} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-mono font-medium">
                                  {Math.round(value * 100)}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${breakdownBarColour(value)}`}
                                  style={{ width: `${Math.round(value * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No breakdown data — analysis may predate P10.
                        </p>
                      )
                    ) : (
                      <LockedPanel
                        title="Pro plan required"
                        description="Score sub-dimension breakdown is available on Pro and above."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      CV Optimisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {canSeeCvOpt ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Enrichments used:</span>
                          <Badge
                            variant={enrichmentsUsedCount > 0 ? 'secondary' : 'outline'}
                            className="font-mono"
                          >
                            {enrichmentsUsedCount}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Projected score:</span>
                          <span className="font-mono text-sm">
                            {cvOptimisationScore != null
                              ? `${Math.round(cvOptimisationScore * 100)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        {cvOptimisationScore != null && analysis.ats_score != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Delta:</span>
                            <span
                              className={`font-mono text-sm font-medium ${Math.round(cvOptimisationScore * 100) - analysis.ats_score >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              {Math.round(cvOptimisationScore * 100) - analysis.ats_score >= 0
                                ? '+'
                                : ''}
                              {Math.round(cvOptimisationScore * 100) - analysis.ats_score}pp
                            </span>
                          </div>
                        )}
                        {enrichmentsUsedCount === 0 && (
                          <p className="text-xs text-muted-foreground pt-1">
                            No accepted enrichments were present at analysis time — baseline only.
                          </p>
                        )}
                      </div>
                    ) : (
                      <LockedPanel
                        title="Pro plan required"
                        description="CV Optimisation score projection is available on Pro and above."
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Skills — always visible */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Matched Skills ({analysis.matched_skills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-36">
                      <div className="flex flex-wrap gap-1 pr-3">
                        {analysis.matched_skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-green-100 text-green-800 text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Missing Skills ({analysis.missing_skills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-36">
                      <div className="flex flex-wrap gap-1 pr-3">
                        {analysis.missing_skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-red-100 text-red-800 text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {extractedFeatures && extractedFeatures.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Extracted Features ({extractedFeatures.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-36">
                      <div className="flex flex-wrap gap-1 pr-3">
                        {extractedFeatures.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Content — always visible ── */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Resume Content Analysis
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(analysis.resume?.name || '', 'Resume Name')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">File:</span> {analysis.resume?.name}
                    </div>
                    {(analysis.resume as Record<string, unknown>)?.file_url && (
                      <div className="text-sm">
                        <span className="font-medium">URL:</span>
                        <span className="font-mono text-xs ml-2">
                          {String((analysis.resume as Record<string, unknown>).file_url)}
                        </span>
                      </div>
                    )}
                    {resumeWarnings.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-red-600">
                          Extraction Warnings:
                        </span>
                        {resumeWarnings.map((warning, index) => (
                          <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Job Description Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Title:</span> {analysis.job_description?.name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Company:</span>{' '}
                      {analysis.job_description?.company?.name}
                    </div>
                    <ScrollArea className="h-32">
                      <div className="text-xs text-muted-foreground">
                        {(analysis.job_description as Record<string, unknown>)?.description
                          ? String(
                              (analysis.job_description as Record<string, unknown>).description
                            )
                          : 'No description available'}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Prompts — Max+ ── */}
            <TabsContent value="prompts" className="space-y-4">
              {canSeeEngineeringData ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          System Prompt
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(prompts.system || '', 'System Prompt')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                          {prompts.system || 'System prompt not recorded.'}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Analysis Prompt
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {promptCharacters && (
                            <span>{promptCharacters.toLocaleString()} chars</span>
                          )}
                          {tokenUsage.prompt_tokens && (
                            <span>{tokenUsage.prompt_tokens.toLocaleString()} tokens</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(prompts.user || '', 'Analysis Prompt')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                          {prompts.user || 'Prompt not recorded.'}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <LockedTabContent
                  title="Max plan required"
                  description="View the exact prompts sent to the AI model. Available on Max and Enterprise plans."
                />
              )}
            </TabsContent>

            {/* ── AI Output — Max+ ── */}
            <TabsContent value="output" className="space-y-4">
              {canSeeEngineeringData ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Raw AI Response
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(formatJSON(rawLLMResponse), 'AI Response')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                          {formatJSON(rawLLMResponse)}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {analysis.suggestions && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">AI Suggestions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">{analysis.suggestions}</div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <LockedTabContent
                  title="Max plan required"
                  description="Inspect the raw AI model output and response JSON. Available on Max and Enterprise plans."
                />
              )}
            </TabsContent>

            {/* ── Usage — Max+ ── */}
            <TabsContent value="usage" className="space-y-4">
              {canSeeEngineeringData ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Token Usage Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Prompt Tokens:</span>
                          <span className="font-mono text-sm">
                            {tokenUsage.prompt_tokens?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Completion Tokens:</span>
                          <span className="font-mono text-sm">
                            {tokenUsage.completion_tokens?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-sm">Total Tokens:</span>
                          <span className="font-mono text-sm">
                            {tokenUsage.total_tokens?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {tokenUsage.prompt_tokens_details && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Prompt Details:</div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Cached:</span>
                              <span className="font-mono">
                                {tokenUsage.prompt_tokens_details.cached_tokens || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Audio:</span>
                              <span className="font-mono">
                                {tokenUsage.prompt_tokens_details.audio_tokens || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <LockedTabContent
                  title="Max plan required"
                  description="View prompt and completion token usage and cost breakdown. Available on Max and Enterprise plans."
                />
              )}
            </TabsContent>

            {/* ── Errors — always visible ── */}
            <TabsContent value="errors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Error Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resumeWarnings.length > 0 ? (
                    <div className="space-y-2">
                      {resumeWarnings.map((warning, index) => (
                        <div
                          key={index}
                          className="p-3 bg-red-50 border border-red-200 rounded text-sm"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <p className="text-red-700">{warning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                      No errors or warnings detected
                    </div>
                  )}

                  {analysisData.processing_completed_at && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          Analysis completed successfully at{' '}
                          {format(
                            new Date(analysisData.processing_completed_at),
                            'MMM dd, yyyy HH:mm:ss'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
