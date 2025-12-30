import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import {
  generateApiToken,
  hashToken,
  formatTokenForDisplay,
} from '@/lib/api-token-utils';
import { v4 as uuidv4 } from 'uuid';
import { ApiToken } from '@/shared/types';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const db = getD1Client();
    const tokens = await db.queryAll<{
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
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [auth.userId]
    );

    // Ensure tokens is an array
    if (!Array.isArray(tokens)) {
      console.error('Tokens is not an array:', tokens);
      return successResponse([]);
    }

    const formattedTokens: ApiToken[] = tokens.map((token) => ({
      id: token.id,
      user_id: token.user_id,
      name: token.name,
      token_prefix: token.token_prefix,
      scopes: JSON.parse(token.scopes || '[]'),
      last_used_at: token.last_used_at,
      expires_at: token.expires_at,
      created_at: token.created_at,
      revoked_at: token.revoked_at,
    }));

    return successResponse(formattedTokens);
  } catch (error: any) {
    console.error('Get API tokens error:', error);
    return errorResponse(error.message || 'Failed to fetch API tokens', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, scopes, expires_at } = body;

    // Validate scopes
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return errorResponse('At least one scope is required');
    }

    // Validate scope format
    const validScopePattern = /^[a-z0-9-]+:[a-z0-9-*]+$|^\*$/;
    for (const scope of scopes) {
      if (typeof scope !== 'string' || !validScopePattern.test(scope)) {
        return errorResponse(
          `Invalid scope format: ${scope}. Expected format: resource:action or *`
        );
      }
    }

    // Validate expiration date if provided
    if (expires_at !== undefined && expires_at !== null) {
      if (typeof expires_at !== 'number' || expires_at <= Date.now()) {
        return errorResponse('Expiration date must be in the future');
      }
    }

    // Generate token
    const token = generateApiToken();
    const tokenHash = await hashToken(token);
    const tokenPrefix = formatTokenForDisplay(token);

    const db = getD1Client();
    const tokenId = uuidv4();
    const now = Date.now();

    await db.execute(
      `INSERT INTO api_tokens 
       (id, user_id, name, token_hash, token_prefix, scopes, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tokenId,
        auth.userId,
        name || null,
        tokenHash,
        tokenPrefix,
        JSON.stringify(scopes),
        expires_at || null,
        now,
      ]
    );

    // Return token with plain text token (only time it's shown)
    return successResponse(
      {
        id: tokenId,
        name: name || null,
        token, // Plain text token - only shown once
        token_prefix: tokenPrefix,
        scopes,
        created_at: now,
        expires_at: expires_at || null,
      },
      201
    );
  } catch (error: any) {
    console.error('Create API token error:', error);
    return errorResponse(error.message || 'Failed to create API token', 500);
  }
}

