'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pause, Play, Settings, Trash2 } from 'lucide-react';

interface TrafficCampaign {
  id: string;
  name: string;
  is_active: number;
}

interface CampaignActionsProps {
  campaign: TrafficCampaign;
}

export function CampaignActions({ campaign }: CampaignActionsProps) {
  const router = useRouter();
  const [pausing, setPausing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePauseToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    setPausing(true);
    try {
      const newIsActive = campaign.is_active === 1 ? 0 : 1;
      await api.put(`/traffic-campaigns/${campaign.id}`, { is_active: newIsActive });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle campaign:', error);
    } finally {
      setPausing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/traffic-campaigns/${campaign.id}`);
      router.push('/traffic-campaigns');
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePauseToggle}
          disabled={pausing}
        >
          {campaign.is_active === 0 ? (
            <>
              <Play className="mr-2 h-4 w-4" />
              {pausing ? 'Başlatılıyor...' : 'Başlat'}
            </>
          ) : (
            <>
              <Pause className="mr-2 h-4 w-4" />
              {pausing ? 'Durduruluyor...' : 'Durdur'}
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/traffic-campaigns/${campaign.id}/edit`}>
            <Settings className="mr-2 h-4 w-4" />
            Düzenle
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={(event) => {
            event.preventDefault();
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Sil
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampanyayı Sil</DialogTitle>
            <DialogDescription>
              &quot;{campaign.name}&quot; kampanyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
