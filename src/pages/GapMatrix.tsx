/**
 * UPDATE LOG
 * 2026-04-05 22:30:00 | P26 S6-1 — Gap Analysis page. Displays the user's gap matrix
 *   (critical / important / nice-to-have gaps) for their target role and market.
 *   Gated to Pro+ users via hasFeature('gap_analysis'). Allows on-demand refresh and
 *   roadmap generation from critical + important gaps.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Lock,
  Info,
} from 'lucide-react'
import { staggerContainer, listItem, fadeIn } from '@/lib/animations'
import { usePlanFeature } from '@/hooks/usePlanFeature'
import { useLatestGapSnapshot, useRefreshGapMatrix, type GapItem } from '@/hooks/useGapAnalysis'
import { useCareerGoals } from '@/hooks/useCareerGoals'
import { useRoleFamilies } from '@/hooks/useRoleFamilies'
import { useGenerateRoadmap } from '@/hooks/useUpskillingRoadmaps'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

// ─── Upsell ────────────────────────────────────────────────────────────────────

function GapAnalysisUpsell() {
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
        <h2 className="text-2xl font-bold mb-2">Gap Analysis is a Pro feature</h2>
        <p className="text-muted-foreground">
          Upgrade to Pro to see exactly which certifications, tools, and skills the market is asking
          for — and how far you are from landing your target role.
        </p>
      </div>
      <Button size="lg" onClick={() => (window.location.href = '/settings')}>
        Upgrade to Pro
      </Button>
    </motion.div>
  )
}

// ─── Gap Item Card ─────────────────────────────────────────────────────────────

function GapItemCard({ item }: { item: GapItem }) {
  const [expanded, setExpanded] = useState(false)
  const tierCfg = TIER_CONFIG[item.priority_tier]

  return (
    <motion.div variants={listItem} className={`rounded-lg border p-4 ${tierCfg.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{item.signal_value}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {item.signal_type}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Market frequency</span>
            <div className="flex-1 max-w-32">
              <Progress value={item.frequency_pct} className="h-1.5" />
            </div>
            <span className="font-medium">{item.frequency_pct.toFixed(0)}%</span>
          </div>
          {item.recommended_action && (
            <p className="text-sm text-foreground/80">{item.recommended_action}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {item.estimated_weeks_to_close != null && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ~{item.estimated_weeks_to_close}w to close
            </span>
          )}
        </div>
      </div>

      {item.resume_language_template && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Resume language template
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-muted-foreground bg-background/70 rounded p-2 border">
              {item.resume_language_template}
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Tier Section ──────────────────────────────────────────────────────────────

function TierSection({ tier, items }: { tier: keyof typeof TIER_CONFIG; items: GapItem[] }) {
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
          {items.slice(0, 10).map((item) => (
            <GapItemCard key={item.id} item={item} />
          ))}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ hasCareerGoals }: { hasCareerGoals: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      <div className="max-w-sm">
        <h3 className="font-semibold mb-1">
          {hasCareerGoals ? 'No market data yet' : 'Set your career goals first'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasCareerGoals
            ? 'Gap analysis requires job posting data. Connect your job alert emails in Settings to start ingesting real job postings, then click Refresh Analysis.'
            : 'Tell SmartATS your target role and markets in Settings so we know what to analyse.'}
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate('/settings')}>
        Open Settings
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GapMatrix() {
  const { hasFeature } = usePlanFeature()
  const navigate = useNavigate()

  const { data: careerGoals, isLoading: goalsLoading } = useCareerGoals()
  const { data: roleFamilies = [] } = useRoleFamilies()

  // Session-level overrides default to profile values
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)

  // Initialise from profile once loaded
  useEffect(() => {
    if (careerGoals && !selectedRole) {
      setSelectedRole(careerGoals.primary_target_role_family_id ?? null)
    }
    if (careerGoals && !selectedMarket) {
      setSelectedMarket(careerGoals.target_market_codes?.[0] ?? null)
    }
  }, [careerGoals]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: gapResult, isLoading: snapshotLoading } = useLatestGapSnapshot(
    selectedRole,
    selectedMarket
  )
  const { mutate: refreshMatrix, isPending: isRefreshing } = useRefreshGapMatrix()
  const { mutate: generateRoadmap, isPending: isGeneratingRoadmap } = useGenerateRoadmap()

  if (!hasFeature('gap_analysis')) return <GapAnalysisUpsell />

  const snapshot = gapResult?.snapshot ?? null
  const items = gapResult?.items ?? []

  const criticalItems = items.filter((i) => i.priority_tier === 'critical')
  const importantItems = items.filter((i) => i.priority_tier === 'important')
  const niceToHaveItems = items.filter((i) => i.priority_tier === 'nice_to_have')

  const hasCareerGoals = !!(
    careerGoals?.primary_target_role_family_id ||
    (careerGoals?.target_market_codes?.length ?? 0) > 0
  )
  const canRefresh = !!(selectedRole && selectedMarket) && !isRefreshing
  const hasGaps = items.length > 0

  const selectedRoleName = roleFamilies.find((r) => r.id === selectedRole)?.name ?? 'Select role'
  const availableMarkets = careerGoals?.target_market_codes?.length
    ? careerGoals.target_market_codes
    : Object.keys(MARKET_LABELS)

  const handleRefresh = () => {
    if (!selectedRole || !selectedMarket) return
    refreshMatrix({ roleFamilyId: selectedRole, marketCode: selectedMarket })
  }

  const handleGenerateRoadmap = () => {
    if (!snapshot) return
    generateRoadmap({ gap_snapshot_id: snapshot.id }, { onSuccess: () => navigate('/roadmaps') })
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Gap Analysis</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          What the market is asking for — vs. where your profile stands today.
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

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button onClick={handleRefresh} disabled={!canRefresh} size="sm" className="h-9">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Analysing…' : 'Refresh Analysis'}
              </Button>
            </span>
          </TooltipTrigger>
          {!canRefresh && !isRefreshing && (
            <TooltipContent>
              {!selectedRole || !selectedMarket
                ? 'Select a role and market first'
                : 'Running analysis…'}
            </TooltipContent>
          )}
        </Tooltip>
      </motion.div>

      {/* Snapshot metadata */}
      {snapshot && (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-6 p-3 bg-muted/40 rounded-lg"
        >
          <span>
            Last refreshed: <strong>{new Date(snapshot.snapshot_date).toLocaleDateString()}</strong>
          </span>
          {snapshot.market_signals_window_end && (
            <span>
              Market data as of:{' '}
              <strong>{new Date(snapshot.market_signals_window_end).toLocaleDateString()}</strong>
            </span>
          )}
          <span>
            Overall gap score: <strong>{snapshot.overall_gap_score.toFixed(0)}</strong>
          </span>
        </motion.div>
      )}

      {/* Loading */}
      {(goalsLoading || snapshotLoading) && (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading gap data…</div>
      )}

      {/* Empty state */}
      {!goalsLoading && !snapshotLoading && !hasGaps && (
        <EmptyState hasCareerGoals={hasCareerGoals} />
      )}

      {/* Gap sections */}
      {hasGaps && (
        <div className="divide-y">
          <TierSection tier="critical" items={criticalItems} />
          <TierSection tier="important" items={importantItems} />
          <TierSection tier="nice_to_have" items={niceToHaveItems} />
        </div>
      )}

      {/* Roadmap CTA */}
      {hasGaps && criticalItems.length + importantItems.length > 0 && snapshot && (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mt-8 p-4 border rounded-lg bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm">
              <strong>{criticalItems.length + importantItems.length} actionable gaps</strong>{' '}
              identified. Generate a personalised upskilling roadmap to close them.
            </p>
          </div>
          <Button
            onClick={handleGenerateRoadmap}
            disabled={isGeneratingRoadmap}
            size="sm"
            className="shrink-0"
          >
            {isGeneratingRoadmap ? 'Generating…' : 'Generate Roadmap from Gaps'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}
