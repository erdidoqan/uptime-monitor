'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MonitorCheck } from '@/shared/types';

interface TimePeriodStats {
  availability: number;
  downtime: string;
  incidents: number;
  longestIncident: string;
  avgIncident: string;
}

interface MonitorStatsProps {
  checks: MonitorCheck[];
}

export function MonitorStats({ checks }: MonitorStatsProps) {
  const calculateStats = (days: number): TimePeriodStats => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const periodChecks = checks.filter(c => c.ts >= cutoff);
    
    if (periodChecks.length === 0) {
      return {
        availability: 100,
        downtime: 'none',
        incidents: 0,
        longestIncident: 'none',
        avgIncident: 'none',
      };
    }

    const sortedChecks = [...periodChecks].sort((a, b) => a.ts - b.ts);
    const total = sortedChecks.length;
    const up = sortedChecks.filter(c => c.status === 'up').length;
    const availability = (up / total) * 100;

    // Calculate incidents (consecutive down statuses)
    let incidents = 0;
    let inIncident = false;
    const incidentDurations: number[] = [];
    let incidentStart = 0;

    for (let i = 0; i < sortedChecks.length; i++) {
      if (sortedChecks[i].status === 'down' && !inIncident) {
        inIncident = true;
        incidentStart = sortedChecks[i].ts;
        incidents++;
      } else if (sortedChecks[i].status === 'up' && inIncident) {
        inIncident = false;
        incidentDurations.push(sortedChecks[i].ts - incidentStart);
      }
    }

    // Handle incident that's still ongoing
    if (inIncident && sortedChecks.length > 0) {
      incidentDurations.push(Date.now() - incidentStart);
    }

    const totalDowntime = incidentDurations.reduce((a, b) => a + b, 0);
    const downtimeHours = totalDowntime / (1000 * 60 * 60);
    const downtime = downtimeHours < 0.01 ? 'none' : `${downtimeHours.toFixed(2)} hours`;

    const longestIncident = incidentDurations.length > 0
      ? `${(Math.max(...incidentDurations) / (1000 * 60 * 60)).toFixed(2)} hours`
      : 'none';

    const avgIncident = incidentDurations.length > 0
      ? `${((incidentDurations.reduce((a, b) => a + b, 0) / incidentDurations.length) / (1000 * 60 * 60)).toFixed(2)} hours`
      : 'none';

    return {
      availability,
      downtime,
      incidents,
      longestIncident,
      avgIncident,
    };
  };

  const todayStats = useMemo(() => calculateStats(1), [checks]);
  const weekStats = useMemo(() => calculateStats(7), [checks]);
  const monthStats = useMemo(() => calculateStats(30), [checks]);
  const yearStats = useMemo(() => calculateStats(365), [checks]);
  const allTimeStats = useMemo(() => {
    if (checks.length === 0) {
      return {
        availability: 100,
        downtime: 'none',
        incidents: 0,
        longestIncident: 'none',
        avgIncident: 'none',
      };
    }
    return calculateStats(365);
  }, [checks]);

  return (
    <Card className="mb-4 border gap-0">
      <CardHeader className="pb-3 px-6 pt-6">
        <CardTitle className="text-base">Availability Report</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time period</TableHead>
              <TableHead className="text-right">Availability</TableHead>
              <TableHead className="text-right">Downtime</TableHead>
              <TableHead className="text-right">Incidents</TableHead>
              <TableHead className="text-right">Longest incident</TableHead>
              <TableHead className="text-right">Avg. incident</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Today</TableCell>
              <TableCell className="text-right">{todayStats.availability.toFixed(4)}%</TableCell>
              <TableCell className="text-right">{todayStats.downtime}</TableCell>
              <TableCell className="text-right">{todayStats.incidents}</TableCell>
              <TableCell className="text-right">{todayStats.longestIncident}</TableCell>
              <TableCell className="text-right">{todayStats.avgIncident}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Last 7 days</TableCell>
              <TableCell className="text-right">{weekStats.availability.toFixed(4)}%</TableCell>
              <TableCell className="text-right">{weekStats.downtime}</TableCell>
              <TableCell className="text-right">{weekStats.incidents}</TableCell>
              <TableCell className="text-right">{weekStats.longestIncident}</TableCell>
              <TableCell className="text-right">{weekStats.avgIncident}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Last 30 days</TableCell>
              <TableCell className="text-right">{monthStats.availability.toFixed(4)}%</TableCell>
              <TableCell className="text-right">{monthStats.downtime}</TableCell>
              <TableCell className="text-right">{monthStats.incidents}</TableCell>
              <TableCell className="text-right">{monthStats.longestIncident}</TableCell>
              <TableCell className="text-right">{monthStats.avgIncident}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Last 365 days</TableCell>
              <TableCell className="text-right">{yearStats.availability.toFixed(4)}%</TableCell>
              <TableCell className="text-right">{yearStats.downtime}</TableCell>
              <TableCell className="text-right">{yearStats.incidents}</TableCell>
              <TableCell className="text-right">{yearStats.longestIncident}</TableCell>
              <TableCell className="text-right">{yearStats.avgIncident}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">All time</TableCell>
              <TableCell className="text-right">{allTimeStats.availability.toFixed(4)}%</TableCell>
              <TableCell className="text-right">{allTimeStats.downtime}</TableCell>
              <TableCell className="text-right">{allTimeStats.incidents}</TableCell>
              <TableCell className="text-right">{allTimeStats.longestIncident}</TableCell>
              <TableCell className="text-right">{allTimeStats.avgIncident}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

