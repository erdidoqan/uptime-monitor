import { D1Client } from './d1-client';
import { appendCheckToR2, getChecksFromR2, batchAppendChecksToR2, type MonitorCheck } from './r2-checks';
import { calculateNextRun, shouldRunThisMinute, hasIntervalPassed } from './cron-utils';
import type { ScheduledEvent, ExecutionContext, R2Bucket } from '@cloudflare/workers-types';

// Memory buffer for batch flushing (10 minutes after monitor creation)
const checkBuffers = new Map<string, MonitorCheck[]>();
const flushTimers = new Map<string, number>(); // monitor_id -> last flush timestamp
const BUFFER_FLUSH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const INITIAL_DIRECT_WRITE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes
const MAX_BUFFER_SIZE = 1000; // Max checks per buffer before auto-flush

interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_D1_DATABASE_ID: string;
  CLOUDFLARE_D1_API_TOKEN: string;
  CHECKS_BUCKET: R2Bucket;
  NEXT_PUBLIC_APP_URL?: string;
  INTERNAL_API_TOKEN?: string;
  // Turkey proxy for geo-restricted sites
  TR_PROXY_URL?: string;
  TR_PROXY_SECRET?: string;
  // Campaign email secret
  CAMPAIGN_API_SECRET?: string;
}

function getD1Client(env: Env): D1Client {
  return new D1Client(
    env.CLOUDFLARE_ACCOUNT_ID,
    env.CLOUDFLARE_D1_DATABASE_ID,
    env.CLOUDFLARE_D1_API_TOKEN
  );
}

/**
 * Flush buffer to R2 for a specific monitor
 */
async function flushBufferToR2(
  checksBucket: R2Bucket,
  monitorId: string
): Promise<void> {
  const buffer = checkBuffers.get(monitorId);
  if (!buffer || buffer.length === 0) {
    return;
  }

  try {
    await batchAppendChecksToR2(checksBucket, buffer);
    checkBuffers.delete(monitorId);
    flushTimers.set(monitorId, Date.now());
  } catch (error) {
    console.error(`Failed to flush buffer for monitor ${monitorId}:`, error);
    // Keep buffer for retry
  }
}

/**
 * Add check to buffer or flush if needed
 */
async function addCheckToBuffer(
  checksBucket: R2Bucket,
  check: MonitorCheck,
  monitorCreatedAt: number
): Promise<void> {
  const now = Date.now();
  const timeSinceCreation = now - monitorCreatedAt;

  // First 10 minutes: write directly to R2
  if (timeSinceCreation < INITIAL_DIRECT_WRITE_PERIOD_MS) {
    await appendCheckToR2(checksBucket, check);
    return;
  }

  // After 10 minutes: use buffer
  const monitorId = check.monitor_id;
  
  // Initialize buffer if needed
  if (!checkBuffers.has(monitorId)) {
    checkBuffers.set(monitorId, []);
    flushTimers.set(monitorId, now);
  }

  // Add to buffer
  const buffer = checkBuffers.get(monitorId)!;
  buffer.push(check);

  // Auto-flush if buffer is too large
  if (buffer.length >= MAX_BUFFER_SIZE) {
    await flushBufferToR2(checksBucket, monitorId);
    return;
  }

  // Check if it's time to flush (10 minutes since last flush)
  const lastFlush = flushTimers.get(monitorId) || now;
  if (now - lastFlush >= BUFFER_FLUSH_INTERVAL_MS) {
    await flushBufferToR2(checksBucket, monitorId);
  }
}

/**
 * Send email notification via Next.js API endpoint
 * This avoids code duplication - all email logic is in Next.js
 */
async function sendEmailViaAPI(
  env: Env,
  type: 'incident' | 'resolved',
  params: any
): Promise<void> {
  try {
    const apiUrl = env.NEXT_PUBLIC_APP_URL || 'https://www.uptimetr.com';
    const internalToken = env.INTERNAL_API_TOKEN;

    if (!internalToken) {
      console.warn('INTERNAL_API_TOKEN not set, skipping email notification');
      return;
    }

    const url = `${apiUrl}/api/incidents/send-email`;
    const payload = {
      type,
      ...params,
    };

    console.log(`Sending email notification to ${url} for ${type} ${params.incidentId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Email API returned ${response.status}:`, errorText);
      console.error(`Request URL: ${url}`);
      console.error(`Request payload:`, JSON.stringify(payload, null, 2));
    } else {
      const responseText = await response.text();
      console.log(`Email notification sent successfully for ${type} incident ${params.incidentId}`);
      console.log(`Response:`, responseText);
    }
  } catch (error) {
    console.error('Error calling email API:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    // Don't throw - email failure shouldn't break incident operations
  }
}

/**
 * Request screenshot via Next.js API endpoint
 * Only called for monitor incidents, first incident only, and HTTP errors
 */
async function requestScreenshotViaAPI(
  env: Env,
  incidentId: string
): Promise<void> {
  try {
    const apiUrl = env.NEXT_PUBLIC_APP_URL || 'https://www.uptimetr.com';
    const internalToken = env.INTERNAL_API_TOKEN;

    if (!internalToken) {
      console.warn('INTERNAL_API_TOKEN not set, skipping screenshot request');
      return;
    }

    const url = `${apiUrl}/api/incidents/${incidentId}/screenshot`;

    console.log(`Requesting screenshot for incident ${incidentId} at ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Screenshot API returned ${response.status}:`, errorText);
      console.error(`Request URL: ${url}`);
    } else {
      const responseText = await response.text();
      console.log(`Screenshot request sent successfully for incident ${incidentId}`);
      console.log(`Response:`, responseText);
    }
  } catch (error) {
    console.error('Error calling screenshot API:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    // Don't throw - screenshot failure shouldn't break incident operations
  }
}

async function processMonitors(db: D1Client, checksBucket: R2Bucket, env: Env, ctx?: ExecutionContext) {
  const now = Date.now();
  const lockTimeout = now - 300000; // 5 minutes ago

  // Get due monitors
  const dueMonitors = await db.queryAll<{
    id: string;
    user_id: string | null;
    url: string;
    method: string;
    headers_json: string | null;
    body: string | null;
    timeout_ms: number;
    expected_min: number | null;
    expected_max: number | null;
    keyword: string | null;
    interval_sec: number;
    last_status: string | null;
    fail_streak: number;
    created_at: number;
    use_tr_proxy: number | null;
  }>(
    `SELECT id, user_id, url, method, headers_json, body, timeout_ms, expected_min, expected_max, keyword, interval_sec, last_status, fail_streak, created_at, use_tr_proxy
     FROM monitors
     WHERE is_active = 1
       AND next_run_at <= ?
       AND (locked_at IS NULL OR locked_at < ?)
     LIMIT 10`,
    [now, lockTimeout]
  );

  if (dueMonitors.length === 0) {
    return;
  }

  // Lock monitors
  const monitorIds = dueMonitors.map((m) => m.id);
  await db.execute(
    `UPDATE monitors SET locked_at = ? WHERE id IN (${monitorIds.map(() => '?').join(',')}) AND locked_at IS NULL`,
    [now, ...monitorIds]
  );

  // Process each monitor
  for (const monitor of dueMonitors) {
    try {
      const startTime = Date.now();
      let httpStatus: number | null = null;
      let error: string | null = null;
      let status: 'up' | 'down' = 'down';
      let isTimeout = false;

      // Helper function to perform a single check with retry logic
      async function performCheck(retryCount = 0): Promise<{ success: boolean; httpStatus: number | null; latency: number; error: string | null; bodyText: string }> {
        try {
          // Prepare headers with default User-Agent
          const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          };
          // Override with custom headers if provided
          if (monitor.headers_json) {
            try {
              Object.assign(headers, JSON.parse(monitor.headers_json));
            } catch (err) {
              console.error(`Failed to parse headers_json for monitor ${monitor.id}:`, err);
            }
          }

          const checkStartTime = Date.now();
          
          // Check if we should use TR proxy
          const useTrProxy = monitor.use_tr_proxy && env.TR_PROXY_URL && env.TR_PROXY_SECRET;
          
          let responseStatus: number;
          let bodyText = '';
          
          if (useTrProxy) {
            // Make request through Turkey proxy
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              monitor.timeout_ms + 5000 // Extra 5s for proxy overhead
            );

            const proxyResponse = await fetch(env.TR_PROXY_URL!, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.TR_PROXY_SECRET}`,
              },
              body: JSON.stringify({
                url: monitor.url,
                method: monitor.method || 'GET',
                headers,
                body: monitor.body || null,
                timeout_ms: monitor.timeout_ms,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!proxyResponse.ok) {
              const errorText = await proxyResponse.text();
              throw new Error(`Proxy error: ${proxyResponse.status} - ${errorText}`);
            }

            const proxyResult = await proxyResponse.json() as {
              success: boolean;
              status?: number;
              body?: string;
              error?: string;
              latency_ms?: number;
            };

            if (!proxyResult.success) {
              throw new Error(proxyResult.error || 'Proxy request failed');
            }

            responseStatus = proxyResult.status || 0;
            bodyText = proxyResult.body || '';
          } else {
            // Direct request (original behavior)
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              monitor.timeout_ms
            );

            const response = await fetch(monitor.url, {
              method: monitor.method || 'GET',
              headers,
              body: monitor.body || undefined,
              signal: controller.signal,
              redirect: 'follow', // Explicitly follow redirects
            });

            clearTimeout(timeoutId);
            responseStatus = response.status;
            
            // Read body if keyword check is needed OR if 403 (for Cloudflare detection)
            if (monitor.keyword || responseStatus === 403) {
              try {
                bodyText = await response.text();
              } catch {
                // If reading body fails, continue without keyword check
              }
            }
          }

          const latency = Date.now() - checkStartTime;
          return { success: true, httpStatus: responseStatus, latency, error: null, bodyText };
        } catch (err: any) {
          const errorMsg = err.message || 'Request failed';
          const isTimeoutError = errorMsg.includes('abort') || errorMsg.includes('timeout');
          
          // If timeout and first attempt, retry once after 2 seconds
          if (isTimeoutError && retryCount === 0) {
            console.log(`Monitor ${monitor.id} timeout on first attempt, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return performCheck(1); // Retry once
          }
          
          // If retry also fails or not a timeout, return error
          return { success: false, httpStatus: null, latency: Date.now() - startTime, error: errorMsg, bodyText: '' };
        }
      }

      // Perform check with retry logic
      const checkResult = await performCheck();
      
      if (checkResult.success) {
        httpStatus = checkResult.httpStatus;
        const latency = checkResult.latency;
        const bodyText = checkResult.bodyText;

        // Default to 200-399 range if not specified (includes redirects: 301, 302, 303, 307, 308)
        const minStatus = monitor.expected_min ?? 200;
        const maxStatus = monitor.expected_max ?? 399;
        
        // Check if this is a Cloudflare challenge page (403 but site is actually up)
        // Cloudflare returns 403 with JS challenge for bot protection - site is working
        const isCloudflareChallenge = httpStatus === 403 && bodyText && (
          bodyText.includes('_cf_chl_opt') || 
          bodyText.includes('Just a moment') ||
          bodyText.includes('challenge-platform') ||
          bodyText.includes('cf-chl-bypass')
        );
        
        // Debug: Log Cloudflare detection details for 403 responses
        if (httpStatus === 403) {
          console.log(`Monitor ${monitor.id} got 403:`, {
            bodyLength: bodyText?.length || 0,
            hasBody: !!bodyText,
            hasCfChlOpt: bodyText?.includes('_cf_chl_opt') || false,
            hasJustAMoment: bodyText?.includes('Just a moment') || false,
            isCloudflareChallenge,
            bodyPreview: bodyText?.substring(0, 200) || 'empty',
          });
        }
        
        // If Cloudflare challenge, treat as "up" - site is responding, just has bot protection
        const statusInRange = isCloudflareChallenge || (httpStatus !== null && httpStatus >= minStatus && httpStatus <= maxStatus);
        const keywordMatch = !monitor.keyword || isCloudflareChallenge || (bodyText && bodyText.includes(monitor.keyword));

        status = statusInRange && keywordMatch ? 'up' : 'down';
        
        // Log Cloudflare challenge detection
        if (isCloudflareChallenge) {
          console.log(`Monitor ${monitor.id} detected Cloudflare challenge (403), treating as UP`);
        }
        
        // If retry was successful after timeout, log it
        if (checkResult.error === null) {
          console.log(`Monitor ${monitor.id} check succeeded after retry`);
        }

        // Debug logging
        if (!statusInRange || !keywordMatch) {
          console.log(`Monitor ${monitor.id} check failed:`, {
            url: monitor.url,
            httpStatus,
            statusInRange,
            keywordMatch,
            keyword: monitor.keyword,
            expectedRange: `${minStatus}-${maxStatus}`,
            bodyLength: bodyText?.length || 0,
          });
        }

        // Log check to R2 (hybrid: direct for first 10 min, buffer after)
        const checkId = crypto.randomUUID();
        const check: MonitorCheck = {
          id: checkId,
          monitor_id: monitor.id,
          ts: now,
          status,
          http_status: httpStatus,
          latency_ms: latency,
          error: null,
        };
        await addCheckToBuffer(checksBucket, check, monitor.created_at);

        // Incident management with fail_streak logic (prevents false positives)
        // Only open incident after 2 consecutive failures
        const nextRunAt = now + monitor.interval_sec * 1000;
        const currentFailStreak = monitor.fail_streak || 0;
        const newFailStreak = status === 'down' ? currentFailStreak + 1 : 0;
        
        if (status === 'down' && newFailStreak >= 2) {
          // Check if incident already exists (prevent race condition)
          const existingIncident = await db.queryFirst<{ id: string }>(
            `SELECT id FROM incidents 
             WHERE type = 'monitor' AND source_id = ? AND resolved_at IS NULL`,
            [monitor.id]
          );

          if (!existingIncident) {
            // Open incident after 2 consecutive failures
            const incidentId = crypto.randomUUID();
            const cause = !statusInRange ? 'http_error' : !keywordMatch ? 'keyword_missing' : 'unknown';
            await db.execute(
              `INSERT INTO incidents (id, type, source_id, user_id, cause, http_status, started_at, last_update_at)
               VALUES (?, 'monitor', ?, ?, ?, ?, ?, ?)`,
              [incidentId, monitor.id, monitor.user_id, cause, httpStatus, now, now]
            );
            // Add 'started' event to timeline
            const eventId = crypto.randomUUID();
            const eventContent = cause === 'http_error' 
              ? `HTTP ${httpStatus} error` 
              : cause === 'keyword_missing' 
              ? 'Keyword not found in response' 
              : 'Monitor check failed';
            await db.execute(
              `INSERT INTO incident_events (id, incident_id, event_type, content, created_at)
               VALUES (?, ?, 'started', ?, ?)`,
              [eventId, incidentId, eventContent, now]
            );

            // Send email notification (use ctx.waitUntil to ensure it completes)
            if (monitor.user_id && ctx) {
              ctx.waitUntil(sendEmailViaAPI(env, 'incident', {
                userId: monitor.user_id,
                incidentType: 'monitor',
                sourceId: monitor.id,
                cause,
                httpStatus,
                timestamp: now,
                incidentId,
              }));
            }

            // Request screenshot for first incident with HTTP error
            // Only take screenshot if:
            // 1. HTTP error (status code not in 200-299 range)
            // 2. First incident for this monitor (no previous screenshot exists)
            if (ctx && httpStatus && (httpStatus < 200 || httpStatus >= 300)) {
              // Check if this monitor already has a screenshot
              const existingScreenshot = await db.queryFirst<{ id: string }>(
                `SELECT id FROM incidents 
                 WHERE type = 'monitor' AND source_id = ? AND screenshot_url IS NOT NULL
                 LIMIT 1`,
                [monitor.id]
              );

              if (!existingScreenshot) {
                // This is the first incident with HTTP error for this monitor
                ctx.waitUntil(requestScreenshotViaAPI(env, incidentId));
              }
            }

            console.log(`Monitor ${monitor.id} incident opened after ${newFailStreak} consecutive failures`);
          }
        } else if (status === 'up') {
          // Close incident if exists (when recovering from failure)
          const openIncident = await db.queryFirst<{ id: string }>(
            `SELECT id FROM incidents 
             WHERE type = 'monitor' AND source_id = ? AND resolved_at IS NULL`,
            [monitor.id]
          );
          if (openIncident) {
            // Get incident details for email
            const incident = await db.queryFirst<{ user_id: string | null; started_at: number }>(
              'SELECT user_id, started_at FROM incidents WHERE id = ?',
              [openIncident.id]
            );

            await db.execute(
              `UPDATE incidents 
               SET resolved_at = ?, last_update_at = ?
               WHERE id = ?`,
              [now, now, openIncident.id]
            );
            // Add 'auto_resolved' event
            const eventId = crypto.randomUUID();
            await db.execute(
              `INSERT INTO incident_events (id, incident_id, event_type, content, created_at)
               VALUES (?, ?, 'auto_resolved', 'Monitor recovered automatically', ?)`,
              [eventId, openIncident.id, now]
            );

            // Send resolved email notification (use ctx.waitUntil to ensure it completes)
            if (incident?.user_id && ctx) {
              ctx.waitUntil(sendEmailViaAPI(env, 'resolved', {
                userId: incident.user_id,
                incidentType: 'monitor',
                sourceId: monitor.id,
                incidentId: openIncident.id,
                resolvedAt: now,
                startedAt: incident.started_at,
              }));
            }

            console.log(`Monitor ${monitor.id} recovered, incident closed`);
          }
        }

        // Update monitor with fail_streak
        // IMPORTANT: Update AFTER incident management so we can use old fail_streak
        const statusChanged = monitor.last_status !== status;
        
        if (statusChanged || newFailStreak !== currentFailStreak) {
          // Full update when status or fail_streak changes
          await db.execute(
            `UPDATE monitors 
             SET last_status = ?, last_latency_ms = ?, last_checked_at = ?, next_run_at = ?, fail_streak = ?, locked_at = NULL
             WHERE id = ?`,
            [status, latency, now, nextRunAt, newFailStreak, monitor.id]
          );
        } else {
          // Minimal update when nothing changed (only last_checked_at and next_run_at)
          await db.execute(
            `UPDATE monitors 
             SET last_checked_at = ?, next_run_at = ?, locked_at = NULL
             WHERE id = ?`,
            [now, nextRunAt, monitor.id]
          );
        }
      } else {
        // Check failed (timeout or other error)
        error = checkResult.error;
        const latency = checkResult.latency;
        isTimeout = error?.includes('abort') || error?.includes('timeout') || false;
        
        // Debug logging for errors
        console.error(`Monitor ${monitor.id} check error:`, {
          url: monitor.url,
          error: error,
          timeout: monitor.timeout_ms,
          isTimeout,
        });

        // Log check to R2 (hybrid: direct for first 10 min, buffer after)
        const checkId = crypto.randomUUID();
        const check: MonitorCheck = {
          id: checkId,
          monitor_id: monitor.id,
          ts: now,
          status: 'down',
          http_status: httpStatus,
          latency_ms: latency,
          error,
        };
        await addCheckToBuffer(checksBucket, check, monitor.created_at);

        // Calculate fail_streak for error case
        const nextRunAt = now + monitor.interval_sec * 1000;
        const currentFailStreak = monitor.fail_streak || 0;
        const newFailStreak = currentFailStreak + 1;

        // Open incident after 2 consecutive failures (prevents false positives)
        if (newFailStreak >= 2) {
          // Check if incident already exists (prevent race condition)
          const existingIncident = await db.queryFirst<{ id: string }>(
            `SELECT id FROM incidents 
             WHERE type = 'monitor' AND source_id = ? AND resolved_at IS NULL`,
            [monitor.id]
          );

          if (!existingIncident) {
            const incidentId = crypto.randomUUID();
            const cause = error?.includes('abort') || error?.includes('timeout') ? 'timeout' : 'http_error';
            await db.execute(
              `INSERT INTO incidents (id, type, source_id, user_id, cause, http_status, started_at, last_update_at)
               VALUES (?, 'monitor', ?, ?, ?, ?, ?, ?)`,
              [incidentId, monitor.id, monitor.user_id, cause, httpStatus, now, now]
            );
            // Add 'started' event to timeline
            const eventId = crypto.randomUUID();
            const eventContent = cause === 'timeout' ? 'Connection timeout' : error || 'Monitor check failed';
            await db.execute(
              `INSERT INTO incident_events (id, incident_id, event_type, content, created_at)
               VALUES (?, ?, 'started', ?, ?)`,
              [eventId, incidentId, eventContent, now]
            );

            // Send email notification (use ctx.waitUntil to ensure it completes)
            if (monitor.user_id && ctx) {
              ctx.waitUntil(sendEmailViaAPI(env, 'incident', {
                userId: monitor.user_id,
                incidentType: 'monitor',
                sourceId: monitor.id,
                cause,
                httpStatus,
                timestamp: now,
                incidentId,
              }));
            }

            // Request screenshot for first incident with HTTP error
            // Only take screenshot if:
            // 1. HTTP error (status code not in 200-299 range) - timeout'lar için screenshot alınmaz
            // 2. First incident for this monitor (no previous screenshot exists)
            if (ctx && httpStatus && (httpStatus < 200 || httpStatus >= 300) && cause !== 'timeout') {
              // Check if this monitor already has a screenshot
              const existingScreenshot = await db.queryFirst<{ id: string }>(
                `SELECT id FROM incidents 
                 WHERE type = 'monitor' AND source_id = ? AND screenshot_url IS NOT NULL
                 LIMIT 1`,
                [monitor.id]
              );

              if (!existingScreenshot) {
                // This is the first incident with HTTP error for this monitor
                ctx.waitUntil(requestScreenshotViaAPI(env, incidentId));
              }
            }

            console.log(`Monitor ${monitor.id} incident opened after ${newFailStreak} consecutive failures (error case)`);
          }
        }

        // Update monitor with fail_streak
        const statusChanged = monitor.last_status !== 'down';
        
        if (statusChanged || newFailStreak !== currentFailStreak) {
          // Full update when status or fail_streak changes
          await db.execute(
            `UPDATE monitors 
             SET last_status = 'down', last_latency_ms = ?, last_checked_at = ?, next_run_at = ?, fail_streak = ?, locked_at = NULL
             WHERE id = ?`,
            [latency, now, nextRunAt, newFailStreak, monitor.id]
          );
        } else {
          // Minimal update when nothing changed
          await db.execute(
            `UPDATE monitors 
             SET last_checked_at = ?, next_run_at = ?, locked_at = NULL
             WHERE id = ?`,
            [now, nextRunAt, monitor.id]
          );
        }
      }
    } catch (error) {
      console.error(`Error processing monitor ${monitor.id}:`, error);
      // Unlock on error
      await db.execute(`UPDATE monitors SET locked_at = NULL WHERE id = ?`, [
        monitor.id,
      ]);
    }
  }
}

async function processCronJobs(db: D1Client, env: Env, ctx?: ExecutionContext) {
  const now = Date.now();
  const lockTimeout = now - 300000; // 5 minutes ago

  // Get all active, unlocked cron jobs
  // We'll check cron_expr/interval_sec to determine if they should run, or next_run_at for manual triggers
  const allCronJobs = await db.queryAll<{
    id: string;
    user_id: string | null;
    url: string;
    method: string;
    headers_json: string | null;
    body: string | null;
    timeout_ms: number;
    expected_min: number | null;
    expected_max: number | null;
    keyword: string | null;
    cron_expr: string | null;
    interval_sec: number | null;
    last_status: string | null;
    fail_streak: number;
    last_run_at: number | null;
    next_run_at: number | null;
  }>(
    `SELECT id, user_id, url, method, headers_json, body, timeout_ms, expected_min, expected_max, keyword, cron_expr, interval_sec, last_status, fail_streak, last_run_at, next_run_at
     FROM cron_jobs
     WHERE is_active = 1
       AND (locked_at IS NULL OR locked_at < ?)
     LIMIT 10`,
    [lockTimeout]
  );

  // Filter jobs that should run based on cron_expr or interval_sec
  // Also check next_run_at for manual "Run Now" triggers
  const dueCronJobs: typeof allCronJobs = [];
  
  for (const job of allCronJobs) {
    let shouldRun = false;
    
    // First check: manual trigger via "Run Now" (next_run_at <= now)
    if (job.next_run_at && job.next_run_at <= now) {
      shouldRun = true;
    } else if (job.cron_expr) {
      // For cron expressions: check if the current minute matches the cron pattern
      shouldRun = shouldRunThisMinute(job.cron_expr, job.last_run_at);
    } else if (job.interval_sec) {
      // For interval-based: check if enough time has passed since last run
      shouldRun = hasIntervalPassed(job.interval_sec, job.last_run_at);
    }
    
    if (shouldRun) {
      dueCronJobs.push(job);
    }
  }

  if (dueCronJobs.length === 0) {
    return;
  }

  // Lock cron jobs
  const cronJobIds = dueCronJobs.map((j) => j.id);
  await db.execute(
    `UPDATE cron_jobs SET locked_at = ? WHERE id IN (${cronJobIds.map(() => '?').join(',')}) AND locked_at IS NULL`,
    [now, ...cronJobIds]
  );

  // Process each cron job
  for (const job of dueCronJobs) {
    try {
      const startTime = Date.now();
      let httpStatus: number | null = null;
      let error: string | null = null;
      let status: 'success' | 'fail' = 'fail';

      // Helper function to perform a single check with retry logic
      async function performCronCheck(retryCount = 0): Promise<{ success: boolean; httpStatus: number | null; duration: number; error: string | null; bodyText: string }> {
        try {
          // Prepare headers with default User-Agent
          const headers: HeadersInit = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          };
          // Override with custom headers if provided
          if (job.headers_json) {
            Object.assign(headers, JSON.parse(job.headers_json));
          }

          const checkStartTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            job.timeout_ms
          );

          const response = await fetch(job.url, {
            method: job.method,
            headers,
            body: job.body || undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const duration = Date.now() - checkStartTime;

          // Read response body (limit to 10KB to avoid storing huge responses)
          let bodyText = '';
          try {
            const responseText = await response.text();
            // Limit response body to 10KB
            bodyText = responseText.length > 10240 ? responseText.substring(0, 10240) + '... [truncated]' : responseText;
          } catch (err) {
            // If reading body fails, continue without it
            console.warn('Failed to read response body:', err);
          }
          
          return { success: true, httpStatus: response.status, duration, error: null, bodyText };
        } catch (err: any) {
          const errorMsg = err.message || 'Request failed';
          const isTimeoutError = errorMsg.includes('abort') || errorMsg.includes('timeout');
          
          // If timeout and first attempt, retry once after 2 seconds
          if (isTimeoutError && retryCount === 0) {
            console.log(`Cron job ${job.id} timeout on first attempt, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return performCronCheck(1); // Retry once
          }
          
          // If retry also fails or not a timeout, return error
          return { success: false, httpStatus: null, duration: Date.now() - startTime, error: errorMsg, bodyText: '' };
        }
      }

      // Perform check with retry logic
      const checkResult = await performCronCheck();
      
      if (checkResult.success) {
        httpStatus = checkResult.httpStatus;
        const duration = checkResult.duration;
        let bodyText = checkResult.bodyText;

        // Default to 200-299 range if not specified
        const minStatus = job.expected_min ?? 200;
        const maxStatus = job.expected_max ?? 299;
        
        const statusInRange = httpStatus !== null && httpStatus >= minStatus && httpStatus <= maxStatus;
        const keywordMatch = !job.keyword || (bodyText && bodyText.includes(job.keyword));

        status = statusInRange && keywordMatch ? 'success' : 'fail';
        
        // If retry was successful after timeout, log it
        if (checkResult.error === null) {
          console.log(`Cron job ${job.id} check succeeded after retry`);
        }

        // Log run
        const runId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO cron_runs (id, cron_job_id, ts, status, http_status, duration_ms, error, response_body)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [runId, job.id, now, status, httpStatus, duration, null, bodyText || null]
        );

        // Calculate next run
        const nextRunAt = calculateNextRun(job.cron_expr, job.interval_sec);

        // Update cron job with next_run_at
        await db.execute(
          `UPDATE cron_jobs SET next_run_at = ? WHERE id = ?`,
          [nextRunAt, job.id]
        );

        // Incident management for successful check
        if (status === 'success' && job.fail_streak >= 3) {
          // Close incident on success after failure streak
          const openIncident = await db.queryFirst<{ id: string }>(
            `SELECT id FROM incidents 
             WHERE type = 'cron' AND source_id = ? AND resolved_at IS NULL`,
            [job.id]
          );
          if (openIncident) {
            // Get incident details for email
            const incident = await db.queryFirst<{ user_id: string | null; started_at: number }>(
              'SELECT user_id, started_at FROM incidents WHERE id = ?',
              [openIncident.id]
            );

            await db.execute(
              `UPDATE incidents 
               SET resolved_at = ?, last_update_at = ?
               WHERE id = ?`,
              [now, now, openIncident.id]
            );
            // Add 'auto_resolved' event
            const eventId = crypto.randomUUID();
            await db.execute(
              `INSERT INTO incident_events (id, incident_id, event_type, content, created_at)
               VALUES (?, ?, 'auto_resolved', 'Cron job recovered automatically', ?)`,
              [eventId, openIncident.id, now]
            );

            // Send resolved email notification (use ctx.waitUntil to ensure it completes)
            if (incident?.user_id && ctx) {
              ctx.waitUntil(sendEmailViaAPI(env, 'resolved', {
                userId: incident.user_id,
                incidentType: 'cron',
                sourceId: job.id,
                incidentId: openIncident.id,
                resolvedAt: now,
                startedAt: incident.started_at,
              }));
            }
          }
        }

        // Update cron job - reset fail_streak on success, increment on fail
        const newFailStreak = status === 'success' ? 0 : job.fail_streak + 1;
        await db.execute(
          `UPDATE cron_jobs 
           SET last_status = ?, last_run_at = ?, fail_streak = ?, next_run_at = ?, locked_at = NULL
           WHERE id = ?`,
          [status, now, newFailStreak, nextRunAt, job.id]
        );
      } else {
        // Check failed (timeout or other error)
        error = checkResult.error;
        const duration = checkResult.duration;
        status = 'fail'; // Check failed, so status is 'fail'
        
        // Debug logging for errors
        console.error(`Cron job ${job.id} check error:`, {
          url: job.url,
          error: error,
          timeout: job.timeout_ms,
        });

        // Log run
        const runId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO cron_runs (id, cron_job_id, ts, status, http_status, duration_ms, error, response_body)
           VALUES (?, ?, ?, 'fail', ?, ?, ?, ?)`,
          [runId, job.id, now, httpStatus, duration, error, null]
        );

        // Calculate new fail streak (BEFORE status update, so we can use old fail_streak)
        const nextRunAt = calculateNextRun(job.cron_expr, job.interval_sec);
        const newFailStreak = job.fail_streak + 1;

        // Incident management (BEFORE status update, so we can use old fail_streak)
        if (newFailStreak >= 3) {
          // Check if incident already exists
          const existingIncident = await db.queryFirst<{ id: string }>(
            `SELECT id FROM incidents 
             WHERE type = 'cron' AND source_id = ? AND resolved_at IS NULL`,
            [job.id]
          );

          if (!existingIncident) {
            // Open incident
            const incidentId = crypto.randomUUID();
            const cause = error?.includes('abort') || error?.includes('timeout') ? 'timeout' : 'http_error';
            await db.execute(
              `INSERT INTO incidents (id, type, source_id, user_id, cause, http_status, started_at, last_update_at)
               VALUES (?, 'cron', ?, ?, ?, ?, ?, ?)`,
              [incidentId, job.id, job.user_id, cause, httpStatus, now, now]
            );
            // Add 'started' event
            const eventId = crypto.randomUUID();
            const eventContent = `Cron job failed ${newFailStreak} times consecutively`;
            await db.execute(
              `INSERT INTO incident_events (id, incident_id, event_type, content, created_at)
               VALUES (?, ?, 'started', ?, ?)`,
              [eventId, incidentId, eventContent, now]
            );

            // Send email notification (use ctx.waitUntil to ensure it completes)
            if (job.user_id && ctx) {
              ctx.waitUntil(sendEmailViaAPI(env, 'incident', {
                userId: job.user_id,
                incidentType: 'cron',
                sourceId: job.id,
                cause,
                httpStatus,
                timestamp: now,
                incidentId,
              }));
            }
          }
        }

        // Update cron job (AFTER incident management, so we can use old fail_streak)
        await db.execute(
          `UPDATE cron_jobs 
           SET last_status = ?, last_run_at = ?, fail_streak = ?, next_run_at = ?, locked_at = NULL
           WHERE id = ?`,
          [status, now, newFailStreak, nextRunAt, job.id]
        );
      }
    } catch (err: any) {
      console.error(`Error processing cron job ${job.id}:`, err);
      // Unlock on error
      await db.execute(`UPDATE cron_jobs SET locked_at = NULL WHERE id = ?`, [
        job.id,
      ]);
    }
  }
}

/**
 * Flush all buffers to R2 (safety flush)
 */
async function flushAllBuffers(checksBucket: R2Bucket): Promise<void> {
  const monitorIds = Array.from(checkBuffers.keys());
  const flushPromises = monitorIds.map(monitorId => 
    flushBufferToR2(checksBucket, monitorId)
  );
  await Promise.all(flushPromises);
}

async function pruneLogs(db: D1Client) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // monitor_checks table removed - data is now in R2
  // R2 retention is handled separately if needed

  // Delete old cron runs
  await db.execute(
    `DELETE FROM cron_runs WHERE ts < ?`,
    [thirtyDaysAgo]
  );

  // Delete expired guest cron jobs (created by unauthenticated users)
  // Also delete their associated cron runs
  const expiredGuestCrons = await db.queryAll<{ id: string }>(
    `SELECT id FROM cron_jobs WHERE expires_at IS NOT NULL AND expires_at < ?`,
    [now]
  );

  if (expiredGuestCrons.length > 0) {
    const expiredIds = expiredGuestCrons.map((c) => c.id);
    
    // Delete cron runs for expired guest crons
    await db.execute(
      `DELETE FROM cron_runs WHERE cron_job_id IN (${expiredIds.map(() => '?').join(',')})`,
      [...expiredIds]
    );
    
    // Delete the expired guest cron jobs
    await db.execute(
      `DELETE FROM cron_jobs WHERE id IN (${expiredIds.map(() => '?').join(',')})`,
      [...expiredIds]
    );
    
    console.log(`Cleaned up ${expiredGuestCrons.length} expired guest cron jobs`);
  }
}

/**
 * Clean up stale locks that are older than the timeout
 * This prevents jobs from being stuck forever if a worker crashes
 */
async function cleanupStaleLocks(db: D1Client) {
  const now = Date.now();
  const lockTimeout = now - 300000; // 5 minutes ago

  try {
    // Clean stale locks for monitors
    const staleMonitors = await db.execute(
      `UPDATE monitors SET locked_at = NULL WHERE locked_at IS NOT NULL AND locked_at < ?`,
      [lockTimeout]
    );

    // Clean stale locks for cron jobs
    const staleCronJobs = await db.execute(
      `UPDATE cron_jobs SET locked_at = NULL WHERE locked_at IS NOT NULL AND locked_at < ?`,
      [lockTimeout]
    );

    // Log if any locks were cleaned (for debugging)
    if (staleMonitors.meta?.changes > 0 || staleCronJobs.meta?.changes > 0) {
      console.log(`Cleaned up stale locks: ${staleMonitors.meta?.changes || 0} monitors, ${staleCronJobs.meta?.changes || 0} cron jobs`);
    }
  } catch (error) {
    console.error('Error cleaning up stale locks:', error);
    // Don't throw - continue with normal processing
  }
}

/**
 * Gunluk kampanya emaili: load test yapmis free kullanicilara Pro upgrade maili gonder.
 * Next.js API'yi cagirir, API hedef kitleyi sorgular ve emailleri gonderir.
 */
async function sendDailyCampaignEmails(env: Env): Promise<void> {
  const apiUrl = env.NEXT_PUBLIC_APP_URL || 'https://www.uptimetr.com';
  const secret = env.CAMPAIGN_API_SECRET;
  if (!secret) return;

  try {
    const res = await fetch(`${apiUrl}/api/email/campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Campaign-Secret': secret,
      },
      body: JSON.stringify({
        campaign: 'pro_upgrade_loadtest_v1',
        limit: 50,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[campaign] API returned ${res.status}: ${text}`);
      return;
    }

    const data = await res.json() as { sent?: number; errors?: number; totalTargets?: number };
    console.log(`[campaign] Daily send complete: ${data.sent ?? 0} sent, ${data.errors ?? 0} errors, ${data.totalTargets ?? 0} targets`);
  } catch (err) {
    console.error('[campaign] Failed to call campaign API:', err);
  }
}

async function runScheduledTask(env: Env, cron?: string, ctx?: ExecutionContext) {
  const db = getD1Client(env);

  if (cron === '0 3 * * *') {
    // Daily prune at 3 AM
    await pruneLogs(db);
    // Daily campaign emails — yeni load test yapmis free kullanicilara
    if (env.CAMPAIGN_API_SECRET) {
      await sendDailyCampaignEmails(env).catch((err) => {
        console.error('[scheduler] Campaign email error:', err);
      });
    }
  } else if (cron === '*/10 * * * *') {
    // Every 10 minutes: flush all buffers (safety flush)
    await flushAllBuffers(env.CHECKS_BUCKET);
  } else {
    // Every minute: first clean up stale locks, then process jobs
    await cleanupStaleLocks(db);
    await Promise.all([processMonitors(db, env.CHECKS_BUCKET, env, ctx), processCronJobs(db, env, ctx)]);
  }
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await runScheduledTask(env, event.cron, ctx);
  },

  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // D1 Proxy: Get cron runs for a cron job
    if (url.pathname.startsWith('/api/cron-runs/') && request.method === 'GET') {
      try {
        const cronJobId = url.pathname.split('/api/cron-runs/')[1];
        if (!cronJobId) {
          return new Response(
            JSON.stringify({ error: 'Cron job ID required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const db = getD1Client(env);
        
        // Check if cron job exists
        const cronJob = await db.queryFirst<{ id: string }>(
          'SELECT id FROM cron_jobs WHERE id = ?',
          [cronJobId]
        );

        if (!cronJob) {
          return new Response(
            JSON.stringify({ error: 'Cron job not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const limit = url.searchParams.get('limit')
          ? parseInt(url.searchParams.get('limit')!)
          : 50;
        const startDate = url.searchParams.get('start_date')
          ? parseInt(url.searchParams.get('start_date')!)
          : undefined;

        let query = `SELECT * FROM cron_runs WHERE cron_job_id = ?`;
        const params: any[] = [cronJobId];

        if (startDate) {
          query += ` AND ts >= ?`;
          params.push(startDate);
        }

        query += ` ORDER BY ts DESC LIMIT ?`;
        params.push(limit);

        const runs = await db.queryAll(query, params);
        
        return new Response(JSON.stringify(runs), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
          },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // R2 Proxy: Get checks for a monitor
    if (url.pathname.startsWith('/api/checks/') && request.method === 'GET') {
      try {
        const monitorId = url.pathname.split('/api/checks/')[1];
        if (!monitorId) {
          return new Response(
            JSON.stringify({ error: 'Monitor ID required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const startDate = url.searchParams.get('start_date') 
          ? parseInt(url.searchParams.get('start_date')!)
          : Date.now() - (30 * 24 * 60 * 60 * 1000); // Default 30 days
        const endDate = url.searchParams.get('end_date')
          ? parseInt(url.searchParams.get('end_date')!)
          : Date.now();
        const limit = url.searchParams.get('limit')
          ? parseInt(url.searchParams.get('limit')!)
          : undefined;

        // Get checks from R2 (flushed)
        const r2Checks = await getChecksFromR2(env.CHECKS_BUCKET, monitorId, startDate, endDate);
        
        // Get checks from memory buffer (not yet flushed)
        const bufferChecks = checkBuffers.get(monitorId) || [];
        const filteredBufferChecks = bufferChecks.filter(
          check => check.ts >= startDate && check.ts <= endDate
        );
        
        // Combine and sort
        const allChecks = [...r2Checks, ...filteredBufferChecks]
          .sort((a, b) => b.ts - a.ts); // Newest first
        
        // Apply limit
        const checks = limit && limit > 0 ? allChecks.slice(0, limit) : allChecks;
        
        return new Response(JSON.stringify(checks), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
          },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // R2 Proxy: Append check to R2
    if (url.pathname.startsWith('/api/checks/') && request.method === 'POST') {
      try {
        const monitorId = url.pathname.split('/api/checks/')[1];
        if (!monitorId) {
          return new Response(
            JSON.stringify({ error: 'Monitor ID required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json() as MonitorCheck;
        if (body.monitor_id !== monitorId) {
          return new Response(
            JSON.stringify({ error: 'Monitor ID mismatch' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        await appendCheckToR2(env.CHECKS_BUCKET, body);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
          },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Asset Get: Serve file from R2
    if (url.pathname.startsWith('/assets/') && request.method === 'GET') {
      try {
        const filePath = url.pathname.replace('/assets/', '');
        
        if (!filePath) {
          return new Response('File path required', { status: 400 });
        }

        const object = await env.CHECKS_BUCKET.get(filePath);
        
        if (!object) {
          return new Response('Not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(object.body, { headers });
      } catch (error: any) {
        return new Response(error.message, { status: 500 });
      }
    }

    // Asset Upload: Upload file to R2 (for logos, etc.)
    if (url.pathname === '/api/assets/upload' && request.method === 'POST') {
      try {
        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
        const filePath = request.headers.get('X-File-Path');
        
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: 'X-File-Path header required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const data = await request.arrayBuffer();
        
        // Upload to R2
        await env.CHECKS_BUCKET.put(filePath, data, {
          httpMetadata: {
            contentType: contentType.split(';')[0].trim(),
          },
        });

        return new Response(JSON.stringify({ 
          success: true, 
          path: filePath 
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
          },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Asset Delete: Delete file from R2
    if (url.pathname.startsWith('/api/assets/') && request.method === 'DELETE') {
      try {
        const filePath = url.pathname.replace('/api/assets/', '');
        
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: 'File path required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Delete from R2
        await env.CHECKS_BUCKET.delete(filePath);

        return new Response(JSON.stringify({ success: true }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE',
          },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // CORS preflight for assets
    if (url.pathname.startsWith('/api/assets') && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-File-Path',
        },
      });
    }

    // Test endpoint for Cloudflare detection
    if (url.pathname === '/test-cf' && request.method === 'POST') {
      try {
        const body = await request.json() as { url: string };
        const testUrl = body.url;
        
        if (!testUrl) {
          return new Response(JSON.stringify({ error: 'URL required' }), { status: 400 });
        }
        
        // Debug: Log proxy URL
        const proxyUrl = env.TR_PROXY_URL;
        if (!proxyUrl) {
          return new Response(JSON.stringify({ error: 'TR_PROXY_URL not configured' }), { status: 500 });
        }
        
        // Test with proxy
        const proxyResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.TR_PROXY_SECRET}`,
          },
          body: JSON.stringify({
            url: testUrl,
            method: 'GET',
            timeout_ms: 15000,
          }),
        });
        
        const proxyRawText = await proxyResponse.text();
        
        let proxyResult: { success: boolean; status?: number; body?: string; error?: string };
        try {
          proxyResult = JSON.parse(proxyRawText);
        } catch (e) {
          return new Response(JSON.stringify({
            error: 'Proxy response is not JSON',
            proxyUrl: proxyUrl,
            proxyStatus: proxyResponse.status,
            proxyRawText: proxyRawText.substring(0, 500),
          }, null, 2), { status: 500 });
        }
        
        const httpStatus = proxyResult.status || 0;
        const bodyText = proxyResult.body || '';
        
        // Check Cloudflare challenge
        const isCloudflareChallenge = httpStatus === 403 && bodyText && (
          bodyText.includes('_cf_chl_opt') || 
          bodyText.includes('Just a moment') ||
          bodyText.includes('challenge-platform') ||
          bodyText.includes('cf-chl-bypass')
        );
        
        return new Response(JSON.stringify({
          url: testUrl,
          httpStatus,
          bodyLength: bodyText.length,
          bodyPreview: bodyText.substring(0, 300),
          hasCfChlOpt: bodyText.includes('_cf_chl_opt'),
          hasJustAMoment: bodyText.includes('Just a moment'),
          hasChallengePlatform: bodyText.includes('challenge-platform'),
          isCloudflareChallenge,
          wouldBeStatus: isCloudflareChallenge ? 'up' : (httpStatus >= 200 && httpStatus <= 399 ? 'up' : 'down'),
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Manual trigger for testing (only in development)
    if (url.pathname === '/trigger' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const cron = body.cron || undefined;

        // Run scheduled task manually
        await runScheduledTask(env, cron);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Scheduled task executed',
            cron: cron || 'default (every minute)'
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message 
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Default response
    return new Response(
      JSON.stringify({
        message: 'Uptime Monitor Scheduler',
        endpoints: {
          health: 'GET /health',
          trigger: 'POST /trigger (for testing)',
          getChecks: 'GET /api/checks/{monitorId}?start_date={ts}&end_date={ts}&limit={n}',
          getCronRuns: 'GET /api/cron-runs/{cronJobId}?start_date={ts}&limit={n}',
          uploadAsset: 'POST /api/assets/upload (X-File-Path header required)',
          deleteAsset: 'DELETE /api/assets/{path}',
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};

