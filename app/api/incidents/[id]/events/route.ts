import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';
import type { Incident, IncidentEvent } from '@/shared/types';

interface RouteContext {
  params: Promise<{ id: string }>;
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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const db = getD1Client();

    // Check ownership
    const incident = await checkIncidentOwnership(db, id, auth.userId);
    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    // Get events with user info
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

    return successResponse(events);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events';
    console.error('Get incident events error:', error);
    return errorResponse(message, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('content is required');
    }

    const db = getD1Client();

    // Check ownership
    const incident = await checkIncidentOwnership(db, id, auth.userId);
    if (!incident) {
      return errorResponse('Incident not found', 404);
    }

    const eventId = uuidv4();
    const now = Date.now();

    await db.execute(
      `INSERT INTO incident_events (id, incident_id, user_id, event_type, content, created_at)
       VALUES (?, ?, ?, 'comment', ?, ?)`,
      [eventId, id, auth.userId, content.trim(), now]
    );

    // Update incident last_update_at
    await db.execute(
      'UPDATE incidents SET last_update_at = ? WHERE id = ?',
      [now, id]
    );

    // Get created event with user info
    const event = await db.queryFirst<IncidentEvent>(
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

    return successResponse(event, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create event';
    console.error('Create incident event error:', error);
    return errorResponse(message, 500);
  }
}

