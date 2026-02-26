'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Pause, Settings, Trash2 } from 'lucide-react';
import { CronJobActions } from './cron-job-actions';
import type { CronJob } from '@/shared/types';

interface CronJobActionsPlaceholderProps {
  cronJobId: string;
}

// Client component that shows buttons immediately, then fetches cron job and enables them
export function CronJobActionsPlaceholder({ cronJobId }: CronJobActionsPlaceholderProps) {
  const { data: session, status } = useSession();
  const [cronJob, setCronJob] = useState<CronJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for session to be ready before making API calls
    if (status === 'loading' || !session?.user?.apiToken) {
      return;
    }

    // Fetch cron job client-side to enable buttons
    const fetchCronJob = async () => {
      try {
        const data = await api.get<CronJob>(`/cron-jobs/${cronJobId}`);
        setCronJob(data);
      } catch (error) {
        console.error('Failed to load cron job for actions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCronJob();
  }, [cronJobId, session, status]);

  // Show disabled buttons immediately
  if (loading || !cronJob) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Pause className="mr-2 h-4 w-4" />
          Duraklat
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Settings className="mr-2 h-4 w-4" />
          Yapılandır
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Trash2 className="mr-2 h-4 w-4" />
          Sil
        </Button>
      </div>
    );
  }

  // Show real actions when cron job loads
  return <CronJobActions cronJob={cronJob} />;
}
