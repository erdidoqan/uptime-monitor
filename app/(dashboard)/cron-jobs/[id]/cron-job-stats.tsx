'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CronRun } from '@/shared/types';

interface TimePeriodStats {
  successRate: number;
  failureRate: number;
  totalRuns: number;
  avgDuration: string;
  longestFailureStreak: number;
}

interface CronJobStatsProps {
  runs: CronRun[];
}

export function CronJobStats({ runs }: CronJobStatsProps) {
  // Ensure runs is always an array
  const safeRuns = Array.isArray(runs) ? runs : [];
  
  const calculateStats = (days: number): TimePeriodStats => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const periodRuns = safeRuns.filter(r => r.ts >= cutoff);
    
    if (periodRuns.length === 0) {
      return {
        successRate: 100,
        failureRate: 0,
        totalRuns: 0,
        avgDuration: 'N/A',
        longestFailureStreak: 0,
      };
    }

    const sortedRuns = [...periodRuns].sort((a, b) => a.ts - b.ts);
    const total = sortedRuns.length;
    const successCount = sortedRuns.filter(r => r.status === 'success').length;
    const successRate = (successCount / total) * 100;
    const failureRate = 100 - successRate;

    // Calculate average duration for successful runs
    const successfulRuns = sortedRuns.filter(r => r.status === 'success' && r.duration_ms !== null);
    const avgDuration = successfulRuns.length > 0
      ? successfulRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / successfulRuns.length
      : 0;

    // Calculate longest failure streak
    let longestStreak = 0;
    let currentStreak = 0;
    for (const run of sortedRuns) {
      if (run.status === 'fail') {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    const formatDuration = (ms: number) => {
      if (ms < 1000) return `${Math.round(ms)}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    return {
      successRate,
      failureRate,
      totalRuns: total,
      avgDuration: avgDuration > 0 ? formatDuration(avgDuration) : 'N/A',
      longestFailureStreak: longestStreak,
    };
  };

  const todayStats = useMemo(() => calculateStats(1), [safeRuns]);
  const weekStats = useMemo(() => calculateStats(7), [safeRuns]);
  const monthStats = useMemo(() => calculateStats(30), [safeRuns]);
  const yearStats = useMemo(() => calculateStats(365), [safeRuns]);
  const allTimeStats = useMemo(() => {
    if (safeRuns.length === 0) {
      return {
        successRate: 100,
        failureRate: 0,
        totalRuns: 0,
        avgDuration: 'N/A',
        longestFailureStreak: 0,
      };
    }
    return calculateStats(365);
  }, [safeRuns]);

  return (
    <Card className="mb-4 border gap-0">
      <CardHeader className="pb-3 px-6 pt-6">
        <CardTitle className="text-base">Performans Raporu</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zaman dilimi</TableHead>
              <TableHead className="text-right">Başarı Oranı</TableHead>
              <TableHead className="text-right">Başarısızlık Oranı</TableHead>
              <TableHead className="text-right">Toplam Çalıştırma</TableHead>
              <TableHead className="text-right">Ort. Süre</TableHead>
              <TableHead className="text-right">En Uzun Başarısızlık Serisi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Bugün</TableCell>
              <TableCell className="text-right">{todayStats.successRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{todayStats.failureRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{todayStats.totalRuns}</TableCell>
              <TableCell className="text-right">{todayStats.avgDuration}</TableCell>
              <TableCell className="text-right">{todayStats.longestFailureStreak}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Son 7 gün</TableCell>
              <TableCell className="text-right">{weekStats.successRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{weekStats.failureRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{weekStats.totalRuns}</TableCell>
              <TableCell className="text-right">{weekStats.avgDuration}</TableCell>
              <TableCell className="text-right">{weekStats.longestFailureStreak}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Son 30 gün</TableCell>
              <TableCell className="text-right">{monthStats.successRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{monthStats.failureRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{monthStats.totalRuns}</TableCell>
              <TableCell className="text-right">{monthStats.avgDuration}</TableCell>
              <TableCell className="text-right">{monthStats.longestFailureStreak}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Son 365 gün</TableCell>
              <TableCell className="text-right">{yearStats.successRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{yearStats.failureRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{yearStats.totalRuns}</TableCell>
              <TableCell className="text-right">{yearStats.avgDuration}</TableCell>
              <TableCell className="text-right">{yearStats.longestFailureStreak}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Tüm zamanlar</TableCell>
              <TableCell className="text-right">{allTimeStats.successRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{allTimeStats.failureRate.toFixed(2)}%</TableCell>
              <TableCell className="text-right">{allTimeStats.totalRuns}</TableCell>
              <TableCell className="text-right">{allTimeStats.avgDuration}</TableCell>
              <TableCell className="text-right">{allTimeStats.longestFailureStreak}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
