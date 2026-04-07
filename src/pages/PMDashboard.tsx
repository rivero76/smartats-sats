/**
 * UPDATE LOG
 * 2026-04-02 | PM Dashboard — unified product management view aggregating roadmap, backlog, bugs, incidents, plans, and release blockers from docs/ markdown sources
 */
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Map,
  Bug,
  AlertTriangle,
  FileText,
  GitBranch,
  CheckCircle2,
  CircleDot,
  Clock,
  Search,
  ClipboardCopy,
  Zap,
  BookOpen,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Raw markdown imports — Vite bundles these at build time and hot-reloads in dev
// ---------------------------------------------------------------------------
import roadmapRaw from '/docs/decisions/product-roadmap.md?raw'
import bugsRaw from '/docs/bugs/BACKLOG.md?raw'
import incidentsRaw from '/docs/incidents/INCIDENTS.md?raw'
import techBacklogRaw from '/docs/improvements/TECHNICAL_IMPROVEMENTS.md?raw'
import untestedRaw from '/docs/releases/UNTESTED_IMPLEMENTATIONS.md?raw'
import changelogRaw from '/docs/changelog/CHANGELOG.md?raw'

const planFiles = import.meta.glob('/plans/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TableRow {
  [key: string]: string
}

interface TechItem {
  id: string
  title: string
  area: string
  effort: string
  priority: string
  done: boolean
}

interface BugItem {
  id: string
  status: string
  severity: string
  summary: string
}

interface PlanEntry {
  path: string
  filename: string
  title: string
  preview: string
}

// ---------------------------------------------------------------------------
// Parsing utilities
// ---------------------------------------------------------------------------

function stripMd(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/^#+\s+/, '')
    .trim()
}

/** Extract text starting from a heading line through the next same-level heading */
function extractSection(text: string, heading: string): string {
  const idx = text.indexOf(heading)
  if (idx === -1) return ''
  const after = text.slice(idx + heading.length)
  // Stop at the next heading of same or higher level
  const headingLevel = heading.match(/^#{1,6}/)?.[0].length ?? 2
  const stopPattern = new RegExp(`^${'#'.repeat(headingLevel)}[^#]`, 'm')
  const stop = after.search(stopPattern)
  return stop === -1 ? after : after.slice(0, stop)
}

/** Parse the first markdown table found in a text block */
function parseMdTable(text: string): TableRow[] {
  const lines = text.split('\n').map((l) => l.trim())
  const startIdx = lines.findIndex((l) => l.startsWith('|') && l.endsWith('|'))
  if (startIdx === -1) return []

  const headerCells = lines[startIdx]
    .split('|')
    .map((h) => h.trim())
    .filter(Boolean)
  const rows: TableRow[] = []

  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('|')) break
    // Skip template/example rows
    const raw = line.slice(1, -1) // strip outer pipes
    const cells = raw.split('|').map((c) => c.trim())
    const row: TableRow = {}
    headerCells.forEach((h, idx) => {
      row[h] = stripMd(cells[idx] ?? '')
    })
    // Skip obviously empty/template rows
    if (Object.values(row).every((v) => !v || v === 'YYYY-MM-DD')) continue
    rows.push(row)
  }
  return rows
}

/** Extract IDs mentioned in "completed" context in HTML comments */
function parseCompletedIds(text: string): Set<string> {
  const done = new Set<string>()
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.toLowerCase().includes('completed') || line.toLowerCase().includes('done')) {
      const ids = line.match(/\b([A-Z]+-\d+(?:-\d+)?)\b/g) ?? []
      ids.forEach((id) => done.add(id))
    }
  }
  return done
}

/** Parse ### items from TECHNICAL_IMPROVEMENTS.md */
function parseTechItems(text: string): TechItem[] {
  const completedIds = parseCompletedIds(text)
  const items: TechItem[] = []

  // Current priority section tracker
  let currentPriority = ''
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track priority section (## P0 — ..., ## P1 — ..., ## WAF Items, etc.)
    const sectionMatch = line.match(/^## (.+)/)
    if (sectionMatch) {
      currentPriority = sectionMatch[1].replace(/—.*/, '').trim()
      continue
    }

    // Match ### item headings: ### P0-1 · Title or ### WAF-1 — Title
    const itemMatch = line.match(/^### ([A-Z]+-\d+(?:-\d+)?)\s*[·—]\s*(.+)/)
    if (!itemMatch) continue

    const id = itemMatch[1]
    const title = stripMd(itemMatch[2])

    // Extract area and effort from next few lines
    let area = ''
    let effort = ''
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const detail = lines[j]
      const areaM = detail.match(/\*\*Area:\*\*\s*(.+)/)
      const effortM = detail.match(/\*\*Effort:\*\*\s*(.+)/)
      if (areaM) area = areaM[1].trim()
      if (effortM) effort = effortM[1].trim()
      if (detail.startsWith('---')) break
    }

    items.push({
      id,
      title,
      area,
      effort,
      priority: currentPriority,
      done: completedIds.has(id),
    })
  }

  return items
}

/** Parse ## BUG- sections from BACKLOG.md */
function parseBugs(text: string): BugItem[] {
  const bugs: BugItem[] = []
  const sections = text.split(/\n(?=## BUG-)/)

  for (const section of sections) {
    const headingMatch = section.match(/^## (BUG-[^\n]+)/)
    if (!headingMatch) continue

    const id = headingMatch[1].trim()
    const statusMatch = section.match(/\*\*Status:\*\*\s*([^\n]+)/)
    const severityMatch = section.match(/\*\*Severity:\*\*\s*([^\n]+)/)
    const summary = section
      .split('\n')
      .slice(3, 5)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')

    bugs.push({
      id,
      status: stripMd(statusMatch?.[1] ?? 'UNKNOWN'),
      severity: stripMd(severityMatch?.[1] ?? ''),
      summary: stripMd(summary),
    })
  }
  return bugs
}

/** Extract plan entries from imported plan files */
function parsePlans(files: Record<string, string>): PlanEntry[] {
  return Object.entries(files)
    .filter(([path]) => !path.includes('/archive/') && !path.endsWith('README.md'))
    .map(([path, content]) => {
      const lines = content.split('\n').filter((l) => l.trim())
      const title = stripMd(lines.find((l) => l.startsWith('# ')) ?? path.split('/').pop() ?? path)
      const preview = lines
        .filter((l) => !l.startsWith('#') && !l.startsWith('<!--'))
        .slice(0, 2)
        .join(' ')
        .slice(0, 160)
      const filename = path.split('/').pop() ?? path
      return { path, filename, title, preview }
    })
    .sort((a, b) => a.filename.localeCompare(b.filename))
}

// ---------------------------------------------------------------------------
// Derived data (computed once at module level from bundled imports)
// ---------------------------------------------------------------------------

const roadmapRows = parseMdTable(extractSection(roadmapRaw, '## 1) Roadmap Snapshot'))
const openBlockers = parseMdTable(extractSection(untestedRaw, '## Open Blockers'))
const closedBlockers = parseMdTable(extractSection(untestedRaw, '## Closure Template'))
const activeIncidents = parseMdTable(extractSection(incidentsRaw, '## Active Incidents'))
const resolvedIncidents = parseMdTable(extractSection(incidentsRaw, '## Resolved Incidents'))
const problemRecords = parseMdTable(extractSection(incidentsRaw, '## Problem Records'))
const bugs = parseBugs(bugsRaw)
const techItems = parseTechItems(techBacklogRaw)
const plans = parsePlans(planFiles)

const recentChangelog = changelogRaw
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('All notable'))
  .slice(0, 40)

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary'
  let className = ''

  if (
    s.includes('runtime-verified') ||
    s.includes('resolved') ||
    s.includes('completed') ||
    s.includes('fixed') ||
    s === 'done'
  ) {
    className = 'bg-green-100 text-green-800 border-green-200'
    variant = 'outline'
  } else if (s.includes('code-verified') || s.includes('in progress')) {
    className = 'bg-blue-100 text-blue-800 border-blue-200'
    variant = 'outline'
  } else if (s.includes('open') || s.includes('planned')) {
    className = 'bg-slate-100 text-slate-700 border-slate-200'
    variant = 'outline'
  } else if (s.includes('blocked') || s.includes('high')) {
    className = 'bg-red-100 text-red-800 border-red-200'
    variant = 'outline'
  } else if (s.includes('pending') || s.includes('medium')) {
    className = 'bg-amber-100 text-amber-800 border-amber-200'
    variant = 'outline'
  }

  // Shorten long status strings
  const label = status
    .replace('RUNTIME-VERIFIED', 'VERIFIED')
    .replace('CODE-VERIFIED', 'CODE-VERIFIED')
    .split('—')[0]
    .split('(')[0]
    .trim()
    .slice(0, 28)

  return (
    <Badge variant={variant} className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  )
}

function SourceBadge({ filePath }: { filePath: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(filePath).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      title="Click to copy file path"
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
    >
      <ClipboardCopy className="h-3 w-3 flex-shrink-0" />
      {copied ? 'Copied!' : filePath}
    </button>
  )
}

function SummaryCard({
  title,
  value,
  sub,
  icon: Icon,
  colorClass,
}: {
  title: string
  value: string | number
  sub: string
  icon: React.ElementType
  colorClass: string
}) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PMDashboard = () => {
  const [techSearch, setTechSearch] = useState('')
  const [techFilter, setTechFilter] = useState<'all' | 'open' | 'done'>('all')

  // Summary counts
  const roadmapInProgress = roadmapRows.filter((r) =>
    (r['Status'] ?? '').toLowerCase().includes('in progress')
  ).length
  const roadmapPlanned = roadmapRows.filter(
    (r) => (r['Status'] ?? '').toLowerCase() === 'planned'
  ).length
  const openBlockerCount = openBlockers.filter(
    (r) => !(r['Status'] ?? '').toLowerCase().includes('runtime-verified')
  ).length
  const openBugsCount = bugs.filter((b) => b.status.toLowerCase().includes('open')).length
  const activeIncidentCount = activeIncidents.length
  const techDone = techItems.filter((i) => i.done).length
  const techOpen = techItems.filter((i) => !i.done).length

  const filteredTech = useMemo(() => {
    let items = techItems
    if (techFilter === 'open') items = items.filter((i) => !i.done)
    if (techFilter === 'done') items = items.filter((i) => i.done)
    if (techSearch) {
      const q = techSearch.toLowerCase()
      items = items.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.area.toLowerCase().includes(q)
      )
    }
    return items
  }, [techSearch, techFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PM Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aggregated view of roadmap, backlog, bugs, incidents, and release status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
              <RefreshCw className="h-3 w-3" />
              Live (HMR)
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            Source: docs/ + plans/
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard
          title="Roadmap In Progress"
          value={roadmapInProgress}
          sub={`${roadmapPlanned} planned`}
          icon={Map}
          colorClass="text-blue-500"
        />
        <SummaryCard
          title="Release Blockers"
          value={openBlockerCount}
          sub={`${closedBlockers.length} closed`}
          icon={ShieldAlert}
          colorClass="text-amber-500"
        />
        <SummaryCard
          title="Open Bugs"
          value={openBugsCount}
          sub={`${bugs.length} total`}
          icon={Bug}
          colorClass="text-red-500"
        />
        <SummaryCard
          title="Active Incidents"
          value={activeIncidentCount}
          sub={`${resolvedIncidents.length} resolved`}
          icon={AlertTriangle}
          colorClass="text-orange-500"
        />
        <SummaryCard
          title="Tech Backlog Open"
          value={techOpen}
          sub={`${techDone} done`}
          icon={Zap}
          colorClass="text-purple-500"
        />
        <SummaryCard
          title="Active Plans"
          value={plans.length}
          sub="in plans/"
          icon={GitBranch}
          colorClass="text-teal-500"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="roadmap">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="blockers">
            Release Blockers
            {openBlockerCount > 0 && (
              <Badge className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0">
                {openBlockerCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="backlog">Tech Backlog</TabsTrigger>
          <TabsTrigger value="bugs">
            Bugs
            {openBugsCount > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0">
                {openBugsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incidents">
            Incidents
            {activeIncidentCount > 0 && (
              <Badge className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0">
                {activeIncidentCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        {/* ----------------------------------------------------------------- */}
        {/* ROADMAP TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="roadmap" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Map className="h-4 w-4" />
                Product Roadmap Phases
              </CardTitle>
              <SourceBadge filePath="docs/decisions/product-roadmap.md" />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium w-[240px]">Phase</th>
                      <th className="pb-2 pr-4 font-medium w-[160px]">Status</th>
                      <th className="pb-2 pr-4 font-medium w-[100px]">Priority</th>
                      <th className="pb-2 font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {roadmapRows.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 pr-4 font-medium text-xs">{row['Phase'] ?? ''}</td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={row['Status'] ?? ''} />
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`text-xs font-medium ${
                              (row['Priority'] ?? '').toLowerCase().includes('highest')
                                ? 'text-red-600'
                                : (row['Priority'] ?? '').toLowerCase().includes('high')
                                  ? 'text-amber-600'
                                  : (row['Priority'] ?? '').toLowerCase() === 'done'
                                    ? 'text-green-600'
                                    : 'text-muted-foreground'
                            }`}
                          >
                            {row['Priority'] ?? ''}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground max-w-[400px]">
                          {(row['Summary'] ?? '').slice(0, 200)}
                          {(row['Summary'] ?? '').length > 200 ? '…' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* RELEASE BLOCKERS TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="blockers" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Open Blockers
              </CardTitle>
              <SourceBadge filePath="docs/releases/UNTESTED_IMPLEMENTATIONS.md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openBlockers.map((row, i) => {
                  const status = row['Status'] ?? ''
                  const isVerified = status.toLowerCase().includes('runtime-verified')
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 text-sm ${
                        isVerified ? 'border-green-200 bg-green-50/50' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{row['Change'] ?? ''}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(row['Required Before Release'] ?? row['Missing Tests'] ?? '').slice(
                              0,
                              200
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusBadge status={status} />
                          <span className="text-xs text-muted-foreground">{row['Date'] ?? ''}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {openBlockers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No open blockers</p>
                )}
              </div>
            </CardContent>
          </Card>

          {closedBlockers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Closed / Verified ({closedBlockers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Change</th>
                        <th className="pb-2 font-medium">Closed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {closedBlockers.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/40">
                          <td className="py-1.5 pr-4 text-muted-foreground whitespace-nowrap">
                            {row['Date Closed'] ?? ''}
                          </td>
                          <td className="py-1.5 pr-4">{row['Change'] ?? ''}</td>
                          <td className="py-1.5 text-muted-foreground">{row['Closed By'] ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* TECH BACKLOG TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="backlog" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Technical Backlog ({techItems.length} items)
                </CardTitle>
                <SourceBadge filePath="docs/improvements/TECHNICAL_IMPROVEMENTS.md" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search ID, title, or area…"
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    className="pl-7 h-8 text-sm"
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'open', 'done'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTechFilter(f)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        techFilter === f
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {f === 'all'
                        ? `All (${techItems.length})`
                        : f === 'open'
                          ? `Open (${techOpen})`
                          : `Done (${techDone})`}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium w-[80px]">ID</th>
                      <th className="pb-2 pr-3 font-medium">Title</th>
                      <th className="pb-2 pr-3 font-medium w-[160px]">Area</th>
                      <th className="pb-2 pr-3 font-medium w-[80px]">Effort</th>
                      <th className="pb-2 font-medium w-[60px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTech.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/40 transition-colors ${item.done ? 'opacity-50' : ''}`}
                      >
                        <td className="py-1.5 pr-3 font-mono font-medium text-primary">
                          {item.id}
                        </td>
                        <td className="py-1.5 pr-3">
                          {item.done ? <s>{item.title}</s> : item.title}
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{item.area}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{item.effort}</td>
                        <td className="py-1.5">
                          {item.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <CircleDot className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTech.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No items match</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* BUGS TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="bugs" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Bug Backlog
              </CardTitle>
              <SourceBadge filePath="docs/bugs/BACKLOG.md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bugs.map((bug, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs font-medium text-primary">{bug.id}</p>
                        <p className="text-xs text-muted-foreground mt-1">{bug.summary}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={bug.status} />
                        {bug.severity && (
                          <span className="text-xs text-muted-foreground">{bug.severity}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {bugs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No bugs found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* INCIDENTS TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="incidents" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Active Incidents
              </CardTitle>
              <SourceBadge filePath="docs/incidents/INCIDENTS.md" />
            </CardHeader>
            <CardContent>
              {activeIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active incidents
                </p>
              ) : (
                <div className="space-y-3">
                  {activeIncidents.map((row, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-orange-200 bg-orange-50/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-orange-700">
                              {row['ID'] ?? ''}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row['Date'] ?? ''}
                            </span>
                          </div>
                          <p className="text-xs mt-1">{row['Summary'] ?? ''}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusBadge status={row['Status'] ?? ''} />
                          {row['Severity'] && (
                            <Badge
                              variant="outline"
                              className="text-xs border-orange-200 text-orange-700 bg-orange-50"
                            >
                              {row['Severity']}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Resolved Incidents ({resolvedIncidents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">ID</th>
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Severity</th>
                      <th className="pb-2 pr-3 font-medium">Resolved</th>
                      <th className="pb-2 font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {resolvedIncidents.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="py-1.5 pr-3 font-mono font-medium">{row['ID'] ?? ''}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                          {row['Date'] ?? ''}
                        </td>
                        <td className="py-1.5 pr-3">
                          {row['Severity'] && <StatusBadge status={row['Severity']} />}
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                          {row['Resolved'] ?? ''}
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          {(row['Summary'] ?? '').slice(0, 120)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {problemRecords.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Problem Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {problemRecords.map((row, i) => (
                    <div key={i} className="text-xs rounded border p-2">
                      <span className="font-mono font-medium">{row['ID'] ?? ''}</span>
                      <span className="text-muted-foreground ml-2">
                        {row['Problem Description'] ?? ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* PLANS TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="plans" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Active Plans ({plans.length})
              </CardTitle>
              <SourceBadge filePath="plans/" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((plan) => (
                  <div key={plan.path} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{plan.title}</p>
                      <SourceBadge filePath={plan.path.replace(/^\//, '')} />
                    </div>
                    {plan.preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{plan.preview}</p>
                    )}
                  </div>
                ))}
                {plans.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 py-4 text-center">
                    No active plans found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* CHANGELOG TAB */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="changelog" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Recent Changelog
              </CardTitle>
              <SourceBadge filePath="docs/changelog/CHANGELOG.md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-xs">
                {recentChangelog.map((line, i) => {
                  const isHeader = line.startsWith('###') || line.startsWith('##')
                  const isListItem = line.startsWith('-')
                  return (
                    <div
                      key={i}
                      className={`leading-relaxed ${
                        isHeader
                          ? 'font-bold text-foreground mt-3 first:mt-0 text-sm'
                          : isListItem
                            ? 'text-muted-foreground pl-2'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {line}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        {import.meta.env.DEV
          ? 'Dashboard auto-updates via Vite HMR when source files change.'
          : 'Dashboard reflects the state at last build. Rebuild to pick up file changes.'}
      </p>
    </div>
  )
}

export default PMDashboard
