'use client';

import Image from 'next/image';
import { Clock, CheckCircle2, XCircle, Globe } from 'lucide-react';
import type { CronJob } from '@/shared/types';

interface CronJobHeaderTopProps {
  cronJob: CronJob;
}

// Get favicon URL from a website URL using Google's favicon service
function getFaviconUrl(url: string, size: number = 32): string | null {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

export function CronJobHeaderTop({ cronJob }: CronJobHeaderTopProps) {
  const faviconUrl = getFaviconUrl(cronJob.url);

  const getScheduleDescription = () => {
    if (cronJob.cron_expr) {
      return `Cron: ${cronJob.cron_expr}`;
    } else if (cronJob.interval_sec) {
      const minutes = Math.floor(cronJob.interval_sec / 60);
      const hours = Math.floor(cronJob.interval_sec / 3600);
      const days = Math.floor(cronJob.interval_sec / 86400);
      
      if (days > 0) {
        return `Every ${days} day${days > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      return `Every ${cronJob.interval_sec} second${cronJob.interval_sec > 1 ? 's' : ''}`;
    }
    return 'No schedule';
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        {/* Favicon */}
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {faviconUrl ? (
            <Image
              src={faviconUrl}
              alt=""
              width={24}
              height={24}
              className="w-6 h-6"
              unoptimized
            />
          ) : (
            <Globe className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <h1 className="text-xl font-semibold">{cronJob.name || cronJob.url}</h1>
      </div>
      <div className="flex items-center gap-2 mb-5">
        {cronJob.is_active === 0 ? (
          <>
            <Clock className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-sm text-yellow-600 font-medium">Paused</span>
          </>
        ) : cronJob.last_status === null ? (
          <>
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">Pending</span>
          </>
        ) : cronJob.last_status === 'success' ? (
          <>
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="status-indicator status-indicator--success" style={{ width: '18px', height: '18px' }}>
                  <div className="circle circle--animated circle-secondary"></div>
                  <div className="circle circle--animated circle-tertiary"></div>
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-500 relative z-10 animate-status-pulse" />
            </div>
            <span className="text-sm text-green-600 font-medium">Success</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-sm text-red-600 font-medium">Failed</span>
          </>
        )}
        <span className="text-sm text-muted-foreground">
          {cronJob.is_active === 0 
            ? 'Cron job paused' 
            : getScheduleDescription()}
        </span>
      </div>
    </div>
  );
}

