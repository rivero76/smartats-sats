/**
 * UPDATE LOG
 * 2026-04-02 00:00:00 | Gap 2 — Admin JD Observability panel. Admin-only view of all
 *   job descriptions across all users. Filterable by source type, date range, and
 *   name/company search. Requires admin SELECT policy migration 20260402000000.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Briefcase, RefreshCw, Search } from 'lucide-react'
import { format, subDays } from 'date-fns'

type SourceType = 'text' | 'url' | 'file' | null

interface AdminJD {
  id: string
  user_id: string
  name: string
  source_type: SourceType
  created_at: string
  company: { name: string } | null
}

type DateFilter = '7d' | '30d' | '90d' | 'all'

function getDateCutoff(filter: DateFilter): string | null {
  const now = new Date()
  switch (filter) {
    case '7d':
      return subDays(now, 7).toISOString()
    case '30d':
      return subDays(now, 30).toISOString()
    case '90d':
      return subDays(now, 90).toISOString()
    default:
      return null
  }
}

function SourceBadge({ type }: { type: SourceType }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    text: { label: 'Text', variant: 'secondary' },
    url: { label: 'URL', variant: 'default' },
    file: { label: 'File', variant: 'outline' },
  }
  const cfg = (type && map[type]) ?? { label: 'Unknown', variant: 'secondary' as const }
  return (
    <Badge variant={cfg.variant} className="text-xs">
      {cfg.label}
    </Badge>
  )
}

export function AdminJobDescriptionsPanel() {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d')

  const {
    data = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-job-descriptions', dateFilter],
    queryFn: async () => {
      const cutoff = getDateCutoff(dateFilter)
      let query = supabase
        .from('sats_job_descriptions')
        .select('id, user_id, name, source_type, created_at, company:sats_companies(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)

      if (cutoff) query = query.gte('created_at', cutoff)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as AdminJD[]
    },
    staleTime: 60_000,
  })

  const filtered = data.filter((jd) => {
    const matchSearch =
      !search ||
      jd.name.toLowerCase().includes(search.toLowerCase()) ||
      (jd.company?.name ?? '').toLowerCase().includes(search.toLowerCase())

    const matchSource = sourceFilter === 'all' || jd.source_type === sourceFilter

    return matchSearch && matchSource
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Job Descriptions (All Users)
          </CardTitle>
          <CardDescription>
            Cross-user view — admin only. Showing up to 500 rows per query.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground">
          {isLoading ? 'Loading…' : `${filtered.length} of ${data.length} job descriptions`}
        </p>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">
            Could not load job descriptions. Ensure admin SELECT policy is applied.
          </p>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <ScrollArea className="h-[400px] rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden sm:table-cell">
                    Company
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Source</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">
                    User
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      No job descriptions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((jd) => (
                    <tr key={jd.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-2 max-w-[200px] truncate font-medium" title={jd.name}>
                        {jd.name}
                      </td>
                      <td className="p-2 hidden sm:table-cell text-muted-foreground">
                        {jd.company?.name ?? '—'}
                      </td>
                      <td className="p-2">
                        <SourceBadge type={jd.source_type} />
                      </td>
                      <td className="p-2 hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {jd.user_id.slice(0, 8)}…
                      </td>
                      <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(jd.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
