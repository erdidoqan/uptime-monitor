'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export function StatusUpdatesTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-2">Durum güncellemeleri</h2>
        <p className="text-sm text-muted-foreground">
          Kullanıcılarınızı devam eden olaylar veya bakım hakkında bilgilendirmek için durum güncellemeleri yayınlayın.
        </p>
      </div>

      <div className="lg:col-span-2">
        <Card className="border">
          <CardContent className="px-6 py-12 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Durum güncellemeleri yakında</h3>
            <p className="text-xs text-muted-foreground">
              Bu özellik şu anda geliştirme aşamasında.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
