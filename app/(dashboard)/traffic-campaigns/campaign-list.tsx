'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, MoreVertical, ExternalLink, Clock, Globe, Megaphone, Pause, Play, Trash2, Users, Timer, Crown } from 'lucide-react';

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

function getFaviconUrl(url: string, size: number = 32): string | null {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

function getHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function formatRelativeTime(timestamp: number | null, currentTime: number): string {
  if (!timestamp) return 'Hiç';

  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Az önce';
  if (minutes < 60) return `${minutes}dk önce`;
  if (hours < 24) return `${hours}sa önce`;
  return `${days}g önce`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const trafficSourceLabels: Record<string, string> = {
  organic: 'Organik',
  direct: 'Doğrudan',
  social: 'Sosyal',
};

const trafficSourceColors: Record<string, string> = {
  organic: 'bg-green-500/10 text-green-600 border-green-500/20',
  direct: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  social: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

const POLAR_CHECKOUT_URL =
  'https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o';

async function openPolarCheckout() {
  try {
    const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed');
    await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: 'dark' });
  } catch {
    window.open(POLAR_CHECKOUT_URL, '_blank');
  }
}

interface CampaignListProps {
  initialCampaigns: TrafficCampaign[];
  isPro?: boolean;
  limits?: {
    maxCampaigns: number;
    maxDailyVisitors: number;
  };
}

export function CampaignList({ initialCampaigns, isPro = false, limits }: CampaignListProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.url.toLowerCase().includes(q)
    );
  }, [campaigns, searchQuery]);

  const handleToggleActive = async (e: React.MouseEvent, campaign: TrafficCampaign) => {
    e.preventDefault();
    e.stopPropagation();
    setTogglingId(campaign.id);
    try {
      const newIsActive = campaign.is_active === 1 ? 0 : 1;
      await api.put(`/traffic-campaigns/${campaign.id}`, { is_active: newIsActive });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, is_active: newIsActive } : c))
      );
    } catch (error) {
      console.error('Failed to toggle campaign:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/traffic-campaigns/${campaignToDelete}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete));
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIndicator = (campaign: TrafficCampaign) => {
    if (campaign.is_active === 0) {
      return <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />;
    }
    if (campaign.last_run_at) {
      return (
        <div className="status-indicator status-indicator--success flex-shrink-0" style={{ width: '12px', height: '12px' }}>
          <div className="circle circle--animated circle-main"></div>
          <div className="circle circle--animated circle-secondary"></div>
          <div className="circle circle--animated circle-tertiary"></div>
        </div>
      );
    }
    return <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />;
  };

  const getStatusText = (campaign: TrafficCampaign) => {
    if (campaign.is_active === 0) {
      return <span className="text-yellow-600 font-medium">Duraklatıldı</span>;
    }
    if (campaign.last_run_at) {
      return <span className="text-green-600 font-medium">Aktif</span>;
    }
    return <span className="text-muted-foreground font-medium">Hiç çalışmadı</span>;
  };

  const maxCampaigns = limits?.maxCampaigns ?? (isPro ? 999 : 1);
  const canCreate = campaigns.length < maxCampaigns;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ara"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 w-[180px] h-9 text-sm"
          />
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">/</span>
        </div>
        {canCreate ? (
          <Button size="sm" asChild>
            <Link href="/traffic-campaigns/create">
              <Plus className="mr-2 h-4 w-4" />
              Kampanya Oluştur
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            type="button"
            onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 cursor-pointer"
          >
            <Crown className="mr-2 h-4 w-4" />
            Pro&apos;ya Geç — Sınırsız Kampanya
          </Button>
        )}
      </div>

      {filteredCampaigns.length === 0 ? (
        <Card className="border">
          <CardContent className="pt-8 text-center py-16">
            <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Henüz kampanya yok</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Web sitenize trafik göndermek için ilk kampanyanızı oluşturun
            </p>
            <Button size="sm" asChild>
              <Link href="/traffic-campaigns/create">
                <Plus className="mr-2 h-4 w-4" />
                Kampanya Oluştur
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {filteredCampaigns.map((campaign) => {
                const faviconUrl = getFaviconUrl(campaign.url);
                const hostname = getHostname(campaign.url);
                return (
                  <TooltipProvider key={campaign.id}>
                    <Link
                      href={`/traffic-campaigns/${campaign.id}`}
                      className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
                    >
                      {getStatusIndicator(campaign)}

                      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {faviconUrl ? (
                          <Image
                            src={faviconUrl}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6"
                            unoptimized
                          />
                        ) : (
                          <Globe className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {campaign.name}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(campaign.url, '_blank', 'noopener,noreferrer');
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{hostname}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="truncate max-w-[180px]">{hostname}</span>
                          {getStatusText(campaign)}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${trafficSourceColors[campaign.traffic_source] || ''}`}>
                            {trafficSourceLabels[campaign.traffic_source] || campaign.traffic_source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {campaign.daily_visitors}/gün
                          </span>
                          {campaign.last_run_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(campaign.last_run_at, currentTime)}
                            </span>
                          )}
                          {campaign.total_visits_sent > 0 && (
                            <span>{formatNumber(campaign.total_visits_sent)} ziyaret</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {String(campaign.start_hour).padStart(2, '0')}-{String(campaign.end_hour).padStart(2, '0')}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/traffic-campaigns/${campaign.id}`}>Detay</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/traffic-campaigns/${campaign.id}/edit`}>Düzenle</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={togglingId === campaign.id}
                              onClick={(e) => handleToggleActive(e, campaign)}
                            >
                              {campaign.is_active === 1 ? (
                                <><Pause className="w-3.5 h-3.5 mr-2" />Durdur</>
                              ) : (
                                <><Play className="w-3.5 h-3.5 mr-2" />Başlat</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCampaignToDelete(campaign.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Link>
                  </TooltipProvider>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampanyayı Sil</DialogTitle>
            <DialogDescription>
              Bu kampanyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCampaignToDelete(null);
              }}
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
