'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import type { Incident } from '@/shared/types';

// Format relative time
function formatRelativeTime(timestamp: number, currentTime: number): string {
  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
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
    parts.push(`${days}d`);
  }
  if (hours % 24 > 0 && parts.length < 2) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes % 60 > 0 && parts.length < 2) {
    parts.push(`${minutes % 60}m`);
  }
  if (parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

// Format cause for display
function formatCause(cause: string | null): string {
  if (!cause) return 'Unknown error';
  
  const causeMap: Record<string, string> = {
    'timeout': 'Timeout',
    'http_error': 'HTTP error',
    'keyword_missing': 'Keyword missing',
    'ssl_error': 'SSL error',
    'dns_error': 'DNS error',
  };
  
  return causeMap[cause] || cause;
}

interface CronJobIncidentsProps {
  cronJobId: string;
}

interface IncidentsResponse {
  incidents: Incident[];
  total: number;
}

export function CronJobIncidents({ cronJobId }: CronJobIncidentsProps) {
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time every second for real-time duration updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchIncidents() {
      if (!session?.user?.apiToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/incidents?type=cron&limit=10`, {
          headers: {
            'Authorization': `Bearer ${session.user.apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch incidents');
        }

        const data: IncidentsResponse = await response.json();
        // Filter incidents for this specific cron job
        const cronIncidents = data.incidents.filter(inc => inc.source_id === cronJobId);
        setIncidents(cronIncidents);
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();
  }, [cronJobId, session?.user?.apiToken]);

  if (loading) {
    return (
      <Card className="border mb-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const ongoingIncidents = incidents.filter(inc => !inc.resolved_at);
  const resolvedIncidents = incidents.filter(inc => inc.resolved_at);

  return (
    <Card className="border mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Incidents
            {ongoingIncidents.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                {ongoingIncidents.length} ongoing
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/incidents?type=cron`}>
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {incidents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No incidents recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.slice(0, 5).map((incident) => {
              const isOngoing = !incident.resolved_at;
              
              return (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    {isOngoing ? (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className={isOngoing ? 'text-red-600' : ''}>
                          {isOngoing ? 'Ongoing' : 'Resolved'}
                        </span>
                        {incident.cause && (
                          <span className="text-muted-foreground font-normal">
                            • {formatCause(incident.cause)}
                            {incident.http_status && ` (${incident.http_status})`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDuration(incident.started_at, incident.resolved_at, currentTime)}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(incident.started_at, currentTime)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
            
            {incidents.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/incidents?type=cron`}>
                    View {incidents.length - 5} more incidents
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

