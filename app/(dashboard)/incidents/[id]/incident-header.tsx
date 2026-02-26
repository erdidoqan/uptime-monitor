'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Monitor, Timer, Clock, AlertTriangle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import type { Incident } from '@/shared/types';

// Get favicon URL from a website URL
function getFaviconUrl(url: string | undefined, size: number = 32): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

// Extract hostname from URL
function getHostname(url: string | undefined): string {
  if (!url) return 'Bilinmiyor';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

// Format cause for display
function formatCause(cause: string | null, httpStatus: number | null): string {
  if (!cause) return 'Bilinmeyen hata';
  
  const causeMap: Record<string, string> = {
    'timeout': 'Bağlantı zaman aşımı',
    'http_error': `HTTP hatası${httpStatus ? ` (${httpStatus})` : ''}`,
    'keyword_missing': 'Anahtar kelime bulunamadı',
    'ssl_error': 'SSL sertifika hatası',
    'dns_error': 'DNS çözümlemesi başarısız',
  };
  
  return causeMap[cause] || cause;
}

// Format date for display
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format duration
function formatDuration(startTime: number, endTime: number | null, currentTime: number): string {
  const end = endTime || currentTime;
  const diff = end - startTime;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days}g`);
  }
  if (hours % 24 > 0) {
    parts.push(`${hours % 24}s`);
  }
  if (minutes % 60 > 0 && days === 0) {
    parts.push(`${minutes % 60}dk`);
  }
  if (seconds % 60 > 0 && hours === 0) {
    parts.push(`${seconds % 60}sn`);
  }
  if (parts.length === 0) {
    parts.push('0sn');
  }

  return parts.join(' ');
}

interface IncidentHeaderProps {
  incident: Incident;
  actions?: React.ReactNode;
}

export function IncidentHeader({ incident, actions }: IncidentHeaderProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  
  const faviconUrl = getFaviconUrl(incident.source_url);
  const hostname = getHostname(incident.source_url);
  const isOngoing = !incident.resolved_at;

  // Update current time every second for real-time duration
  useEffect(() => {
    if (!isOngoing) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOngoing]);

  return (
    <div className="mb-6">
      {/* Title section */}
      <div className="flex items-start gap-4 mb-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {faviconUrl ? (
            <Image
              src={faviconUrl}
              alt=""
              width={32}
              height={32}
              className="w-8 h-8"
              unoptimized
            />
          ) : incident.type === 'monitor' ? (
            <Monitor className="w-6 h-6 text-muted-foreground" />
          ) : (
            <Timer className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Title and meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold truncate">
              {incident.source_name || hostname}
            </h1>
            <Badge variant={isOngoing ? 'destructive' : 'default'}>
              {isOngoing ? 'Devam Ediyor' : 'Çözüldü'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="capitalize">{incident.type === 'monitor' ? 'Monitör' : 'Cron'}</span>
            {incident.source_url && (
              <>
                <span>•</span>
                <Link
                  href={incident.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {hostname}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </>
            )}
            <span>•</span>
            <Link
              href={`/${incident.type === 'monitor' ? 'monitors' : 'cron-jobs'}/${incident.source_id}`}
              className="hover:text-foreground transition-colors"
            >
              {incident.type === 'monitor' ? 'Monitörü' : 'Cron job\'u'} görüntüle
            </Link>
          </div>
        </div>

        {/* Actions - right side */}
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Duration */}
        <Card className="border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span>Süre</span>
            </div>
            <div className="text-lg font-semibold">
              {formatDuration(incident.started_at, incident.resolved_at, currentTime)}
            </div>
          </CardContent>
        </Card>

        {/* Started at */}
        <Card className="border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Başlangıç</span>
            </div>
            <div className="text-lg font-semibold">
              {formatDateTime(incident.started_at)}
            </div>
          </CardContent>
        </Card>

        {/* Cause */}
        <Card className="border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Neden</span>
            </div>
            <div className="text-lg font-semibold">
              {formatCause(incident.cause, incident.http_status)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screenshot section */}
      {incident.screenshot_url && (
        <Card className="border mt-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                <span>Ekran Görüntüsü</span>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button className="relative w-full rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer group bg-muted/30">
                  <div className="relative w-full" style={{ maxHeight: '300px', aspectRatio: '16/9' }}>
                    <Image
                      src={incident.screenshot_url}
                      alt="Olay ekran görüntüsü"
                      width={1920}
                      height={1080}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-4 py-2 rounded-md backdrop-blur-sm">
                        Büyütmek için tıklayın
                      </span>
                    </div>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl w-full p-0">
                <div className="relative w-full h-[90vh] flex items-center justify-center bg-black/95">
                  <Image
                    src={incident.screenshot_url}
                    alt="Olay ekran görüntüsü (tam boyut)"
                    width={1920}
                    height={1080}
                    className="max-w-full max-h-full object-contain"
                    unoptimized
                  />
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
