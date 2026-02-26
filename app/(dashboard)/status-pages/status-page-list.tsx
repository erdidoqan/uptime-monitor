'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Globe, Plus, MoreVertical, Search, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api-client';
import type { StatusPage } from '@/shared/types';

interface StatusPageListProps {
  initialStatusPages: StatusPage[];
}

export function StatusPageList({ initialStatusPages }: StatusPageListProps) {
  const [statusPages, setStatusPages] = useState(initialStatusPages);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusPageToDelete, setStatusPageToDelete] = useState<StatusPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredStatusPages = useMemo(() => {
    if (!searchQuery) {
      return statusPages;
    }
    return statusPages.filter(sp =>
      sp.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sp.custom_domain && sp.custom_domain.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [statusPages, searchQuery]);

  const handleDelete = async () => {
    if (!statusPageToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/status-pages/${statusPageToDelete.id}`);
      setStatusPages(prev => prev.filter(sp => sp.id !== statusPageToDelete.id));
      setDeleteDialogOpen(false);
      setStatusPageToDelete(null);
    } catch (error) {
      console.error('Failed to delete status page:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusPageUrl = (statusPage: StatusPage) => {
    if (statusPage.custom_domain) {
      return `https://${statusPage.custom_domain}`;
    }
    return `https://${statusPage.subdomain}.uptimetr.com`;
  };

  return (
    <>
      {/* Search input */}
      <div className="mb-4">
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
      </div>

      {filteredStatusPages.length === 0 ? (
        <Card className="border">
          <CardContent className="pt-8 text-center py-16">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Henüz durum sayfası yok</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Kullanıcılarınızı hizmetleriniz hakkında bilgilendirmek için ilk durum sayfanızı oluşturun
            </p>
            <Button size="sm" asChild>
              <Link href="/status-pages/create">
                <Plus className="mr-2 h-4 w-4" />
                Durum Sayfası Oluştur
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {filteredStatusPages.map((statusPage) => {
                const pageUrl = getStatusPageUrl(statusPage);
                return (
                  <Link
                    key={statusPage.id}
                    href={`/status-pages/${statusPage.id}/edit`}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-muted/40 transition-colors group"
                  >
                    {/* Status Indicator */}
                    {statusPage.is_active === 1 ? (
                      <div className="status-indicator status-indicator--success flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                        <div className="circle circle--animated circle-main"></div>
                        <div className="circle circle--animated circle-secondary"></div>
                        <div className="circle circle--animated circle-tertiary"></div>
                      </div>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                    )}
                    
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {statusPage.company_name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(pageUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="truncate">
                          {statusPage.custom_domain || `${statusPage.subdomain}.uptimetr.com`}
                        </span>
                        {statusPage.is_active === 0 && (
                          <span className="text-yellow-600 font-medium">Pasif</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/status-pages/${statusPage.id}/edit`}>Düzenle</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                              Önizle
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              setStatusPageToDelete(statusPage);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Durum Sayfasını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{statusPageToDelete?.company_name}&quot; sayfasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
