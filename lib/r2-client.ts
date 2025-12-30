/**
 * R2 Client for Next.js
 * Uses Cloudflare R2 REST API to read/write monitor checks
 */

interface MonitorCheck {
  id: string;
  monitor_id: string;
  ts: number;
  status: 'up' | 'down';
  http_status: number | null;
  latency_ms: number;
  error: string | null;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string; // Optional public URL for read operations
}

function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.R2_BUCKET_NAME || 'uptime';
  const publicUrl = process.env.R2_PUBLIC_URL; // Required for public URL generation

  // Note: Write operations now use Worker proxy, so credentials are optional
  // Only publicUrl is needed for generating public URLs after upload

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

/**
 * Get the daily file path for a monitor check
 * Format: monitors/{monitor_id}/YYYY-MM-DD.json
 */
function getDailyFilePath(monitorId: string, timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `monitors/${monitorId}/${year}-${month}-${day}.json`;
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
 * Sign R2 request using AWS S3-compatible signature
 * Note: Cloudflare R2 uses S3-compatible API
 * For production, consider using AWS SDK or implementing proper signature v4
 */
async function signR2Request(
  method: string,
  url: string,
  config: R2Config
): Promise<HeadersInit> {
  // Cloudflare R2 uses S3-compatible API with access key authentication
  // For now, we'll use a simple approach. In production, implement AWS Signature V4
  // The endpoint format is: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<object-key>
  return {
    'Authorization': `Bearer ${config.secretAccessKey}`, // Simplified - should use AWS signature v4
    'Content-Type': 'application/json',
  };
}

/**
 * Append a check to R2
 * Note: Write operations always require authenticated API (public URL is read-only)
 */
export async function appendCheckToR2(check: MonitorCheck): Promise<void> {
  const config = getR2Config();
  const filePath = getDailyFilePath(check.monitor_id, check.ts);
  
  // Write operations always use authenticated API
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('R2 write operations require R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY');
  }
  
  // Cloudflare R2 S3-compatible endpoint
  // Format: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<object-key>
  const url = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${filePath}`;

  // Try to read existing file (use public URL if available for read)
  let existingChecks: MonitorCheck[] = [];
  try {
    let readUrl = url;
    let readHeaders: HeadersInit = {};
    
    if (config.publicUrl) {
      // Use public URL for read if available
      readUrl = `${config.publicUrl}/${filePath}`;
    } else {
      // Use authenticated API
      readHeaders = await signR2Request('GET', url, config);
    }
    
    const response = await fetch(readUrl, { method: 'GET', headers: readHeaders });
    if (response.ok) {
      const content = await response.json();
      if (Array.isArray(content)) {
        existingChecks = content;
      }
    }
  } catch (error) {
    // File doesn't exist yet, that's okay
  }

  // Append new check
  existingChecks.push(check);
  existingChecks.sort((a, b) => a.ts - b.ts);

  // Write back (always use authenticated API)
  const writeHeaders = await signR2Request('PUT', url, config);
  const writeResponse = await fetch(url, {
    method: 'PUT',
    headers: writeHeaders,
    body: JSON.stringify(existingChecks),
  });

  if (!writeResponse.ok) {
    throw new Error(`Failed to write to R2: ${writeResponse.status} ${writeResponse.statusText}`);
  }
}

/**
 * Upload a file to R2 via Worker proxy
 * @param path - The path/key in the bucket (e.g., 'status-pages/123/logo.png')
 * @param data - The file data as ArrayBuffer
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToR2(
  path: string,
  data: ArrayBuffer,
  contentType: string
): Promise<string> {
  const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
  const config = getR2Config();
  
  const response = await fetch(`${workerUrl}/api/assets/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-File-Path': path,
    },
    body: data,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to upload to R2: ${response.status} - ${(errorData as any).error || response.statusText}`);
  }
  
  // Return the public URL
  // Prefer R2_PUBLIC_URL if set, otherwise use Worker to serve assets
  if (config.publicUrl) {
    return `${config.publicUrl}/${path}`;
  }
  
  // Fallback: Serve via Worker
  return `${workerUrl}/${path}`;
}

/**
 * Delete a file from R2 via Worker proxy
 * @param path - The path/key in the bucket to delete
 */
export async function deleteFileFromR2(path: string): Promise<void> {
  const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
  
  const response = await fetch(`${workerUrl}/api/assets/${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });
  
  // 200 OK or 404 Not Found are both acceptable
  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to delete from R2: ${response.status} - ${(errorData as any).error || response.statusText}`);
  }
}

/**
 * Get the public URL for a file in R2
 * @param path - The path/key in the bucket
 * @returns The public URL or null if no public URL is configured
 */
export function getR2PublicUrl(path: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return null;
  return `${publicUrl}/${path}`;
}

/**
 * Get checks from R2 for a date range
 */
export async function getChecksFromR2(
  monitorId: string,
  startDate: number,
  endDate: number,
  limit?: number
): Promise<MonitorCheck[]> {
  const config = getR2Config();
  const filePaths = getDateRangeFilePaths(monitorId, startDate, endDate);
  
  const allChecks: MonitorCheck[] = [];

  // Read all daily files in parallel
  const readPromises = filePaths.map(async (filePath) => {
    // Use public URL if available, otherwise use authenticated API
    let url: string;
    let headers: HeadersInit = {};
    
    if (config.publicUrl) {
      // Public URL - no authentication needed
      url = `${config.publicUrl}/${filePath}`;
    } else {
      // Authenticated API endpoint
      url = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${filePath}`;
      headers = await signR2Request('GET', url, config);
    }
    
    try {
      const response = await fetch(url, { method: 'GET', headers });
      if (response.ok) {
        const content = await response.json();
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

