import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Eye, Settings, Trash2, Download, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { LogViewer } from './LogViewer'
import { LogCleanupManager } from './LogCleanupManager'
import { JobDescriptionLoggingPanel } from './JobDescriptionLoggingPanel'
import { ObservabilityPanel } from './ObservabilityPanel'

interface LogSetting {
  id: string
  script_name: string
  description: string
  logging_enabled: boolean
  debug_enabled: boolean
  trace_enabled: boolean
  log_level: 'OFF' | 'ERROR' | 'INFO' | 'DEBUG' | 'TRACE'
  updated_at: string
}

interface LogEntry {
  id: string
  script_name: string
  log_level: string
  message: string
  metadata: any
  timestamp: string
}

export const LoggingControlPanel = () => {
  const queryClient = useQueryClient()
  const [selectedScript, setSelectedScript] = useState<string>('')

  // Fetch log settings
  const { data: logSettings, isLoading } = useQuery({
    queryKey: ['log-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('log_settings').select('*').order('script_name')

      if (error) throw error
      return data as LogSetting[]
    },
  })

  // Update log setting mutation
  const updateLogSettingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LogSetting> }) => {
      const { error } = await supabase.from('log_settings').update(updates).eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-settings'] })
      toast.success('Log settings updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update log settings: ' + error.message)
    },
  })

  const getLogLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'OFF':
        return 'secondary'
      case 'ERROR':
        return 'destructive'
      case 'INFO':
        return 'default'
      case 'DEBUG':
        return 'outline'
      case 'TRACE':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const handleToggleLogging = (setting: LogSetting, field: keyof LogSetting) => {
    updateLogSettingMutation.mutate({
      id: setting.id,
      updates: { [field]: !(setting[field] as boolean) },
    })
  }

  const handleLogLevelChange = (setting: LogSetting, level: string) => {
    updateLogSettingMutation.mutate({
      id: setting.id,
      updates: { log_level: level as LogSetting['log_level'] },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading logging settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Logging Control Panel</h2>
          <p className="text-muted-foreground">
            Manage logging, debugging, and tracing for all system processes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">All logging is disabled by default</span>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Log Settings
          </TabsTrigger>
          <TabsTrigger value="observability" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Observability
          </TabsTrigger>
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Log Viewer
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Cleanup
          </TabsTrigger>
          <TabsTrigger value="job-descriptions" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Job Descriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            {logSettings?.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{setting.script_name}</CardTitle>
                      <CardDescription>{setting.description}</CardDescription>
                    </div>
                    <Badge variant={getLogLevelBadgeVariant(setting.log_level)}>
                      {setting.log_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Logging Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium">Logging</label>
                        <p className="text-xs text-muted-foreground">Enable basic logging</p>
                      </div>
                      <Switch
                        checked={setting.logging_enabled}
                        onCheckedChange={() => handleToggleLogging(setting, 'logging_enabled')}
                      />
                    </div>

                    {/* Debug Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium">Debug</label>
                        <p className="text-xs text-muted-foreground">Enable debug output</p>
                      </div>
                      <Switch
                        checked={setting.debug_enabled}
                        onCheckedChange={() => handleToggleLogging(setting, 'debug_enabled')}
                      />
                    </div>

                    {/* Trace Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium">Trace</label>
                        <p className="text-xs text-muted-foreground">Enable detailed tracing</p>
                      </div>
                      <Switch
                        checked={setting.trace_enabled}
                        onCheckedChange={() => handleToggleLogging(setting, 'trace_enabled')}
                      />
                    </div>
                  </div>

                  {/* Log Level Selection */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-0">Log Level:</label>
                    <Select
                      value={setting.log_level}
                      onValueChange={(value) => handleLogLevelChange(setting, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFF">OFF</SelectItem>
                        <SelectItem value="ERROR">ERROR</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="DEBUG">DEBUG</SelectItem>
                        <SelectItem value="TRACE">TRACE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="observability">
          <ObservabilityPanel />
        </TabsContent>

        <TabsContent value="viewer">
          <LogViewer />
        </TabsContent>

        <TabsContent value="cleanup">
          <LogCleanupManager />
        </TabsContent>

        <TabsContent value="job-descriptions" className="space-y-4">
          <JobDescriptionLoggingPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
