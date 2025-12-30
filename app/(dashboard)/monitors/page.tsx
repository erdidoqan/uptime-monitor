import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import type { Monitor as MonitorType } from '@/shared/types';
import { MonitorList } from './monitor-list';

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

function MonitorListSkeleton() {
  return (
    <>
      {/* Search skeleton */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Skeleton className="h-9 w-[180px] rounded-md" />
        </div>
      </div>
      
      <Card className="border">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-5 animate-pulse">
                {/* Status indicator skeleton */}
                <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
                
                {/* Favicon skeleton */}
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                
                {/* Monitor info skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-3.5 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                
                {/* Right side skeleton */}
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

async function MonitorsListWrapper() {
  const monitors = await getMonitorsData();
  return <MonitorList initialMonitors={monitors} />;
}

export default function MonitorsPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      {/* Header - always visible */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Monitors</h1>
        <Button size="sm" asChild>
          <Link href="/monitors/create">
            <Plus className="mr-2 h-4 w-4" />
            Create monitor
          </Link>
        </Button>
      </div>

      {/* Monitor list with search - progressive loading */}
      <Suspense fallback={<MonitorListSkeleton />}>
        <MonitorsListWrapper />
      </Suspense>
    </div>
  );
}
