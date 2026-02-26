import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:read')) {
      return errorResponse('Insufficient permissions. Required scope: status-pages:read', 403);
    }

    const db = getD1Client();
    const statusPages = await db.queryAll(
      `SELECT * FROM status_pages WHERE user_id = ? ORDER BY created_at DESC`,
      [auth.userId]
    );

    return successResponse(statusPages);
  } catch (error: any) {
    console.error('Get status pages error:', error);
    return errorResponse(error.message || 'Failed to fetch status pages', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:write')) {
      return errorResponse('Insufficient permissions. Required scope: status-pages:write', 403);
    }

    const body = await request.json();
    const {
      company_name,
      subdomain,
      custom_domain,
      logo_url,
      logo_link_url,
      contact_url,
    } = body;

    if (!company_name || !subdomain) {
      return errorResponse('company_name and subdomain are required');
    }

    // Validate subdomain format (alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!subdomainRegex.test(subdomain.toLowerCase())) {
      return errorResponse('Subdomain must be alphanumeric and can contain hyphens (not at start or end)');
    }

    const db = getD1Client();

    // Check if subdomain is already taken
    const existing = await db.queryFirst(
      'SELECT id FROM status_pages WHERE subdomain = ?',
      [subdomain.toLowerCase()]
    );
    if (existing) {
      return errorResponse('This subdomain is already taken', 409);
    }

    const statusPageId = uuidv4();
    const now = Date.now();

    await db.execute(
      `INSERT INTO status_pages (
        id, user_id, company_name, subdomain, custom_domain,
        logo_url, logo_link_url, contact_url, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        statusPageId,
        auth.userId,
        company_name,
        subdomain.toLowerCase(),
        custom_domain || null,
        logo_url || null,
        logo_link_url || null,
        contact_url || null,
        now,
        now,
      ]
    );

    const statusPage = await db.queryFirst(
      'SELECT * FROM status_pages WHERE id = ?',
      [statusPageId]
    );

    // Note: Subdomain routing handled by wildcard domain *.uptimetr.com
    // No need to add individual subdomains to Vercel

    return successResponse(statusPage, 201);
  } catch (error: any) {
    console.error('Create status page error:', error);
    return errorResponse(error.message || 'Failed to create status page', 500);
  }
}






