import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import type { CronJob } from '@/shared/types';
import { CronJobList } from './cron-job-list';

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

function CronJobListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-[180px] mb-4" />
      <div className="divide-y divide-border/50">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-5">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-7 w-7" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function CronJobListWrapper() {
  const cronJobs = await getCronJobsData();
  return <CronJobList initialCronJobs={cronJobs} showSearch={true} />;
}

export default function CronJobsPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Cron Job&apos;lar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zamanlanmış HTTP isteklerinizi yönetin
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/cron-jobs/create">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Cron Job
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CronJobListSkeleton />}>
        <CronJobListWrapper />
      </Suspense>
    </div>
  );
}

