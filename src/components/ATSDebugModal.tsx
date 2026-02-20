/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added request_id visibility for log correlation in ATS debug modal.
 */
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ATSAnalysis } from '@/hooks/useATSAnalyses'
import { useRetryATSAnalysis } from '@/hooks/useRetryATSAnalysis'
import { format } from 'date-fns'

interface ATSDebugModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: ATSAnalysis | null
}

export default function ATSDebugModal({ open, onOpenChange, analysis }: ATSDebugModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const retryAnalysis = useRetryATSAnalysis()

  if (!analysis) return null

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast({
        title: 'Copied to clipboard',
        description: `${fieldName} copied successfully`,
      })
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
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
  const resumeWarnings = analysisData.resume_warnings || []
  const prompts = analysisData.prompts || {}
  const promptCharacters = analysisData.prompt_characters
  const costEstimate = analysisData.cost_estimate_usd
  const requestId = analysisData.request_id
  const extractedFeatures =
    (Array.isArray(analysisData.extracted_features)
      ? analysisData.extracted_features
      : rawLLMResponse?.parsed_result?.keywords_found) || analysis.matched_skills

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
    if (value === 0) return '$0.0000'
    return `$${value < 0.01 ? value.toFixed(4) : value.toFixed(2)}`
  }

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
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
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="response">AI Response</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                  </CardContent>
                </Card>

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
                        <span className="font-mono text-[10px] text-muted-foreground break-all text-right">
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
                    {resumeWarnings.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Warnings:</span>
                        <Badge variant="destructive" className="text-xs">
                          {resumeWarnings.length}
                        </Badge>
                      </div>
                    )}
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
              </div>

              {/* Skills Overview */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Matched Skills ({analysis.matched_skills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-24">
                      <div className="flex flex-wrap gap-1">
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
                    <ScrollArea className="h-24">
                      <div className="flex flex-wrap gap-1">
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
                    <ScrollArea className="h-24">
                      <div className="flex flex-wrap gap-1">
                        {extractedFeatures.map((feature: string, index: number) => (
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
                    {(analysis.resume as any)?.file_url && (
                      <div className="text-sm">
                        <span className="font-medium">URL:</span>
                        <span className="font-mono text-xs ml-2">
                          {(analysis.resume as any).file_url}
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
                        {(analysis.job_description as any)?.description ||
                          'No description available'}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompts" className="space-y-4">
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
                      {promptCharacters && <span>{promptCharacters.toLocaleString()} chars</span>}
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
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4">
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
            </TabsContent>

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
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div>
                              <div className="font-medium text-red-800">Warning {index + 1}</div>
                              <div className="text-red-700 mt-1">{warning}</div>
                            </div>
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
