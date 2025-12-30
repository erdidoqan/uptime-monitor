import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { Monitor as MonitorType, CronJob } from '@/shared/types';
import { WelcomeCard } from './welcome-card';
import { LatestMonitors } from './latest-monitors';

async function getMonitorsData(): Promise<MonitorType[]> {
  try {
    const monitors = await serverApi.get<MonitorType[]>('/monitors');
    return monitors;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    console.error('Failed to load monitors:', error);
    return [];
  }
}

async function getCronJobsData(): Promise<CronJob[]> {
  try {
    const cronJobs = await serverApi.get<CronJob[]>('/cron-jobs');
    return cronJobs;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    console.error('Failed to load cron jobs:', error);
    return [];
  }
}

function LatestMonitorsSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Card className="border">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                {/* Status indicator skeleton */}
                <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
                
                {/* Favicon skeleton */}
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                
                {/* Monitor info skeleton */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-3 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
                
                {/* Right side skeleton */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-10 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WelcomeCardSkeleton() {
  return (
    <Card className="border bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        <Skeleton className="w-16 h-16 rounded-xl mb-6" />
        <Skeleton className="h-6 w-56 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function DashboardContent() {
  const [monitors, cronJobs] = await Promise.all([
    getMonitorsData(),
    getCronJobsData(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <WelcomeCard 
        hasMonitors={monitors.length > 0} 
        hasCronJobs={cronJobs.length > 0} 
      />
      <LatestMonitors initialMonitors={monitors.slice(0, 5)} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px]">
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WelcomeCardSkeleton />
          <LatestMonitorsSkeleton />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
