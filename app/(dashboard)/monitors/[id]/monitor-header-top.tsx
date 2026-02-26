'use client';

import Image from 'next/image';
import { CheckCircle2, XCircle, Clock, Globe } from 'lucide-react';
import type { Monitor } from '@/shared/types';

interface MonitorHeaderTopProps {
  monitor: Monitor;
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

export function MonitorHeaderTop({ monitor }: MonitorHeaderTopProps) {
  const faviconUrl = getFaviconUrl(monitor.url);

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
        <h1 className="text-xl font-semibold">{monitor.name || monitor.url}</h1>
      </div>
      <div className="flex items-center gap-2 mb-5">
        {monitor.is_active === 0 ? (
          <>
            <Clock className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-sm text-yellow-600 font-medium">Duraklatıldı</span>
          </>
        ) : monitor.last_status === 'up' ? (
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
            <span className="text-sm text-green-600 font-medium">Açık</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-sm text-red-600 font-medium">Kapalı</span>
          </>
        )}
        <span className="text-sm text-muted-foreground">
          {monitor.is_active === 0 
            ? 'İzleme duraklatıldı' 
            : `Her ${monitor.interval_sec} saniyede bir kontrol ediliyor`}
        </span>
      </div>
    </div>
  );
}
