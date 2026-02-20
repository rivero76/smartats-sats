import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Calendar, Database, AlertTriangle, Settings } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface CleanupPolicy {
  id: string
  script_name?: string
  retention_days: number
  max_entries: number
  auto_cleanup_enabled: boolean
}

export const LogCleanupManager = () => {
  const queryClient = useQueryClient()
  const [selectedScript, setSelectedScript] = useState<string>('all')
  const [retentionDays, setRetentionDays] = useState<number>(7)

  // Fetch cleanup policies
  const { data: cleanupPolicies } = useQuery({
    queryKey: ['cleanup-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('log_cleanup_policies')
        .select('*')
        .order('script_name')

      if (error) throw error
      return data as CleanupPolicy[]
    },
  })

  // Fetch log statistics
  const { data: logStats } = useQuery({
    queryKey: ['log-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('script_name, log_level, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      // Calculate statistics
      const totalEntries = data.length
      const scriptStats = data.reduce(
        (acc, entry) => {
          acc[entry.script_name] = (acc[entry.script_name] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const oldestEntry =
        data.length > 0
          ? new Date(Math.min(...data.map((e) => new Date(e.created_at).getTime())))
          : null

      return {
        totalEntries,
        scriptStats,
        oldestEntry,
      }
    },
  })

  // Delete logs mutation
  const deleteLogsMutation = useMutation({
    mutationFn: async ({ script, days }: { script: string; days: number }) => {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase.from('log_entries').delete().lt('created_at', cutoffDate)

      if (script !== 'all') {
        query = query.eq('script_name', script)
      }

      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] })
      queryClient.invalidateQueries({ queryKey: ['log-stats'] })
      toast.success('Logs deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete logs: ' + error.message)
    },
  })

  // Delete all logs mutation
  const deleteAllLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('log_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] })
      queryClient.invalidateQueries({ queryKey: ['log-stats'] })
      toast.success('All logs deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete all logs: ' + error.message)
    },
  })

  const formatFileSize = (entries: number) => {
    const bytesPerEntry = 500 // Rough estimate
    const bytes = entries * bytesPerEntry
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Statistics Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Log Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logStats?.totalEntries.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              ~{formatFileSize(logStats?.totalEntries || 0)} estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oldest Entry</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logStats?.oldestEntry
                ? Math.ceil((Date.now() - logStats.oldestEntry.getTime()) / (1000 * 60 * 60 * 24))
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">days ago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Scripts</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(logStats?.scriptStats || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">generating logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Script Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Log Distribution by Script</CardTitle>
          <CardDescription>Number of log entries per script (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(logStats?.scriptStats || {}).map(([script, count]) => (
              <div key={script} className="flex items-center justify-between p-2 border rounded">
                <span className="font-mono text-sm">{script}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {count.toLocaleString()} entries
                  </span>
                  <span className="text-xs text-muted-foreground">({formatFileSize(count)})</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Log Cleanup
          </CardTitle>
          <CardDescription>Delete old log entries to free up storage space</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="script-select">Script (Optional)</Label>
              <Select value={selectedScript} onValueChange={setSelectedScript}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scripts</SelectItem>
                  {Object.keys(logStats?.scriptStats || {}).map((script) => (
                    <SelectItem key={script} value={script}>
                      {script}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="retention-days">Delete logs older than (days)</Label>
              <Input
                id="retention-days"
                type="number"
                min="1"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 7)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Old Logs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Old Logs</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This will permanently delete log entries older than {retentionDays} days
                      {selectedScript !== 'all'
                        ? ` for script "${selectedScript}"`
                        : ' for all scripts'}
                      .
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800">This action cannot be undone.</span>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteLogsMutation.mutate({ script: selectedScript, days: retentionDays })
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Logs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Logs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Logs</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This will permanently delete <strong>all log entries</strong> from the system.
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        This is a destructive action that cannot be undone!
                      </span>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllLogsMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All Logs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
