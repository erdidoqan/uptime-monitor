'use client';

import { CheckCircle2, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusBannerProps {
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  isRefreshing?: boolean;
}

const statusConfig = {
  operational: {
    icon: CheckCircle2,
    title: 'Tüm servisler çalışıyor',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderClass: 'border-emerald-200 dark:border-emerald-900',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    textClass: 'text-emerald-900 dark:text-emerald-100',
  },
  degraded: {
    icon: AlertCircle,
    title: 'Bazı servislerin performansı düşük',
    bgClass: 'bg-amber-50 dark:bg-amber-950/50',
    borderClass: 'border-amber-200 dark:border-amber-900',
    iconClass: 'text-amber-600 dark:text-amber-400',
    textClass: 'text-amber-900 dark:text-amber-100',
  },
  partial_outage: {
    icon: AlertTriangle,
    title: 'Kısmi sistem kesintisi',
    bgClass: 'bg-orange-50 dark:bg-orange-950/50',
    borderClass: 'border-orange-200 dark:border-orange-900',
    iconClass: 'text-orange-600 dark:text-orange-400',
    textClass: 'text-orange-900 dark:text-orange-100',
  },
  major_outage: {
    icon: XCircle,
    title: 'Büyük sistem kesintisi',
    bgClass: 'bg-red-50 dark:bg-red-950/50',
    borderClass: 'border-red-200 dark:border-red-900',
    iconClass: 'text-red-600 dark:text-red-400',
    textClass: 'text-red-900 dark:text-red-100',
  },
};

export function StatusBanner({ status, isRefreshing }: StatusBannerProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        'p-5 sm:p-6 border',
        config.bgClass,
        config.borderClass
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0', config.iconClass)} aria-hidden="true" />
        <span className={cn('text-lg sm:text-xl font-semibold', config.textClass)} role="status">
          {config.title}
        </span>
        {isRefreshing && (
          <div className="ml-auto">
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block opacity-50" />
          </div>
        )}
      </div>
    </Card>
  );
}
