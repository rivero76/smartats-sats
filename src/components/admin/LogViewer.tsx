import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Download, RefreshCw, Filter, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  script_name: string;
  log_level: string;
  message: string;
  metadata: any;
  user_id?: string;
  session_id?: string;
  request_id?: string;
  timestamp: string;
}

export const LogViewer = () => {
  const [filterScript, setFilterScript] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  // Fetch log entries
  const { data: logEntries, isLoading, refetch } = useQuery({
    queryKey: ['log-entries', filterScript, filterLevel, searchTerm, limit],
    queryFn: async () => {
      let query = supabase
        .from('log_entries')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (filterScript !== 'all') {
        query = query.eq('script_name', filterScript);
      }

      if (filterLevel !== 'all') {
        query = query.eq('log_level', filterLevel);
      }

      if (searchTerm) {
        query = query.ilike('message', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LogEntry[];
    }
  });

  // Fetch available scripts
  const { data: scripts } = useQuery({
    queryKey: ['log-scripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('log_settings')
        .select('script_name')
        .order('script_name');
      
      if (error) throw error;
      return data.map(s => s.script_name);
    }
  });

  const getLogLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'ERROR': return 'destructive';
      case 'INFO': return 'default';
      case 'DEBUG': return 'secondary';
      case 'TRACE': return 'outline';
      default: return 'secondary';
    }
  };

  const exportLogs = () => {
    if (!logEntries) return;

    const csvContent = [
      'Timestamp,Script,Level,Message,Metadata,User ID,Session ID,Request ID',
      ...logEntries.map(entry => [
        entry.timestamp,
        entry.script_name,
        entry.log_level,
        `"${entry.message.replace(/"/g, '""')}"`,
        `"${JSON.stringify(entry.metadata || {}).replace(/"/g, '""')}"`,
        entry.user_id || '',
        entry.session_id || '',
        entry.request_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Log Viewer
          </CardTitle>
          <CardDescription>
            View and search through system logs in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <label className="text-sm font-medium mb-2 block">Search Messages</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search log messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Script</label>
              <Select value={filterScript} onValueChange={setFilterScript}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scripts</SelectItem>
                  {scripts?.map(script => (
                    <SelectItem key={script} value={script}>{script}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="TRACE">TRACE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Limit</label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <div className="text-sm text-muted-foreground ml-auto">
              {logEntries?.length || 0} entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading logs...
              </div>
            ) : (
              <div className="space-y-1">
                {logEntries?.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 border-b hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1">
                        <Badge variant={getLogLevelBadgeVariant(entry.log_level)}>
                          {entry.log_level}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span className="font-mono">{entry.script_name}</span>
                          <span>•</span>
                          <span>{format(new Date(entry.timestamp), 'MMM dd, HH:mm:ss')}</span>
                          {entry.request_id && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-xs">{entry.request_id}</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm break-words">{entry.message}</div>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Metadata
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!logEntries || logEntries.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No log entries found
                  </div>
                ) : null}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};