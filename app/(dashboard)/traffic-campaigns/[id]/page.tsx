import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { CampaignHeader } from './campaign-header';
import { CampaignStats } from './campaign-stats';
import { CampaignActions } from './campaign-actions';
import { CampaignUrls } from './campaign-urls';

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

function HeaderSkeleton() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-4 w-64 mb-5" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
  );
}

function ActionsSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-20" />
    </div>
  );
}

async function CampaignHeaderData({ campaignId }: { campaignId: string }) {
  const campaign = await getCampaignData(campaignId);

  if (!campaign) {
    return (
      <Card className="border">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-sm text-muted-foreground">Kampanya bulunamadı</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/traffic-campaigns">Kampanyalara Dön</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <CampaignHeader campaign={campaign} />;
}

async function CampaignStatsData({ campaignId }: { campaignId: string }) {
  const campaign = await getCampaignData(campaignId);
  if (!campaign) return null;
  return <CampaignStats campaign={campaign} />;
}

async function CampaignUrlsData({ campaignId }: { campaignId: string }) {
  const campaign = await getCampaignData(campaignId);
  if (!campaign) return null;
  return <CampaignUrls urlPool={campaign.url_pool} mainUrl={campaign.url} />;
}

async function CampaignActionsData({ campaignId }: { campaignId: string }) {
  const campaign = await getCampaignData(campaignId);
  if (!campaign) return null;
  return <CampaignActions campaign={campaign} />;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const campaignId = typeof id === 'string' ? id : id?.[0] || '';

  if (!campaignId) {
    return (
      <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
        <Card className="border">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-sm text-muted-foreground">Kampanya ID gerekli</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/traffic-campaigns">Kampanyalara Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/traffic-campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kampanyalara Dön
          </Link>
        </Button>
      </div>

      <Suspense fallback={<HeaderSkeleton />}>
        <CampaignHeaderData campaignId={campaignId} />
      </Suspense>

      <Suspense fallback={<ActionsSkeleton />}>
        <CampaignActionsData campaignId={campaignId} />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <CampaignStatsData campaignId={campaignId} />
      </Suspense>

      <Suspense fallback={null}>
        <CampaignUrlsData campaignId={campaignId} />
      </Suspense>
    </div>
  );
}
