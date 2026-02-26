'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Monitor, Plus, MoreVertical, ArrowRight, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Monitor as MonitorType } from '@/shared/types';

// Get favicon URL from a website URL using Google's favicon service
function getFaviconUrl(url: string, size: number = 32): string | null {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

// Extract hostname from URL for display
function getHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

interface LatestMonitorsProps {
  initialMonitors: MonitorType[];
}

export function LatestMonitors({ initialMonitors }: LatestMonitorsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Only start updating time after component is mounted (client-side)
  // This prevents hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(Date.now());
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptimeDuration = (ms: number | undefined) => {
    if (!ms || ms === 0) return '0sn';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    const parts: string[] = [];
    
    if (years > 0) {
      parts.push(`${years}y`);
    }
    if (months > 0) {
      parts.push(`${months % 12}ay`);
    }
    if (days > 0 && parts.length < 2) {
      parts.push(`${days % 30}g`);
    }
    if (hours > 0 && parts.length < 2) {
      parts.push(`${hours % 24}sa`);
    }
    if (minutes > 0 && parts.length < 2) {
      parts.push(`${minutes % 60}dk`);
    }
    if (parts.length === 0) {
      parts.push(`${seconds}sn`);
    }

    return parts.join(' ');
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}sn`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}dk`;
  };

  // Calculate uptime/downtime duration based on last_status and last_checked_at
  // Only calculate after mount to prevent hydration mismatch
  const monitorsWithDuration = useMemo(() => {
    return initialMonitors.map((monitor) => {
      let uptimeDuration = 0;
      let downtimeDuration = 0;

      // Don't calculate durations until mounted (client-side)
      if (!isMounted || monitor.is_active === 0) {
        return { ...monitor, uptime_duration: 0, downtime_duration: 0 };
      }

      if (monitor.last_status === 'up' && monitor.last_checked_at) {
        uptimeDuration = currentTime - monitor.last_checked_at;
      } else if (monitor.last_status === 'down' && monitor.last_checked_at) {
        downtimeDuration = currentTime - monitor.last_checked_at;
      } else if (monitor.last_status === 'up' && !monitor.last_checked_at && monitor.created_at) {
        uptimeDuration = currentTime - monitor.created_at;
      }

      return { ...monitor, uptime_duration: uptimeDuration, downtime_duration: downtimeDuration };
    });
  }, [initialMonitors, currentTime, isMounted]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Son monitörler</h2>
        <Link 
          href="/monitors" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Tümünü gör
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Monitor List */}
      {monitorsWithDuration.length === 0 ? (
        <Card className="border">
          <CardContent className="pt-8 text-center py-12">
            <Monitor className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Henüz monitör yok</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Uptime takibi için ilk monitörünüzü oluşturun
            </p>
            <Button size="sm" asChild>
              <Link href="/monitors/create">
                <Plus className="mr-2 h-4 w-4" />
                Monitör Oluştur
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {monitorsWithDuration.map((monitor) => {
                const faviconUrl = getFaviconUrl(monitor.url);
                const hostname = getHostname(monitor.url);
                return (
                <TooltipProvider key={monitor.id}>
                <Link
                  href={`/monitors/${monitor.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors group"
                >
                  {/* Status Indicator */}
                  {monitor.is_active === 0 ? (
                    <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                  ) : monitor.last_status === 'up' ? (
                    <div className="status-indicator status-indicator--success flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                      <div className="circle circle--animated circle-main"></div>
                      <div className="circle circle--animated circle-secondary"></div>
                      <div className="circle circle--animated circle-tertiary"></div>
                    </div>
                  ) : monitor.last_status === 'down' ? (
                    <div className="status-indicator status-indicator--danger flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                      <div className="circle circle-main"></div>
                    </div>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
                  )}
                  {/* Favicon */}
                  <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {faviconUrl ? (
                      <Image
                        src={faviconUrl}
                        alt=""
                        width={22}
                        height={22}
                        className="w-5.5 h-5.5"
                        unoptimized
                      />
                    ) : (
                      <Globe className="w-4.5 h-4.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Monitor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {monitor.name || hostname}
                      </span>
                      {/* External Link */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(monitor.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{hostname} aç</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {/* Hostname if name exists */}
                      {monitor.name && (
                        <span className="truncate max-w-[120px]">{hostname}</span>
                      )}
                      {/* Status */}
                      {monitor.is_active === 0 ? (
                        <span className="text-yellow-600 font-medium">Duraklatıldı</span>
                      ) : (
                        <span className={`font-medium ${monitor.last_status === 'up' ? 'text-green-600' : monitor.last_status === 'down' ? 'text-red-600' : ''}`}>
                          {monitor.last_status === 'up' ? 'Çalışıyor' : monitor.last_status === 'down' ? 'Çalışmıyor' : 'Bilinmiyor'}
                          {monitor.last_status === 'up' && monitor.uptime_duration > 0 && (
                            <span className="text-muted-foreground font-normal"> {formatUptimeDuration(monitor.uptime_duration)}</span>
                          )}
                          {monitor.last_status === 'down' && monitor.downtime_duration > 0 && (
                            <span className="text-muted-foreground font-normal"> {formatUptimeDuration(monitor.downtime_duration)}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interval & Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {formatInterval(monitor.interval_sec)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/monitors/${monitor.id}`}>Detayları gör</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={monitor.url} target="_blank" rel="noopener noreferrer">
                            Siteyi ziyaret et
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/monitors/${monitor.id}/edit`}>Düzenle</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Sil</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
                </TooltipProvider>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
