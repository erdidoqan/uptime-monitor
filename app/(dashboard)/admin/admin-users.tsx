'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Monitor,
  Timer,
  Globe,
  Zap,
  ChevronRight,
  ChevronLeft,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminUserDetail } from './admin-user-detail';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  created_at: number;
  monitor_count: number;
  cron_count: number;
  status_page_count: number;
  load_test_count: number;
  subscription_status: string | null;
  subscription_plan: string | null;
  is_banned: number;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function UsersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    api
      .get<{ users: AdminUser[] }>('/admin/users')
      .then((res) => setUsers(res.users))
      .catch((err) => console.error('Failed to fetch users:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;
    const d = new Date(u.created_at);
    const now = new Date();
    if (dateFilter === 'today') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    // yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    );
  });

  if (selectedUserId) {
    return (
      <AdminUserDetail
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kullanıcı ara (e-posta, isim)..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border text-xs">
          {([['all', 'Tümü'], ['today', 'Bugün'], ['yesterday', 'Dün']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setDateFilter(value); setPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                dateFilter === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} / {users.length} kullanıcı
          </span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <UsersSkeleton />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search ? 'Aramayla eşleşen kullanıcı bulunamadı.' : 'Henüz kullanıcı yok.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice((page - 1) * perPage, page * perPage).map((user) => (
            <Card
              key={user.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedUserId(user.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {user.name || user.email}
                      </span>
                      {user.subscription_status === 'active' && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                          <Crown className="h-3 w-3" />
                          {user.subscription_plan === 'pro' ? 'Pro' : user.subscription_plan}
                        </Badge>
                      )}
                      {!!user.is_banned && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                          Banlı
                        </Badge>
                      )}
                    </div>
                    {user.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Kayıt: {formatDate(user.created_at)}
                    </p>
                  </div>

                  {/* Resource counts - hidden on mobile, shown on sm+ */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {user.monitor_count > 0 && (
                      <span className="flex items-center gap-1" title="Monitör">
                        <Monitor className="h-3.5 w-3.5" />
                        {user.monitor_count}
                      </span>
                    )}
                    {user.cron_count > 0 && (
                      <span className="flex items-center gap-1" title="Cron Job">
                        <Timer className="h-3.5 w-3.5" />
                        {user.cron_count}
                      </span>
                    )}
                    {user.status_page_count > 0 && (
                      <span className="flex items-center gap-1" title="Status Page">
                        <Globe className="h-3.5 w-3.5" />
                        {user.status_page_count}
                      </span>
                    )}
                    {user.load_test_count > 0 && (
                      <span className="flex items-center gap-1" title="Yük Testi">
                        <Zap className="h-3.5 w-3.5" />
                        {user.load_test_count}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                {/* Resource counts - mobile only */}
                <div className="flex sm:hidden items-center gap-3 text-xs text-muted-foreground mt-2 ml-[52px]">
                  {user.monitor_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3.5 w-3.5" />
                      {user.monitor_count}
                    </span>
                  )}
                  {user.cron_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      {user.cron_count}
                    </span>
                  )}
                  {user.status_page_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {user.status_page_count}
                    </span>
                  )}
                  {user.load_test_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      {user.load_test_count}
                    </span>
                  )}
                  {user.monitor_count + user.cron_count + user.status_page_count + user.load_test_count === 0 && (
                    <span className="text-muted-foreground/60">Kaynak yok</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {filtered.length > perPage && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} / {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {Math.ceil(filtered.length / perPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(filtered.length / perPage)}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
