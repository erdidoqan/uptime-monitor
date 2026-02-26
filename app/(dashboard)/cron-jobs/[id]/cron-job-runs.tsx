'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { cache } from '@/lib/cache';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { CronRun } from '@/shared/types';

// Simple JSON syntax highlighter
function highlightJSON(jsonString: string): React.ReactNode {
  try {
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, 2);
    
    // Split by lines and highlight each token
    const lines = formatted.split('\n');
    
    return lines.map((line, lineIndex) => {
      const tokens: React.ReactNode[] = [];
      let currentIndex = 0;
      
      // Improved regex patterns for better token matching
      const patterns = [
        { regex: /^(\s+)/, className: 'text-slate-500' }, // Indentation
        { regex: /^("(?:[^"\\]|\\.)*":\s*)/, className: 'text-blue-400' }, // Keys
        { regex: /^("(?:[^"\\]|\\.)*")/, className: 'text-emerald-400' }, // String values
        { regex: /^(\d+\.?\d*)/, className: 'text-amber-400' }, // Numbers
        { regex: /^(true|false|null)/, className: 'text-purple-400' }, // Booleans and null
        { regex: /^([{}\[\],:])/, className: 'text-slate-400' }, // Punctuation
      ];
      
      while (currentIndex < line.length) {
        let matched = false;
        
        for (const pattern of patterns) {
          const match = line.slice(currentIndex).match(pattern.regex);
          if (match) {
            const text = match[1];
            tokens.push(
              <span key={`${lineIndex}-${currentIndex}`} className={pattern.className}>
                {text}
              </span>
            );
            currentIndex += text.length;
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          // Default text
          tokens.push(
            <span key={`${lineIndex}-${currentIndex}`} className="text-slate-100">
              {line[currentIndex]}
            </span>
          );
          currentIndex++;
        }
      }
      
      return (
        <React.Fragment key={lineIndex}>
          {tokens}
          {lineIndex < lines.length - 1 && '\n'}
        </React.Fragment>
      );
    });
  } catch {
    // If not valid JSON, return as plain text
    return <span className="text-slate-100">{jsonString}</span>;
  }
}

interface CronJobRunsProps {
  cronJobId: string;
  initialTimeRange?: 'day' | 'week' | 'month';
  initialRuns?: CronRun[];
}

export function CronJobRuns({ cronJobId, initialTimeRange = 'month', initialRuns = [] }: CronJobRunsProps) {
  const [runs, setRuns] = useState<CronRun[]>(initialRuns);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>(initialTimeRange);
  const [filter, setFilter] = useState<'all' | 'success' | 'fail'>('all');
  const [loading, setLoading] = useState(initialRuns.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const calculateStartDate = (range: 'day' | 'week' | 'month'): number => {
    const now = Date.now();
    switch (range) {
      case 'day':
        return now - (1 * 24 * 60 * 60 * 1000);
      case 'week':
        return now - (7 * 24 * 60 * 60 * 1000);
      case 'month':
        return now - (30 * 24 * 60 * 60 * 1000);
    }
  };

  useEffect(() => {
    const loadRuns = async () => {
      if (!cronJobId) return;

      const startDate = calculateStartDate(timeRange);
      const cacheKey = `cron-runs-${cronJobId}-${timeRange}-${startDate}`;

      // Try cache first
      const cached = cache.get<CronRun[]>(cacheKey);
      if (cached) {
        setRuns(cached);
        setLoading(false);
        return;
      }

      // If we have initial runs and they match the time range, use them
      if (initialRuns.length > 0 && timeRange === initialTimeRange) {
        const initialStartDate = calculateStartDate(initialTimeRange);
        const initialRunsInRange = initialRuns.filter(r => r.ts >= initialStartDate);
        if (initialRunsInRange.length > 0) {
          setRuns(initialRunsInRange);
          setLoading(false);
          // Cache the initial runs
          cache.set(cacheKey, initialRunsInRange, 5 * 60 * 1000);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const runsData = await api.get<CronRun[]>(
          `/cron-jobs/${cronJobId}/runs?start_date=${startDate}&limit=1000`
        );
        
        const runsArray = runsData || [];
        setRuns(runsArray);
        
        // Cache for 5 minutes
        cache.set(cacheKey, runsArray, 5 * 60 * 1000);
      } catch (err) {
        console.error('Failed to load runs:', err);
        if (err instanceof ApiError && err.status === 401) {
          setError('Yetkisiz');
        } else {
          setError('Çalıştırmalar yüklenemedi');
        }
        setRuns([]);
      } finally {
        setLoading(false);
      }
    };

    loadRuns();
  }, [cronJobId, timeRange, initialRuns, initialTimeRange]);

  // Filter runs based on status
  const filteredRuns = useMemo(() => {
    if (filter === 'all') return runs;
    return runs.filter(r => r.status === filter);
  }, [runs, filter]);

  // Chart data for durations
  const chartData = useMemo(() => {
    if (filteredRuns.length === 0) return [];
    
    // If we have few runs, show each run individually
    // Otherwise, use buckets based on time range
    if (filteredRuns.length <= 50) {
      // Show individual runs
      return filteredRuns
        .filter(run => run.duration_ms !== null)
        .map(run => ({
          time: new Date(run.ts),
          duration: run.duration_ms!,
          status: run.status,
        }))
        .sort((a, b) => a.time.getTime() - b.time.getTime());
    }
    
    // For many runs, use buckets
    const buckets: Record<number, number[]> = {};
    
    // Determine bucket size based on time range
    const getBucketTime = (timestamp: number): number => {
      const date = new Date(timestamp);
      
      switch (timeRange) {
        case 'day':
          // 5-minute buckets for day view
          const minutes = date.getMinutes();
          const bucketMinutes = Math.floor(minutes / 5) * 5;
          return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), bucketMinutes).getTime();
        
        case 'week':
          // Hourly buckets for week view
          return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
        
        case 'month':
          // Daily buckets for month view
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        
        default:
          return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
      }
    };
    
    filteredRuns.forEach(run => {
      const bucketTime = getBucketTime(run.ts);
      
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = [];
      }
      
      if (run.duration_ms !== null) {
        buckets[bucketTime].push(run.duration_ms);
      }
    });

    return Object.entries(buckets)
      .map(([bucketTime, durations]) => ({
        time: new Date(parseInt(bucketTime)),
        duration: durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length 
          : 0,
        count: durations.length,
      }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [filteredRuns, timeRange]);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (error) {
    return (
      <Card className="border gap-0">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-base">Çalıştırma Geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border gap-0">
      <CardHeader className="pb-3 px-6 pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Çalıştırma Geçmişi</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'success' | 'fail')}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="success">Başarılı</SelectItem>
                <SelectItem value="fail">Başarısız</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={timeRange === 'day' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  setTimeRange('day');
                }}
              >
                Gün
              </Button>
              <Button
                type="button"
                variant={timeRange === 'week' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  setTimeRange('week');
                }}
              >
                Hafta
              </Button>
              <Button
                type="button"
                variant={timeRange === 'month' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  setTimeRange('month');
                }}
              >
                Ay
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 space-y-6">
        {/* Chart */}
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (timeRange === 'day') {
                    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                  }
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                tickFormatter={(value) => {
                  if (value < 1000) return `${value}ms`;
                  return `${(value / 1000).toFixed(1)}s`;
                }}
              />
              <Tooltip
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
                      }}
                formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Süre']}
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            Veri yok
          </div>
        )}

        {/* Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Son Çalıştırmalar</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredRuns.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>HTTP Durumu</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Zaman</TableHead>
                    <TableHead>Hata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.slice(0, 50).map((run) => {
                    const isExpanded = expandedRows.has(run.id);
                    const hasResponseBody = run.response_body && run.response_body.trim().length > 0;
                    
                    return (
                      <React.Fragment key={run.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => {
                          if (hasResponseBody) {
                            setExpandedRows(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(run.id)) {
                                newSet.delete(run.id);
                              } else {
                                newSet.add(run.id);
                              }
                              return newSet;
                            });
                          }
                        }}>
                          <TableCell className="w-12">
                            {hasResponseBody ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {run.status === 'success' ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Başarılı
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Başarısız
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{run.http_status || 'N/A'}</TableCell>
                          <TableCell>{formatDuration(run.duration_ms)}</TableCell>
                          <TableCell className="text-xs">{formatTimestamp(run.ts)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {run.error || '-'}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasResponseBody && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase">Yanıt Gövdesi</div>
                                <pre className="text-sm bg-slate-900 border border-slate-700 rounded p-4 overflow-auto max-h-[600px] whitespace-pre-wrap break-words font-mono">
                                  {highlightJSON(run.response_body || '')}
                                </pre>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Çalıştırma bulunamadı
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
