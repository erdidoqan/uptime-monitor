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
      alert('Duraklatma/devam ettirme başarısız');
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
      alert('Cron job tetiklendi! Sonraki worker çalışmasında (1 dakika içinde) çalışacak.');
      router.refresh();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
      if (error instanceof ApiError) {
        alert(`Cron job tetiklenemedi: ${error.message}`);
      } else {
        alert('Cron job tetiklenemedi');
      }
    } finally {
      setTriggering(false);
    }
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!cronJob || !cronJob.id) return;
    
    if (!confirm('Bu cron job\'u silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
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
        alert(`Cron job silinemedi: ${error.message}`);
      } else {
        alert('Cron job silinemedi');
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
          {triggering ? 'Tetikleniyor...' : 'Şimdi Çalıştır'}
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
            {pausing ? 'Devam ettiriliyor...' : 'Devam Et'}
          </>
        ) : (
          <>
            <Pause className="mr-2 h-4 w-4" />
            {pausing ? 'Duraklatılıyor...' : 'Duraklat'}
          </>
        )}
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/cron-jobs/${cronJob.id}/edit`}>
          <Settings className="mr-2 h-4 w-4" />
          Yapılandır
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
        {deleting ? 'Siliniyor...' : 'Sil'}
      </Button>
    </div>
  );
}
