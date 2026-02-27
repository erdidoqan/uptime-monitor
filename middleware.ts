import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Main domains that should not be treated as subdomains
const MAIN_DOMAINS = ['uptimetr.com', 'www.uptimetr.com', 'cronuptime.com', 'www.cronuptime.com', 'localhost', 'localhost:3000'];

// Known app domains (requests to these should never be treated as custom domains)
const APP_DOMAINS = [
  'uptimetr.com',
  'cronuptime.com',
  'vercel.app',
  'vercel-dns.com',
];

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
  
  // Check if it's a subdomain of uptimetr.com
  if (hostWithoutPort.endsWith('.uptimetr.com')) {
    const subdomain = hostWithoutPort.replace('.uptimetr.com', '');
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

function isCustomDomain(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return false;
  }
  return !APP_DOMAINS.some(domain => hostWithoutPort === domain || hostWithoutPort.endsWith(`.${domain}`));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Skip static/API routes
  if (pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for subdomain (status page on *.uptimetr.com)
  const subdomain = getSubdomain(host);
  
  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/status-public/${subdomain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }
  
  // Custom domain support: unknown hosts are rewritten to status-public
  // The page will look up the status page by custom_domain field
  if (isCustomDomain(host)) {
    const domain = host.split(':')[0].toLowerCase();
    const url = request.nextUrl.clone();
    url.pathname = `/status-public/${domain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }
  
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
