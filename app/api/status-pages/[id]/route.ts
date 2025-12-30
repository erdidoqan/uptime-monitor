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
import { addVercelDomain, removeVercelDomain } from '@/lib/vercel-api';

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
    
    const statusPage = await db.queryFirst(
      'SELECT * FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) {
      return notFoundResponse('Status page not found');
    }

    return successResponse(statusPage);
  } catch (error: any) {
    console.error('Get status page error:', error);
    return errorResponse(error.message || 'Failed to fetch status page', 500);
  }
}

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
    const existing = await db.queryFirst(
      'SELECT * FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!existing) {
      return notFoundResponse('Status page not found');
    }

    const body = await request.json();
    const {
      company_name,
      subdomain,
      custom_domain,
      logo_url,
      logo_link_url,
      contact_url,
      is_active,
    } = body;

    // If subdomain is being changed, validate and check uniqueness
    const oldSubdomain = (existing as any).subdomain;
    if (subdomain && subdomain.toLowerCase() !== oldSubdomain) {
      const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
      if (!subdomainRegex.test(subdomain.toLowerCase())) {
        return errorResponse('Subdomain must be alphanumeric and can contain hyphens (not at start or end)');
      }

      const subdomainExists = await db.queryFirst(
        'SELECT id FROM status_pages WHERE subdomain = ? AND id != ?',
        [subdomain.toLowerCase(), id]
      );
      if (subdomainExists) {
        return errorResponse('This subdomain is already taken', 409);
      }

      // Remove old domain from Vercel and add new one (non-blocking)
      const oldDomain = `${oldSubdomain}.cronuptime.com`;
      const newDomain = `${subdomain.toLowerCase()}.cronuptime.com`;
      
      removeVercelDomain(oldDomain).catch((error) => {
        console.error(`Failed to remove old domain ${oldDomain} from Vercel:`, error);
      });
      
      addVercelDomain(newDomain).catch((error) => {
        console.error(`Failed to add new domain ${newDomain} to Vercel:`, error);
      });
    }

    const now = Date.now();

    await db.execute(
      `UPDATE status_pages SET
        company_name = COALESCE(?, company_name),
        subdomain = COALESCE(?, subdomain),
        custom_domain = ?,
        logo_url = ?,
        logo_link_url = ?,
        contact_url = ?,
        is_active = COALESCE(?, is_active),
        updated_at = ?
      WHERE id = ?`,
      [
        company_name || null,
        subdomain ? subdomain.toLowerCase() : null,
        custom_domain !== undefined ? custom_domain : (existing as any).custom_domain,
        logo_url !== undefined ? logo_url : (existing as any).logo_url,
        logo_link_url !== undefined ? logo_link_url : (existing as any).logo_link_url,
        contact_url !== undefined ? contact_url : (existing as any).contact_url,
        is_active !== undefined ? is_active : null,
        now,
        id,
      ]
    );

    const statusPage = await db.queryFirst(
      'SELECT * FROM status_pages WHERE id = ?',
      [id]
    );

    return successResponse(statusPage);
  } catch (error: any) {
    console.error('Update status page error:', error);
    return errorResponse(error.message || 'Failed to update status page', 500);
  }
}

export async function DELETE(
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
    const existing = await db.queryFirst(
      'SELECT id FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!existing) {
      return notFoundResponse('Status page not found');
    }

    // Get subdomain before deletion for Vercel cleanup
    const subdomain = (existing as any).subdomain;
    const domainToRemove = `${subdomain}.cronuptime.com`;

    // Delete related resources and sections first (cascade)
    await db.execute(
      `DELETE FROM status_page_resources WHERE section_id IN (
        SELECT id FROM status_page_sections WHERE status_page_id = ?
      )`,
      [id]
    );
    await db.execute('DELETE FROM status_page_sections WHERE status_page_id = ?', [id]);
    await db.execute('DELETE FROM status_pages WHERE id = ?', [id]);

    // Remove domain from Vercel (non-blocking)
    removeVercelDomain(domainToRemove).catch((error) => {
      console.error(`Failed to remove domain ${domainToRemove} from Vercel:`, error);
    });

    return successResponse({ message: 'Status page deleted successfully' });
  } catch (error: any) {
    console.error('Delete status page error:', error);
    return errorResponse(error.message || 'Failed to delete status page', 500);
  }
}






