/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed ATS analyses page updates and added timestamped file header tracking.
 */
import { useMemo, useState } from 'react'
import ATSAnalysisProgress from '@/components/ATSAnalysisProgress'
import ATSDebugModal from '@/components/ATSDebugModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Plus,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  Calendar,
  Building,
  Trash2,
  Loader2,
  RefreshCw,
  Bug,
  Download,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  useATSAnalyses,
  useATSAnalysisStats,
  useDeleteATSAnalysis,
  ATSAnalysis,
} from '@/hooks/useATSAnalyses'
import { useRetryATSAnalysis } from '@/hooks/useRetryATSAnalysis'
import ATSAnalysisModal from '@/components/ATSAnalysisModal'
import { EnrichExperienceModal } from '@/components/EnrichExperienceModal'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { formatDistanceToNow } from 'date-fns'

const ATSAnalyses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [debugAnalysis, setDebugAnalysis] = useState<ATSAnalysis | null>(null)
  const [enrichAnalysis, setEnrichAnalysis] = useState<ATSAnalysis | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('atsAnalysis')

  const {
    data: analyses,
    isLoading: analysesLoading,
    isFetching: analysesFetching,
    refetch: refetchAnalyses,
    dataUpdatedAt,
  } = useATSAnalyses()
  const { data: stats, isLoading: statsLoading } = useATSAnalysisStats()
  const deleteAnalysis = useDeleteATSAnalysis()
  const retryAnalysis = useRetryATSAnalysis()

  const inFlightCount = useMemo(
    () =>
      analyses?.filter((analysis) =>
        ['initial', 'queued', 'processing'].includes(analysis.status)
      ).length || 0,
    [analyses]
  )

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Complete
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Processing
          </Badge>
        )
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Queued</Badge>
    }
  }

  const exportAnalysisToMarkdown = (analysis: ATSAnalysis) => {
    const analysisData = analysis.analysis_data || {}
    const rawLLMResponse = analysisData.raw_llm_response || {}
    const tokenUsage = analysisData.token_usage || {}
    const resumeWarnings: string[] = analysisData.resume_warnings || []
    const prompts = analysisData.prompts || {}
    const costEstimate = analysisData.cost_estimate_usd
    const extractedFeatures: string[] =
      (Array.isArray(analysisData.extracted_features)
        ? analysisData.extracted_features
        : rawLLMResponse?.parsed_result?.keywords_found) || analysis.matched_skills

    const formatCost = (v?: number | null) => {
      if (typeof v !== 'number' || Number.isNaN(v)) return 'N/A'
      return `$${v < 0.01 ? v.toFixed(4) : v.toFixed(2)}`
    }

    const lines: string[] = []

    lines.push(`# ATS Analysis Report`)
    lines.push(
      `**${analysis.resume?.name}** vs **${analysis.job_description?.name}**` +
        (analysis.job_description?.company?.name
          ? ` @ ${analysis.job_description.company.name}`
          : '')
    )
    lines.push(`\n_Exported: ${new Date().toISOString()}_\n`)

    lines.push(`## Overview\n`)
    lines.push(`| Field | Value |`)
    lines.push(`|---|---|`)
    lines.push(`| Analysis ID | \`${analysis.id}\` |`)
    lines.push(`| Status | ${analysis.status} |`)
    lines.push(`| ATS Score | **${analysis.ats_score ?? 'N/A'}%** |`)
    lines.push(`| Created | ${new Date(analysis.created_at).toISOString()} |`)
    if (analysisData.processing_completed_at)
      lines.push(`| Completed | ${analysisData.processing_completed_at} |`)
    if (analysisData.processing_time_ms)
      lines.push(`| Processing Time | ${Math.round(analysisData.processing_time_ms / 1000)}s |`)
    if (analysisData.model_used)
      lines.push(`| Model | \`${analysisData.model_used}\` |`)
    if (tokenUsage.prompt_tokens)
      lines.push(`| Prompt Tokens | ${tokenUsage.prompt_tokens.toLocaleString()} |`)
    if (tokenUsage.completion_tokens)
      lines.push(`| Completion Tokens | ${tokenUsage.completion_tokens.toLocaleString()} |`)
    if (tokenUsage.total_tokens)
      lines.push(`| Total Tokens | ${tokenUsage.total_tokens.toLocaleString()} |`)
    if (costEstimate !== undefined && costEstimate !== null)
      lines.push(`| Est. Cost | ${formatCost(costEstimate)} |`)

    if (analysis.matched_skills.length > 0) {
      lines.push(`\n## Matched Skills (${analysis.matched_skills.length})\n`)
      lines.push(analysis.matched_skills.map((s) => `- ${s}`).join('\n'))
    }

    if (analysis.missing_skills.length > 0) {
      lines.push(`\n## Missing Skills (${analysis.missing_skills.length})\n`)
      lines.push(analysis.missing_skills.map((s) => `- ${s}`).join('\n'))
    }

    if (extractedFeatures.length > 0) {
      lines.push(`\n## Extracted Features (${extractedFeatures.length})\n`)
      lines.push(extractedFeatures.map((f) => `- ${f}`).join('\n'))
    }

    if (analysis.suggestions) {
      lines.push(`\n## AI Suggestions\n`)
      lines.push(analysis.suggestions)
    }

    if (resumeWarnings.length > 0) {
      lines.push(`\n## Resume Warnings\n`)
      resumeWarnings.forEach((w, i) => lines.push(`${i + 1}. ${w}`))
    }

    if (prompts.system) {
      lines.push(`\n## System Prompt\n`)
      lines.push('```\n' + prompts.system + '\n```')
    }

    if (prompts.user) {
      lines.push(`\n## Analysis Prompt\n`)
      lines.push('```\n' + prompts.user + '\n```')
    }

    if (rawLLMResponse && Object.keys(rawLLMResponse).length > 0) {
      lines.push(`\n## Raw AI Response\n`)
      lines.push('```json\n' + JSON.stringify(rawLLMResponse, null, 2) + '\n```')
    }

    const markdown = lines.join('\n')
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const r = (analysis.resume?.name || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const j = (analysis.job_description?.name || 'job').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    a.download = `ats_${r}_vs_${j}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ATS Analyses</h1>
          <p className="text-muted-foreground">
            Analyze resume-job compatibility and get detailed insights to improve match rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetchAnalyses()}
            disabled={analysesFetching}
            title="Refresh analyses now"
          >
            {analysesFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
          {helpContent && (
            <HelpButton
              onClick={() => setShowHelp(true)}
              tooltip="Learn how to run and interpret ATS analyses"
            />
          )}
        </div>
      </div>

      {/* Analysis Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : [
              {
                title: 'Total Analyses',
                value: stats?.totalAnalyses.toString() || '0',
                description: 'Resume-job matches analyzed',
                icon: BarChart3,
                color: 'text-blue-600',
              },
              {
                title: 'Average Score',
                value: `${stats?.averageScore || 0}%`,
                description: 'ATS compatibility rate',
                icon: TrendingUp,
                color: 'text-green-600',
              },
              {
                title: 'High Matches',
                value: stats?.highMatches.toString() || '0',
                description: 'Scores above 80%',
                icon: CheckCircle,
                color: 'text-emerald-600',
              },
              {
                title: 'Need Improvement',
                value: stats?.needImprovement.toString() || '0',
                description: 'Scores below 60%',
                icon: AlertCircle,
                color: 'text-orange-600',
              },
            ].map((stat, index) => (
              <Card key={index} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Analyses</CardTitle>
          <CardDescription>
            View and manage your ATS analyses and their results.
            {inFlightCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-blue-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                Live updates on ({inFlightCount} in progress, auto-refresh every ~3s)
              </span>
            )}
            {!!dataUpdatedAt && (
              <span className="ml-2 text-xs text-muted-foreground">
                Last sync {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No analyses completed yet</h3>
              <p className="text-muted-foreground mb-4">
                Run your first ATS analysis to see how well your resume matches job requirements.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Start Your First Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="p-6 border rounded-lg space-y-4">
                  {/* Analysis Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{analysis.resume?.name}</h3>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">{analysis.job_description?.name}</span>
                        {analysis.user?.name && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            by {analysis.user.name}
                            {analysis.user.email && (
                              <span className="text-xs ml-1">({analysis.user.email})</span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                        </div>
                        {analysis.job_description?.company?.name && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {analysis.job_description.company.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(analysis.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDebugAnalysis(analysis)}
                        className="text-xs"
                      >
                        <Bug className="h-3 w-3 mr-1" />
                        Debug
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportAnalysisToMarkdown(analysis)}
                        className="text-xs"
                        title="Export analysis as Markdown"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                      {(analysis.status === 'error' ||
                        (analysis.status === 'completed' && analysis.ats_score === 0)) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryAnalysis.mutate(analysis.id)}
                          disabled={retryAnalysis.isPending}
                          className="text-xs"
                        >
                          {retryAnalysis.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnalysis.mutate(analysis.id)}
                        disabled={deleteAnalysis.isPending}
                      >
                        {deleteAnalysis.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Analysis Progress and Results */}
                  <ATSAnalysisProgress analysis={analysis} />

                  {/* Analysis Results */}
                  {analysis.status === 'completed' && analysis.ats_score !== null && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <HelpTooltip content="Score from 0-100% showing how well your resume matches the job requirements. 80%+ is excellent.">
                          <span className="text-sm font-medium">ATS Compatibility Score</span>
                        </HelpTooltip>
                        <span className={`text-2xl font-bold ${getScoreColor(analysis.ats_score)}`}>
                          {analysis.ats_score}%
                        </span>
                      </div>
                      <Progress value={analysis.ats_score} className="h-2" />

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Matched Skills */}
                        {analysis.matched_skills.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <HelpTooltip content="Skills from the job description that were found in your resume">
                                <span className="text-sm font-medium">Matched Skills</span>
                              </HelpTooltip>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {analysis.matched_skills.slice(0, 6).map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-green-100 text-green-800"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {analysis.matched_skills.length > 6 && (
                                <Badge variant="outline">
                                  +{analysis.matched_skills.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Missing Skills */}
                        {analysis.missing_skills.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <HelpTooltip content="Skills mentioned in the job description that weren't found in your resume - consider adding these">
                                <span className="text-sm font-medium">Missing Skills</span>
                              </HelpTooltip>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {analysis.missing_skills.slice(0, 6).map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-red-100 text-red-800"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {analysis.missing_skills.length > 6 && (
                                <Badge variant="outline">
                                  +{analysis.missing_skills.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggestions */}
                      {analysis.suggestions && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">💡 AI Suggestions</p>
                          <p className="text-sm text-muted-foreground">{analysis.suggestions}</p>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setEnrichAnalysis(analysis)}
                      >
                        Add Missing Experience
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Modal */}
      <ATSAnalysisModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      {/* Enrich Experience Modal */}
      <EnrichExperienceModal
        open={!!enrichAnalysis}
        onOpenChange={(open) => !open && setEnrichAnalysis(null)}
        initialAnalysisId={enrichAnalysis?.id}
      />

      {/* Debug Modal */}
      <ATSDebugModal
        open={!!debugAnalysis}
        onOpenChange={(open) => !open && setDebugAnalysis(null)}
        analysis={debugAnalysis}
      />

      {/* Help Modal */}
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
    </div>
  )
}

export default ATSAnalyses
