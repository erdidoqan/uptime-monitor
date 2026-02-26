'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Globe, Monitor, Plus, MoreVertical, Search, ExternalLink, Clock } from 'lucide-react';
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

// Format relative time (e.g., "2 min ago", "1 hour ago")
function formatRelativeTime(timestamp: number | null, currentTime: number): string {
  if (!timestamp) return 'Hiç';
  
  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Az önce';
  if (minutes < 60) return `${minutes}dk önce`;
  if (hours < 24) return `${hours}sa önce`;
  return `${days}g önce`;
}

interface MonitorListProps {
  initialMonitors: MonitorType[];
  showSearch?: boolean;
}

export function MonitorList({ initialMonitors, showSearch = true }: MonitorListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time every second for real-time duration updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptimeDuration = (ms: number | undefined) => {
    if (!ms || ms === 0) return '0s';
    
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
      parts.push(`${months % 12}mo`);
    }
    if (days > 0 && parts.length < 2) {
      parts.push(`${days % 30}d`);
    }
    if (hours > 0 && parts.length < 2) {
      parts.push(`${hours % 24}h`);
    }
    if (minutes > 0 && parts.length < 2) {
      parts.push(`${minutes % 60}m`);
    }
    if (parts.length === 0) {
      parts.push(`${seconds}s`);
    }

    return parts.join(' ');
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  // Calculate uptime/downtime duration based on last_status and last_checked_at
  const monitorsWithDuration = useMemo(() => {
    return initialMonitors.map((monitor) => {
      let uptimeDuration = 0;
      let downtimeDuration = 0;

      if (monitor.is_active === 0) {
        // Paused - no duration
        return { ...monitor, uptime_duration: 0, downtime_duration: 0 };
      }

      if (monitor.last_status === 'up' && monitor.last_checked_at) {
        // Calculate uptime from last check
        uptimeDuration = currentTime - monitor.last_checked_at;
        // Add time from creation to last check if available
        if (monitor.created_at && monitor.last_checked_at > monitor.created_at) {
          // We can't know exact uptime without checks, so we use a simple approximation
          // For listing page, this is acceptable
          uptimeDuration = currentTime - monitor.last_checked_at;
        }
      } else if (monitor.last_status === 'down' && monitor.last_checked_at) {
        // Calculate downtime from last check
        downtimeDuration = currentTime - monitor.last_checked_at;
      } else if (monitor.last_status === 'up' && !monitor.last_checked_at && monitor.created_at) {
        // No checks yet but monitor is up - use creation time
        uptimeDuration = currentTime - monitor.created_at;
      }

      return { ...monitor, uptime_duration: uptimeDuration, downtime_duration: downtimeDuration };
    });
  }, [initialMonitors, currentTime]);

  const filteredMonitors = useMemo(() => {
    if (!showSearch || !searchQuery) {
      return monitorsWithDuration;
    }
    return monitorsWithDuration.filter(monitor =>
      monitor.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (monitor.name && monitor.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [monitorsWithDuration, searchQuery, showSearch]);

  return (
    <>
      {/* Search input - controlled by this component */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ara"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 w-[180px] h-9 text-sm"
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">/</span>
          </div>
        </div>
      )}

      {filteredMonitors.length === 0 ? (
        showSearch ? (
          <Card className="border">
            <CardContent className="pt-8 text-center py-16">
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
          <div className="px-5 py-8 text-center">
            <Monitor className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">No monitors yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first monitor to start tracking uptime
            </p>
            <Button size="sm" asChild>
              <Link href="/monitors/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Monitor
              </Link>
            </Button>
          </div>
        )
      ) : (
        showSearch ? (
          <Card className="border">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {filteredMonitors.map((monitor) => {
                  const faviconUrl = getFaviconUrl(monitor.url);
                  const hostname = getHostname(monitor.url);
                  return (
                  <TooltipProvider key={monitor.id}>
                  <Link
                    href={`/monitors/${monitor.id}`}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
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
                    {/* Monitor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
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
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open {hostname}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {/* URL (if name exists) */}
                        {monitor.name && (
                          <span className="truncate max-w-[200px]">{hostname}</span>
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
                        {/* Last checked */}
                        {monitor.last_checked_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(monitor.last_checked_at, currentTime)}
                          </span>
                        )}
                        {/* Latency */}
                        {monitor.last_latency_ms && monitor.last_latency_ms > 0 && (
                          <span>{monitor.last_latency_ms}ms</span>
                        )}
                      </div>
                    </div>
                    {/* Right side info */}
                    <div className="flex items-center gap-4">
                      {/* Interval badge */}
                      <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        Her {formatInterval(monitor.interval_sec)}
                      </div>
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
        ) : (
          <div className="divide-y divide-border/50">
            {filteredMonitors.map((monitor) => {
              const faviconUrl = getFaviconUrl(monitor.url);
              const hostname = getHostname(monitor.url);
              return (
              <TooltipProvider key={monitor.id}>
              <Link
                href={`/monitors/${monitor.id}`}
                className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
              >
                  {/* Status Indicator */}
                  {monitor.is_active === 0 ? (
                    <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0 ring-2 ring-yellow-500/20" />
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
                  {/* Monitor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open {hostname}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {/* URL (if name exists) */}
                      {monitor.name && (
                        <span className="truncate max-w-[200px]">{hostname}</span>
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
                      {/* Last checked */}
                      {monitor.last_checked_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(monitor.last_checked_at, currentTime)}
                        </span>
                      )}
                      {/* Latency */}
                      {monitor.last_latency_ms && monitor.last_latency_ms > 0 && (
                        <span>{monitor.last_latency_ms}ms</span>
                      )}
                    </div>
                  </div>
                  {/* Right side info */}
                  <div className="flex items-center gap-4">
                    {/* Interval badge */}
                    <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      Her {formatInterval(monitor.interval_sec)}
                    </div>
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
        )
      )}
    </>
  );
}

