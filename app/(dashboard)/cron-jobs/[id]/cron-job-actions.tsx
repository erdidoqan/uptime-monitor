'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Pause, Play, Settings, Trash2, PlayCircle } from 'lucide-react';
import type { CronJob } from '@/shared/types';

interface CronJobActionsProps {
  cronJob: CronJob;
  onUpdate?: () => void;
}

export function CronJobActions({ cronJob, onUpdate }: CronJobActionsProps) {
  const router = useRouter();
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const handlePauseToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!cronJob || !cronJob.id) return;
    
    setPausing(true);
    try {
      const newIsActive = cronJob.is_active === 1 ? 0 : 1;
      await api.put(`/cron-jobs/${cronJob.id}`, { is_active: newIsActive });
      // Refresh the page to show updated data
      router.refresh();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      alert('Failed to toggle pause');
    } finally {
      setPausing(false);
    }
  };

  const handleTrigger = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!cronJob || !cronJob.id) return;
    
    setTriggering(true);
    try {
      await api.post(`/cron-jobs/${cronJob.id}/trigger`, {});
      alert('Cron job triggered! It will run on the next worker execution (within 1 minute).');
      router.refresh();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
      if (error instanceof ApiError) {
        alert(`Failed to trigger cron job: ${error.message}`);
      } else {
        alert('Failed to trigger cron job');
      }
    } finally {
      setTriggering(false);
    }
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!cronJob || !cronJob.id) return;
    
    if (!confirm('Are you sure you want to delete this cron job? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      await api.delete(`/cron-jobs/${cronJob.id}`);
      // Redirect to cron jobs list
      router.push('/cron-jobs');
    } catch (error) {
      console.error('Failed to delete cron job:', error);
      if (error instanceof ApiError) {
        alert(`Failed to delete cron job: ${error.message}`);
      } else {
        alert('Failed to delete cron job');
      }
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {cronJob.is_active === 1 && (
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handleTrigger}
          disabled={triggering}
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          {triggering ? 'Triggering...' : 'Run Now'}
        </Button>
      )}
      <Button 
        type="button"
        variant="outline" 
        size="sm"
        onClick={handlePauseToggle}
        disabled={pausing}
      >
        {cronJob.is_active === 0 ? (
          <>
            <Play className="mr-2 h-4 w-4" />
            {pausing ? 'Resuming...' : 'Resume'}
          </>
        ) : (
          <>
            <Pause className="mr-2 h-4 w-4" />
            {pausing ? 'Pausing...' : 'Pause'}
          </>
        )}
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/cron-jobs/${cronJob.id}/edit`}>
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Link>
      </Button>
      <Button 
        type="button"
        variant="outline" 
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}

