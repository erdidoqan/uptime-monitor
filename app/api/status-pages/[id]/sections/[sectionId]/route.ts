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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:write')) {
      return errorResponse('Insufficient permissions. Required scope: status-pages:write', 403);
    }

    const { id, sectionId } = await params;
    const db = getD1Client();

    // Check ownership via status page
    const statusPage = await db.queryFirst(
      'SELECT id FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    // Check section exists
    const existingSection = await db.queryFirst(
      'SELECT * FROM status_page_sections WHERE id = ? AND status_page_id = ?',
      [sectionId, id]
    );

    if (!existingSection) {
      return notFoundResponse('Section not found');
    }

    const body = await request.json();
    const { name, resources } = body;

    // Update section name if provided
    if (name !== undefined) {
      await db.execute(
        'UPDATE status_page_sections SET name = ? WHERE id = ?',
        [name || null, sectionId]
      );
    }

    // Update resources if provided
    if (resources !== undefined && Array.isArray(resources)) {
      // Delete existing resources
      await db.execute('DELETE FROM status_page_resources WHERE section_id = ?', [sectionId]);

      // Insert new resources
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

    // Return updated section with resources
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

    return successResponse({ ...section, resources: sectionResources });
  } catch (error: any) {
    console.error('Update section error:', error);
    return errorResponse(error.message || 'Failed to update section', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:write')) {
      return errorResponse('Insufficient permissions. Required scope: status-pages:write', 403);
    }

    const { id, sectionId } = await params;
    const db = getD1Client();

    // Check ownership via status page
    const statusPage = await db.queryFirst(
      'SELECT id FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    // Check section exists
    const existingSection = await db.queryFirst(
      'SELECT id FROM status_page_sections WHERE id = ? AND status_page_id = ?',
      [sectionId, id]
    );

    if (!existingSection) {
      return notFoundResponse('Section not found');
    }

    // Delete resources first, then section
    await db.execute('DELETE FROM status_page_resources WHERE section_id = ?', [sectionId]);
    await db.execute('DELETE FROM status_page_sections WHERE id = ?', [sectionId]);

    return successResponse({ message: 'Section deleted successfully' });
  } catch (error: any) {
    console.error('Delete section error:', error);
    return errorResponse(error.message || 'Failed to delete section', 500);
  }
}



















