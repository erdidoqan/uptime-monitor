import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { ApiToken } from '@/shared/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const db = getD1Client();

    const token = await db.queryFirst<{
      id: string;
      user_id: string;
      name: string | null;
      token_prefix: string;
      scopes: string;
      last_used_at: number | null;
      expires_at: number | null;
      created_at: number;
      revoked_at: number | null;
    }>(
      `SELECT id, user_id, name, token_prefix, scopes, last_used_at, expires_at, created_at, revoked_at
       FROM api_tokens
       WHERE id = ? AND user_id = ?`,
      [id, auth.userId]
    );

    if (!token) {
      return errorResponse('API token not found', 404);
    }

    const formattedToken: ApiToken = {
      id: token.id,
      user_id: token.user_id,
      name: token.name,
      token_prefix: token.token_prefix,
      scopes: JSON.parse(token.scopes || '[]'),
      last_used_at: token.last_used_at,
      expires_at: token.expires_at,
      created_at: token.created_at,
      revoked_at: token.revoked_at,
    };

    return successResponse(formattedToken);
  } catch (error: any) {
    console.error('Get API token error:', error);
    return errorResponse(error.message || 'Failed to fetch API token', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, scopes, expires_at } = body;

    const db = getD1Client();

    // Check if token exists and belongs to user
    const existingToken = await db.queryFirst<{
      id: string;
      user_id: string;
      revoked_at: number | null;
    }>(
      'SELECT id, user_id, revoked_at FROM api_tokens WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!existingToken) {
      return errorResponse('API token not found', 404);
    }

    if (existingToken.revoked_at) {
      return errorResponse('Cannot update revoked token', 400);
    }

    // Validate scopes if provided
    if (scopes !== undefined) {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return errorResponse('At least one scope is required');
      }

      const validScopePattern = /^[a-z0-9-]+:[a-z0-9-*]+$|^\*$/;
      for (const scope of scopes) {
        if (typeof scope !== 'string' || !validScopePattern.test(scope)) {
          return errorResponse(
            `Invalid scope format: ${scope}. Expected format: resource:action or *`
          );
        }
      }
    }

    // Validate expiration date if provided
    if (expires_at !== undefined && expires_at !== null) {
      if (typeof expires_at !== 'number' || expires_at <= Date.now()) {
        return errorResponse('Expiration date must be in the future');
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name || null);
    }

    if (scopes !== undefined) {
      updates.push('scopes = ?');
      values.push(JSON.stringify(scopes));
    }

    if (expires_at !== undefined) {
      updates.push('expires_at = ?');
      values.push(expires_at || null);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    values.push(id, auth.userId);

    await db.execute(
      `UPDATE api_tokens 
       SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ?`,
      values
    );

    // Fetch updated token
    const updatedToken = await db.queryFirst<{
      id: string;
      user_id: string;
      name: string | null;
      token_prefix: string;
      scopes: string;
      last_used_at: number | null;
      expires_at: number | null;
      created_at: number;
      revoked_at: number | null;
    }>(
      `SELECT id, user_id, name, token_prefix, scopes, last_used_at, expires_at, created_at, revoked_at
       FROM api_tokens
       WHERE id = ? AND user_id = ?`,
      [id, auth.userId]
    );

    const formattedToken: ApiToken = {
      id: updatedToken!.id,
      user_id: updatedToken!.user_id,
      name: updatedToken!.name,
      token_prefix: updatedToken!.token_prefix,
      scopes: JSON.parse(updatedToken!.scopes || '[]'),
      last_used_at: updatedToken!.last_used_at,
      expires_at: updatedToken!.expires_at,
      created_at: updatedToken!.created_at,
      revoked_at: updatedToken!.revoked_at,
    };

    return successResponse(formattedToken);
  } catch (error: any) {
    console.error('Update API token error:', error);
    return errorResponse(error.message || 'Failed to update API token', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const db = getD1Client();

    // Check if token exists and belongs to user
    const existingToken = await db.queryFirst<{
      id: string;
      revoked_at: number | null;
    }>(
      'SELECT id, revoked_at FROM api_tokens WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!existingToken) {
      return errorResponse('API token not found', 404);
    }

    // Revoke token (soft delete)
    const now = Date.now();
    await db.execute(
      'UPDATE api_tokens SET revoked_at = ? WHERE id = ? AND user_id = ?',
      [now, id, auth.userId]
    );

    return successResponse({ message: 'API token revoked successfully' });
  } catch (error: any) {
    console.error('Revoke API token error:', error);
    return errorResponse(error.message || 'Failed to revoke API token', 500);
  }
}

