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
import type { Incident, IncidentEvent } from '@/shared/types';
import { sendIncidentResolvedEmail } from '@/lib/incident-notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Helper to check incident ownership
async function getIncidentWithAuth(
  db: ReturnType<typeof getD1Client>,
  incidentId: string,
  userId: string
): Promise<Incident | null> {
  const incident = await db.queryFirst<Incident>(
    'SELECT * FROM incidents WHERE id = ?',
    [incidentId]
  );

  if (!incident) {
    return null;
  }

  // Check ownership through source
  if (incident.type === 'monitor') {
    const monitor = await db.queryFirst(
      'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
      [incident.source_id, userId]
    );
    if (!monitor) return null;
  } else {
    const cronJob = await db.queryFirst(
      'SELECT id FROM cron_jobs WHERE id = ? AND user_id = ?',
      [incident.source_id, userId]
    );
    if (!cronJob) return null;
  }

  return incident;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'incidents:read')) {
      return errorResponse('Insufficient permissions. Required scope: incidents:read', 403);
    }

    const { id } = await context.params;
    const db = getD1Client();

    // Get incident with source info
    const incident = await db.queryFirst<Incident>(
      `SELECT 
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
      WHERE i.id = ?`,
      [id]
    );

    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    // Check ownership
    const authCheck = await getIncidentWithAuth(db, id, auth.userId);
    if (!authCheck) {
      return errorResponse('Incident not found', 404);
    }

    // Get events for timeline
    const events = await db.queryAll<IncidentEvent>(
      `SELECT 
        e.*,
        u.name as user_name,
        u.email as user_email,
        u.image as user_image
      FROM incident_events e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.incident_id = ?
      ORDER BY e.created_at DESC`,
      [id]
    );

    return successResponse({ incident, events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch incident';
    console.error('Get incident error:', error);
    return errorResponse(message, 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'incidents:write')) {
      return errorResponse('Insufficient permissions. Required scope: incidents:write', 403);
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action } = body; // 'resolve' or 'reopen'

    if (!action || !['resolve', 'reopen'].includes(action)) {
      return errorResponse('action must be "resolve" or "reopen"');
    }

    const db = getD1Client();

    const incident = await getIncidentWithAuth(db, id, auth.userId);
    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    const now = Date.now();

    if (action === 'resolve') {
      if (incident.resolved_at) {
        return errorResponse('Incident is already resolved', 400);
      }

      await db.execute(
        'UPDATE incidents SET resolved_at = ?, last_update_at = ? WHERE id = ?',
        [now, now, id]
      );

      // Create 'resolved' event
      const eventId = uuidv4();
      await db.execute(
        `INSERT INTO incident_events (id, incident_id, user_id, event_type, content, created_at)
         VALUES (?, ?, ?, 'resolved', 'Incident resolved manually', ?)`,
        [eventId, id, auth.userId, now]
      );

      // Send resolved email notification after response is sent
      after(async () => {
        try {
          await sendIncidentResolvedEmail({
            userId: incident.user_id || auth.userId,
            incidentType: incident.type as 'monitor' | 'cron',
            sourceId: incident.source_id,
            incidentId: id,
            resolvedAt: now,
            startedAt: incident.started_at,
          });
        } catch (error) {
          console.error(`Failed to send resolved email for incident ${id}:`, error);
        }
      });
    } else {
      // reopen
      if (!incident.resolved_at) {
        return errorResponse('Incident is already open', 400);
      }

      await db.execute(
        'UPDATE incidents SET resolved_at = NULL, last_update_at = ? WHERE id = ?',
        [now, id]
      );

      // Create reopen event (using 'started' type for reopening)
      const eventId = uuidv4();
      await db.execute(
        `INSERT INTO incident_events (id, incident_id, user_id, event_type, content, created_at)
         VALUES (?, ?, ?, 'started', 'Incident reopened', ?)`,
        [eventId, id, auth.userId, now]
      );
    }

    const updatedIncident = await db.queryFirst<Incident>(
      'SELECT * FROM incidents WHERE id = ?',
      [id]
    );

    return successResponse(updatedIncident);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update incident';
    console.error('Update incident error:', error);
    return errorResponse(message, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'incidents:write')) {
      return errorResponse('Insufficient permissions. Required scope: incidents:write', 403);
    }

    const { id } = await context.params;
    const db = getD1Client();

    const incident = await getIncidentWithAuth(db, id, auth.userId);
    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    // Delete events first (cascade should handle this, but being explicit)
    await db.execute('DELETE FROM incident_events WHERE incident_id = ?', [id]);
    await db.execute('DELETE FROM incidents WHERE id = ?', [id]);

    return successResponse({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete incident';
    console.error('Delete incident error:', error);
    return errorResponse(message, 500);
  }
}

