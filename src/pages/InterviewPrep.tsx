/**
 * UPDATE LOG
 * 2026-04-12 00:00:00 | P-INTERVIEW S1+S2 — Interview Intelligence page.
 *   Entry via /interview-prep?analysis_id=<uuid> from ATSAnalyses card button.
 *   Tabs: Company Brief | Role Decoder | Question Bank.
 *   Question categories: behavioural, gap_bridge, role_specific (S1) +
 *     company_values, technical_deep_dive (S2) — all 5 rendered when present.
 *   Gated to Pro+ via hasFeature('interview_prep').
 *   Loading: triggers generation if no session exists; shows per-call progress text.
 *   Regeneration: rate-limited to once per 24h (force_regenerate flag bypasses).
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeIn, staggerContainer, listItem } from '@/lib/animations'
import { usePlanFeature } from '@/hooks/usePlanFeature'
import {
  useInterviewSession,
  useGenerateInterviewPrep,
  useAllInterviewSessions,
  type InterviewQuestion,
  type CompanyDossier,
  type RoleDecoder,
} from '@/hooks/useInterviewPrep'
import { useATSAnalyses } from '@/hooks/useATSAnalyses'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BrainCircuit,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  Target,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lightbulb,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  InterviewQuestion['category'],
  { label: string; colour: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  behavioural: {
    label: 'Behavioural',
    colour: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: MessageSquare,
  },
  gap_bridge: {
    label: 'Gap Bridge',
    colour: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
  role_specific: {
    label: 'Role-Specific',
    colour: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    icon: Target,
  },
  company_values: {
    label: 'Company Values',
    colour: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Building2,
  },
  technical_deep_dive: {
    label: 'Technical',
    colour: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    icon: BrainCircuit,
  },
}

const DIFFICULTY_CONFIG = {
  standard: { label: 'Standard', colour: 'text-muted-foreground' },
  tough: { label: 'Tough', colour: 'text-amber-600' },
  curveball: { label: 'Curveball', colour: 'text-red-600' },
}

const RISK_CONFIG = {
  green: { label: 'Safe to use', colour: 'text-green-700', icon: CheckCircle },
  amber: { label: 'Verify first', colour: 'text-amber-600', icon: AlertCircle },
  red: { label: 'Use with caution', colour: 'text-red-600', icon: ShieldAlert },
}

type TabKey = 'company' | 'role' | 'questions'

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompanyBriefPanel({
  dossier,
  scrapeStatus,
}: {
  dossier: CompanyDossier | null
  scrapeStatus: string
}) {
  if (!dossier) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
        <AlertTriangle className="inline h-4 w-4 mr-1.5" />
        {scrapeStatus === 'partial'
          ? 'Company website could not be scraped — questions were generated from the job description only.'
          : 'No company data available.'}
      </div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {dossier.stated_values.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Stated Values
          </h3>
          <div className="flex flex-wrap gap-2">
            {dossier.stated_values.map((v) => (
              <Badge key={v} variant="secondary">
                {v}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {dossier.strategic_themes.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Strategic Themes
          </h3>
          <ul className="space-y-1">
            {dossier.strategic_themes.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-muted-foreground">›</span>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {dossier.cultural_keywords.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Cultural Language
          </h3>
          <div className="flex flex-wrap gap-2">
            {dossier.cultural_keywords.map((k) => (
              <span
                key={k}
                className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border"
              >
                {k}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        variants={listItem}
        className="flex items-center gap-3 text-sm text-muted-foreground"
      >
        <span className="font-medium">Hiring style:</span>
        <Badge variant="outline" className="capitalize">
          {dossier.hiring_language_style}
        </Badge>
      </motion.div>

      {dossier.red_flags.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Watch out for
          </h3>
          <ul className="space-y-1">
            {dossier.red_flags.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5">⚠</span>
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  )
}

function RoleDecoderPanel({ decoder }: { decoder: RoleDecoder | null }) {
  if (!decoder) {
    return (
      <p className="text-sm text-muted-foreground">
        Role decoder unavailable — the job description may be too short to extract implicit signals.
      </p>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={listItem} className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Implicit Seniority
          </div>
          <div className="text-sm font-medium">{decoder.implicit_seniority}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Reports To
          </div>
          <div className="text-sm font-medium">{decoder.reporting_level || 'Not specified'}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Team Scope
          </div>
          <div className="text-sm font-medium">{decoder.team_scope || 'Not specified'}</div>
        </div>
      </motion.div>

      {decoder.primary_deliverables.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            First-90-Day Deliverables
          </h3>
          <ul className="space-y-1.5">
            {decoder.primary_deliverables.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-content-center font-bold">
                  {i + 1}
                </span>
                {d}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {decoder.soft_skill_priorities.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Soft Skills Prioritised
          </h3>
          <div className="flex flex-wrap gap-2">
            {decoder.soft_skill_priorities.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {decoder.candidate_risk_areas.length > 0 && (
        <motion.div variants={listItem}>
          <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Likely Probe Areas
          </h3>
          <ul className="space-y-1">
            {decoder.candidate_risk_areas.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5">›</span>
                {r}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  )
}

function QuestionCard({ question }: { question: InterviewQuestion }) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_CONFIG[question.category]
  const diff = DIFFICULTY_CONFIG[question.difficulty]
  const CatIcon = cat.icon

  return (
    <div className={`rounded-lg border ${cat.bg} overflow-hidden`}>
      <button
        className="w-full text-left p-4 flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <CatIcon className={`h-4 w-4 mt-0.5 shrink-0 ${cat.colour}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wide ${cat.colour}`}>
              {cat.label}
            </span>
            <span className={`text-xs ${diff.colour}`}>{diff.label}</span>
            {question.source_evidence_skill && (
              <span className="text-xs text-muted-foreground">
                · {question.source_evidence_skill}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{question.question}</p>
        </div>
        <div className="shrink-0 mt-0.5 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: { duration: 0.22, ease: 'easeOut' },
            }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-current/10">
              {/* Why asked */}
              <div className="flex items-start gap-2 rounded-md bg-white/60 border border-current/10 p-3 text-sm">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Why you'll be asked this: </span>
                  {question.why_asked}
                </p>
              </div>

              {/* STAR Scaffold */}
              {question.star_scaffold && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      STAR Scaffold
                    </span>
                    {(() => {
                      const risk = RISK_CONFIG[question.star_scaffold.risk_flag]
                      const RiskIcon = risk.icon
                      return (
                        <span className={`flex items-center gap-1 text-xs ${risk.colour}`}>
                          <RiskIcon className="h-3 w-3" />
                          {risk.label}
                        </span>
                      )
                    })()}
                  </div>

                  {question.star_scaffold.risk_note && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                      {question.star_scaffold.risk_note}
                    </p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { key: 'situation', label: 'S — Situation' },
                        { key: 'task', label: 'T — Task' },
                        { key: 'action', label: 'A — Action' },
                        { key: 'result', label: 'R — Result' },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="rounded-md border bg-white/70 p-2.5">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          {label}
                        </div>
                        <p className="text-xs leading-relaxed">
                          {question.star_scaffold![key] || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const InterviewPrep = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { hasFeature, isLoading: planLoading } = usePlanFeature()

  // analysis_id from URL param (set when arriving from ATSAnalyses)
  const urlAnalysisId = searchParams.get('analysis_id')
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(urlAnalysisId)
  const [activeTab, setActiveTab] = useState<TabKey>('questions')

  const { data: analyses } = useATSAnalyses()
  const completedAnalyses = (analyses ?? []).filter(
    (a) => a.status === 'completed' && a.ats_score != null
  )

  const { data: session, isLoading: sessionLoading } = useInterviewSession(selectedAnalysisId)
  const generateMutation = useGenerateInterviewPrep()

  // Auto-trigger generation when arriving with an analysis_id and no session
  useEffect(() => {
    if (
      selectedAnalysisId &&
      !sessionLoading &&
      !session &&
      !generateMutation.isPending &&
      hasFeature('interview_prep')
    ) {
      generateMutation.mutate({ analysisId: selectedAnalysisId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnalysisId, sessionLoading, session])

  const isGenerating = generateMutation.isPending
  const canGenerate = !!selectedAnalysisId && hasFeature('interview_prep')

  // Group questions by category
  const questionsByCategory = (session?.questions ?? []).reduce(
    (acc, q) => {
      if (!acc[q.category]) acc[q.category] = []
      acc[q.category].push(q)
      return acc
    },
    {} as Record<string, InterviewQuestion[]>
  )

  const categoryOrder: InterviewQuestion['category'][] = [
    'behavioural',
    'gap_bridge',
    'role_specific',
    'company_values',
    'technical_deep_dive',
  ]

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'questions', label: 'Question Bank', count: session?.questions.length },
    { key: 'company', label: 'Company Brief' },
    { key: 'role', label: 'Role Decoder' },
  ]

  // Locked state for non-Pro users
  if (!planLoading && !hasFeature('interview_prep')) {
    return (
      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Intelligence</h1>
          <p className="text-muted-foreground">
            Walk into every interview knowing more than they expect.
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Lock className="h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Pro plan required</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              Interview Intelligence generates a personalised question bank — built from your
              resume, the job description, and the company's public values — and pre-populates STAR
              answer scaffolds from your experience. Available on Pro and above.
            </p>
            <Button onClick={() => navigate('/settings')}>View plan options</Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Intelligence</h1>
          <p className="text-muted-foreground">
            Personalised question bank, company brief, and STAR scaffolds — built from your
            analysis.
          </p>
        </div>

        {session && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Generated {formatDistanceToNow(new Date(session.generated_at), { addSuffix: true })}
              {session.session_version > 1 && ` · v${session.session_version}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                generateMutation.mutate({
                  analysisId: selectedAnalysisId!,
                  forceRegenerate: true,
                })
              }
              disabled={isGenerating}
              title="Regenerate (rate-limited to once per 24h)"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* Analysis selector */}
      {completedAnalyses.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium shrink-0">Analysis:</span>
          <Select
            value={selectedAnalysisId ?? ''}
            onValueChange={(v) => {
              setSelectedAnalysisId(v)
              navigate(`/interview-prep?analysis_id=${v}`, { replace: true })
            }}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select an analysis..." />
            </SelectTrigger>
            <SelectContent>
              {completedAnalyses.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.resume?.name ?? 'Resume'} vs {a.job_description?.name ?? 'Job'}{' '}
                  {a.ats_score != null && `(${a.ats_score}%)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* No analysis selected */}
      {!selectedAnalysisId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <BrainCircuit className="h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-base font-semibold">Select an analysis to get started</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Choose a completed ATS analysis above, or go to{' '}
              <button className="underline" onClick={() => navigate('/analyses')}>
                ATS Analyses
              </button>{' '}
              and click "Prepare for Interview" on any completed analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generating state */}
      {selectedAnalysisId && isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="font-medium">Generating your interview prep kit…</p>
              <p className="text-sm text-muted-foreground">
                Researching company · Decoding role expectations · Building question bank
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session loaded */}
      {selectedAnalysisId && !isGenerating && session && (
        <>
          {/* Scrape status notice */}
          {session.scrape_status === 'partial' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Company website could not be scraped. Company Brief and Company Values questions
                were generated from the job description language only.
              </span>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-0 font-semibold ${
                      activeTab === tab.key
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'company' && (
              <motion.div
                key="company"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Company Intelligence Brief
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Extracted from the company's public website. Use this to frame your answers
                      around their stated values and cultural language.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <CompanyBriefPanel
                      dossier={session.company_dossier}
                      scrapeStatus={session.scrape_status}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'role' && (
              <motion.div
                key="role"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      Role Expectation Decoder
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Implicit expectations decoded from the job description language — what they
                      really mean beyond what they wrote.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <RoleDecoderPanel decoder={session.role_decoder} />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'questions' && (
              <motion.div
                key="questions"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {categoryOrder
                  .filter((cat) => questionsByCategory[cat]?.length > 0)
                  .map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat]
                    const CatIcon = cfg.icon
                    return (
                      <div key={cat}>
                        <h2
                          className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide mb-3 ${cfg.colour}`}
                        >
                          <CatIcon className="h-4 w-4" />
                          {cfg.label} ({questionsByCategory[cat].length})
                        </h2>
                        <motion.div
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                          className="space-y-2"
                        >
                          {questionsByCategory[cat].map((q) => (
                            <motion.div key={q.id} variants={listItem}>
                              <QuestionCard question={q} />
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    )
                  })}

                {session.questions.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No questions generated. Try regenerating.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

export default InterviewPrep
