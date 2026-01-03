'use client';

import { Calendar } from 'lucide-react';
import { StatusHeader } from '../status-header';
import { StatusFooter } from '../status-footer';
import { Card, CardContent } from '@/components/ui/card';

interface StatusPageBasic {
  id: string;
  companyName: string;
  subdomain: string;
  customDomain: string | null;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  contactUrl: string | null;
}

interface MaintenanceContentProps {
  statusPage: StatusPageBasic;
  subdomain: string;
}

export function MaintenanceContent({ statusPage, subdomain }: MaintenanceContentProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <StatusHeader
        companyName={statusPage.companyName}
        subdomain={subdomain}
        logoUrl={statusPage.logoUrl}
        logoLinkUrl={statusPage.logoLinkUrl}
        contactUrl={statusPage.contactUrl}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Scheduled Maintenance
        </h1>

        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No scheduled maintenance
              </h2>
              <p className="text-muted-foreground max-w-md">
                There are no upcoming maintenance windows scheduled at this time. 
                Check back later for any planned maintenance activities.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <StatusFooter />
    </div>
  );
}















