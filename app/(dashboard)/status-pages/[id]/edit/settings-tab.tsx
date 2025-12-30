'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import type { StatusPage } from '@/shared/types';

interface SettingsTabProps {
  statusPage: StatusPage;
  onUpdate: (statusPage: StatusPage) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

export function SettingsTab({ statusPage, onUpdate }: SettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Logo upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(statusPage.logo_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    company_name: statusPage.company_name,
    subdomain: statusPage.subdomain,
    logo_link_url: statusPage.logo_link_url || '',
    contact_url: statusPage.contact_url || '',
    custom_domain: statusPage.custom_domain || '',
  });

  const handleLogoUpload = useCallback(async (file: File) => {
    setUploadError(null);
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Please upload PNG, JPG, SVG, or WebP.');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File too large. Maximum size is 2MB.');
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get token from localStorage
      const token = localStorage.getItem('apiToken');
      
      const response = await fetch(`/api/status-pages/${statusPage.id}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload logo');
      }
      
      const data = await response.json();
      setLogoUrl(data.logo_url);
      
      // Update parent with new logo URL
      onUpdate({ ...statusPage, logo_url: data.logo_url });
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      setUploadError(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  }, [statusPage, onUpdate]);

  const handleLogoDelete = useCallback(async () => {
    setUploadError(null);
    setUploading(true);
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('apiToken');
      
      const response = await fetch(`/api/status-pages/${statusPage.id}/logo`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete logo');
      }
      
      setLogoUrl(null);
      onUpdate({ ...statusPage, logo_url: null });
    } catch (err: any) {
      console.error('Logo delete failed:', err);
      setUploadError(err.message || 'Failed to delete logo');
    } finally {
      setUploading(false);
    }
  }, [statusPage, onUpdate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleLogoUpload]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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

    setSaving(true);
    try {
      const response = await api.put<StatusPage>(`/status-pages/${statusPage.id}`, {
        company_name: form.company_name.trim(),
        subdomain: form.subdomain.toLowerCase().trim(),
        logo_link_url: form.logo_link_url.trim() || null,
        contact_url: form.contact_url.trim() || null,
        custom_domain: form.custom_domain.trim() || null,
      });
      onUpdate(response);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to update status page:', err);
      setError(err.message || 'Failed to update status page');
    } finally {
      setSaving(false);
    }
  }

  return (
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Company name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))}
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

        {/* Personalization - Logo Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2">Personalization</h2>
            <p className="text-sm text-muted-foreground">
              Upload your logo to personalize the look & feel of your status page.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Supported formats: PNG, JPG, SVG, WebP. Max size: 2MB.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border">
              <CardContent className="px-6 py-6">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Logo</Label>
                  
                  {/* Current logo preview */}
                  {logoUrl && (
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="relative w-16 h-16 bg-background rounded-lg border overflow-hidden">
                        <Image
                          src={logoUrl}
                          alt="Current logo"
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Current logo</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {logoUrl}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleLogoDelete}
                        disabled={uploading}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Upload zone */}
                  <div
                    className={`
                      relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                      ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
                      ${uploading ? 'pointer-events-none opacity-50' : ''}
                    `}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_TYPES.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag & drop or click to choose
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Upload error */}
                  {uploadError && (
                    <p className="text-sm text-destructive">{uploadError}</p>
                  )}
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
                      Please point <strong>{form.custom_domain}</strong> to CronUptime by configuring the following CNAME records.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">Settings saved successfully!</p>
        </div>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
