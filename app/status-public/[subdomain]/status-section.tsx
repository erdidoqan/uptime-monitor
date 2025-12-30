'use client';

import { useState } from 'react';
import { ChevronRight, CheckCircle2, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusResource } from './status-resource';
import { cn } from '@/lib/utils';

interface UptimeDay {
  date: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptimePercentage: number;
  downtimeMinutes: number;
}

interface Resource {
  id: string;
  type: string;
  name: string;
  url: string | null;
  status: string;
  lastCheckedAt: number | null;
  showHistory: boolean;
  uptimeHistory: UptimeDay[];
  uptimePercentage: number | null;
}

interface StatusSectionProps {
  section: {
    id: string;
    name: string | null;
    status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
    resources: Resource[];
  };
  defaultExpanded?: boolean;
}

const statusConfig = {
  operational: {
    label: 'Operational',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
  },
  partial_outage: {
    label: 'Partial Outage',
    icon: AlertTriangle,
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
  },
  major_outage: {
    label: 'Major Outage',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
  },
};

export function StatusSection({ section, defaultExpanded = false }: StatusSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (section.resources.length === 0) {
    return null;
  }

  const config = statusConfig[section.status] || statusConfig.operational;
  const StatusIcon = config.icon;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Section Header - Clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4 transition-colors cursor-pointer',
          isExpanded 
            ? 'bg-muted/30' 
            : 'hover:bg-muted/20'
        )}
      >
        {/* Section Name */}
        <span className="font-semibold text-foreground text-[15px]">
          {section.name || 'Services'}
        </span>
        
        {/* Right side: Badge + Chevron */}
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn('gap-1.5 font-medium px-2.5 py-1', config.className)}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {config.label}
          </Badge>
          <ChevronRight
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </div>
      </button>

      {/* Section Content - Resources */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t border-border/40">
          {section.resources.map((resource, index) => (
            <div 
              key={resource.id}
              className={cn(
                index > 0 && 'border-t border-border/30'
              )}
            >
              <StatusResource resource={resource} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
