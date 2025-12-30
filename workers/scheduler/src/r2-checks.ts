import type { R2Bucket } from '@cloudflare/workers-types';

export interface MonitorCheck {
  id: string;
  monitor_id: string;
  ts: number;
  status: 'up' | 'down';
  http_status: number | null;
  latency_ms: number;
  error: string | null;
}

/**
 * Get the daily file path for a monitor check
 * Format: monitors/{monitor_id}/YYYY-MM-DD.json
 */
export function getDailyFilePath(monitorId: string, timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `monitors/${monitorId}/${year}-${month}-${day}.json`;
}

/**
 * Append a check to the daily R2 file
 * Reads existing file, appends new check, writes back atomically
 */
export async function appendCheckToR2(
  bucket: R2Bucket,
  check: MonitorCheck
): Promise<void> {
  const filePath = getDailyFilePath(check.monitor_id, check.ts);
  
  // Try to read existing file
  let existingChecks: MonitorCheck[] = [];
  try {
    const existingFile = await bucket.get(filePath);
    if (existingFile) {
      const content = await existingFile.json();
      if (Array.isArray(content)) {
        existingChecks = content;
      }
    }
  } catch (error) {
    // File doesn't exist yet, that's okay
    // We'll create a new one
  }

  // Append new check to the array
  existingChecks.push(check);

  // Sort by timestamp (oldest first)
  existingChecks.sort((a, b) => a.ts - b.ts);

  // Write back to R2
  await bucket.put(filePath, JSON.stringify(existingChecks), {
    httpMetadata: {
      contentType: 'application/json',
    },
  });
}

/**
 * Generate date range file paths for a monitor
 */
function getDateRangeFilePaths(monitorId: string, startDate: number, endDate: number): string[] {
  const paths: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  current.setUTCHours(0, 0, 0, 0);
  
  while (current <= end) {
    paths.push(getDailyFilePath(monitorId, current.getTime()));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return paths;
}

/**
 * Get checks from R2 for a date range
 */
export async function getChecksFromR2(
  bucket: R2Bucket,
  monitorId: string,
  startDate: number,
  endDate: number,
  limit?: number
): Promise<MonitorCheck[]> {
  const filePaths = getDateRangeFilePaths(monitorId, startDate, endDate);
  
  const allChecks: MonitorCheck[] = [];

  // Read all daily files in parallel
  const readPromises = filePaths.map(async (filePath) => {
    try {
      const file = await bucket.get(filePath);
      if (file) {
        const content = await file.json();
        if (Array.isArray(content)) {
          return content as MonitorCheck[];
        }
      }
    } catch (error) {
      // File doesn't exist, skip
    }
    return [];
  });

  const results = await Promise.all(readPromises);
  for (const checks of results) {
    allChecks.push(...checks);
  }

  // Filter by date range and sort
  const filtered = allChecks
    .filter(check => check.ts >= startDate && check.ts <= endDate)
    .sort((a, b) => b.ts - a.ts); // Newest first

  // Apply limit
  if (limit && limit > 0) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Batch append multiple checks to R2
 * More efficient than individual appends
 */
export async function batchAppendChecksToR2(
  bucket: R2Bucket,
  checks: MonitorCheck[]
): Promise<void> {
  if (checks.length === 0) return;

  // Group checks by date (daily files)
  const checksByDate = new Map<string, MonitorCheck[]>();
  
  for (const check of checks) {
    const filePath = getDailyFilePath(check.monitor_id, check.ts);
    if (!checksByDate.has(filePath)) {
      checksByDate.set(filePath, []);
    }
    checksByDate.get(filePath)!.push(check);
  }

  // Flush each daily file
  const flushPromises = Array.from(checksByDate.entries()).map(async ([filePath, dateChecks]) => {
    // Try to read existing file
    let existingChecks: MonitorCheck[] = [];
    try {
      const existingFile = await bucket.get(filePath);
      if (existingFile) {
        const content = await existingFile.json();
        if (Array.isArray(content)) {
          existingChecks = content;
        }
      }
    } catch (error) {
      // File doesn't exist yet, that's okay
    }

    // Append new checks
    existingChecks.push(...dateChecks);

    // Sort by timestamp (oldest first)
    existingChecks.sort((a, b) => a.ts - b.ts);

    // Write back to R2
    await bucket.put(filePath, JSON.stringify(existingChecks), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
  });

  await Promise.all(flushPromises);
}

