'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function CreateStatusPageForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    company_name: '',
    subdomain: '',
    logo_link_url: '',
    contact_url: '',
    custom_domain: '',
  });

  // Generate subdomain from company name
  const generateSubdomain = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
  };

  const handleCompanyNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      company_name: value,
      // Auto-generate subdomain if it hasn't been manually edited
      subdomain: prev.subdomain === generateSubdomain(prev.company_name) || prev.subdomain === ''
        ? generateSubdomain(value)
        : prev.subdomain,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.company_name.trim()) {
      setError('Company name is required');
      return;
    }

    if (!form.subdomain.trim()) {
      setError('Subdomain is required');
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!subdomainRegex.test(form.subdomain.toLowerCase())) {
      setError('Subdomain must be alphanumeric and can contain hyphens (not at start or end)');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ id: string }>('/status-pages', {
        company_name: form.company_name.trim(),
        subdomain: form.subdomain.toLowerCase().trim(),
        logo_link_url: form.logo_link_url.trim() || null,
        contact_url: form.contact_url.trim() || null,
        custom_domain: form.custom_domain.trim() || null,
      });
      router.push(`/status-pages/${response.id}/edit?created=true`);
    } catch (err: any) {
      console.error('Failed to create status page:', err);
      setError(err.message || 'Failed to create status page');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-6">
        <Link href="/status-pages" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Status Pages
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Create status page</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-12">
          {/* Basic information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">Basic information</h2>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">Billable</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A public status page informs your users about the uptime of your services.
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6 space-y-6">
                  {/* Company name and Subdomain - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Company name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={form.company_name}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        placeholder="Digitexa"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Subdomain <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex">
                        <Input
                          value={form.subdomain}
                          onChange={(e) => setForm(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
                          placeholder="digitexa"
                          className="rounded-r-none"
                          required
                        />
                        <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                          .cronuptime.com
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can configure a custom domain below.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Links & URLs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Links & URLs</h2>
              <p className="text-sm text-muted-foreground">
                Where should we point your users when they want to visit your website?
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">What URL should your logo point to?</Label>
                      <Input
                        type="url"
                        value={form.logo_link_url}
                        onChange={(e) => setForm(prev => ({ ...prev, logo_link_url: e.target.value }))}
                        placeholder="https://stripe.com"
                      />
                      <p className="text-xs text-muted-foreground">What's your company's homepage?</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Get in touch URL</Label>
                      <Input
                        type="url"
                        value={form.contact_url}
                        onChange={(e) => setForm(prev => ({ ...prev, contact_url: e.target.value }))}
                        placeholder="https://stripe.com/support"
                      />
                      <p className="text-xs text-muted-foreground">
                        You can use mailto:support@stripe.com. Leave blank for no 'Get in touch' button.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Personalization - disabled for now */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 opacity-50">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Personalization</h2>
              <p className="text-sm text-muted-foreground">
                Upload your logo to personalize the look & feel of your status page.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Use modern look for refreshed design with latest features like dark theme, translations, and custom favicon.
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Logo</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-not-allowed">
                            <p className="text-sm text-muted-foreground">
                              Drag & drop or click to choose
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Logo upload will be available after creating the status page</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Custom domain */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Custom domain</h2>
              <p className="text-sm text-muted-foreground">
                Deploy your status page to a custom subdomain for a branded experience.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Need help with the setup?{' '}
                <a href="#" className="text-primary hover:underline">Let us know</a>
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Custom domain</Label>
                    <Input
                      value={form.custom_domain}
                      onChange={(e) => setForm(prev => ({ ...prev, custom_domain: e.target.value }))}
                      placeholder="status.stripe.com"
                    />
                  </div>
                  {form.custom_domain && (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      <p>
                        Please point <strong>{form.custom_domain || 'status.example.com'}</strong> to CronUptime by configuring the following CNAME records.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Structure & other tabs info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 opacity-50">
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-2">Structure & More</h2>
              <p className="text-sm text-muted-foreground">
                Configure structure, status updates, maintenance windows, subscribers, and translations after creating the status page.
              </p>
            </div>

            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="px-6 py-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <p>These settings will be available after you create the status page.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Status Page'}
          </Button>
        </div>
      </form>
    </div>
  );
}

