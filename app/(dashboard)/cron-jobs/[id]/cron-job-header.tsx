'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CronJob } from '@/shared/types';
import type { CronRun } from '@/shared/types';

interface CronJobHeaderProps {
  cronJob: CronJob;
  initialRuns: CronRun[];
}

export function CronJobHeader({ cronJob, initialRuns }: CronJobHeaderProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [nextRunAt, setNextRunAt] = useState<number | null>(null);

  // Update current time every second for real-time "ago" calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate and update nextRunAt when cronJob changes
  useEffect(() => {
    if (!cronJob || cronJob.is_active === 0) {
      setNextRunAt(null);
      return;
    }

    let calculatedNextRunAt = cronJob.next_run_at;
    
    if (!calculatedNextRunAt || calculatedNextRunAt <= Date.now()) {
      // Calculate next run time from last run + interval/cron
      if (cronJob.last_run_at) {
        if (cronJob.interval_sec) {
          calculatedNextRunAt = cronJob.last_run_at + (cronJob.interval_sec * 1000);
        } else {
          // For cron expressions, we'd need to parse it, but for now use next_run_at
          calculatedNextRunAt = cronJob.next_run_at || Date.now() + 3600000; // Default 1 hour
        }
        // If that's also in the past, calculate from current time
        if (calculatedNextRunAt <= Date.now()) {
          if (cronJob.interval_sec) {
            calculatedNextRunAt = Date.now() + (cronJob.interval_sec * 1000);
          } else {
            calculatedNextRunAt = Date.now() + 3600000; // Default 1 hour
          }
        }
      } else {
        // No last run, use next_run_at or current time + interval
        if (cronJob.next_run_at) {
          calculatedNextRunAt = cronJob.next_run_at;
        } else if (cronJob.interval_sec) {
          calculatedNextRunAt = Date.now() + (cronJob.interval_sec * 1000);
        } else {
          calculatedNextRunAt = Date.now() + 3600000; // Default 1 hour
        }
      }
    }
    
    setNextRunAt(calculatedNextRunAt);
  }, [cronJob?.id, cronJob?.next_run_at, cronJob?.last_run_at, cronJob?.interval_sec, cronJob?.is_active]);

  // Reset nextRunAt when it passes
  useEffect(() => {
    if (nextRunAt && nextRunAt <= currentTime && cronJob && cronJob.is_active === 1) {
      // Calculate new next run time
      if (cronJob.interval_sec) {
        const newNextRunAt = currentTime + (cronJob.interval_sec * 1000);
        setNextRunAt(newNextRunAt);
      }
    }
  }, [currentTime, nextRunAt, cronJob]);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Hiçbir zaman';
    const diff = currentTime - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  };

  // Calculate success rate (last 30 days)
  const successRate = useMemo(() => {
    const cutoff = currentTime - (30 * 24 * 60 * 60 * 1000);
    const periodRuns = initialRuns.filter(r => r.ts >= cutoff);
    if (periodRuns.length === 0) return null;
    
    const successCount = periodRuns.filter(r => r.status === 'success').length;
    return (successCount / periodRuns.length) * 100;
  }, [initialRuns, currentTime]);

  // Calculate total runs
  const totalRuns = useMemo(() => {
    return initialRuns.length;
  }, [initialRuns]);

  // Calculate time until next check
  const timeUntilNextRun = useMemo(() => {
    if (!cronJob || cronJob.is_active === 0 || nextRunAt === null) {
      return null;
    }
    
    const diff = nextRunAt - currentTime;
    if (diff <= 0) {
      return 0;
    }
    
    return diff;
  }, [cronJob, currentTime, nextRunAt]);

  const formatTimeUntil = (ms: number | null) => {
    if (ms === null) return 'Duraklatıldı';
    if (ms <= 0) return 'Şimdi';
    
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      if (hours > 0) {
        return `${days}g ${hours}s ${minutes}dk`;
      }
      return `${days}g ${minutes}dk`;
    }
    if (hours > 0) {
      if (minutes > 0 && seconds > 0) {
        return `${hours}s ${minutes}dk ${seconds}sn`;
      } else if (minutes > 0) {
        return `${hours}s ${minutes}dk`;
      } else if (seconds > 0) {
        return `${hours}s ${seconds}sn`;
      }
      return `${hours}s`;
    }
    if (minutes > 0) {
      // Always show seconds when minutes > 0 for countdown
      return `${minutes}dk ${seconds}sn`;
    }
    return `${seconds}sn`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Başarı Oranı (30 gün)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-lg font-semibold text-foreground">
            {successRate !== null ? `${successRate.toFixed(2)}%` : 'N/A'}
          </div>
        </CardContent>
      </Card>

      <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sonraki çalıştırma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-lg font-semibold text-foreground">
            {timeUntilNextRun !== null
              ? formatTimeUntil(timeUntilNextRun)
              : 'Duraklatıldı'}
          </div>
        </CardContent>
      </Card>

      <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Son çalıştırma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-lg font-semibold text-foreground">
            {formatTime(cronJob.last_run_at)}
          </div>
        </CardContent>
      </Card>

      <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Toplam çalıştırma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-lg font-semibold text-foreground">{totalRuns}</div>
        </CardContent>
      </Card>
    </div>
  );
}
