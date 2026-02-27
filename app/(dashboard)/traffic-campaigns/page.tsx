import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { CampaignList } from './campaign-list';

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
}

interface CampaignsResponse {
  campaigns: TrafficCampaign[];
  isPro: boolean;
  limits: {
    maxCampaigns: number;
    maxDailyVisitors: number;
  };
}

async function getCampaignsData(): Promise<CampaignsResponse> {
  try {
    const data = await serverApi.get<CampaignsResponse>('/traffic-campaigns');
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    console.error('Failed to load campaigns:', error);
    return { campaigns: [], isPro: false, limits: { maxCampaigns: 1, maxDailyVisitors: 50 } };
  }
}

function CampaignListSkeleton() {
  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Skeleton className="h-9 w-[180px] rounded-md" />
        </div>
      </div>

      <Card className="border">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-5 animate-pulse">
                <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-3.5 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

async function CampaignsListWrapper() {
  const { campaigns, isPro, limits } = await getCampaignsData();
  return <CampaignList initialCampaigns={campaigns} isPro={isPro} limits={limits} />;
}

export default function TrafficCampaignsPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Trafik Kampanyaları</h1>
      </div>

      <Suspense fallback={<CampaignListSkeleton />}>
        <CampaignsListWrapper />
      </Suspense>
    </div>
  );
}
