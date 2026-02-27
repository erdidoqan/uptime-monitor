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
import {
  getDomainFromProject,
  getDomainConfig,
  verifyDomain,
  addDomainToProject,
  isVercelConfigured,
} from '@/lib/vercel-domain';

// GET - Check domain configuration and verification status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:read')) {
      return errorResponse('Insufficient permissions', 403);
    }

    const { id } = await params;
    const db = getD1Client();

    const statusPage = await db.queryFirst<{ custom_domain: string | null }>(
      'SELECT custom_domain FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) return notFoundResponse('Status page not found');
    if (!statusPage.custom_domain) {
      return successResponse({ configured: false, domain: null });
    }

    if (!isVercelConfigured()) {
      return errorResponse('Vercel integration not configured', 500);
    }

    const domain = statusPage.custom_domain;

    // Get both project domain status and DNS config in parallel
    const [domainInfo, domainConfig] = await Promise.allSettled([
      getDomainFromProject(domain),
      getDomainConfig(domain),
    ]);

    const projectDomain = domainInfo.status === 'fulfilled' ? domainInfo.value : null;
    const dnsConfig = domainConfig.status === 'fulfilled' ? domainConfig.value : null;

    // If domain not registered in Vercel project yet, add it
    if (!projectDomain) {
      try {
        const added = await addDomainToProject(domain);
        return successResponse({
          configured: false,
          domain,
          verified: added.verified,
          verification: added.verification || [],
          dns: { configured: false, type: null },
          instructions: buildInstructions(domain, added.verified, added.verification),
        });
      } catch {
        return successResponse({
          configured: false,
          domain,
          verified: false,
          verification: [],
          dns: { configured: false, type: null },
          instructions: buildInstructions(domain, false, undefined),
        });
      }
    }

    const isFullyConfigured = projectDomain.verified && dnsConfig && !dnsConfig.misconfigured;

    return successResponse({
      configured: isFullyConfigured,
      domain,
      verified: projectDomain.verified,
      verification: projectDomain.verification || [],
      dns: dnsConfig
        ? {
            configured: !dnsConfig.misconfigured,
            type: dnsConfig.configuredBy,
          }
        : { configured: false, type: null },
      instructions: buildInstructions(domain, projectDomain.verified, projectDomain.verification),
    });
  } catch (error: any) {
    console.error('Domain check error:', error);
    return errorResponse(error.message || 'Failed to check domain', 500);
  }
}

// POST - Trigger domain verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    if (auth.scopes && !checkScope(auth.scopes, 'status-pages:write')) {
      return errorResponse('Insufficient permissions', 403);
    }

    const { id } = await params;
    const db = getD1Client();

    const statusPage = await db.queryFirst<{ custom_domain: string | null }>(
      'SELECT custom_domain FROM status_pages WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!statusPage) return notFoundResponse('Status page not found');
    if (!statusPage.custom_domain) {
      return errorResponse('No custom domain configured');
    }

    if (!isVercelConfigured()) {
      return errorResponse('Vercel integration not configured', 500);
    }

    const result = await verifyDomain(statusPage.custom_domain);

    return successResponse({
      domain: statusPage.custom_domain,
      verified: result.verified,
      verification: result.verification || [],
    });
  } catch (error: any) {
    console.error('Domain verify error:', error);
    return errorResponse(error.message || 'Failed to verify domain', 500);
  }
}

function buildInstructions(
  domain: string,
  verified: boolean,
  verification?: { type: string; domain: string; value: string }[]
) {
  const instructions: { type: string; name: string; value: string; purpose: string }[] = [];

  // CNAME record is always needed for subdomain-style custom domains (e.g. status.example.com)
  const isSubdomain = domain.split('.').length > 2;
  if (isSubdomain) {
    const hostPart = domain.split('.')[0];
    instructions.push({
      type: 'CNAME',
      name: hostPart,
      value: 'cname.vercel-dns.com',
      purpose: 'Domain yönlendirmesi',
    });
  } else {
    instructions.push({
      type: 'A',
      name: '@',
      value: '76.76.21.21',
      purpose: 'Domain yönlendirmesi',
    });
  }

  // TXT verification record if domain is not yet verified
  if (!verified && verification?.length) {
    const txtChallenge = verification.find(v => v.type === 'TXT');
    if (txtChallenge) {
      instructions.push({
        type: 'TXT',
        name: txtChallenge.domain.replace(`.${domain}`, '').replace(domain, '@'),
        value: txtChallenge.value,
        purpose: 'Domain doğrulama',
      });
    }
  }

  return instructions;
}
