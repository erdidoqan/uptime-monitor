'use client';

import { useEffect, useState, useMemo } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { cache } from '@/lib/cache';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonitorCheck } from '@/shared/types';

interface MonitorChecksProps {
  monitorId: string;
  initialTimeRange?: 'day' | 'week' | 'month';
  initialChecks?: MonitorCheck[];
}

export function MonitorChecks({ monitorId, initialTimeRange = 'month', initialChecks = [] }: MonitorChecksProps) {
  const [checks, setChecks] = useState<MonitorCheck[]>(initialChecks);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>(initialTimeRange);
  const [loading, setLoading] = useState(initialChecks.length === 0);
  const [error, setError] = useState<string | null>(null);

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
    const loadChecks = async () => {
      if (!monitorId) return;

      const startDate = calculateStartDate(timeRange);
      const cacheKey = cache.getChecksKey(monitorId, timeRange, startDate);

      // Try cache first
      const cached = cache.get<MonitorCheck[]>(cacheKey);
      if (cached) {
        setChecks(cached);
        setLoading(false);
        return;
      }

      // If we have initial checks and they match the time range, use them
      if (initialChecks.length > 0 && timeRange === initialTimeRange) {
        const initialStartDate = calculateStartDate(initialTimeRange);
        const initialChecksInRange = initialChecks.filter(c => c.ts >= initialStartDate);
        if (initialChecksInRange.length > 0) {
          setChecks(initialChecksInRange);
          setLoading(false);
          // Cache the initial checks
          cache.set(cacheKey, initialChecksInRange, 5 * 60 * 1000);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const checksData = await api.get<MonitorCheck[]>(
          `/monitors/${monitorId}/checks?start_date=${startDate}`
        );
        
        const checksArray = checksData || [];
        setChecks(checksArray);
        
        // Cache for 5 minutes
        cache.set(cacheKey, checksArray, 5 * 60 * 1000);
      } catch (err) {
        console.error('Failed to load checks:', err);
        if (err instanceof ApiError && err.status === 401) {
          setError('Yetkisiz');
        } else {
          setError('Kontroller yüklenemedi');
        }
        setChecks([]);
      } finally {
        setLoading(false);
      }
    };

    loadChecks();
  }, [monitorId, timeRange, initialChecks, initialTimeRange]);

  // Chart data for response times
  const chartData = useMemo(() => {
    if (checks.length === 0) return [];
    
    // If we have few checks, show each check individually
    // Otherwise, use buckets based on time range
    if (checks.length <= 50) {
      // Show individual checks
      return checks
        .filter(check => check.latency_ms !== null)
        .map(check => ({
          time: new Date(check.ts),
          latency: check.latency_ms!,
        }))
        .sort((a, b) => a.time.getTime() - b.time.getTime());
    }
    
    // For many checks, use buckets
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
    
    checks.forEach(check => {
      const bucketTime = getBucketTime(check.ts);
      
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = [];
      }
      
      if (check.latency_ms !== null) {
        buckets[bucketTime].push(check.latency_ms);
      }
    });

    return Object.entries(buckets)
      .map(([bucketTime, latencies]) => ({
        time: new Date(parseInt(bucketTime)),
        latency: latencies.length > 0 
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
          : 0,
        count: latencies.length,
      }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [checks, timeRange]);

  if (error) {
    return (
      <Card className="border gap-0">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-base">Yanıt süreleri</CardTitle>
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
          <CardTitle className="text-base">Yanıt süreleri</CardTitle>
          <div className="flex items-center gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Bölge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Bölgeler</SelectItem>
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
      <CardContent className="px-6 pb-6 pt-0">
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
                  return date.toLocaleString('tr-TR');
                }}
                formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Yanıt süresi']}
              />
              <Line
                type="monotone"
                dataKey="latency"
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
      </CardContent>
    </Card>
  );
}
