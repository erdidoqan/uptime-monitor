import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import type { Incident, IncidentEvent } from '@/shared/types';

interface RouteContext {
  params: Promise<{ id: string; eventId: string }>;
}

// Helper to check incident ownership
async function checkIncidentOwnership(
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id, eventId } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('content is required');
    }

    const db = getD1Client();

    // Check incident ownership
    const incident = await checkIncidentOwnership(db, id, auth.userId);
    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    // Get event and verify ownership (only comment owner can edit)
    const event = await db.queryFirst<IncidentEvent>(
      'SELECT * FROM incident_events WHERE id = ? AND incident_id = ?',
      [eventId, id]
    );

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    if (event.event_type !== 'comment') {
      return errorResponse('Only comments can be edited', 400);
    }

    if (event.user_id !== auth.userId) {
      return errorResponse('You can only edit your own comments', 403);
    }

    const now = Date.now();

    await db.execute(
      'UPDATE incident_events SET content = ?, updated_at = ? WHERE id = ?',
      [content.trim(), now, eventId]
    );

    // Get updated event with user info
    const updatedEvent = await db.queryFirst<IncidentEvent>(
      `SELECT 
        e.*,
        u.name as user_name,
        u.email as user_email,
        u.image as user_image
      FROM incident_events e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?`,
      [eventId]
    );

    return successResponse(updatedEvent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update event';
    console.error('Update incident event error:', error);
    return errorResponse(message, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id, eventId } = await context.params;
    const db = getD1Client();

    // Check incident ownership
    const incident = await checkIncidentOwnership(db, id, auth.userId);
    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    // Get event and verify ownership
    const event = await db.queryFirst<IncidentEvent>(
      'SELECT * FROM incident_events WHERE id = ? AND incident_id = ?',
      [eventId, id]
    );

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    if (event.event_type !== 'comment') {
      return errorResponse('Only comments can be deleted', 400);
    }

    if (event.user_id !== auth.userId) {
      return errorResponse('You can only delete your own comments', 403);
    }

    await db.execute('DELETE FROM incident_events WHERE id = ?', [eventId]);

    return successResponse({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete event';
    console.error('Delete incident event error:', error);
    return errorResponse(message, 500);
  }
}

