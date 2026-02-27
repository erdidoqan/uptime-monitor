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
import { addDomainToProject, removeDomainFromProject, isVercelConfigured } from '@/lib/vercel-domain';

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
      // Note: Subdomain routing handled by wildcard domain *.uptimetr.com
    }

    const now = Date.now();
    const oldCustomDomain = (existing as any).custom_domain;
    const newCustomDomain = custom_domain !== undefined ? (custom_domain || null) : oldCustomDomain;

    // Manage Vercel domain when custom_domain changes
    if (isVercelConfigured() && newCustomDomain !== oldCustomDomain) {
      try {
        if (oldCustomDomain) {
          await removeDomainFromProject(oldCustomDomain);
        }
        if (newCustomDomain) {
          await addDomainToProject(newCustomDomain);
        }
      } catch (err) {
        console.error('Vercel domain operation failed:', err);
        // Don't block the update - domain can be retried via verification endpoint
      }
    }

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
        newCustomDomain,
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
    const existing = await db.queryFirst<{ id: string; custom_domain: string | null }>(
      'SELECT id, custom_domain FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!existing) {
      return notFoundResponse('Status page not found');
    }

    // Remove custom domain from Vercel if configured
    const customDomain = existing.custom_domain;
    if (customDomain && isVercelConfigured()) {
      try {
        await removeDomainFromProject(customDomain);
      } catch (err) {
        console.error('Failed to remove domain from Vercel:', err);
      }
    }

    // Delete related resources and sections first (cascade)
    await db.execute(
      `DELETE FROM status_page_resources WHERE section_id IN (
        SELECT id FROM status_page_sections WHERE status_page_id = ?
      )`,
      [id]
    );
    await db.execute('DELETE FROM status_page_sections WHERE status_page_id = ?', [id]);
    await db.execute('DELETE FROM status_pages WHERE id = ?', [id]);

    return successResponse({ message: 'Status page deleted successfully' });
  } catch (error: any) {
    console.error('Delete status page error:', error);
    return errorResponse(error.message || 'Failed to delete status page', 500);
  }
}






