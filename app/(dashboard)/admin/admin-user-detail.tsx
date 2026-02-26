'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Monitor,
  Timer,
  Globe,
  Zap,
  ExternalLink,
  Crown,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldBan,
  ShieldCheck,
} from 'lucide-react';

interface UserDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    created_at: number;
    is_banned: number;
  };
  monitors: {
    id: string;
    name: string | null;
    url: string;
    method: string;
    is_active: number;
    last_status: string | null;
    last_checked_at: number | null;
    created_at: number;
  }[];
  cronJobs: {
    id: string;
    name: string | null;
    url: string;
    method: string;
    cron_expr: string | null;
    is_active: number;
    last_status: string | null;
    last_run_at: number | null;
    created_at: number;
  }[];
  statusPages: {
    id: string;
    company_name: string;
    subdomain: string;
    custom_domain: string | null;
    is_active: number;
    created_at: number;
  }[];
  loadTests: {
    id: string;
    url: string;
    target_url: string;
    target_concurrent_users: number;
    total_sent: number;
    total_ok: number;
    total_errors: number;
    duration_sec: number;
    p95: number | null;
    status: string;
    stopped_reason: string | null;
    created_at: number;
  }[];
  subscription: {
    status: string;
    plan: string | null;
    current_period_end: number | null;
  } | null;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(ts: number) {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function StatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />;
  const isUp = status === 'up' || status === '200' || parseInt(status) >= 200 && parseInt(status) < 400;
  return (
    <span
      className={`h-2 w-2 rounded-full shrink-0 ${isUp ? 'bg-green-500' : 'bg-red-500'}`}
    />
  );
}

function UrlLink({ url }: { url: string }) {
  let display = url;
  try {
    const u = new URL(url);
    display = u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    // keep raw
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline truncate max-w-[260px] sm:max-w-none"
      title={url}
    >
      <span className="truncate">{display}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminUserDetail({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => {
    api
      .get<UserDetail>(`/admin/users/${userId}`)
      .then(setData)
      .catch((err) => console.error('Failed to fetch user detail:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleBan = async () => {
    if (!data) return;
    const newBanState = data.user.is_banned ? 0 : 1;
    setBanLoading(true);
    try {
      await api.patch(`/admin/users/${userId}`, { is_banned: newBanState });
      setData((prev) =>
        prev ? { ...prev, user: { ...prev.user, is_banned: newBanState } } : prev
      );
    } catch (err) {
      console.error('Failed to toggle ban:', err);
    } finally {
      setBanLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 -ml-2 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Geri
      </Button>

      {loading || !data ? (
        <DetailSkeleton />
      ) : (
        <>
          {/* User header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {data.user.image ? (
                  <img
                    src={data.user.image}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-medium shrink-0">
                    {data.user.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-base">
                      {data.user.name || data.user.email}
                    </h2>
                    {data.subscription?.status === 'active' && (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Crown className="h-3 w-3" />
                        {data.subscription.plan === 'pro' ? 'Pro' : data.subscription.plan}
                      </Badge>
                    )}
                    {!!data.user.is_banned && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <ShieldBan className="h-3 w-3" />
                        Banlı
                      </Badge>
                    )}
                  </div>
                  {data.user.name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {data.user.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kayıt: {formatDate(data.user.created_at)}
                    {data.subscription?.current_period_end && (
                      <> · Abonelik: {formatDateShort(data.subscription.current_period_end)}&apos;e kadar</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  variant={data.user.is_banned ? 'outline' : 'destructive'}
                  size="sm"
                  onClick={toggleBan}
                  disabled={banLoading}
                  className="gap-1.5 cursor-pointer"
                >
                  {data.user.is_banned ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Banı Kaldır
                    </>
                  ) : (
                    <>
                      <ShieldBan className="h-3.5 w-3.5" />
                      Banla
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Monitors */}
          <Card className="gap-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium">
              <Monitor className="h-4 w-4" />
              Monitörler
              <Badge variant="secondary" className="text-xs ml-auto">{data.monitors.length}</Badge>
            </div>
            <div className="px-4 py-3">
              {data.monitors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Monitör yok</p>
              ) : (
                <div className="divide-y">
                  {data.monitors.map((m) => (
                    <div key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={m.last_status} />
                        <span className="text-sm font-medium truncate">{m.name || m.url}</span>
                        {!m.is_active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pasif</Badge>
                        )}
                      </div>
                      <div className="ml-4 mt-0.5"><UrlLink url={m.url} /></div>
                      <p className="text-xs text-muted-foreground ml-4 mt-0.5">
                        {m.method} · {formatDateShort(m.created_at)}
                        {m.last_checked_at && ` · Son kontrol: ${formatDate(m.last_checked_at)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Cron Jobs */}
          <Card className="gap-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium">
              <Timer className="h-4 w-4" />
              Cron Job&apos;lar
              <Badge variant="secondary" className="text-xs ml-auto">{data.cronJobs.length}</Badge>
            </div>
            <div className="px-4 py-3">
              {data.cronJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cron job yok</p>
              ) : (
                <div className="divide-y">
                  {data.cronJobs.map((c) => (
                    <div key={c.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={c.last_status} />
                        <span className="text-sm font-medium truncate">{c.name || c.url}</span>
                        {!c.is_active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pasif</Badge>
                        )}
                      </div>
                      <div className="ml-4 mt-0.5"><UrlLink url={c.url} /></div>
                      <p className="text-xs text-muted-foreground ml-4 mt-0.5">
                        {c.method}{c.cron_expr && ` · ${c.cron_expr}`}{' · '}{formatDateShort(c.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Status Pages */}
          <Card className="gap-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium">
              <Globe className="h-4 w-4" />
              Durum Sayfaları
              <Badge variant="secondary" className="text-xs ml-auto">{data.statusPages.length}</Badge>
            </div>
            <div className="px-4 py-3">
              {data.statusPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Durum sayfası yok</p>
              ) : (
                <div className="divide-y">
                  {data.statusPages.map((sp) => (
                    <div key={sp.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{sp.company_name}</span>
                        {!sp.is_active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pasif</Badge>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <a
                          href={`https://${sp.subdomain}.uptimetr.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {sp.subdomain}.uptimetr.com
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {sp.custom_domain && (
                          <span className="text-xs text-muted-foreground ml-2">({sp.custom_domain})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateShort(sp.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Load Tests */}
          <Card className="gap-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium">
              <Zap className="h-4 w-4" />
              Yük Testleri
              <Badge variant="secondary" className="text-xs ml-auto">{data.loadTests.length}</Badge>
            </div>
            <div className="px-4 py-3">
              {data.loadTests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Yük testi yok</p>
              ) : (
                <div className="divide-y">
                  {data.loadTests.map((lt) => {
                    const errorRate =
                      lt.total_sent > 0
                        ? ((lt.total_errors / lt.total_sent) * 100).toFixed(1)
                        : '0';
                    const isGood = parseFloat(errorRate) < 10;
                    return (
                      <div key={lt.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {lt.status === 'completed' ? (
                            isGood ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            )
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <UrlLink url={lt.target_url || lt.url} />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1 ml-6">
                          <span>{lt.target_concurrent_users} eşzamanlı</span>
                          <span>{lt.total_sent} istek</span>
                          <span>Hata: {errorRate}%</span>
                          {lt.p95 && <span>p95: {lt.p95}ms</span>}
                          {lt.stopped_reason && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {lt.stopped_reason === 'smart_stop' ? 'Otomatik durdurma' : lt.stopped_reason}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 ml-6">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(lt.created_at)}
                            {lt.duration_sec > 0 && ` · ${Math.round(lt.duration_sec)}s`}
                          </p>
                          <a
                            href={`/load-test/${lt.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            Testi incele
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
