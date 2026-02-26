import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';
import type { Incident } from '@/shared/types';
import { sendIncidentEmail } from '@/lib/incident-notifications';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'incidents:read')) {
      return errorResponse('Insufficient permissions. Required scope: incidents:read', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'ongoing', 'resolved', 'all'
    const type = searchParams.get('type'); // 'monitor', 'cron', 'all'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getD1Client();

    // Build query with filters
    let whereConditions: string[] = [];
    const params: (string | number)[] = [];

    // Status filter
    if (status === 'ongoing') {
      whereConditions.push('i.resolved_at IS NULL');
    } else if (status === 'resolved') {
      whereConditions.push('i.resolved_at IS NOT NULL');
    }

    // Type filter
    if (type && type !== 'all') {
      whereConditions.push('i.type = ?');
      params.push(type);
    }

    // User filter - get incidents for user's monitors and cron jobs
    whereConditions.push(`(
      (i.type = 'monitor' AND i.source_id IN (SELECT id FROM monitors WHERE user_id = ?))
      OR (i.type = 'cron' AND i.source_id IN (SELECT id FROM cron_jobs WHERE user_id = ?))
    )`);
    params.push(auth.userId, auth.userId);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get incidents with source info (join with monitors/cron_jobs)
    const query = `
      SELECT 
        i.*,
        CASE 
          WHEN i.type = 'monitor' THEN m.name
          WHEN i.type = 'cron' THEN c.name
        END as source_name,
        CASE 
          WHEN i.type = 'monitor' THEN m.url
          WHEN i.type = 'cron' THEN c.url
        END as source_url
      FROM incidents i
      LEFT JOIN monitors m ON i.type = 'monitor' AND i.source_id = m.id
      LEFT JOIN cron_jobs c ON i.type = 'cron' AND i.source_id = c.id
      ${whereClause}
      ORDER BY i.started_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const incidents = await db.queryAll<Incident>(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count
      FROM incidents i
      ${whereClause}
    `;
    const countResult = await db.queryFirst<{ count: number }>(countQuery, params.slice(0, -2));

    return successResponse({
      incidents,
      total: countResult?.count || 0,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch incidents';
    console.error('Get incidents error:', error);
    return errorResponse(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'incidents:write')) {
      return errorResponse('Insufficient permissions. Required scope: incidents:write', 403);
    }

    const body = await request.json();
    const { type, source_id, cause, http_status } = body;

    if (!type || !source_id) {
      return errorResponse('type and source_id are required');
    }

    if (!['monitor', 'cron'].includes(type)) {
      return errorResponse('type must be "monitor" or "cron"');
    }

    const db = getD1Client();

    // Verify source exists and belongs to user
    if (type === 'monitor') {
      const monitor = await db.queryFirst(
        'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
        [source_id, auth.userId]
      );
      if (!monitor) {
        return errorResponse('Monitor not found', 404);
      }
    } else {
      const cronJob = await db.queryFirst(
        'SELECT id FROM cron_jobs WHERE id = ? AND user_id = ?',
        [source_id, auth.userId]
      );
      if (!cronJob) {
        return errorResponse('Cron job not found', 404);
      }
    }

    // Check if there's already an open incident
    const existingIncident = await db.queryFirst<Incident>(
      'SELECT * FROM incidents WHERE type = ? AND source_id = ? AND resolved_at IS NULL',
      [type, source_id]
    );

    if (existingIncident) {
      return errorResponse('An open incident already exists for this source', 409);
    }

    const incidentId = uuidv4();
    const now = Date.now();

    await db.execute(
      `INSERT INTO incidents (id, type, source_id, user_id, cause, http_status, started_at, last_update_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [incidentId, type, source_id, auth.userId, cause || null, http_status || null, now, now]
    );

    // Create 'started' event
    const eventId = uuidv4();
    await db.execute(
      `INSERT INTO incident_events (id, incident_id, user_id, event_type, content, created_at)
       VALUES (?, ?, ?, 'started', ?, ?)`,
      [eventId, incidentId, auth.userId, cause || 'Incident started', now]
    );

    const incident = await db.queryFirst<Incident>(
      'SELECT * FROM incidents WHERE id = ?',
      [incidentId]
    );

    // Send email notification after response is sent
    after(async () => {
      try {
        await sendIncidentEmail({
          userId: auth.userId,
          incidentType: type as 'monitor' | 'cron',
          sourceId: source_id,
          cause: cause || null,
          httpStatus: http_status || null,
          timestamp: now,
          incidentId,
        });
      } catch (error) {
        console.error(`Failed to send incident email for ${incidentId}:`, error);
      }
    });

    return successResponse(incident, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create incident';
    console.error('Create incident error:', error);
    return errorResponse(message, 500);
  }
}

