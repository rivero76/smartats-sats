/**
 * UPDATE LOG
 * 2026-02-20 22:19:11 | Reviewed ATS analyses page updates and added timestamped file header tracking.
 * 2026-03-17 00:00:00 | P18 CV Optimisation Score: read cv_optimisation_score and
 *   cv_optimisation_improvements from analysis_data; render optimisation panel below
 *   the ATS score when enrichments were applied.
 * 2026-03-26 19:00:00 | P19 S2-3: add stagger animation to analysis list cards (P19-S2-3)
 * 2026-03-26 | S3-1: fix heading hierarchy — stat CardTitle → p, section CardTitle → h2, empty-state h3 → h2 (P19-S3-1)
 * 2026-03-30 11:00:00 | PROD-9–12: Import and render ResumeIntelligencePanel after CV Optimisation panel.
 * 2026-04-07 18:00:00 | UIUX redesign: collapsed score-first cards with progressive disclosure,
 *   colour-coded left border, filter bar, debug/export moved to expanded state.
 */
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, listItem } from '@/lib/animations'
import ATSAnalysisProgress from '@/components/ATSAnalysisProgress'
import ATSDebugModal from '@/components/ATSDebugModal'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
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
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Filter,
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
import ResumeIntelligencePanel from '@/components/ResumeIntelligencePanel'
import { EnrichExperienceModal } from '@/components/EnrichExperienceModal'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { formatDistanceToNow } from 'date-fns'

type FilterKey = 'all' | 'strong' | 'needs_work' | 'in_progress'

const ATSAnalyses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [debugAnalysis, setDebugAnalysis] = useState<ATSAnalysis | null>(null)
  const [enrichAnalysis, setEnrichAnalysis] = useState<ATSAnalysis | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
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
      analyses?.filter((a) => ['initial', 'queued', 'processing'].includes(a.status)).length || 0,
    [analyses]
  )

  const filteredAnalyses = useMemo(() => {
    if (!analyses) return []
    const list = analyses.slice(0, 20)
    switch (filter) {
      case 'strong':
        return list.filter((a) => a.status === 'completed' && (a.ats_score ?? 0) >= 80)
      case 'needs_work':
        return list.filter((a) => a.status === 'completed' && (a.ats_score ?? 0) < 60)
      case 'in_progress':
        return list.filter((a) => ['initial', 'queued', 'processing'].includes(a.status))
      default:
        return list
    }
  }, [analyses, filter])

  const getScoreColor = (score?: number | null) => {
    if (score == null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBorderClass = (analysis: ATSAnalysis) => {
    if (analysis.status === 'error') return 'border-l-red-400'
    if (['initial', 'queued', 'processing'].includes(analysis.status)) return 'border-l-blue-400'
    if (analysis.ats_score == null) return 'border-l-border'
    if (analysis.ats_score >= 80) return 'border-l-green-500'
    if (analysis.ats_score >= 60) return 'border-l-amber-400'
    return 'border-l-red-500'
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
    if (analysisData.model_used) lines.push(`| Model | \`${analysisData.model_used}\` |`)
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

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'strong', label: 'Strong Match' },
    { key: 'needs_work', label: 'Needs Work' },
    { key: 'in_progress', label: 'In Progress' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ATS Analyses</h1>
          <p className="text-muted-foreground">
            Analyse resume-job compatibility and get actionable insights to improve your match rate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetchAnalyses()}
            disabled={analysesFetching}
            title="Refresh analyses"
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

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
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
                description: 'Resume-job matches analysed',
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
                title: 'Strong Matches',
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
            ].map((stat, i) => (
              <Card key={i} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium tracking-tight">{stat.title}</p>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Analysis list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold leading-none tracking-tight">Your Analyses</h2>
              <CardDescription className="mt-1">
                {inFlightCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-blue-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {inFlightCount} in progress · auto-refresh on
                  </span>
                )}
                {!!dataUpdatedAt && inFlightCount === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Last sync {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
                  </span>
                )}
              </CardDescription>
            </div>

            {/* Filter bar */}
            {!analysesLoading && analyses && analyses.length > 0 && (
              <div className="flex items-center gap-1 rounded-lg border p-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
                {filterButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      filter === key
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {analysesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-medium mb-2">No analyses yet</h2>
              <p className="text-muted-foreground mb-4">
                Run your first ATS analysis to see how well your resume matches job requirements.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Start Your First Analysis
              </Button>
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No analyses match this filter.</p>
              <Button variant="link" onClick={() => setFilter('all')} className="mt-1">
                Show all
              </Button>
            </div>
          ) : (
            <motion.div
              className="space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filteredAnalyses.map((analysis) => {
                const isExpanded = expandedId === analysis.id
                const hasResults = analysis.status === 'completed' && analysis.ats_score != null

                return (
                  <motion.div
                    key={analysis.id}
                    variants={listItem}
                    className={`border-l-4 border rounded-lg overflow-hidden transition-shadow hover:shadow-sm ${getScoreBorderClass(analysis)}`}
                  >
                    {/* ── Collapsed header row (always visible) ── */}
                    <button
                      className="w-full text-left px-5 py-4 flex items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setExpandedId(isExpanded ? null : analysis.id)}
                      aria-expanded={isExpanded}
                    >
                      {/* Score hero */}
                      <div className="w-14 shrink-0 text-right">
                        {hasResults ? (
                          <span
                            className={`text-2xl font-bold tabular-nums ${getScoreColor(analysis.ats_score)}`}
                          >
                            {analysis.ats_score}%
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {analysis.status === 'error' ? '—' : '…'}
                          </span>
                        )}
                      </div>

                      {/* Thin score bar */}
                      {hasResults && (
                        <div className="w-1 self-stretch rounded-full bg-muted overflow-hidden shrink-0">
                          <div
                            className={`w-full rounded-full transition-all ${
                              (analysis.ats_score ?? 0) >= 80
                                ? 'bg-green-500'
                                : (analysis.ats_score ?? 0) >= 60
                                  ? 'bg-amber-400'
                                  : 'bg-red-500'
                            }`}
                            style={{
                              height: `${analysis.ats_score}%`,
                              marginTop: `${100 - (analysis.ats_score ?? 0)}%`,
                            }}
                          />
                        </div>
                      )}

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold truncate max-w-[200px]">
                            {analysis.resume?.name ?? 'Resume'}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0">vs</span>
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {analysis.job_description?.name ?? 'Job'}
                          </span>
                          {analysis.job_description?.company?.name && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                              <Building className="h-3 w-3" />
                              {analysis.job_description.company.name}
                            </span>
                          )}
                        </div>

                        {/* Signal badges + date */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {hasResults && analysis.matched_skills.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                              <CheckCircle className="h-3 w-3" />
                              {analysis.matched_skills.length} matched
                            </span>
                          )}
                          {hasResults && analysis.missing_skills.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                              <AlertCircle className="h-3 w-3" />
                              {analysis.missing_skills.length} missing
                            </span>
                          )}
                          {!hasResults && getStatusBadge(analysis.status)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(analysis.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Chevron */}
                      <div className="shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {/* ── Expanded detail ── */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                            transition: { duration: 0.22, ease: 'easeOut' },
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                            transition: { duration: 0.18, ease: 'easeIn' },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 space-y-4 border-t">
                            {/* Action row */}
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {hasResults && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Complete
                                </Badge>
                              )}
                              {!hasResults && getStatusBadge(analysis.status)}

                              <div className="ml-auto flex items-center gap-2">
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
                                  title="Export as Markdown"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Export
                                </Button>
                                {(analysis.status === 'error' ||
                                  (analysis.status === 'completed' &&
                                    analysis.ats_score === 0)) && (
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

                            {/* Progress / in-flight state */}
                            <ATSAnalysisProgress analysis={analysis} />

                            {/* Completed results */}
                            {hasResults && (
                              <div className="space-y-4">
                                {/* Score bar */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <HelpTooltip content="Score from 0–100% showing how well your resume matches the job. 80%+ is excellent.">
                                      <span className="text-sm font-medium">
                                        ATS Compatibility Score
                                      </span>
                                    </HelpTooltip>
                                    <span
                                      className={`text-xl font-bold ${getScoreColor(analysis.ats_score)}`}
                                    >
                                      {analysis.ats_score}%
                                    </span>
                                  </div>
                                  <Progress value={analysis.ats_score ?? 0} className="h-2" />
                                </div>

                                {/* Skills grid */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  {analysis.matched_skills.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <HelpTooltip content="Skills found in your resume that match the job description">
                                          <span className="text-sm font-medium">
                                            Matched Skills
                                          </span>
                                        </HelpTooltip>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {analysis.matched_skills.slice(0, 8).map((skill, i) => (
                                          <Badge
                                            key={i}
                                            variant="secondary"
                                            className="bg-green-100 text-green-800"
                                          >
                                            {skill}
                                          </Badge>
                                        ))}
                                        {analysis.matched_skills.length > 8 && (
                                          <Badge variant="outline">
                                            +{analysis.matched_skills.length - 8} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {analysis.missing_skills.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <HelpTooltip content="Skills in the job description not found in your resume — consider adding these">
                                          <span className="text-sm font-medium">
                                            Missing Skills
                                          </span>
                                        </HelpTooltip>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {analysis.missing_skills.slice(0, 8).map((skill, i) => (
                                          <Badge
                                            key={i}
                                            variant="secondary"
                                            className="bg-red-100 text-red-800"
                                          >
                                            {skill}
                                          </Badge>
                                        ))}
                                        {analysis.missing_skills.length > 8 && (
                                          <Badge variant="outline">
                                            +{analysis.missing_skills.length - 8} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* AI Suggestions */}
                                {analysis.suggestions && (
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-medium mb-1.5">AI Suggestions</p>
                                    <p className="text-sm text-muted-foreground">
                                      {analysis.suggestions}
                                    </p>
                                  </div>
                                )}

                                {/* CV Optimisation Score */}
                                {(() => {
                                  const optScore = analysis.analysis_data?.cv_optimisation_score
                                  const improvements =
                                    analysis.analysis_data?.cv_optimisation_improvements ?? []
                                  const enrichmentsUsed =
                                    analysis.analysis_data?.enrichments_used_count ?? 0
                                  if (optScore == null || enrichmentsUsed === 0) return null
                                  const baseline = analysis.ats_score ?? 0
                                  const optimised = Math.round(optScore * 100)
                                  const delta = optimised - baseline
                                  return (
                                    <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Sparkles className="h-4 w-4 text-emerald-600" />
                                          <HelpTooltip content="Projected ATS score if you update your CV with accepted enrichments.">
                                            <span className="text-sm font-semibold text-emerald-800">
                                              CV Optimisation Score
                                            </span>
                                          </HelpTooltip>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-2xl font-bold text-emerald-700">
                                            {optimised}%
                                          </span>
                                          {delta > 0 && (
                                            <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                                              <ArrowUpRight className="h-3 w-3" />+{delta}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Progress
                                        value={optimised}
                                        className="h-2 bg-emerald-200 [&>div]:bg-emerald-600"
                                      />
                                      <p className="text-xs text-emerald-700">
                                        Based on {enrichmentsUsed} accepted enrichment
                                        {enrichmentsUsed !== 1 ? 's' : ''}. Update your CV to
                                        realise this score.
                                      </p>
                                      {improvements.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                          {improvements.slice(0, 4).map(
                                            (
                                              imp: {
                                                skill: string
                                                role?: string
                                                impact: string
                                              },
                                              i: number
                                            ) => (
                                              <div
                                                key={i}
                                                className="flex items-start gap-2 text-xs text-emerald-800"
                                              >
                                                <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
                                                <span>
                                                  <span className="font-medium">{imp.skill}</span>
                                                  {imp.role ? ` (${imp.role})` : ''} — {imp.impact}
                                                </span>
                                              </div>
                                            )
                                          )}
                                          {improvements.length > 4 && (
                                            <p className="text-xs text-emerald-600 pl-5">
                                              +{improvements.length - 4} more
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}

                                {/* Resume Intelligence */}
                                <ResumeIntelligencePanel
                                  analysisData={analysis.analysis_data ?? {}}
                                />

                                {/* Primary CTA */}
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ATSAnalysisModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      <EnrichExperienceModal
        open={!!enrichAnalysis}
        onOpenChange={(open) => !open && setEnrichAnalysis(null)}
        initialAnalysisId={enrichAnalysis?.id}
      />

      <ATSDebugModal
        open={!!debugAnalysis}
        onOpenChange={(open) => !open && setDebugAnalysis(null)}
        analysis={debugAnalysis}
      />

      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
    </div>
  )
}

export default ATSAnalyses
