/**
 * UPDATE LOG
 * 2026-02-20 23:42:10 | P4: Added observability dashboards and rule-based alerting panel for admin monitoring.
 */
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Activity, TrendingUp, DollarSign, ShieldAlert } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

type LogLevel = 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE'

interface LogRow {
  id: string
  script_name: string
  log_level: LogLevel
  timestamp: string
  metadata: unknown
}

interface AnalysisRow {
  id: string
  status: string
  created_at: string
  analysis_data: unknown
}

interface AlertRuleResult {
  key: string
  title: string
  threshold: string
  triggered: boolean
  detail: string
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readNumberField(obj: Record<string, unknown> | null, key: string): number | null {
  if (!obj) return null
  const value = obj[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

export const ObservabilityPanel = () => {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const last15m = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['observability-metrics'],
    queryFn: async () => {
      const [logsRes, analysesRes] = await Promise.all([
        supabase
          .from('log_entries')
          .select('id, script_name, log_level, timestamp, metadata')
          .gte('timestamp', last7d)
          .order('timestamp', { ascending: false })
          .limit(5000),
        supabase
          .from('sats_analyses')
          .select('id, status, created_at, analysis_data')
          .gte('created_at', last7d)
          .order('created_at', { ascending: false })
          .limit(2000),
      ])

      if (logsRes.error) throw logsRes.error
      if (analysesRes.error) throw analysesRes.error

      const logs = (logsRes.data || []) as LogRow[]
      const analyses = (analysesRes.data || []) as AnalysisRow[]

      const logs24h = logs.filter((l) => new Date(l.timestamp).toISOString() >= last24h)
      const errors24h = logs24h.filter((l) => l.log_level === 'ERROR')
      const errorRate24h = logs24h.length > 0 ? (errors24h.length / logs24h.length) * 100 : 0

      const latencyValues = logs24h
        .map((l) => {
          const metadata = asObject(l.metadata)
          return (
            readNumberField(metadata, 'duration_ms') ||
            readNumberField(metadata, 'processing_time_ms') ||
            null
          )
        })
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

      const p95LatencyMs = percentile(latencyValues, 95)

      const atsLogs24h = logs24h.filter((l) => l.script_name === 'ats-analysis-direct')
      const enrichLogs24h = logs24h.filter((l) => l.script_name === 'enrich-experiences')
      const atsFailures24h = atsLogs24h.filter((l) => l.log_level === 'ERROR').length
      const enrichFailures24h = enrichLogs24h.filter((l) => l.log_level === 'ERROR').length

      const volumeByScript = logs24h.reduce(
        (acc, row) => {
          acc[row.script_name] = (acc[row.script_name] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const topScripts = Object.entries(volumeByScript)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)

      const costValuesToday = analyses
        .filter((a) => new Date(a.created_at) >= startOfDay)
        .map((a) => {
          const metadata = asObject(a.analysis_data)
          return readNumberField(metadata, 'cost_estimate_usd')
        })
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

      const totalCostToday = costValuesToday.reduce((sum, v) => sum + v, 0)
      const avgCostToday = costValuesToday.length > 0 ? totalCostToday / costValuesToday.length : 0

      const errors15m = logs.filter(
        (l) => l.log_level === 'ERROR' && new Date(l.timestamp).toISOString() >= last15m
      ).length
      const atsFailureRate24h =
        atsLogs24h.length > 0 ? (atsFailures24h / atsLogs24h.length) * 100 : 0

      const alertRules: AlertRuleResult[] = [
        {
          key: 'errors_spike_15m',
          title: 'Error Spike (15m)',
          threshold: '> 25 errors / 15m',
          triggered: errors15m > 25,
          detail: `${errors15m} errors in last 15 minutes`,
        },
        {
          key: 'ats_failure_rate_24h',
          title: 'ATS Failure Rate (24h)',
          threshold: '> 15%',
          triggered: atsFailureRate24h > 15,
          detail: `${atsFailureRate24h.toFixed(1)}% ATS failure rate`,
        },
        {
          key: 'avg_cost_today',
          title: 'Average Cost Anomaly (today)',
          threshold: '> $0.05 avg / analysis',
          triggered: avgCostToday > 0.05,
          detail: `$${avgCostToday.toFixed(4)} avg (${costValuesToday.length} analyses)`,
        },
      ]

      return {
        generatedAt: now.toISOString(),
        totalLogs24h: logs24h.length,
        errors24h: errors24h.length,
        errorRate24h,
        p95LatencyMs,
        atsFailures24h,
        enrichFailures24h,
        totalCostToday,
        avgCostToday,
        topScripts,
        alertRules,
      }
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading observability metrics...</div>
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">
          Failed to load observability metrics.
        </CardContent>
      </Card>
    )
  }

  const activeAlerts = data.alertRules.filter((a) => a.triggered)

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Last refresh: {format(new Date(data.generatedAt), 'yyyy-MM-dd HH:mm:ss')}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Rate (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.errorRate24h.toFixed(1)}%</div>
            <CardDescription>{data.errors24h} errors / {data.totalLogs24h} logs</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              P95 Latency (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.p95LatencyMs)} ms</div>
            <CardDescription>From structured `duration_ms` telemetry</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Failure Trends (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">ATS failures: <span className="font-semibold">{data.atsFailures24h}</span></div>
            <div className="text-sm">Enrichment failures: <span className="font-semibold">{data.enrichFailures24h}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Trend (today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalCostToday.toFixed(4)}</div>
            <CardDescription>Avg ${data.avgCostToday.toFixed(4)} / analysis</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Script Volume (24h)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topScripts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No logs in the selected window.</div>
          ) : (
            data.topScripts.map(([script, count]) => (
              <div key={script} className="flex items-center justify-between border rounded px-3 py-2">
                <span className="font-mono text-xs">{script}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Alert Rules
          </CardTitle>
          <CardDescription>Static threshold checks refreshed every 30 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.alertRules.map((rule) => (
            <div key={rule.key} className="flex items-center justify-between border rounded px-3 py-2">
              <div>
                <div className="text-sm font-medium">{rule.title}</div>
                <div className="text-xs text-muted-foreground">
                  Threshold: {rule.threshold} | Current: {rule.detail}
                </div>
              </div>
              <Badge variant={rule.triggered ? 'destructive' : 'secondary'}>
                {rule.triggered ? 'Triggered' : 'Normal'}
              </Badge>
            </div>
          ))}
          {activeAlerts.length === 0 ? (
            <div className="text-xs text-muted-foreground pt-1">No active alerts.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
