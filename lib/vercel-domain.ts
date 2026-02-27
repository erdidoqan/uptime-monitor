const VERCEL_API = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
}

function headers() {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is not configured');
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

export interface DomainConfigResponse {
  configuredBy: 'CNAME' | 'A' | 'http' | null;
  acceptedChallenges: string[];
  misconfigured: boolean;
}

export async function addDomainToProject(domain: string): Promise<VercelDomainResponse> {
  const res = await fetch(
    `${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery()}`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: domain }),
    }
  );

  if (res.status === 409) {
    // Domain already exists, get its current status instead
    return getDomainFromProject(domain);
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `Failed to add domain: ${res.status}`);
  }

  return res.json();
}

export async function removeDomainFromProject(domain: string): Promise<void> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamQuery()}`,
    {
      method: 'DELETE',
      headers: headers(),
    }
  );

  if (res.status === 404) return; // Already removed
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `Failed to remove domain: ${res.status}`);
  }
}

export async function getDomainFromProject(domain: string): Promise<VercelDomainResponse> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamQuery()}`,
    { headers: headers() }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `Failed to get domain: ${res.status}`);
  }

  return res.json();
}

export async function verifyDomain(domain: string): Promise<VercelDomainResponse> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify${teamQuery()}`,
    {
      method: 'POST',
      headers: headers(),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `Failed to verify domain: ${res.status}`);
  }

  return res.json();
}

export async function getDomainConfig(domain: string): Promise<DomainConfigResponse> {
  const res = await fetch(
    `${VERCEL_API}/v6/domains/${domain}/config${teamQuery()}`,
    { headers: headers() }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `Failed to get domain config: ${res.status}`);
  }

  return res.json();
}

export function isVercelConfigured(): boolean {
  return !!(VERCEL_TOKEN && VERCEL_PROJECT_ID);
}
