import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';

// Main domains that should not be treated as subdomains
const MAIN_DOMAINS = ['cronuptime.com', 'www.cronuptime.com', 'localhost', 'localhost:3000'];

// Cache for custom domain lookups (in-memory, resets on server restart)
// In production, consider using Redis or similar for distributed caching
const customDomainCache = new Map<string, { subdomain: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Extract subdomain from host
function getSubdomain(host: string): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];
  
  // Check for localhost (development)
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return null;
  }
  
  // Check for main domain
  if (MAIN_DOMAINS.includes(host) || MAIN_DOMAINS.includes(hostWithoutPort)) {
    return null;
  }
  
  // Check if it's a subdomain of cronuptime.com
  if (hostWithoutPort.endsWith('.cronuptime.com')) {
    const subdomain = hostWithoutPort.replace('.cronuptime.com', '');
    // Ignore www
    if (subdomain === 'www') {
      return null;
    }
    return subdomain;
  }
  
  // For development: check if it's a subdomain of localhost (e.g., digitexa.localhost:3000)
  // This requires hosts file configuration
  if (hostWithoutPort.endsWith('.localhost')) {
    const subdomain = hostWithoutPort.replace('.localhost', '');
    return subdomain;
  }
  
  return null;
}

// Look up custom domain in database and return corresponding subdomain
async function getSubdomainFromCustomDomain(host: string): Promise<string | null> {
  const hostWithoutPort = host.split(':')[0];
  
  // Check cache first
  const cached = customDomainCache.get(hostWithoutPort);
  if (cached && cached.expires > Date.now()) {
    return cached.subdomain;
  }
  
  try {
    const db = getD1Client();
    const statusPage = await db.queryFirst<{ subdomain: string }>(
      `SELECT subdomain FROM status_pages 
       WHERE custom_domain = ? AND is_active = 1 
       LIMIT 1`,
      [hostWithoutPort.toLowerCase()]
    );
    
    if (statusPage) {
      // Cache the result
      customDomainCache.set(hostWithoutPort, {
        subdomain: statusPage.subdomain,
        expires: Date.now() + CACHE_TTL,
      });
      return statusPage.subdomain;
    }
  } catch (error) {
    console.error('Failed to lookup custom domain:', error);
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // First, check for subdomain (status page on cronuptime.com)
  let subdomain = getSubdomain(host);
  
  // If not a subdomain, check if it's a custom domain
  if (!subdomain) {
    subdomain = await getSubdomainFromCustomDomain(host);
  }
  
  if (subdomain) {
    // Rewrite to status-public route
    // Don't rewrite API routes or static files
    if (!pathname.startsWith('/api') && 
        !pathname.startsWith('/_next') && 
        !pathname.startsWith('/favicon') &&
        !pathname.includes('.')) {
      
      // Rewrite to /status-public/[subdomain]
      const url = request.nextUrl.clone();
      url.pathname = `/status-public/${subdomain}${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  
  // Note: We don't call auth() here because middleware runs in edge runtime
  // and NextAuth session callback requires Node.js runtime (for crypto operations).
  // Auth checks are handled at the route level where nodejs runtime is available.
  
  // Let the routes handle themselves
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
