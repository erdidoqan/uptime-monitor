'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Languages } from 'lucide-react';

export function TranslationsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-2">Translations</h2>
        <p className="text-sm text-muted-foreground">
          Translate your status page to multiple languages.
        </p>
      </div>

      <div className="lg:col-span-2">
        <Card className="border">
          <CardContent className="px-6 py-12 text-center">
            <Languages className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-semibold mb-1">Translations coming soon</h3>
            <p className="text-xs text-muted-foreground">
              This feature is currently under development.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


















