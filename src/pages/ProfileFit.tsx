/**
 * UPDATE LOG
 * 2026-04-07 00:00:00 | P28 S4/S5/S6 — Profile Fit Analyzer page. Compares the
 *   user's LinkedIn-sourced skill profile against market baselines for a target
 *   role. Displays fit score, gap breakdown (Pro+), reconciliation (Max+), and
 *   score history chart (Max+). Gated to Pro+ via hasFeature('profile_fit').
 * 2026-04-08 | P30 S4 — Move reconciliation LockedPanel to "Pro plan required".
 *   Fix coupling bug: score history section now gates on 'profile_fit_score_history'
 *   (Max+) instead of 'profile_fit_reconciliation' (now Pro+).
 * 2026-04-08 | P30 S5 — Add ConsistencyScoreDisplay above ReconciliationConflictList.
 *   Renders a 0–100 score derived from computeConsistencyScore() with colour coding.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Target,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Trash2,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'
import { fadeIn, staggerContainer, listItem } from '@/lib/animations'
import { usePlanFeature } from '@/hooks/usePlanFeature'
import { useProfileFitHistory, useRunProfileFit } from '@/hooks/useProfileFit'
import { useRoleFamilies } from '@/hooks/useRoleFamilies'
import { useCareerGoals } from '@/hooks/useCareerGoals'
import { useResumes } from '@/hooks/useResumes'
import { ReconciliationConflictList } from '@/components/profile-fit/ReconciliationConflictList'
import { FitScoreHistoryChart } from '@/components/profile-fit/FitScoreHistoryChart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLinkedinImportAge } from '@/hooks/useLinkedinImportAge'
import type {
  ProfileFitGapItem,
  ProfileFitReport,
  ReconciliationConflict,
} from '@/hooks/useProfileFit'
import { computeConsistencyScore } from '@/lib/consistency-score'

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKET_LABELS: Record<string, string> = {
  nz: 'New Zealand',
  au: 'Australia',
  uk: 'United Kingdom',
  br: 'Brazil',
  us: 'United States',
}

const TIER_CONFIG = {
  critical: {
    label: 'Critical Gaps',
    colour: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    badge: 'destructive' as const,
  },
  important: {
    label: 'Important Gaps',
    colour: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'secondary' as const,
  },
  nice_to_have: {
    label: 'Nice-to-Have Gaps',
    colour: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    badge: 'outline' as const,
  },
}

// ─── Score display ────────────────────────────────────────────────────────────

function scoreColour(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

// ─── Upsell gate ─────────────────────────────────────────────────────────────

function ProfileFitUpsell() {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4"
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <div className="max-w-md">
        <h2 className="text-2xl font-bold mb-2">Profile Fit Analyzer is a Pro feature</h2>
        <p className="text-muted-foreground">
          Upgrade to Pro to see how competitive your LinkedIn profile is for your target role — with
          a fit score, prioritised gap breakdown, and actionable recommendations.
        </p>
      </div>
      <Button size="lg" onClick={() => (window.location.href = '/settings')}>
        Upgrade to Pro
      </Button>
    </motion.div>
  )
}

// ─── Gap item card ────────────────────────────────────────────────────────────

function GapItemCard({ item }: { item: ProfileFitGapItem }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = TIER_CONFIG[item.priority_tier]

  return (
    <motion.div variants={listItem} className={`rounded-lg border p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{item.signal_value}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {item.signal_type}
            </Badge>
          </div>
          {item.frequency_pct != null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>Market frequency</span>
              <div className="flex-1 max-w-32">
                <Progress value={item.frequency_pct} className="h-1.5" />
              </div>
              <span className="font-medium">{item.frequency_pct.toFixed(0)}%</span>
            </div>
          )}
          {item.recommended_action && (
            <p className="text-sm text-foreground/80">{item.recommended_action}</p>
          )}
        </div>
        {item.estimated_weeks_to_close != null && (
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            ~{item.estimated_weeks_to_close}w
          </span>
        )}
      </div>
      {item.recommended_action && item.signal_type === 'certification' && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Why this matters
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-muted-foreground bg-background/70 rounded p-2 border">
              Certifications in this category appear in a high percentage of job postings for your
              target role.
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Tier section ─────────────────────────────────────────────────────────────

function TierSection({
  tier,
  items,
}: {
  tier: keyof typeof TIER_CONFIG
  items: ProfileFitGapItem[]
}) {
  const [open, setOpen] = useState(tier !== 'nice_to_have')
  const cfg = TIER_CONFIG[tier]

  if (items.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between py-3 px-1 hover:bg-muted/30 rounded transition-colors">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={`font-semibold ${cfg.colour}`}>{cfg.label}</span>
            <Badge variant={cfg.badge} className="text-xs">
              {items.length}
            </Badge>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 pb-4"
        >
          {items.slice(0, 10).map((item, i) => (
            <GapItemCard key={`${item.signal_value}-${i}`} item={item} />
          ))}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Consistency score display ────────────────────────────────────────────────

function ConsistencyScoreDisplay({ conflicts }: { conflicts: ReconciliationConflict[] }) {
  const score = computeConsistencyScore(conflicts)
  const colourClass =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  const borderClass =
    score >= 80 ? 'border-l-green-500' : score >= 60 ? 'border-l-amber-400' : 'border-l-red-500'
  const message =
    score >= 80
      ? 'Your LinkedIn profile and resume are highly consistent.'
      : score >= 60
        ? 'Some discrepancies detected — review the conflicts below.'
        : 'Significant conflicts detected. Resolve these before applying.'

  return (
    <div
      className={`flex items-center gap-4 mb-4 p-4 rounded-lg border border-l-4 bg-card ${borderClass}`}
    >
      <div className="text-center shrink-0">
        <div className={`text-2xl font-bold tabular-nums ${colourClass}`}>{score}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Consistency Score</p>
      </div>
      <p className="text-sm text-muted-foreground flex-1">{message}</p>
    </div>
  )
}

// ─── Locked panel ─────────────────────────────────────────────────────────────

function LockedPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative rounded-lg border border-dashed p-6 text-center overflow-hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
          Upgrade
        </Button>
      </div>
      <div className="opacity-20 select-none pointer-events-none">
        <p className="text-sm">{description}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileFit() {
  const { hasFeature } = usePlanFeature()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: careerGoals } = useCareerGoals()
  const { data: roleFamilies = [] } = useRoleFamilies()
  const { data: resumes = [] } = useResumes()
  const { data: history = [], isLoading: historyLoading } = useProfileFitHistory()
  const { mutate: runFit, isPending: isRunning, data: latestResult } = useRunProfileFit()

  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [dismissedStaleAlert, setDismissedStaleAlert] = useState(false)

  const { daysSinceImport, isStale } = useLinkedinImportAge()

  // Initialise selectors from career goals profile
  useEffect(() => {
    if (careerGoals && !selectedRole) {
      setSelectedRole(careerGoals.primary_target_role_family_id ?? null)
    }
    if (careerGoals && !selectedMarket) {
      setSelectedMarket(careerGoals.target_market_codes?.[0] ?? null)
    }
  }, [careerGoals]) // eslint-disable-line react-hooks/exhaustive-deps

  // Default resume selector to most recently uploaded
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id)
    }
  }, [resumes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasFeature('profile_fit')) return <ProfileFitUpsell />

  // Latest report for the selected role/market (either from the live mutation result or history)
  const latestReport: ProfileFitReport | null = (() => {
    if (latestResult) {
      // Shape the live result into a report for display
      return {
        id: latestResult.report_id,
        user_id: user?.id ?? '',
        target_role_family_id: selectedRole ?? '',
        target_market_code: selectedMarket ?? '',
        fit_score: latestResult.fit_score,
        score_rationale: latestResult.score_rationale,
        gap_items: latestResult.gap_items,
        reconciliation_conflicts: latestResult.reconciliation_conflicts,
        model_used: null,
        cost_estimate_usd: null,
        created_at: new Date().toISOString(),
      }
    }
    if (!selectedRole || !selectedMarket) return null
    return (
      history.find(
        (r) => r.target_role_family_id === selectedRole && r.target_market_code === selectedMarket
      ) ?? null
    )
  })()

  const criticalItems = (latestReport?.gap_items ?? []).filter(
    (g) => g.priority_tier === 'critical'
  )
  const importantItems = (latestReport?.gap_items ?? []).filter(
    (g) => g.priority_tier === 'important'
  )
  const niceToHaveItems = (latestReport?.gap_items ?? []).filter(
    (g) => g.priority_tier === 'nice_to_have'
  )

  const availableMarkets = careerGoals?.target_market_codes?.length
    ? careerGoals.target_market_codes
    : Object.keys(MARKET_LABELS)

  const selectedRoleName = roleFamilies.find((r) => r.id === selectedRole)?.name ?? 'Select role'

  const canRun = !!(selectedRole && selectedMarket) && !isRunning

  const handleRun = () => {
    if (!selectedRole || !selectedMarket) return
    runFit({
      targetRoleFamilyId: selectedRole,
      targetMarketCode: selectedMarket,
      resumeId: hasFeature('profile_fit_reconciliation')
        ? (selectedResumeId ?? undefined)
        : undefined,
    })
  }

  const handleClearHistory = async () => {
    if (!confirm('Delete all profile fit reports? This cannot be undone.')) return
    try {
      const { error } = await supabase
        .from('sats_profile_fit_reports')
        .delete()
        .eq('user_id', user?.id ?? '')
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['profile-fit-history', user?.id] })
      toast({ title: 'History cleared', description: 'All fit reports have been deleted.' })
    } catch {
      toast({ variant: 'destructive', title: 'Failed to clear history' })
    }
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Profile Fit Analyzer</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          How competitive is your LinkedIn profile for your target role?
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-3 mb-6 items-end"
      >
        <div className="flex flex-col gap-1 min-w-48">
          <label className="text-xs text-muted-foreground font-medium">Target role</label>
          <Select value={selectedRole ?? ''} onValueChange={(v) => setSelectedRole(v || null)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select role">{selectedRoleName}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              {roleFamilies.map((rf) => (
                <SelectItem key={rf.id} value={rf.id}>
                  {rf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-36">
          <label className="text-xs text-muted-foreground font-medium">Market</label>
          <Select value={selectedMarket ?? ''} onValueChange={(v) => setSelectedMarket(v || null)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              {availableMarkets.map((code) => (
                <SelectItem key={code} value={code}>
                  {MARKET_LABELS[code] ?? code.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleRun} disabled={!canRun} size="sm" className="h-9">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Analysing…' : 'Analyze Fit'}
        </Button>
      </motion.div>

      {/* Stale LinkedIn data alert */}
      {isStale && !dismissedStaleAlert && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2 text-sm">
            <span>
              LinkedIn data is {daysSinceImport} days old — re-import for accurate results.
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => (window.location.href = '/settings')}
              >
                Re-import →
              </Button>
              <button
                className="text-muted-foreground hover:text-foreground text-sm"
                onClick={() => setDismissedStaleAlert(true)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {historyLoading && !latestReport && (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading fit data…</div>
      )}

      {/* Empty state */}
      {!historyLoading && !latestReport && !isRunning && (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center px-4"
        >
          <TrendingUp className="h-10 w-10 text-muted-foreground" />
          <div className="max-w-sm">
            <h3 className="font-semibold mb-1">No fit analysis yet</h3>
            <p className="text-sm text-muted-foreground">
              Select a target role and market, then click "Analyze Fit" to see how competitive your
              profile is.
            </p>
          </div>
        </motion.div>
      )}

      {/* Score display */}
      {latestReport && (
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          {/* Score card */}
          <div className="rounded-xl border bg-card p-6 mb-6 flex items-start gap-6">
            <div className="text-center shrink-0">
              <div
                className={`text-5xl font-bold tabular-nums ${scoreColour(latestReport.fit_score)}`}
                aria-label={`Fit score: ${latestReport.fit_score} percent`}
              >
                {latestReport.fit_score}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Profile Fit Score</p>
            </div>
            <div className="flex-1 min-w-0">
              {latestReport.score_rationale && (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {latestReport.score_rationale}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Last analysed:{' '}
                {new Date(latestReport.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Gap breakdown — Pro+ */}
          <div className="mb-8">
            <h2 className="text-base font-semibold mb-3">Gap Breakdown</h2>
            {latestReport.gap_items.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>No gaps detected — your profile covers all tracked market signals.</span>
              </div>
            ) : (
              <div className="divide-y">
                <TierSection tier="critical" items={criticalItems} />
                <TierSection tier="important" items={importantItems} />
                <TierSection tier="nice_to_have" items={niceToHaveItems} />
              </div>
            )}
          </div>

          {/* Reconciliation section — Max+ */}
          <div className="mb-8">
            <h2 className="text-base font-semibold mb-1">Resume Reconciliation</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Discrepancies between your LinkedIn profile and uploaded resume.
            </p>
            {hasFeature('profile_fit_reconciliation') ? (
              <>
                {/* Resume selector */}
                {resumes.length > 0 && (
                  <div className="flex flex-wrap gap-3 items-end mb-4">
                    <div className="flex flex-col gap-1 min-w-56">
                      <label className="text-xs text-muted-foreground font-medium">
                        Compare against resume
                      </label>
                      <Select
                        value={selectedResumeId ?? ''}
                        onValueChange={(v) => setSelectedResumeId(v || null)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select resume" />
                        </SelectTrigger>
                        <SelectContent>
                          {resumes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.title ?? 'Untitled resume'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled={!canRun || !selectedResumeId}
                      onClick={handleRun}
                    >
                      Analyze with Reconciliation
                    </Button>
                  </div>
                )}
                {latestReport.reconciliation_conflicts !== null ? (
                  <>
                    <ConsistencyScoreDisplay
                      conflicts={latestReport.reconciliation_conflicts ?? []}
                    />
                    <ReconciliationConflictList
                      conflicts={latestReport.reconciliation_conflicts ?? []}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Run "Analyze with Reconciliation" to compare your LinkedIn profile against your
                    resume.
                  </p>
                )}
              </>
            ) : (
              <LockedPanel
                title="Pro plan required"
                description="Detect inconsistencies between your LinkedIn profile and resume — job titles, dates, skill claims."
              />
            )}
          </div>

          {/* Score history — Max+ */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold">Score History</h2>
                <p className="text-xs text-muted-foreground">
                  Fit score over time for this role and market.
                </p>
              </div>
              {hasFeature('profile_fit_score_history') && history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleClearHistory}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Clear history
                </Button>
              )}
            </div>
            {hasFeature('profile_fit_score_history') ? (
              selectedRole && selectedMarket ? (
                <FitScoreHistoryChart
                  reports={history}
                  roleFamilyId={selectedRole}
                  marketCode={selectedMarket}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a role and market to see score history.
                </p>
              )
            ) : (
              <LockedPanel
                title="Max plan required"
                description="Track how your fit score improves over time as you close skill gaps."
              />
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
