import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
  notFoundResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:read')) {
      return errorResponse('Insufficient permissions. Required scope: status-pages:read', 403);
    }

    const { id } = await params;
    const db = getD1Client();

    // Check ownership
    const statusPage = await db.queryFirst(
      'SELECT id FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    // Get sections with resources
    const sections = await db.queryAll(
      `SELECT * FROM status_page_sections WHERE status_page_id = ? ORDER BY sort_order ASC`,
      [id]
    );

    // Get resources for each section with monitor/cron_job details
    const sectionsWithResources = await Promise.all(
      (sections as any[]).map(async (section) => {
        const resources = await db.queryAll(
          `SELECT 
            spr.*,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.name
              WHEN spr.resource_type = 'cron_job' THEN c.name
            END as resource_name,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.url
              WHEN spr.resource_type = 'cron_job' THEN c.url
            END as resource_url
          FROM status_page_resources spr
          LEFT JOIN monitors m ON spr.resource_type = 'monitor' AND spr.resource_id = m.id
          LEFT JOIN cron_jobs c ON spr.resource_type = 'cron_job' AND spr.resource_id = c.id
          WHERE spr.section_id = ?
          ORDER BY spr.sort_order ASC`,
          [section.id]
        );
        return { ...section, resources };
      })
    );

    return successResponse(sectionsWithResources);
  } catch (error: any) {
    console.error('Get sections error:', error);
    return errorResponse(error.message || 'Failed to fetch sections', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:write')) {
      return errorResponse('Insufficient permissions. Required scope: status-pages:write', 403);
    }

    const { id } = await params;
    const db = getD1Client();

    // Check ownership
    const statusPage = await db.queryFirst(
      'SELECT id FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    const body = await request.json();
    const { name, resources } = body;

    // Get current max sort_order
    const maxOrder = await db.queryFirst(
      'SELECT MAX(sort_order) as max_order FROM status_page_sections WHERE status_page_id = ?',
      [id]
    );
    const nextOrder = ((maxOrder as any)?.max_order ?? -1) + 1;

    const sectionId = uuidv4();
    const now = Date.now();

    await db.execute(
      `INSERT INTO status_page_sections (id, status_page_id, name, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [sectionId, id, name || null, nextOrder, now]
    );

    // Add resources if provided
    if (resources && Array.isArray(resources)) {
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        const resourceId = uuidv4();
        await db.execute(
          `INSERT INTO status_page_resources (id, section_id, resource_type, resource_id, show_history, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [resourceId, sectionId, resource.resource_type, resource.resource_id, resource.show_history ?? 1, i]
        );
      }
    }

    // Return section with resources
    const section = await db.queryFirst(
      'SELECT * FROM status_page_sections WHERE id = ?',
      [sectionId]
    );

    const sectionResources = await db.queryAll(
      `SELECT 
        spr.*,
        CASE 
          WHEN spr.resource_type = 'monitor' THEN m.name
          WHEN spr.resource_type = 'cron_job' THEN c.name
        END as resource_name,
        CASE 
          WHEN spr.resource_type = 'monitor' THEN m.url
          WHEN spr.resource_type = 'cron_job' THEN c.url
        END as resource_url
      FROM status_page_resources spr
      LEFT JOIN monitors m ON spr.resource_type = 'monitor' AND spr.resource_id = m.id
      LEFT JOIN cron_jobs c ON spr.resource_type = 'cron_job' AND spr.resource_id = c.id
      WHERE spr.section_id = ?
      ORDER BY spr.sort_order ASC`,
      [sectionId]
    );

    return successResponse({ ...section, resources: sectionResources }, 201);
  } catch (error: any) {
    console.error('Create section error:', error);
    return errorResponse(error.message || 'Failed to create section', 500);
  }
}



















