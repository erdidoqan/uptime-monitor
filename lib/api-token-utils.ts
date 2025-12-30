import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
const TOKEN_PREFIX_LENGTH = 8;

/**
 * Generate a secure random API token
 * Returns a hex string (64 characters)
 */
export function generateApiToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash an API token using bcrypt
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Verify a token against its hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Extract the prefix from a token for display purposes
 * Returns the first 8 characters
 */
export function formatTokenForDisplay(token: string): string {
  return token.substring(0, TOKEN_PREFIX_LENGTH);
}

/**
 * Format token with prefix for display (e.g., "abc12345...")
 */
export function formatTokenWithPrefix(token: string): string {
  const prefix = formatTokenForDisplay(token);
  return `${prefix}...`;
}

