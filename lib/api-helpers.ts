import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from './auth';
import { getD1Client } from './d1-client';
import { verifyToken as verifyApiToken } from './api-token-utils';

export async function authenticateRequest(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function errorResponse(message: string, status: number = 400, extra?: Record<string, any>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function notFoundResponse(message: string = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export interface ApiTokenAuthResult {
  userId: string;
  email: string;
  scopes: string[];
  tokenId: string;
}

/**
 * Authenticate API token from request
 * Returns token info if valid, null otherwise
 * Also updates last_used_at timestamp
 */
export async function authenticateApiToken(
  request: NextRequest
): Promise<ApiTokenAuthResult | null> {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  try {
    const db = getD1Client();
    const now = Date.now();

    // Get all active tokens (not revoked, not expired)
    const tokens = await db.queryAll<{
      id: string;
      user_id: string;
      token_hash: string;
      scopes: string;
      expires_at: number | null;
    }>(
      `SELECT id, user_id, token_hash, scopes, expires_at 
       FROM api_tokens 
       WHERE revoked_at IS NULL 
       AND (expires_at IS NULL OR expires_at > ?)`,
      [now]
    );

    // Try to match token against all active tokens
    for (const tokenRecord of tokens) {
      const isValid = await verifyApiToken(token, tokenRecord.token_hash);
      if (isValid) {
        // Check expiration
        if (tokenRecord.expires_at && tokenRecord.expires_at <= now) {
          continue;
        }

        // Update last_used_at
        await db.execute(
          'UPDATE api_tokens SET last_used_at = ? WHERE id = ?',
          [now, tokenRecord.id]
        );

        // Get user email
        const user = await db.queryFirst<{ email: string }>(
          'SELECT email FROM users WHERE id = ?',
          [tokenRecord.user_id]
        );

        if (!user) {
          return null;
        }

        // Parse scopes
        let scopes: string[] = [];
        try {
          scopes = JSON.parse(tokenRecord.scopes || '[]');
        } catch {
          scopes = [];
        }

        return {
          userId: tokenRecord.user_id,
          email: user.email,
          scopes,
          tokenId: tokenRecord.id,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('API token authentication error:', error);
    return null;
  }
}

/**
 * Check if token has required scope
 */
export function checkScope(
  tokenScopes: string[],
  requiredScope: string
): boolean {
  // Support wildcard scopes (e.g., "monitors:*" matches "monitors:read")
  for (const scope of tokenScopes) {
    if (scope === requiredScope) {
      return true;
    }
    // Check wildcard: "monitors:*" matches "monitors:read"
    if (scope.endsWith(':*')) {
      const resource = scope.slice(0, -2);
      if (requiredScope.startsWith(resource + ':')) {
        return true;
      }
    }
    // Check wildcard: "*" matches everything
    if (scope === '*') {
      return true;
    }
  }
  return false;
}

/**
 * Authenticate request using either session (JWT) or API token
 * Returns user info if authenticated, null otherwise
 */
export async function authenticateRequestOrToken(
  request: NextRequest
): Promise<{ userId: string; email: string; scopes?: string[] } | null> {
  // Try API token first
  const apiTokenAuth = await authenticateApiToken(request);
  if (apiTokenAuth) {
    return {
      userId: apiTokenAuth.userId,
      email: apiTokenAuth.email,
      scopes: apiTokenAuth.scopes,
    };
  }

  // Fall back to session-based auth
  return authenticateRequest(request);
}


