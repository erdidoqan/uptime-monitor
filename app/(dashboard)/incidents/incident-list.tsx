'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertTriangle, Monitor, Timer, Search, MoreVertical, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Incident } from '@/shared/types';

// Get favicon URL from a website URL using Google's favicon service
function getFaviconUrl(url: string | undefined, size: number = 32): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

// Extract hostname from URL for display
function getHostname(url: string | undefined): string {
  if (!url) return 'Bilinmiyor';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

// Format relative time
function formatRelativeTime(timestamp: number, currentTime: number): string {
  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Az önce';
  if (minutes < 60) return `${minutes}dk önce`;
  if (hours < 24) return `${hours}s önce`;
  if (days < 30) return `${days}g önce`;
  return new Date(timestamp).toLocaleDateString('tr-TR');
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
  if (hours % 24 > 0 && parts.length < 2) {
    parts.push(`${hours % 24}s`);
  }
  if (minutes % 60 > 0 && parts.length < 2) {
    parts.push(`${minutes % 60}dk`);
  }
  if (parts.length === 0) {
    parts.push(`${seconds}sn`);
  }

  return parts.join(' ');
}

// Format cause for display
function formatCause(cause: string | null): string {
  if (!cause) return 'Bilinmeyen hata';
  
  const causeMap: Record<string, string> = {
    'timeout': 'Bağlantı zaman aşımı',
    'http_error': 'HTTP hatası',
    'keyword_missing': 'Anahtar kelime bulunamadı',
    'ssl_error': 'SSL sertifika hatası',
    'dns_error': 'DNS çözümlemesi başarısız',
  };
  
  return causeMap[cause] || cause;
}

interface IncidentListProps {
  initialIncidents: Incident[];
}

type StatusFilter = 'all' | 'ongoing' | 'resolved';
type TypeFilter = 'all' | 'monitor' | 'cron';

export function IncidentList({ initialIncidents }: IncidentListProps) {
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Update current time every second for real-time duration updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = incident.source_name?.toLowerCase().includes(query);
        const matchesUrl = incident.source_url?.toLowerCase().includes(query);
        const matchesCause = incident.cause?.toLowerCase().includes(query);
        if (!matchesName && !matchesUrl && !matchesCause) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'ongoing' && incident.resolved_at !== null) {
        return false;
      }
      if (statusFilter === 'resolved' && incident.resolved_at === null) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && incident.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [incidents, searchQuery, statusFilter, typeFilter]);

  const handleResolve = async (e: React.MouseEvent, incidentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!session?.user?.apiToken) return;
    
    setResolvingId(incidentId);
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'resolve' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve incident');
      }
      
      setIncidents(prev => prev.map(inc => 
        inc.id === incidentId 
          ? { ...inc, resolved_at: Date.now() } 
          : inc
      ));
    } catch (error) {
      console.error('Failed to resolve incident:', error);
    } finally {
      setResolvingId(null);
    }
  };

  const ongoingCount = incidents.filter(inc => !inc.resolved_at).length;

  return (
    <>
      {/* Search and filters */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
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
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="ongoing">Devam Eden ({ongoingCount})</SelectItem>
            <SelectItem value="resolved">Çözülmüş</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Tür" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Türler</SelectItem>
            <SelectItem value="monitor">Monitörler</SelectItem>
            <SelectItem value="cron">Cron Job&apos;lar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredIncidents.length === 0 ? (
        <Card className="border">
          <CardContent className="pt-8 text-center py-16">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Olay yok</h3>
            <p className="text-xs text-muted-foreground">
              {incidents.length === 0 
                ? "Harika! Henüz hiç olay kaydedilmemiş."
                : "Filtrelerinize uyan olay yok."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {filteredIncidents.map((incident) => {
                const faviconUrl = getFaviconUrl(incident.source_url);
                const hostname = getHostname(incident.source_url);
                const isOngoing = !incident.resolved_at;
                const isResolving = resolvingId === incident.id;

                return (
                  <TooltipProvider key={incident.id}>
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
                    >
                      {/* Status Indicator */}
                      {isOngoing ? (
                        <div className="status-indicator status-indicator--danger flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                          <div className="circle circle-main"></div>
                        </div>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                      )}

                      {/* Icon - Type indicator or Favicon */}
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
                        ) : incident.type === 'monitor' ? (
                          <Monitor className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Timer className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Incident Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {incident.source_name || hostname}
                          </span>
                          {incident.source_url && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(incident.source_url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{hostname} aç</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {/* Type badge */}
                          <span className="capitalize">{incident.type === 'monitor' ? 'Monitör' : 'Cron'}</span>
                          
                          {/* Status */}
                          <span className={`font-medium ${isOngoing ? 'text-red-600' : 'text-green-600'}`}>
                            {isOngoing ? 'Devam Ediyor' : 'Çözüldü'}
                          </span>
                          
                          {/* Duration */}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(incident.started_at, incident.resolved_at, currentTime)}
                          </span>
                          
                          {/* Cause */}
                          {incident.cause && (
                            <span className="truncate max-w-[150px]">
                              {formatCause(incident.cause)}
                              {incident.http_status && ` (${incident.http_status})`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-3">
                        {/* Started time */}
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(incident.started_at, currentTime)}
                        </div>

                        {/* Quick resolve button for ongoing incidents */}
                        {isOngoing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={isResolving}
                            onClick={(e) => handleResolve(e, incident.id)}
                          >
                            {isResolving ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                                <span>Çözülüyor</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Çöz</span>
                              </span>
                            )}
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/incidents/${incident.id}`}>Detayları gör</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/${incident.type === 'monitor' ? 'monitors' : 'cron-jobs'}/${incident.source_id}`}>
                                {incident.type === 'monitor' ? 'Monitörü' : 'Cron job\'u'} görüntüle
                              </Link>
                            </DropdownMenuItem>
                            {incident.source_url && (
                              <DropdownMenuItem asChild>
                                <a href={incident.source_url} target="_blank" rel="noopener noreferrer">
                                  Siteyi ziyaret et
                                  <ExternalLink className="w-3 h-3 ml-2" />
                                </a>
                              </DropdownMenuItem>
                            )}
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
    </>
  );
}
