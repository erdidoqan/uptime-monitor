'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Monitor } from '@/shared/types';
import type { MonitorCheck } from '@/shared/types';
import type { Incident } from '@/shared/types';

interface MonitorHeaderProps {
  monitor: Monitor;
  initialChecks: MonitorCheck[];
  openIncident?: Incident | null;
}

export function MonitorHeader({ monitor, initialChecks, openIncident }: MonitorHeaderProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [nextRunAt, setNextRunAt] = useState<number | null>(null);

  // Update current time every second for real-time "ago" calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate and update nextRunAt when monitor changes
  useEffect(() => {
    if (!monitor || monitor.is_active === 0) {
      setNextRunAt(null);
      return;
    }

    let calculatedNextRunAt = monitor.next_run_at;
    
    if (!calculatedNextRunAt || calculatedNextRunAt <= Date.now()) {
      // Calculate next run time from last check + interval
      if (monitor.last_checked_at) {
        calculatedNextRunAt = monitor.last_checked_at + (monitor.interval_sec * 1000);
        // If that's also in the past, calculate from current time
        if (calculatedNextRunAt <= Date.now()) {
          calculatedNextRunAt = Date.now() + (monitor.interval_sec * 1000);
        }
      } else {
        // No last check, use current time + interval
        calculatedNextRunAt = Date.now() + (monitor.interval_sec * 1000);
      }
    }
    
    setNextRunAt(calculatedNextRunAt);
  }, [monitor?.id, monitor?.next_run_at, monitor?.last_checked_at, monitor?.interval_sec, monitor?.is_active]);

  // Reset nextRunAt when it passes
  useEffect(() => {
    if (nextRunAt && nextRunAt <= currentTime && monitor && monitor.is_active === 1) {
      // Calculate new next run time
      const newNextRunAt = currentTime + (monitor.interval_sec * 1000);
      setNextRunAt(newNextRunAt);
    }
  }, [currentTime, nextRunAt, monitor]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '0 saniye';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);

    if (months > 0) {
      const remainingDays = days % 30;
      return `${months} ay ${remainingDays} gün`;
    }
    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days} gün ${remainingHours} saat`;
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours} saat ${remainingMinutes} dakika`;
    }
    if (minutes > 0) {
      return `${minutes} dakika`;
    }
    return `${seconds} saniye`;
  };

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

  // Calculate uptime duration
  const uptimeDuration = useMemo(() => {
    if (!monitor) return null;
    
    // If we have checks, use them for accurate calculation
    if (initialChecks.length > 0) {
      const sortedChecks = [...initialChecks].sort((a, b) => a.ts - b.ts);
      let lastDownTime = null;
      
      // Find last downtime
      for (let i = sortedChecks.length - 1; i >= 0; i--) {
        if (sortedChecks[i].status === 'down') {
          lastDownTime = sortedChecks[i].ts;
          break;
        }
      }

      if (!lastDownTime) {
        // Always up, calculate from first check or creation
        const startTime = monitor.created_at || sortedChecks[0].ts;
        return currentTime - startTime;
      }

      // Calculate from last downtime
      const upSince = sortedChecks.find(c => c.ts > lastDownTime && c.status === 'up');
      return upSince ? currentTime - upSince.ts : 0;
    }
    
    // Fallback: If no checks but monitor is up, calculate from creation or last checked
    if (monitor.last_status === 'up' && monitor.last_checked_at) {
      // If last status is up and we have last_checked_at, use it
      return currentTime - monitor.last_checked_at;
    }
    
    // If monitor is down, return null
    if (monitor.last_status === 'down') {
      return null;
    }
    
    // Final fallback: use created_at
    if (monitor.created_at) {
      return currentTime - monitor.created_at;
    }
    
    return null;
  }, [monitor, initialChecks, currentTime]);

  // Calculate month stats for incidents count
  const monthIncidents = useMemo(() => {
    const cutoff = currentTime - (30 * 24 * 60 * 60 * 1000);
    const periodChecks = initialChecks.filter(c => c.ts >= cutoff);
    if (periodChecks.length === 0) return 0;

    const sortedChecks = [...periodChecks].sort((a, b) => a.ts - b.ts);
    let incidents = 0;
    let inIncident = false;

    for (let i = 0; i < sortedChecks.length; i++) {
      if (sortedChecks[i].status === 'down' && !inIncident) {
        inIncident = true;
        incidents++;
      } else if (sortedChecks[i].status === 'up' && inIncident) {
        inIncident = false;
      }
    }

    return incidents;
  }, [initialChecks, currentTime]);

  // Calculate time until next check
  const timeUntilNextCheck = useMemo(() => {
    if (!monitor || monitor.is_active === 0 || nextRunAt === null) {
      return null;
    }
    
    const diff = nextRunAt - currentTime;
    if (diff <= 0) {
      return 0;
    }
    
    return diff;
  }, [monitor, currentTime, nextRunAt]);

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
              {monitor?.last_status === 'down' && openIncident
                ? 'Şu an kapalı'
                : 'Şu an açık'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="text-lg font-semibold text-foreground">
              {monitor?.last_status === 'down' && openIncident
                ? formatDuration(Date.now() - openIncident.started_at)
                : uptimeDuration
                ? formatDuration(uptimeDuration)
                : 'Hesaplanıyor...'}
            </div>
          </CardContent>
        </Card>

        <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sonraki kontrol
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="text-lg font-semibold text-foreground">
              {timeUntilNextCheck !== null
                ? formatTimeUntil(timeUntilNextCheck)
                : 'Duraklatıldı'}
            </div>
          </CardContent>
        </Card>

        <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Son kontrol
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="text-lg font-semibold text-foreground">
              {formatTime(monitor.last_checked_at)}
            </div>
          </CardContent>
        </Card>

        <Card className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Olaylar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="text-lg font-semibold text-foreground">{monthIncidents}</div>
          </CardContent>
        </Card>
      </div>
  );
}
