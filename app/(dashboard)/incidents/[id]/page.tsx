import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { IncidentHeader } from './incident-header';
import { IncidentActions } from './incident-actions';
import { IncidentTimeline } from './incident-timeline';
import type { Incident, IncidentEvent } from '@/shared/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface IncidentDetailResponse {
  incident: Incident;
  events: IncidentEvent[];
}

async function getIncidentData(incidentId: string): Promise<IncidentDetailResponse | null> {
  try {
    const data = await serverApi.get<IncidentDetailResponse>(`/incidents/${incidentId}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    console.error('Failed to load incident:', error);
    return null;
  }
}

function HeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border">
          <CardContent className="pt-5 pb-5">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="pt-5 pb-5">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="pt-5 pb-5">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <Card className="border">
      <CardContent className="p-6">
        <Skeleton className="h-6 w-24 mb-6" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function IncidentDetailWrapper({ incidentId }: { incidentId: string }) {
  const data = await getIncidentData(incidentId);

  if (!data || !data.incident) {
    return (
      <Card className="border">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-sm text-muted-foreground">Olay bulunamadı</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/incidents">Olaylara Dön</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <IncidentHeader 
        incident={data.incident} 
        actions={<IncidentActions incident={data.incident} />}
      />
      <IncidentTimeline 
        incidentId={incidentId} 
        initialEvents={data.events} 
        isResolved={!!data.incident.resolved_at}
      />
    </>
  );
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const incidentId = typeof id === 'string' ? id : id?.[0] || '';

  if (!incidentId) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <Card className="border">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-sm text-muted-foreground">Olay ID gerekli</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/incidents">Olaylara Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      {/* Back button - always visible */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Olaylara Dön
          </Link>
        </Button>
      </div>

      {/* Incident content - progressive loading */}
      <Suspense fallback={
        <>
          <HeaderSkeleton />
          <div className="mb-4">
            <Skeleton className="h-9 w-24" />
          </div>
          <TimelineSkeleton />
        </>
      }>
        <IncidentDetailWrapper incidentId={incidentId} />
      </Suspense>
    </div>
  );
}
