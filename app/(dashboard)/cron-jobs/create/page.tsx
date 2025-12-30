'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const CreateCronJobForm = dynamic(
  () => import('./create-cron-job-form').then(mod => ({ default: mod.CreateCronJobForm })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <div className="mb-6">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-12">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    ),
  }
);

export default function CreateCronJobPage() {
  return <CreateCronJobForm />;
}
