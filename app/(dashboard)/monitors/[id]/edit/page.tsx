import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { MonitorEditForm } from './monitor-edit-form';
import { MonitorEditActions } from './monitor-edit-actions';
import type { Monitor } from '@/shared/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getMonitorData(monitorId: string): Promise<{ monitor: Monitor }> {
  try {
    const monitor = await serverApi.get<Monitor>(`/monitors/${monitorId}`);
    return { monitor };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }
}

function FormSkeleton() {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

async function MonitorEditActionsWrapper({ monitorId }: { monitorId: string }) {
  const { monitor } = await getMonitorData(monitorId);
  return <MonitorEditActions monitor={monitor} />;
}

async function MonitorEditFormWrapper({ monitorId }: { monitorId: string }) {
  const { monitor } = await getMonitorData(monitorId);
  return <MonitorEditForm monitor={monitor} />;
}

export default async function EditMonitorPage({ params }: PageProps) {
  const { id } = await params;
  const monitorId = typeof id === 'string' ? id : id?.[0] || '';

  if (!monitorId) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <div className="mb-6">
          <Link href="/monitors" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline mr-2 h-4 w-4" />
            Monitors
          </Link>
          <span className="text-sm text-muted-foreground mx-2">/</span>
          <span className="text-sm font-medium">Edit monitor</span>
        </div>
        <div className="text-sm text-muted-foreground">Monitor ID is required</div>
      </div>
    );
  }

  // Page renders immediately, form data loads progressively
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      {/* Breadcrumb - always visible */}
      <div className="mb-6">
        <Link href={`/monitors/${monitorId}`} className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Monitor details
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Edit monitor</span>
      </div>

      {/* Actions buttons - progressive loading */}
      <Suspense fallback={
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      }>
        <MonitorEditActionsWrapper monitorId={monitorId} />
      </Suspense>

      {/* Form - progressive loading */}
      <Suspense fallback={<FormSkeleton />}>
        <MonitorEditFormWrapper monitorId={monitorId} />
      </Suspense>
    </div>
  );
}

