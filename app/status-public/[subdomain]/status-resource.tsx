'use client';

import { Globe, Timer, CheckCircle2, XCircle, AlertCircle, Wrench, HelpCircle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UptimeBar, UptimePercentage } from './uptime-bar';

interface UptimeDay {
  date: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptimePercentage: number;
  downtimeMinutes: number;
}

interface StatusResourceProps {
  resource: {
    id: string;
    type: string;
    name: string;
    url: string | null;
    status: string;
    lastCheckedAt: number | null;
    showHistory: boolean;
    uptimeHistory: UptimeDay[];
    uptimePercentage: number | null;
  };
}

const statusConfig: Record<string, { 
  label: string; 
  icon: typeof CheckCircle2; 
  colorClass: string;
}> = {
  up: {
    label: 'Operational',
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  down: {
    label: 'Down',
    icon: XCircle,
    colorClass: 'text-red-600 dark:text-red-400',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertCircle,
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    colorClass: 'text-blue-600 dark:text-blue-400',
  },
  unknown: {
    label: 'Unknown',
    icon: HelpCircle,
    colorClass: 'text-gray-500 dark:text-gray-400',
  },
};

export function StatusResource({ resource }: StatusResourceProps) {
  const config = statusConfig[resource.status] || statusConfig.unknown;
  const StatusIcon = config.icon;
  const TypeIcon = resource.type === 'monitor' ? Globe : Timer;

  return (
    <div className="p-4 sm:p-5">
      {/* Resource Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Status icon */}
          <StatusIcon className={`h-5 w-5 ${config.colorClass}`} />
          
          {/* Name */}
          <span className="font-medium text-foreground">
            {resource.name}
          </span>
          
          {/* Info tooltip */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-3.5 w-3.5" />
                    <span className="text-xs text-muted-foreground">
                      {resource.type === 'monitor' ? 'HTTP Monitor' : 'Cron Job'}
                    </span>
                  </div>
                  {resource.url && (
                    <div className="text-xs text-muted-foreground truncate">
                      {resource.url}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Uptime percentage */}
        <UptimePercentage percentage={resource.uptimePercentage} />
      </div>

      {/* Uptime bar */}
      {resource.showHistory && resource.uptimeHistory.length > 0 && (
        <UptimeBar history={resource.uptimeHistory} className="mt-2" />
      )}
    </div>
  );
}
