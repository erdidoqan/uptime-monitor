import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { CronJobHeaderTop } from './cron-job-header-top';
import { CronJobHeader } from './cron-job-header';
import { CronJobStats } from './cron-job-stats';
import { CronJobRuns } from './cron-job-runs';
import { CronJobActionsPlaceholder } from './cron-job-actions-placeholder';
import { CronJobIncidents } from './cron-job-incidents';
import type { CronJob } from '@/shared/types';
import type { CronRun } from '@/shared/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper to calculate start date (server-side safe)
function getStartDateForRange(days: number): number {
  const now = new Date();
  return now.getTime() - (days * 24 * 60 * 60 * 1000);
}

async function getCronJobData(cronJobId: string): Promise<{ cronJob: CronJob; initialRuns: CronRun[] }> {
  try {
    // Fetch cron job data first
    const cronJobData = await serverApi.get<CronJob>(`/cron-jobs/${cronJobId}`);

    // Fetch only minimal runs for header (last 100 runs for stats calculation)
    let initialRuns: CronRun[] = [];
    try {
      const startDate = getStartDateForRange(7); // Only last 7 days for header
      initialRuns = await serverApi.get<CronRun[]>(
        `/cron-jobs/${cronJobId}/runs?limit=100`
      ) || [];
    } catch (error) {
      // If runs fetch fails, continue without them
      console.warn('Failed to load initial runs:', error);
    }

    return { cronJob: cronJobData, initialRuns };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }
}

function RunsSkeleton() {
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

async function CronJobHeaderTopData({ cronJobId }: { cronJobId: string }) {
  const data = await getCronJobData(cronJobId);
  
  if (!data.cronJob) {
    return (
      <Card className="border">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-sm text-muted-foreground">Cron job not found</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/cron-jobs">Back to Cron Jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <CronJobHeaderTop cronJob={data.cronJob} />;
}

async function CronJobHeaderCardsData({ cronJobId }: { cronJobId: string }) {
  const data = await getCronJobData(cronJobId);
  
  if (!data.cronJob) {
    return null;
  }

  return (
    <CronJobHeader 
      cronJob={data.cronJob} 
      initialRuns={data.initialRuns} 
    />
  );
}

export default async function CronJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cronJobId = typeof id === 'string' ? id : id?.[0] || '';

  if (!cronJobId) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <Card className="border">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-sm text-muted-foreground">Cron job ID is required</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/cron-jobs">Back to Cron Jobs</Link>
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
          <Link href="/cron-jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cron Jobs
          </Link>
        </Button>
      </div>

      {/* Cron job header top (title, status) - progressive loading */}
      <Suspense fallback={
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-5" />
        </div>
      }>
        <CronJobHeaderTopData cronJobId={cronJobId} />
      </Suspense>

      {/* Butonlar - hemen görünür (cron job gelene kadar disabled) */}
      <div className="mb-4">
        <CronJobActionsPlaceholder cronJobId={cronJobId} />
      </div>

      {/* Cron job header cards - progressive loading */}
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
        <CronJobHeaderCardsData cronJobId={cronJobId} />
      </Suspense>

      {/* Incidents - client-side loading */}
      <CronJobIncidents cronJobId={cronJobId} />

      {/* Stats - progressive loading */}
      <Suspense fallback={<StatsSkeleton />}>
        <CronJobStatsWrapper cronJobId={cronJobId} />
      </Suspense>

      {/* Runs - progressive loading */}
      <Suspense fallback={<RunsSkeleton />}>
        <CronJobRunsWrapper cronJobId={cronJobId} />
      </Suspense>
    </div>
  );
}

// Wrapper component to fetch runs for stats
async function CronJobStatsWrapper({ cronJobId }: { cronJobId: string }) {
  let runs: CronRun[] = [];
  
  try {
    // Fetch 30 days of runs for stats, but with a reasonable limit
    const runsData = await serverApi.get<CronRun[]>(
      `/cron-jobs/${cronJobId}/runs?limit=5000`
    );
    // Ensure we have an array
    runs = Array.isArray(runsData) ? runsData : [];
  } catch (error) {
    console.error('Failed to load runs for stats:', error);
    runs = [];
  }
  
  return <CronJobStats runs={runs} />;
}

// Wrapper component to fetch initial runs for CronJobRuns
async function CronJobRunsWrapper({ cronJobId }: { cronJobId: string }) {
  let initialRuns: CronRun[] = [];
  
  try {
    initialRuns = await serverApi.get<CronRun[]>(
      `/cron-jobs/${cronJobId}/runs?limit=100`
    ) || [];
  } catch (error) {
    console.warn('Failed to load initial runs:', error);
    initialRuns = [];
  }
  
  return <CronJobRuns cronJobId={cronJobId} initialRuns={initialRuns} initialTimeRange="month" />;
}

