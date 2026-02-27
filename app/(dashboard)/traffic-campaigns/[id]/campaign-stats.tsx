'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Zap, Target, Clock, Globe, Timer, CalendarClock, CalendarCheck } from 'lucide-react';

interface TrafficCampaign {
  id: string;
  name: string;
  url: string;
  daily_visitors: number;
  browsers_per_run: number;
  tabs_per_browser: number;
  traffic_source: 'direct' | 'organic' | 'social';
  session_duration: 'fast' | 'realistic' | 'long';
  start_hour: number;
  end_hour: number;
  is_active: number;
  next_run_at: number | null;
  last_run_at: number | null;
  total_runs: number;
  total_visits_sent: number;
  created_at: number;
}

interface CampaignStatsProps {
  campaign: TrafficCampaign;
}

const trafficSourceLabels: Record<string, string> = {
  organic: 'Organik',
  direct: 'Doğrudan',
  social: 'Sosyal',
};

const sessionDurationLabels: Record<string, string> = {
  fast: 'Hızlı (~2s)',
  realistic: 'Gerçekçi (~15s)',
  long: 'Uzun (~30s)',
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatRelativeTime(timestamp: number | null, currentTime: number): string {
  if (!timestamp) return 'Hiçbir zaman';

  const diff = currentTime - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function formatFutureTime(timestamp: number | null, currentTime: number): string {
  if (!timestamp) return 'Planlanmadı';

  const diff = timestamp - currentTime;
  if (diff <= 0) return 'Şimdi';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Birkaç saniye içinde';
  if (minutes < 60) return `${minutes} dakika sonra`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat sonra`;
  const days = Math.floor(hours / 24);
  return `${days} gün sonra`;
}

export function CampaignStats({ campaign }: CampaignStatsProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      title: 'Toplam Gönderilen',
      value: formatNumber(campaign.total_visits_sent),
      subtitle: 'ziyaret',
      icon: Users,
    },
    {
      title: 'Toplam Çalıştırma',
      value: campaign.total_runs.toString(),
      subtitle: 'çalıştırma',
      icon: Zap,
    },
    {
      title: 'Günlük Hedef',
      value: `${campaign.daily_visitors}`,
      subtitle: 'ziyaretçi/gün',
      icon: Target,
    },
    {
      title: 'Çalışma Saatleri',
      value: `${String(campaign.start_hour).padStart(2, '0')}:00 - ${String(campaign.end_hour).padStart(2, '0')}:00`,
      subtitle: '',
      icon: Clock,
    },
    {
      title: 'Trafik Kaynağı',
      value: trafficSourceLabels[campaign.traffic_source] || campaign.traffic_source,
      subtitle: '',
      icon: Globe,
    },
    {
      title: 'Oturum Süresi',
      value: sessionDurationLabels[campaign.session_duration] || campaign.session_duration,
      subtitle: '',
      icon: Timer,
    },
    {
      title: 'Son Çalıştırma',
      value: formatRelativeTime(campaign.last_run_at, currentTime),
      subtitle: '',
      icon: CalendarCheck,
    },
    {
      title: 'Sonraki Çalıştırma',
      value: campaign.is_active === 0
        ? 'Duraklatıldı'
        : formatFutureTime(campaign.next_run_at, currentTime),
      subtitle: '',
      icon: CalendarClock,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border gap-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="text-lg font-semibold text-foreground">{stat.value}</div>
            {stat.subtitle && (
              <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
