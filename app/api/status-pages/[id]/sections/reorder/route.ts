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

export async function PUT(
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
    const { section_ids } = body;

    if (!Array.isArray(section_ids)) {
      return errorResponse('section_ids must be an array');
    }

    // Update sort_order for each section
    for (let i = 0; i < section_ids.length; i++) {
      await db.execute(
        'UPDATE status_page_sections SET sort_order = ? WHERE id = ? AND status_page_id = ?',
        [i, section_ids[i], id]
      );
    }

    // Return updated sections
    const sections = await db.queryAll(
      `SELECT * FROM status_page_sections WHERE status_page_id = ? ORDER BY sort_order ASC`,
      [id]
    );

    return successResponse(sections);
  } catch (error: any) {
    console.error('Reorder sections error:', error);
    return errorResponse(error.message || 'Failed to reorder sections', 500);
  }
}





















