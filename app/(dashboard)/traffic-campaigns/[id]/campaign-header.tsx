'use client';

import Image from 'next/image';
import { CheckCircle2, Clock, Globe, Pause } from 'lucide-react';

interface TrafficCampaign {
  id: string;
  name: string;
  url: string;
  is_active: number;
  last_run_at: number | null;
  created_at: number;
}

interface CampaignHeaderProps {
  campaign: TrafficCampaign;
}

function getFaviconUrl(url: string, size: number = 32): string | null {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function CampaignHeader({ campaign }: CampaignHeaderProps) {
  const faviconUrl = getFaviconUrl(campaign.url);
  const hostname = getHostname(campaign.url);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
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
        <h1 className="text-xl font-semibold">{campaign.name}</h1>
      </div>
      <div className="flex items-center gap-2 mb-5">
        {campaign.is_active === 0 ? (
          <>
            <Clock className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-sm text-yellow-600 font-medium">Duraklatıldı</span>
          </>
        ) : campaign.last_run_at ? (
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
            <span className="text-sm text-green-600 font-medium">Aktif</span>
          </>
        ) : (
          <>
            <Pause className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-muted-foreground font-medium">Hiç çalışmadı</span>
          </>
        )}
        <span className="text-sm text-muted-foreground mx-1">·</span>
        <a
          href={campaign.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {hostname}
        </a>
        <span className="text-sm text-muted-foreground mx-1">·</span>
        <span className="text-sm text-muted-foreground">
          Oluşturulma: {formatDate(campaign.created_at)}
        </span>
      </div>
    </div>
  );
}
