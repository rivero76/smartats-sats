import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import {
  RefreshCw,
  Search,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'

interface JobDescriptionLogEntry {
  id: string
  script_name: string
  log_level: string
  message: string
  metadata: any
  timestamp: string
  session_id?: string
  user_id?: string
}

interface IngestionMetrics {
  totalSessions: number
  successfulIngestions: number
  failedIngestions: number
  averageProcessingTime: number
  extractionAccuracy: number
  topErrors: Array<{ error: string; count: number }>
}

export const JobDescriptionLoggingPanel = () => {
  const [timeRange, setTimeRange] = useState('24h')
  const [logLevel, setLogLevel] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch job description logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['job-description-logs', timeRange, logLevel],
    queryFn: async () => {
      const hoursBack =
        timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720

      let query = supabase
        .from('log_entries')
        .select('*')
        .in('script_name', [
          'job-description-ingest',
          'content-extraction',
          'company-location-management',
        ])
        .gte('timestamp', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(500)

      if (logLevel !== 'all') {
        query = query.eq('log_level', logLevel.toUpperCase())
      }

      const { data, error } = await query
      if (error) throw error
      return data as JobDescriptionLogEntry[]
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Calculate metrics
  const metrics: IngestionMetrics = React.useMemo(() => {
    if (!logs)
      return {
        totalSessions: 0,
        successfulIngestions: 0,
        failedIngestions: 0,
        averageProcessingTime: 0,
        extractionAccuracy: 0,
        topErrors: [],
      }

    const sessions = new Set(logs.map((log) => log.metadata?.sessionId).filter(Boolean))
    const successful = logs.filter(
      (log) => log.message.includes('Completed') && log.log_level === 'INFO'
    ).length
    const failed = logs.filter((log) => log.log_level === 'ERROR').length

    const processingTimes = logs
      .filter((log) => log.metadata?.duration)
      .map((log) => log.metadata.duration)

    const avgTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0

    const extractionLogs = logs.filter(
      (log) => log.script_name === 'content-extraction' && log.metadata?.extractionQuality
    )

    const accuracy =
      extractionLogs.length > 0
        ? (extractionLogs.filter((log) => log.metadata.extractionQuality.hasCore).length /
            extractionLogs.length) *
          100
        : 0

    const errors = logs.filter((log) => log.log_level === 'ERROR')
    const errorCounts = errors.reduce((acc: any, log) => {
      const error = log.metadata?.error || log.message
      acc[error] = (acc[error] || 0) + 1
      return acc
    }, {})

    const topErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalSessions: sessions.size,
      successfulIngestions: successful,
      failedIngestions: failed,
      averageProcessingTime: Math.round(avgTime),
      extractionAccuracy: Math.round(accuracy),
      topErrors,
    }
  }, [logs])

  const filteredLogs =
    logs?.filter(
      (log) =>
        searchTerm === '' ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.metadata?.sessionId?.includes(searchTerm)
    ) || []

  const getLogIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'info':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'debug':
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getLogBadgeVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'destructive'
      case 'info':
        return 'default'
      case 'debug':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Job Description Ingestion Monitoring</h3>
          <p className="text-muted-foreground">
            Monitor and analyze job description processing, content extraction, and company/location
            management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Unique ingestion sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.totalSessions > 0
                ? Math.round(
                    (metrics.successfulIngestions /
                      (metrics.successfulIngestions + metrics.failedIngestions)) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.successfulIngestions} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageProcessingTime}ms</div>
            <p className="text-xs text-muted-foreground">Per ingestion session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Extraction Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.extractionAccuracy}%</div>
            <p className="text-xs text-muted-foreground">Core fields extracted</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Live Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search logs by message or session ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading logs...</span>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-start gap-3">
                    {getLogIcon(log.log_level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getLogBadgeVariant(log.log_level)} className="text-xs">
                          {log.log_level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.script_name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                        </span>
                        {log.metadata?.sessionId && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {log.metadata.sessionId.split('-')[1]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View metadata
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Extraction Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Extraction Quality</h4>
                      <p className="text-2xl font-bold">{metrics.extractionAccuracy}%</p>
                      <p className="text-sm text-muted-foreground">
                        Successfully extracted core fields
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Processing Speed</h4>
                      <p className="text-2xl font-bold">{metrics.averageProcessingTime}ms</p>
                      <p className="text-sm text-muted-foreground">Average extraction time</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Top Errors ({timeRange})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.topErrors.length === 0 ? (
                <p className="text-muted-foreground">No errors recorded in this time period.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topErrors.map((errorItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{errorItem.error}</p>
                      </div>
                      <Badge variant="destructive">{errorItem.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
