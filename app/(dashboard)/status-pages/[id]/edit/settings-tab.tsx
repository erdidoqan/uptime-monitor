'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
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
      setUploadError('Geçersiz dosya türü. Lütfen PNG, JPG, SVG veya WebP yükleyin.');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Dosya çok büyük. Maksimum boyut 2MB.');
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
        throw new Error(data.error || 'Logo yüklenemedi');
      }
      
      const data = await response.json();
      setLogoUrl(data.logo_url);
      
      // Update parent with new logo URL
      onUpdate({ ...statusPage, logo_url: data.logo_url });
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      setUploadError(err.message || 'Logo yüklenemedi');
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
        throw new Error(data.error || 'Logo silinemedi');
      }
      
      setLogoUrl(null);
      onUpdate({ ...statusPage, logo_url: null });
    } catch (err: any) {
      console.error('Logo delete failed:', err);
      setUploadError(err.message || 'Logo silinemedi');
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
      setError('Şirket adı gerekli');
      return;
    }

    if (!form.subdomain.trim()) {
      setError('Alt alan adı gerekli');
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!subdomainRegex.test(form.subdomain.toLowerCase())) {
      setError('Alt alan adı alfanümerik olmalı ve tire içerebilir (başta veya sonda olamaz)');
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
      setError(err.message || 'Durum sayfası güncellenemedi');
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
              <h2 className="text-lg font-semibold">Temel bilgiler</h2>
              <span className="text-xs bg-muted px-2 py-0.5 rounded">Ücretli</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Herkese açık bir durum sayfası, kullanıcılarınızı hizmetlerinizin çalışma durumu hakkında bilgilendirir.
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border">
              <CardContent className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Şirket adı <span className="text-red-500">*</span>
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
                      Alt alan adı <span className="text-red-500">*</span>
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
                        .uptimetr.com
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aşağıdan özel alan adı yapılandırabilirsiniz.
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
            <h2 className="text-lg font-semibold mb-2">Bağlantılar & URL&apos;ler</h2>
            <p className="text-sm text-muted-foreground">
              Kullanıcılarınız web sitenizi ziyaret etmek istediğinde onları nereye yönlendirelim?
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border">
              <CardContent className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Logonuz hangi URL&apos;ye yönlendirsin?</Label>
                    <Input
                      type="url"
                      value={form.logo_link_url}
                      onChange={(e) => setForm(prev => ({ ...prev, logo_link_url: e.target.value }))}
                      placeholder="https://stripe.com"
                    />
                    <p className="text-xs text-muted-foreground">Şirketinizin ana sayfası nedir?</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">İletişim URL&apos;si</Label>
                    <Input
                      type="url"
                      value={form.contact_url}
                      onChange={(e) => setForm(prev => ({ ...prev, contact_url: e.target.value }))}
                      placeholder="https://stripe.com/support"
                    />
                    <p className="text-xs text-muted-foreground">
                      mailto:support@stripe.com kullanabilirsiniz. &apos;İletişim&apos; butonu olmasın istiyorsanız boş bırakın.
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
            <h2 className="text-lg font-semibold mb-2">Kişiselleştirme</h2>
            <p className="text-sm text-muted-foreground">
              Durum sayfanızın görünümünü kişiselleştirmek için logonuzu yükleyin.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Desteklenen formatlar: PNG, JPG, SVG, WebP. Maks boyut: 2MB.
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
                          alt="Mevcut logo"
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Mevcut logo</p>
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
                        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Sürükle & bırak veya tıklayarak seçin
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
            <h2 className="text-lg font-semibold mb-2">Özel alan adı</h2>
            <p className="text-sm text-muted-foreground">
              Markalı bir deneyim için durum sayfanızı özel bir alt alan adına dağıtın.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Kurulum konusunda yardıma mı ihtiyacınız var?{' '}
              <a href="#" className="text-primary hover:underline">Bize bildirin</a>
            </p>
          </div>

          <div className="lg:col-span-2">
            <Card className="border">
              <CardContent className="px-6 py-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Özel alan adı</Label>
                  <Input
                    value={form.custom_domain}
                    onChange={(e) => setForm(prev => ({ ...prev, custom_domain: e.target.value }))}
                    placeholder="status.stripe.com"
                  />
                </div>
                {form.custom_domain && (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <p>
                      Lütfen <strong>{form.custom_domain}</strong> adresini aşağıdaki CNAME kayıtlarını yapılandırarak UptimeTR&apos;ye yönlendirin.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Embed Options */}
        <EmbedSection statusPage={statusPage} />
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">Ayarlar başarıyla kaydedildi!</p>
        </div>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
        <Button type="submit" disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'}
        </Button>
      </div>
    </form>
  );
}

// Badge Preview Component (static, doesn't require iframe)
function BadgePreview({ theme }: { theme: 'light' | 'dark' }) {
  const isLight = theme === 'light';
  
  return (
    <a 
      href="#"
      onClick={(e) => e.preventDefault()}
      className={`
        inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium
        transition-all cursor-default select-none
        ${isLight 
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
          : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
        }
      `}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLight ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
      <span>Tüm sistemler çalışıyor</span>
    </a>
  );
}

// Embed Section Component
function EmbedSection({ statusPage }: { statusPage: StatusPage }) {
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [badgeTheme, setBadgeTheme] = useState<'light' | 'dark'>('light');

  // Build status page URL
  const statusPageUrl = statusPage.custom_domain 
    ? `https://${statusPage.custom_domain}`
    : `https://${statusPage.subdomain}.uptimetr.com`;

  // Embed codes
  const fullPageEmbedCode = `<iframe src="${statusPageUrl}" width="100%" height="800" frameborder="0" style="border: none;"></iframe>`;
  const badgeEmbedCode = `<iframe src="${statusPageUrl}/badge?theme=${badgeTheme}" width="250" height="36" frameborder="0" scrolling="no" style="border: none; color-scheme: normal;"></iframe>`;

  const copyToClipboard = async (text: string, type: 'embed' | 'badge') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'embed') {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      } else {
        setCopiedBadge(true);
        setTimeout(() => setCopiedBadge(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-2">Embed seçenekleri</h2>
        <p className="text-sm text-muted-foreground">
          Durum sayfanızı veya durum badge&apos;ini web sitenize veya uygulamanıza embed edin.
        </p>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Full page embed */}
        <Card className="border">
          <CardContent className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Durum sayfasını embed edin</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Durum sayfanızın tamamını bir iframe ile sitenize yerleştirin.
                </p>
              </div>
              <a 
                href={statusPageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Önizle <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            <div className="relative">
              <div className="bg-muted/50 rounded-lg p-4 pr-12 font-mono text-xs overflow-x-auto">
                <code className="text-muted-foreground break-all">{fullPageEmbedCode}</code>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => copyToClipboard(fullPageEmbedCode, 'embed')}
              >
                {copiedEmbed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badge embed */}
        <Card className="border">
          <CardContent className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Durum badge&apos;i embed edin</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Küçük bir durum badge&apos;i ile servislerinizin durumunu gösterin.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBadgeTheme('light')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    badgeTheme === 'light' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Açık
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeTheme('dark')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    badgeTheme === 'dark' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Koyu
                </button>
              </div>
            </div>

            {/* Badge preview */}
            <div className={`rounded-lg p-4 flex items-center justify-center ${badgeTheme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
              <BadgePreview theme={badgeTheme} />
            </div>
            
            <div className="relative">
              <div className="bg-muted/50 rounded-lg p-4 pr-12 font-mono text-xs overflow-x-auto">
                <code className="text-muted-foreground break-all">{badgeEmbedCode}</code>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => copyToClipboard(badgeEmbedCode, 'badge')}
              >
                {copiedBadge ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
