'use client';

import { AlertCircle, CheckCircle2, Clock, Globe, Timer } from 'lucide-react';
import { StatusHeader } from '../status-header';
import { StatusFooter } from '../status-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusPageBasic {
  id: string;
  companyName: string;
  subdomain: string;
  customDomain: string | null;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  contactUrl: string | null;
}

interface Incident {
  id: string;
  type: 'monitor' | 'cron_job';
  sourceId: string;
  sourceName: string;
  startedAt: number;
  resolvedAt: number | null;
  duration: number | null;
}

interface IncidentsContentProps {
  statusPage: StatusPageBasic;
  incidents: Incident[];
  subdomain: string;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Unknown';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Group incidents by date
function groupIncidentsByDate(incidents: Incident[]): Map<string, Incident[]> {
  const groups = new Map<string, Incident[]>();
  
  for (const incident of incidents) {
    const date = formatDate(incident.startedAt);
    const existing = groups.get(date) || [];
    existing.push(incident);
    groups.set(date, existing);
  }
  
  return groups;
}

export function IncidentsContent({ statusPage, incidents, subdomain }: IncidentsContentProps) {
  const groupedIncidents = groupIncidentsByDate(incidents);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <StatusHeader
        companyName={statusPage.companyName}
        subdomain={subdomain}
        logoUrl={statusPage.logoUrl}
        logoLinkUrl={statusPage.logoLinkUrl}
        contactUrl={statusPage.contactUrl}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Previous Incidents
        </h1>

        {incidents.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  No incidents in the past 90 days
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Great news! There have been no service disruptions during this period.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedIncidents.entries()).map(([date, dateIncidents]) => (
              <div key={date}>
                {/* Date header */}
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {date}
                </h2>
                
                {/* Incidents for this date */}
                <div className="space-y-3">
                  {dateIncidents.map((incident) => (
                    <Card key={incident.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {/* Type icon */}
                            <div className="mt-0.5">
                              {incident.type === 'monitor' ? (
                                <Globe className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <Timer className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            
                            {/* Details */}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">
                                  {incident.sourceName}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-xs"
                                >
                                  Resolved
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Started at {formatTime(incident.startedAt)}
                                </span>
                                {incident.resolvedAt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Resolved at {formatTime(incident.resolvedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Duration */}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDuration(incident.duration)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <StatusFooter />
    </div>
  );
}

















