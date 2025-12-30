'use client';

import { useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UptimeDay {
  date: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptimePercentage: number;
  downtimeMinutes: number;
}

interface UptimeBarProps {
  history: UptimeDay[];
  className?: string;
}

export function UptimeBar({ history, className = '' }: UptimeBarProps) {
  // Format date for tooltip
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get color based on status
  const getBarColor = (day: UptimeDay) => {
    switch (day.status) {
      case 'up':
        return 'bg-emerald-500 dark:bg-emerald-400';
      case 'degraded':
        return 'bg-amber-500 dark:bg-amber-400';
      case 'down':
        return 'bg-red-500 dark:bg-red-400';
      case 'unknown':
      default:
        return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  // Get tooltip content
  const getTooltipContent = (day: UptimeDay) => {
    const formattedDate = formatDate(day.date);
    
    if (day.status === 'unknown') {
      return (
        <div className="text-center">
          <div className="font-medium">{formattedDate}</div>
          <div className="text-muted-foreground text-xs">Not monitored</div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="font-medium">{formattedDate}</div>
        <div className="text-xs">
          {day.uptimePercentage.toFixed(2)}% uptime
        </div>
        {day.downtimeMinutes > 0 && (
          <div className="text-red-400 text-xs">
            Down for {formatDowntime(day.downtimeMinutes)}
          </div>
        )}
      </div>
    );
  };

  const formatDowntime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Calculate days label
  const daysLabel = useMemo(() => {
    const firstDate = history[0]?.date;
    const lastDate = history[history.length - 1]?.date;
    if (!firstDate || !lastDate) return { start: '90 days ago', end: 'Today' };
    
    const daysDiff = Math.ceil(
      (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      start: `${daysDiff} days ago`,
      end: 'Today',
    };
  }, [history]);

  return (
    <div className={className}>
      <TooltipProvider delayDuration={0}>
        <div className="flex gap-[2px] h-8">
          {history.map((day, index) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={`flex-1 min-w-[3px] max-w-[6px] rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${getBarColor(day)}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {getTooltipContent(day)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      
      {/* Time labels */}
      <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
        <span>{daysLabel.start}</span>
        <span>{daysLabel.end}</span>
      </div>
    </div>
  );
}

// Compact uptime percentage display
interface UptimePercentageProps {
  percentage: number | null;
  className?: string;
}

export function UptimePercentage({ percentage, className = '' }: UptimePercentageProps) {
  if (percentage === null) {
    return (
      <span className={`text-sm text-muted-foreground ${className}`}>
        N/A
      </span>
    );
  }

  const color = percentage >= 99.9 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : percentage >= 99 
    ? 'text-amber-600 dark:text-amber-400' 
    : 'text-red-600 dark:text-red-400';

  return (
    <span className={`text-sm font-medium ${color} ${className}`}>
      {percentage.toFixed(3)}% uptime
    </span>
  );
}














