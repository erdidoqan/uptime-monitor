'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Globe, Timer, Plus, MoreVertical, Search, ExternalLink, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CronJob } from '@/shared/types';

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
  if (!timestamp) return 'Never';
  
  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Format time until next run
function formatTimeUntil(nextRunAt: number | null, currentTime: number): string {
  if (!nextRunAt) return 'N/A';
  
  const diff = nextRunAt - currentTime;
  if (diff <= 0) return 'Now';
  
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    if (hours > 0) {
      return `${days}d ${hours}h`;
    }
    return `${days}d ${minutes}m`;
  }
  if (hours > 0) {
    if (minutes > 0 && seconds > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (seconds > 0) {
      return `${hours}h ${seconds}s`;
    }
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Convert cron expression to human-readable description
function cronToDescription(cronExpr: string): string {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return cronExpr;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Helper to check if a field is "every" (*)
  const isEvery = (field: string) => field === '*';
  // Helper to check if a field is a step (*/n)
  const isStep = (field: string) => field.startsWith('*/');
  // Helper to get step value
  const getStep = (field: string) => parseInt(field.replace('*/', ''), 10);
  // Helper to check if field is a specific value
  const isSpecific = (field: string) => /^\d+$/.test(field);
  // Helper to get specific value
  const getSpecific = (field: string) => parseInt(field, 10);

  // Day of week names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Every minute: * * * * *
  if (isEvery(minute) && isEvery(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
    return 'Every minute';
  }

  // Every N minutes: */N * * * *
  if (isStep(minute) && isEvery(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
    const n = getStep(minute);
    return n === 1 ? 'Every minute' : `Every ${n} minutes`;
  }

  // Every hour at minute 0: 0 * * * *
  if (isSpecific(minute) && isEvery(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
    const min = getSpecific(minute);
    return min === 0 ? 'Every hour' : `Every hour at :${min.toString().padStart(2, '0')}`;
  }

  // Every N hours: 0 */N * * *
  if (isSpecific(minute) && isStep(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
    const n = getStep(hour);
    return n === 1 ? 'Every hour' : `Every ${n} hours`;
  }

  // Every day at specific time: M H * * *
  if (isSpecific(minute) && isSpecific(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
    const h = getSpecific(hour);
    const m = getSpecific(minute);
    return `Daily at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Weekly on specific day: M H * * D
  if (isSpecific(minute) && isSpecific(hour) && isEvery(dayOfMonth) && isEvery(month) && isSpecific(dayOfWeek)) {
    const h = getSpecific(hour);
    const m = getSpecific(minute);
    const d = getSpecific(dayOfWeek);
    const dayName = dayNames[d] || `Day ${d}`;
    return `${dayName}s at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Monthly on specific day: M H D * *
  if (isSpecific(minute) && isSpecific(hour) && isSpecific(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
    const h = getSpecific(hour);
    const m = getSpecific(minute);
    const d = getSpecific(dayOfMonth);
    const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
    return `Monthly on ${d}${suffix} at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Fallback to cron expression
  return cronExpr;
}

// Get schedule description
function getScheduleDescription(cronJob: CronJob): string {
  if (cronJob.cron_expr) {
    return cronToDescription(cronJob.cron_expr);
  } else if (cronJob.interval_sec) {
    const seconds = cronJob.interval_sec;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);
    
    if (days > 0) {
      return `Every ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `Every ${seconds} second${seconds > 1 ? 's' : ''}`;
  }
  return 'No schedule';
}

interface CronJobListProps {
  initialCronJobs: CronJob[];
  showSearch?: boolean;
}

export function CronJobList({ initialCronJobs, showSearch = true }: CronJobListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time every second for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredCronJobs = useMemo(() => {
    if (!showSearch || !searchQuery) {
      return initialCronJobs;
    }
    return initialCronJobs.filter(cronJob =>
      cronJob.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cronJob.name && cronJob.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cronJob.method && cronJob.method.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [initialCronJobs, searchQuery, showSearch]);

  return (
    <>
      {/* Search input */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 w-[180px] h-9 text-sm"
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">/</span>
          </div>
        </div>
      )}

      {filteredCronJobs.length === 0 ? (
        showSearch ? (
          <Card className="border">
            <CardContent className="pt-8 text-center py-16">
              <Timer className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">No cron jobs yet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Create your first cron job to schedule HTTP requests
              </p>
              <Button size="sm" asChild>
                <Link href="/cron-jobs/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Cron Job
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="px-5 py-8 text-center">
            <Timer className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">No cron jobs yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first cron job to schedule HTTP requests
            </p>
            <Button size="sm" asChild>
              <Link href="/cron-jobs/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Cron Job
              </Link>
            </Button>
          </div>
        )
      ) : (
        showSearch ? (
          <Card className="border">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {filteredCronJobs.map((cronJob) => {
                  const faviconUrl = getFaviconUrl(cronJob.url);
                  const hostname = getHostname(cronJob.url);
                  return (
                    <TooltipProvider key={cronJob.id}>
                      <Link
                        href={`/cron-jobs/${cronJob.id}`}
                        className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
                      >
                        {/* Status Indicator */}
                        {cronJob.is_active === 0 ? (
                          <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                        ) : cronJob.last_status === 'success' ? (
                          <div className="status-indicator status-indicator--success flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                            <div className="circle circle--animated circle-main"></div>
                            <div className="circle circle--animated circle-secondary"></div>
                            <div className="circle circle--animated circle-tertiary"></div>
                          </div>
                        ) : cronJob.last_status === 'fail' ? (
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
                        {/* Cron Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                              {cronJob.name || hostname}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              {cronJob.method}
                            </span>
                            {/* External Link */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(cronJob.url, '_blank', 'noopener,noreferrer');
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
                            {cronJob.name && (
                              <span className="truncate max-w-[200px]">{hostname}</span>
                            )}
                            {/* Status */}
                            {cronJob.is_active === 0 ? (
                              <span className="text-yellow-600 font-medium">Paused</span>
                            ) : (
                              <span className={`font-medium ${cronJob.last_status === 'success' ? 'text-green-600' : cronJob.last_status === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
                                {cronJob.last_status === 'success' ? 'Success' : cronJob.last_status === 'fail' ? 'Failed' : 'Pending'}
                              </span>
                            )}
                            {/* Last run */}
                            {cronJob.last_run_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(cronJob.last_run_at, currentTime)}
                              </span>
                            )}
                            {/* Next run */}
                            {cronJob.next_run_at && cronJob.is_active === 1 && (
                              <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {formatTimeUntil(cronJob.next_run_at, currentTime)}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Right side info */}
                        <div className="flex items-center gap-4">
                          {/* Schedule badge */}
                          <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            {getScheduleDescription(cronJob)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/cron-jobs/${cronJob.id}`}>View details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={cronJob.url} target="_blank" rel="noopener noreferrer">
                                  Visit URL
                                  <ExternalLink className="w-3 h-3 ml-2" />
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/cron-jobs/${cronJob.id}/edit`}>Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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
            {filteredCronJobs.map((cronJob) => {
              const faviconUrl = getFaviconUrl(cronJob.url);
              const hostname = getHostname(cronJob.url);
              return (
                <TooltipProvider key={cronJob.id}>
                  <Link
                    href={`/cron-jobs/${cronJob.id}`}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
                  >
                    {/* Status Indicator */}
                    {cronJob.is_active === 0 ? (
                      <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0 ring-2 ring-yellow-500/20" />
                    ) : cronJob.last_status === 'success' ? (
                      <div className="status-indicator status-indicator--success flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                        <div className="circle circle--animated circle-main"></div>
                        <div className="circle circle--animated circle-secondary"></div>
                        <div className="circle circle--animated circle-tertiary"></div>
                      </div>
                    ) : cronJob.last_status === 'fail' ? (
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
                    {/* Cron Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {cronJob.name || hostname}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {cronJob.method}
                        </span>
                        {/* External Link */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(cronJob.url, '_blank', 'noopener,noreferrer');
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
                        {cronJob.name && (
                          <span className="truncate max-w-[200px]">{hostname}</span>
                        )}
                        {/* Status */}
                        {cronJob.is_active === 0 ? (
                          <span className="text-yellow-600 font-medium">Paused</span>
                        ) : (
                          <span className={`font-medium ${cronJob.last_status === 'success' ? 'text-green-600' : cronJob.last_status === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
                            {cronJob.last_status === 'success' ? 'Success' : cronJob.last_status === 'fail' ? 'Failed' : 'Pending'}
                          </span>
                        )}
                        {/* Last run */}
                        {cronJob.last_run_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(cronJob.last_run_at, currentTime)}
                          </span>
                        )}
                        {/* Next run */}
                        {cronJob.next_run_at && cronJob.is_active === 1 && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {formatTimeUntil(cronJob.next_run_at, currentTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Right side info */}
                    <div className="flex items-center gap-4">
                      {/* Schedule badge */}
                      <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {getScheduleDescription(cronJob)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/cron-jobs/${cronJob.id}`}>View details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={cronJob.url} target="_blank" rel="noopener noreferrer">
                              Visit URL
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/cron-jobs/${cronJob.id}/edit`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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

