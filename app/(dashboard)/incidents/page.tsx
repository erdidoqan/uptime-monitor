import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { Incident } from '@/shared/types';
import { IncidentList } from './incident-list';
import { CreateIncidentDialog } from './create-incident-dialog';

interface IncidentsResponse {
  incidents: Incident[];
  total: number;
  limit: number;
  offset: number;
}

async function getIncidentsData(): Promise<Incident[]> {
  try {
    const response = await serverApi.get<IncidentsResponse>('/incidents?limit=100');
    return response.incidents;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    console.error('Failed to load incidents:', error);
    return [];
  }
}

function IncidentListSkeleton() {
  return (
    <>
      {/* Search and filter skeleton */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Skeleton className="h-9 w-[180px] rounded-md" />
        </div>
        <Skeleton className="h-9 w-[120px] rounded-md" />
      </div>
      
      <Card className="border">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-5 animate-pulse">
                {/* Status indicator skeleton */}
                <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
                
                {/* Icon skeleton */}
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                
                {/* Incident info skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                
                {/* Right side skeleton */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-20 rounded" />
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

async function IncidentsListWrapper() {
  const incidents = await getIncidentsData();
  return <IncidentList initialIncidents={incidents} />;
}

export default function IncidentsPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      {/* Header - always visible */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <CreateIncidentDialog />
      </div>

      {/* Incident list with search and filter - progressive loading */}
      <Suspense fallback={<IncidentListSkeleton />}>
        <IncidentsListWrapper />
      </Suspense>
    </div>
  );
}

