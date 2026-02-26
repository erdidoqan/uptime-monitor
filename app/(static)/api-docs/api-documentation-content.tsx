'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Terminal, Key, Shield, Code as CodeIcon, BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function ApiDocumentationContent() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative group my-4">
      <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm border border-white/10">
        <code className={`language-${language} block whitespace-pre text-gray-100`}>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 bg-slate-800/90 hover:bg-slate-700/90 border border-white/10"
        onClick={() => handleCopy(code, id)}
      >
        {copied === id ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-gray-300" />
        )}
      </Button>
    </div>
  );

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    useEffect(() => {
      if (window.location.hash === `#${id}`) {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    }, [id]);

    return (
      <section id={id} className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-6 pt-8 border-t border-white/10 first:border-t-0 first:pt-0">
          {title}
        </h2>
        {children}
      </section>
    );
  };

  const navItems = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'authentication', label: 'Authentication', icon: Key },
    { id: 'monitors', label: 'Monitors', icon: Terminal },
    { id: 'cron-jobs', label: 'Cron Jobs', icon: Terminal },
    { id: 'incidents', label: 'Incidents', icon: Shield },
    { id: 'scopes', label: 'Scopes & Permissions', icon: Shield },
    { id: 'code-examples', label: 'Code Examples', icon: CodeIcon },
  ];

  const curlExample = `curl -X GET https://www.uptimetr.com/api/monitors \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"`;

  const javascriptExample = `// Using fetch
const response = await fetch('https://www.uptimetr.com/api/monitors', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
  }
});

const monitors = await response.json();
console.log(monitors);`;

  const pythonExample = `import requests

headers = {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://www.uptimetr.com/api/monitors',
    headers=headers
)

monitors = response.json()
print(monitors)`;

  const nodeExample = `const axios = require('axios');

const response = await axios.get('https://www.uptimetr.com/api/monitors', {
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
  }
});

console.log(response.data);`;

  const createMonitorExample = `curl -X POST https://www.uptimetr.com/api/monitors \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My API Monitor",
    "url": "https://api.example.com/health",
    "interval_sec": 300,
    "timeout_ms": 15000
  }'`;

  const createCronJobExample = `curl -X POST https://www.uptimetr.com/api/cron-jobs \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Daily Backup",
    "url": "https://api.example.com/backup",
    "method": "POST",
    "cron_expr": "0 2 * * *",
    "timeout_ms": 15000
  }'`;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 lg:py-16">
      <div className="flex gap-12">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSection(item.id);
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === item.id
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="prose prose-invert max-w-none">
            {/* Getting Started */}
            <Section id="getting-started" title="Getting Started">
              <div className="space-y-4 text-gray-300">
                <p>
                  The UptimeTR API allows you to programmatically manage monitors, cron jobs, and incidents.
                  All API requests should be made to the base URL:
                </p>
                <CodeBlock
                  code="https://www.uptimetr.com/api"
                  language="text"
                  id="base-url"
                />
                <p>
                  To use the API, you'll need to create an API token from your{' '}
                  <Link href="/api-tokens" className="text-purple-400 hover:underline">
                    dashboard
                  </Link>
                  . Include this token in the <code className="bg-black/30 px-2 py-1 rounded text-xs">Authorization</code> header
                  of every request.
                </p>
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                  <p className="text-sm text-purple-200">
                    <strong>Quick Start:</strong> Create an API token, then make your first request using any of the code examples below.
                  </p>
                </div>
              </div>
            </Section>

            {/* Authentication */}
            <Section id="authentication" title="Authentication">
              <div className="space-y-6 text-gray-300">
                <p>
                  All API requests require authentication using a Bearer token. Include your API token in the
                  <code className="bg-black/30 px-2 py-1 rounded text-xs mx-1">Authorization</code> header:
                </p>
                <CodeBlock
                  code="Authorization: Bearer YOUR_API_TOKEN"
                  language="http"
                  id="auth-header"
                />
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white mt-8 mb-4">Response Format</h3>
                  <p>
                    All responses are in JSON format. Successful requests return the data directly,
                    while errors return an object with an <code className="bg-black/30 px-2 py-1 rounded text-xs">error</code> field.
                  </p>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400 mb-2">Example error response:</p>
                    <CodeBlock
                      code={`{
  "error": "Insufficient permissions. Required scope: monitors:read"
}`}
                      language="json"
                      id="error-example"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Monitors */}
            <Section id="monitors" title="Monitors">
              <div className="space-y-8 text-gray-300">
                <p>
                  Monitor endpoints allow you to manage uptime monitors for your websites and APIs.
                </p>

                <div className="space-y-6">
                  <div className="border-l-4 border-green-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">GET</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/monitors</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">List all monitors</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">monitors:read</code></p>
                    <CodeBlock
                      code={curlExample}
                      language="bash"
                      id="get-monitors"
                    />
                  </div>

                  <div className="border-l-4 border-blue-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono">POST</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/monitors</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Create a new monitor</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">monitors:write</code></p>
                    <CodeBlock
                      code={createMonitorExample}
                      language="bash"
                      id="create-monitor"
                    />
                  </div>

                  <div className="border-l-4 border-green-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">GET</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/monitors/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Get monitor details</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">monitors:read</code></p>
                  </div>

                  <div className="border-l-4 border-yellow-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono">PUT</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/monitors/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Update a monitor</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">monitors:write</code></p>
                  </div>

                  <div className="border-l-4 border-red-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono">DELETE</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/monitors/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Delete a monitor</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">monitors:write</code></p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Cron Jobs */}
            <Section id="cron-jobs" title="Cron Jobs">
              <div className="space-y-8 text-gray-300">
                <p>
                  Cron job endpoints allow you to manage scheduled HTTP requests.
                </p>

                <div className="space-y-6">
                  <div className="border-l-4 border-green-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">GET</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/cron-jobs</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">List all cron jobs</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">cron-jobs:read</code></p>
                  </div>

                  <div className="border-l-4 border-blue-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono">POST</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/cron-jobs</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Create a new cron job</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">cron-jobs:write</code></p>
                    <CodeBlock
                      code={createCronJobExample}
                      language="bash"
                      id="create-cron"
                    />
                  </div>

                  <div className="border-l-4 border-green-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">GET</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/cron-jobs/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Get cron job details</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">cron-jobs:read</code></p>
                  </div>

                  <div className="border-l-4 border-yellow-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono">PUT</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/cron-jobs/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Update a cron job</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">cron-jobs:write</code></p>
                  </div>

                  <div className="border-l-4 border-red-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono">DELETE</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/cron-jobs/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Delete a cron job</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">cron-jobs:write</code></p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Incidents */}
            <Section id="incidents" title="Incidents">
              <div className="space-y-8 text-gray-300">
                <p>
                  Incident endpoints allow you to view and manage incidents for your monitors and cron jobs.
                </p>

                <div className="space-y-6">
                  <div className="border-l-4 border-green-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">GET</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/incidents</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">List incidents</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">incidents:read</code></p>
                  </div>

                  <div className="border-l-4 border-green-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono">GET</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/incidents/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Get incident details</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">incidents:read</code></p>
                  </div>

                  <div className="border-l-4 border-yellow-500/50 pl-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono">PATCH</Badge>
                      <code className="text-purple-400 font-mono text-lg">/api/incidents/[id]</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Update incident (resolve/reopen)</p>
                    <p className="text-xs text-gray-500 mb-2">Required scope: <code className="bg-black/30 px-1.5 py-0.5 rounded">incidents:write</code></p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Scopes */}
            <Section id="scopes" title="Scopes & Permissions">
              <div className="space-y-6 text-gray-300">
                <p>
                  Scopes control what actions an API token can perform. When creating a token, select only the scopes you need.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Scope Format</h3>
                  <p className="mb-4">
                    Scopes follow the format <code className="bg-black/30 px-2 py-1 rounded text-xs">resource:action</code>.
                    You can also use wildcards for broader permissions.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Available Scopes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">monitors:read</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Read access to monitors
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">monitors:write</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Write access to monitors
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">cron-jobs:read</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Read access to cron jobs
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">cron-jobs:write</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Write access to cron jobs
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">incidents:read</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Read access to incidents
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">incidents:write</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Write access to incidents
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Wildcard Scopes</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">monitors:*</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Full access to all monitor operations (read and write)
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <code className="font-mono text-purple-400 text-sm">*</code>
                      <p className="text-gray-400 mt-2 text-sm">
                        Full access to all resources and operations
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-200">
                    <strong>Security Note:</strong> Always follow the principle of least privilege. Only grant the minimum scopes necessary for your use case.
                  </p>
                </div>
              </div>
            </Section>

            {/* Code Examples */}
            <Section id="code-examples" title="Code Examples">
              <div className="space-y-8 text-gray-300">
                <p>
                  Here are complete examples for different programming languages and tools.
                </p>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">cURL</h3>
                  <CodeBlock code={curlExample} language="bash" id="curl-example" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">JavaScript (Fetch API)</h3>
                  <CodeBlock code={javascriptExample} language="javascript" id="js-example" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Python</h3>
                  <CodeBlock code={pythonExample} language="python" id="python-example" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Node.js (Axios)</h3>
                  <CodeBlock code={nodeExample} language="javascript" id="node-example" />
                </div>
              </div>
            </Section>

            {/* CTA */}
            <div className="mt-16 rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-3">
                Ready to get started?
              </h3>
              <p className="text-gray-400 mb-6">
                Create your first API token and start integrating UptimeTR into your applications.
              </p>
              <Link
                href="/api-tokens"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Key className="h-4 w-4" />
                Create API Token
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
