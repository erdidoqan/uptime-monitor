/**
 * Vercel API helper functions
 * Used to programmatically add domains to Vercel projects
 */

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified?: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

interface VercelError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Add a domain to a Vercel project
 * @param domain Domain to add (e.g., "digitexa.cronuptime.com")
 * @param projectId Vercel project ID (optional, uses VERCEL_PROJECT_ID env var if not provided)
 * @returns Domain response or null if failed
 */
export async function addVercelDomain(
  domain: string,
  projectId?: string
): Promise<VercelDomainResponse | null> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;
  const vercelProjectId = projectId || process.env.VERCEL_PROJECT_ID;

  if (!vercelToken) {
    console.warn('VERCEL_API_TOKEN not set, skipping Vercel domain addition');
    return null;
  }

  if (!vercelProjectId) {
    console.warn('VERCEL_PROJECT_ID not set, skipping Vercel domain addition');
    return null;
  }

  try {
    // Build API URL with optional team ID
    let apiUrl = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`;
    if (vercelTeamId) {
      apiUrl += `?teamId=${vercelTeamId}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    if (!response.ok) {
      const error: VercelError = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: 'Failed to parse error response' },
      }));

      // Domain already exists - this is OK, return success
      if (error.error?.code === 'domain_already_in_use' || response.status === 409) {
        console.log(`Domain ${domain} already exists in Vercel, skipping`);
        return { name: domain } as VercelDomainResponse;
      }

      console.error(`Failed to add domain to Vercel:`, error);
      return null;
    }

    const data: VercelDomainResponse = await response.json();
    console.log(`Successfully added domain ${domain} to Vercel`);
    return data;
  } catch (error) {
    console.error('Error adding domain to Vercel:', error);
    return null;
  }
}

/**
 * Remove a domain from a Vercel project
 * @param domain Domain to remove
 * @param projectId Vercel project ID (optional)
 * @returns true if successful, false otherwise
 */
export async function removeVercelDomain(
  domain: string,
  projectId?: string
): Promise<boolean> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;
  const vercelProjectId = projectId || process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !vercelProjectId) {
    console.warn('VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set, skipping Vercel domain removal');
    return false;
  }

  try {
    let apiUrl = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${encodeURIComponent(domain)}`;
    if (vercelTeamId) {
      apiUrl += `?teamId=${vercelTeamId}`;
    }

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error: VercelError = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: 'Failed to parse error response' },
      }));
      console.error(`Failed to remove domain from Vercel:`, error);
      return false;
    }

    console.log(`Successfully removed domain ${domain} from Vercel`);
    return true;
  } catch (error) {
    console.error('Error removing domain from Vercel:', error);
    return false;
  }
}














