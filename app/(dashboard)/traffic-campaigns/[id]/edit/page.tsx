import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { CampaignEditForm } from './campaign-edit-form';

interface TrafficCampaign {
  id: string;
  user_id: string;
  name: string;
  url: string;
  daily_visitors: number;
  browsers_per_run: number;
  tabs_per_browser: number;
  traffic_source: 'direct' | 'organic' | 'social';
  session_duration: 'fast' | 'realistic' | 'long';
  use_proxy: number;
  start_hour: number;
  end_hour: number;
  is_active: number;
  next_run_at: number | null;
  locked_at: number | null;
  last_run_at: number | null;
  last_status: string | null;
  total_runs: number;
  total_visits_sent: number;
  created_at: number;
  updated_at: number | null;
  url_pool: string[] | null;
  url_pool_updated_at: number | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCampaignData(campaignId: string): Promise<TrafficCampaign> {
  try {
    const campaign = await serverApi.get<TrafficCampaign>(`/traffic-campaigns/${campaignId}`);
    return campaign;
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

async function CampaignEditFormWrapper({ campaignId }: { campaignId: string }) {
  const campaign = await getCampaignData(campaignId);
  return <CampaignEditForm campaign={campaign} />;
}

export default async function EditCampaignPage({ params }: PageProps) {
  const { id } = await params;
  const campaignId = typeof id === 'string' ? id : id?.[0] || '';

  if (!campaignId) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <div className="text-sm text-muted-foreground">Kampanya ID gerekli</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-6">
        <Link href={`/traffic-campaigns/${campaignId}`} className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Kampanya detayları
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Düzenle</span>
      </div>

      <Suspense fallback={<FormSkeleton />}>
        <CampaignEditFormWrapper campaignId={campaignId} />
      </Suspense>
    </div>
  );
}
