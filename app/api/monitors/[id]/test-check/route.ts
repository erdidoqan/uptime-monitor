import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';
import { sendIncidentEmail, sendIncidentResolvedEmail } from '@/lib/incident-notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const monitorId = id;
    const db = getD1Client();

    // Get monitor - only if it belongs to this user
    const monitor = await db.queryFirst<{
      url: string;
      method: string;
      headers_json: string | null;
      body: string | null;
      timeout_ms: number;
      expected_min: number | null;
      expected_max: number | null;
      keyword: string | null;
      last_status: string | null;
      use_tr_proxy: number | null;
    }>(
      'SELECT url, method, headers_json, body, timeout_ms, expected_min, expected_max, keyword, last_status, use_tr_proxy FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, auth.userId]
    );

    if (!monitor) {
      return errorResponse('Monitor not found', 404);
    }

    // Perform manual check
    const startTime = Date.now();
    let httpStatus: number | null = null;
    let error: string | null = null;
    let status: 'up' | 'down' = 'down';

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      if (monitor.headers_json) {
        try {
          Object.assign(headers, JSON.parse(monitor.headers_json));
        } catch (err) {
          console.error(`Failed to parse headers_json for monitor ${monitorId}:`, err);
        }
      }

      let responseStatus: number;
      let bodyText = '';
      let latency: number;

      // Check if we should use TR proxy
      const useTrProxy = monitor.use_tr_proxy && process.env.TR_PROXY_URL && process.env.TR_PROXY_SECRET;

      if (useTrProxy) {
        // Make request through Turkey proxy
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          monitor.timeout_ms + 5000 // Extra 5s for proxy overhead
        );

        const proxyResponse = await fetch(process.env.TR_PROXY_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TR_PROXY_SECRET}`,
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
        latency = Date.now() - startTime;

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
        // Direct request
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
        });

        clearTimeout(timeoutId);
        responseStatus = response.status;
        latency = Date.now() - startTime;

        // Read body for keyword check
        if (monitor.keyword) {
          bodyText = await response.text();
        }
      }

      httpStatus = responseStatus;

      // Default to 200-399 range if not specified (includes redirects: 301, 302, 303, 307, 308)
      const minStatus = monitor.expected_min ?? 200;
      const maxStatus = monitor.expected_max ?? 399;
      
      const statusInRange = httpStatus >= minStatus && httpStatus <= maxStatus;
      const keywordMatch = !monitor.keyword || bodyText.includes(monitor.keyword);

      status = statusInRange && keywordMatch ? 'up' : 'down';

      // Log check to R2 via Worker proxy
      const checkId = uuidv4();
      const now = Date.now();
      try {
        const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
        const workerResponse = await fetch(`${workerUrl}/api/checks/${monitorId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: checkId,
            monitor_id: monitorId,
            ts: now,
            status,
            http_status: httpStatus,
            latency_ms: latency,
            error: null,
          }),
        });
        
        if (!workerResponse.ok) {
          throw new Error(`Worker returned ${workerResponse.status}`);
        }
      } catch (r2Error) {
        console.error('Failed to write check to R2 via Worker:', r2Error);
        // Continue even if R2 write fails
      }

      // Update monitor (but don't change next_run_at for manual checks)
      await db.execute(
        `UPDATE monitors 
         SET last_status = ?, last_latency_ms = ?, last_checked_at = ?
         WHERE id = ?`,
        [status, latency, now, monitorId]
      );

      // Incident management (same logic as scheduler)
      if (monitor.last_status === 'up' && status === 'down') {
        // Open incident
        const incidentId = uuidv4();
        const cause = !statusInRange ? 'http_error' : !keywordMatch ? 'keyword_missing' : 'unknown';
        await db.execute(
          `INSERT INTO incidents (id, type, source_id, user_id, cause, http_status, started_at, last_update_at)
           VALUES (?, 'monitor', ?, ?, ?, ?, ?, ?)`,
          [incidentId, monitorId, auth.userId, cause, httpStatus, now, now]
        );
        
        // Add 'started' event
        const eventId = uuidv4();
        const eventContent = cause === 'http_error' 
          ? `HTTP ${httpStatus} error` 
          : cause === 'keyword_missing' 
          ? 'Keyword not found in response' 
          : 'Monitor check failed';
        await db.execute(
          `INSERT INTO incident_events (id, incident_id, user_id, event_type, content, created_at)
           VALUES (?, ?, ?, 'started', ?, ?)`,
          [eventId, incidentId, auth.userId, eventContent, now]
        );

        // Send email notification (fire-and-forget)
        sendIncidentEmail({
          userId: auth.userId,
          incidentType: 'monitor',
          sourceId: monitorId,
          cause,
          httpStatus,
          timestamp: now,
          incidentId,
        });
      } else if (monitor.last_status === 'down' && status === 'up') {
        // Close incident
        const resolvedIncident = await db.queryFirst<{ id: string; started_at: number }>(
          `SELECT id, started_at FROM incidents 
           WHERE type = 'monitor' AND source_id = ? AND resolved_at IS NULL`,
          [monitorId]
        );

        if (resolvedIncident) {
          await db.execute(
            `UPDATE incidents 
             SET resolved_at = ?, last_update_at = ?
             WHERE id = ?`,
            [now, now, resolvedIncident.id]
          );

          // Send resolved email notification (fire-and-forget)
          sendIncidentResolvedEmail({
            userId: auth.userId,
            incidentType: 'monitor',
            sourceId: monitorId,
            incidentId: resolvedIncident.id,
            resolvedAt: now,
            startedAt: resolvedIncident.started_at,
          });
        }
      }

      return successResponse({
        status,
        http_status: httpStatus,
        latency_ms: latency,
        check_id: checkId,
        debug: {
          expected_min: minStatus,
          expected_max: maxStatus,
          status_in_range: statusInRange,
          keyword: monitor.keyword,
          keyword_match: keywordMatch,
          url: monitor.url,
        },
      });
    } catch (err: any) {
        error = err.message || 'Request failed';
        const latency = Date.now() - startTime;

        // Log check to R2 via Worker proxy
        const checkId = uuidv4();
        const now = Date.now();
        try {
          const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
          const workerResponse = await fetch(`${workerUrl}/api/checks/${monitorId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: checkId,
              monitor_id: monitorId,
              ts: now,
              status: 'down',
              http_status: httpStatus,
              latency_ms: latency,
              error,
            }),
          });
          
          if (!workerResponse.ok) {
            throw new Error(`Worker returned ${workerResponse.status}`);
          }
        } catch (r2Error) {
          console.error('Failed to write check to R2 via Worker:', r2Error);
          // Continue even if R2 write fails
        }

      // Update monitor
      await db.execute(
        `UPDATE monitors 
         SET last_status = 'down', last_latency_ms = ?, last_checked_at = ?
         WHERE id = ?`,
        [latency, now, monitorId]
      );

      // Open incident if was up
      if (monitor.last_status === 'up') {
        const incidentId = uuidv4();
        const cause = error?.includes('abort') || error?.includes('timeout') ? 'timeout' : 'http_error';
        await db.execute(
          `INSERT INTO incidents (id, type, source_id, user_id, cause, http_status, started_at, last_update_at)
           VALUES (?, 'monitor', ?, ?, ?, ?, ?, ?)`,
          [incidentId, monitorId, auth.userId, cause, httpStatus, now, now]
        );
        
        // Add 'started' event
        const eventId = uuidv4();
        const eventContent = cause === 'timeout' ? 'Connection timeout' : error || 'Monitor check failed';
        await db.execute(
          `INSERT INTO incident_events (id, incident_id, user_id, event_type, content, created_at)
           VALUES (?, ?, ?, 'started', ?, ?)`,
          [eventId, incidentId, auth.userId, eventContent, now]
        );

        // Send email notification (fire-and-forget)
        sendIncidentEmail({
          userId: auth.userId,
          incidentType: 'monitor',
          sourceId: monitorId,
          cause,
          httpStatus,
          timestamp: now,
          incidentId,
        });
      }

      return successResponse({
        status: 'down',
        http_status: httpStatus,
        latency_ms: latency,
        error,
        check_id: checkId,
        debug: {
          expected_min: monitor.expected_min ?? 200,
          expected_max: monitor.expected_max ?? 299,
          status_in_range: httpStatus ? (httpStatus >= (monitor.expected_min ?? 200) && httpStatus <= (monitor.expected_max ?? 299)) : false,
          keyword: monitor.keyword,
          keyword_match: null, // Could not check due to error
          url: monitor.url,
        },
      });
    }
  } catch (error: any) {
    console.error('Test check error:', error);
    return errorResponse(error.message || 'Failed to perform test check', 500);
  }
}

