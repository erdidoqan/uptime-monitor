import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { MonitorHeader } from './monitor-header';
import { MonitorHeaderTop } from './monitor-header-top';
import { MonitorStats } from './monitor-stats';
import { MonitorChecks } from './monitor-checks';
import { MonitorActionsPlaceholder } from './monitor-actions-placeholder';
import { MonitorIncidents } from './monitor-incidents';
import type { Monitor } from '@/shared/types';
import type { MonitorCheck } from '@/shared/types';
import type { Incident } from '@/shared/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper to calculate start date (server-side safe)
function getStartDateForRange(days: number): number {
  const now = new Date();
  return now.getTime() - (days * 24 * 60 * 60 * 1000);
}

async function getMonitorData(monitorId: string): Promise<{ monitor: Monitor; openIncident: Incident | null; initialChecks: MonitorCheck[] }> {
  try {
    // Fetch monitor data first
    const monitorData = await serverApi.get<Monitor>(`/monitors/${monitorId}`);

    let openIncident: Incident | null = null;

      // Get open incident for this monitor if monitor is down
      if (monitorData && monitorData.last_status === 'down') {
        try {
        // Incidents feature removed with projects
        const incidents: Incident[] = [];
        openIncident = incidents.find(
            (inc) => inc.type === 'monitor' && inc.source_id === monitorId && !inc.resolved_at
        ) || null;
        } catch (incidentError) {
          // If incident fetch fails, just continue without it
          console.warn('Failed to load incident:', incidentError);
      }
    }

    // Fetch only minimal checks for header (last 100 checks for uptime calculation)
    // This is much faster than fetching 30 days of checks
    let initialChecks: MonitorCheck[] = [];
    try {
      const startDate = getStartDateForRange(7); // Only last 7 days for header
      initialChecks = await serverApi.get<MonitorCheck[]>(
        `/monitors/${monitorId}/checks?start_date=${startDate}&limit=100`
      ) || [];
    } catch (error) {
      // If checks fetch fails, continue without them
      console.warn('Failed to load initial checks:', error);
    }

    return { monitor: monitorData, openIncident, initialChecks };
    } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }
}

function ChecksSkeleton() {
  return (
    <Card className="border gap-0">
      <div className="pb-3 px-6 pt-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="px-6 pb-6 pt-0">
        <Skeleton className="h-[250px] w-full" />
      </div>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <Card className="mb-4 border gap-0">
      <div className="pb-3 px-6 pt-6">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="px-6 pb-6 pt-0">
        <Skeleton className="h-64 w-full" />
      </div>
    </Card>
  );
}


async function MonitorHeaderTopData({ monitorId }: { monitorId: string }) {
  const data = await getMonitorData(monitorId);
  
  if (!data.monitor) {
    return (
      <Card className="border">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-sm text-muted-foreground">Monitör bulunamadı</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/monitors">Monitörlere Dön</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <MonitorHeaderTop monitor={data.monitor} />;
}

async function MonitorHeaderCardsData({ monitorId }: { monitorId: string }) {
  const data = await getMonitorData(monitorId);
  
  if (!data.monitor) {
    return null;
  }

  return (
    <MonitorHeader 
      monitor={data.monitor} 
      initialChecks={data.initialChecks} 
      openIncident={data.openIncident}
    />
  );
}

export default async function MonitorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const monitorId = typeof id === 'string' ? id : id?.[0] || '';

  if (!monitorId) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <Card className="border">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-sm text-muted-foreground">Monitör ID gerekli</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/monitors">Monitörlere Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Page renders immediately, data loads progressively
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      {/* Back button - always visible */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/monitors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Monitörlere Dön
          </Link>
        </Button>
      </div>

      {/* Monitor header top (title, status) - progressive loading */}
      <Suspense fallback={
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-5" />
        </div>
      }>
        <MonitorHeaderTopData monitorId={monitorId} />
      </Suspense>

      {/* Butonlar - hemen görünür (monitor gelene kadar disabled) */}
      <div className="mb-4">
        <MonitorActionsPlaceholder monitorId={monitorId} />
      </div>

      {/* Monitor header cards - progressive loading */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border gap-0">
              <div className="pb-3 px-5 pt-5">
                <Skeleton className="h-4 w-24 mb-2" />
              </div>
              <div className="px-5 pb-5 pt-0">
                <Skeleton className="h-6 w-32" />
              </div>
            </Card>
          ))}
        </div>
      }>
        <MonitorHeaderCardsData monitorId={monitorId} />
      </Suspense>

      {/* Incidents - client-side loading */}
      <MonitorIncidents monitorId={monitorId} />

      {/* Stats - progressive loading */}
      <Suspense fallback={<StatsSkeleton />}>
        <MonitorStatsWrapper monitorId={monitorId} />
      </Suspense>

      {/* Checks - progressive loading */}
      <Suspense fallback={<ChecksSkeleton />}>
        <MonitorChecksWrapper monitorId={monitorId} />
      </Suspense>
    </div>
  );
}

// Wrapper component to fetch checks for stats
async function MonitorStatsWrapper({ monitorId }: { monitorId: string }) {
  let checks: MonitorCheck[] = [];
  
  try {
    // Fetch 30 days of checks for stats, but with a reasonable limit
    const startDate = getStartDateForRange(30);
    checks = await serverApi.get<MonitorCheck[]>(
      `/monitors/${monitorId}/checks?start_date=${startDate}&limit=5000`
    );
  } catch (error) {
    console.error('Failed to load checks for stats:', error);
    checks = [];
  }
  
  return <MonitorStats checks={checks} />;
}

// Wrapper component to fetch initial checks for MonitorChecks
async function MonitorChecksWrapper({ monitorId }: { monitorId: string }) {
  let initialChecks: MonitorCheck[] = [];
  
  try {
    const startDate = getStartDateForRange(7);
    initialChecks = await serverApi.get<MonitorCheck[]>(
      `/monitors/${monitorId}/checks?start_date=${startDate}&limit=100`
    ) || [];
  } catch (error) {
    console.warn('Failed to load initial checks:', error);
    initialChecks = [];
  }
  
  return <MonitorChecks monitorId={monitorId} initialChecks={initialChecks} initialTimeRange="month" />;
}
