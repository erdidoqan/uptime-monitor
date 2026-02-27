'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, Shield, Zap, Globe, BarChart3, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0b]">
      {/* Sol Panel - Branding & Özellikler */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient arka plan */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-purple-600/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/android-chrome-192x192.png"
              alt="UptimeTR Logo"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-2xl font-bold text-white tracking-tight">UptimeTR</span>
          </Link>

          {/* Ortadaki içerik */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Servislerinizi{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  7/24 izleyin
                </span>
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed max-w-md">
                Uptime izleme, cron job yönetimi ve gerçek trafik gönderimi — hepsi tek platformda.
              </p>
            </div>

            <div className="space-y-5">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center`}>
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alt kısım */}
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} UptimeTR. Tüm hakları saklıdır.
          </p>
        </div>
      </div>

      {/* Sağ Panel - Login Formu */}
      <div className="flex-1 flex flex-col">
        {/* Üst bar - mobil */}
        <div className="flex items-center justify-between p-6 lg:p-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ana Sayfa</span>
          </Link>

          {/* Mobil logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Image
              src="/android-chrome-192x192.png"
              alt="UptimeTR Logo"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="text-lg font-semibold text-white">UptimeTR</span>
          </div>

          <div className="w-20" />
        </div>

        {/* Login İçeriği */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-8">
            {/* Başlık */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 mb-4">
                <Activity className="w-7 h-7 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Hoş Geldiniz</h2>
              <p className="text-sm text-gray-500">
                Hesabınıza giriş yaparak devam edin
              </p>
            </div>

            {/* Google Butonu */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-xl bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : (
                  'Google ile Giriş Yap'
                )}
              </button>

              {/* Ayırıcı */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#0a0a0b] text-gray-600">veya</span>
                </div>
              </div>

              {/* Ücretsiz test linki */}
              <Link
                href="/browser-test"
                className="w-full flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all duration-200"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                Giriş yapmadan Trafik Testi deneyin
              </Link>
            </div>

            {/* Alt bilgi */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
                <Link href="/terms" className="hover:text-gray-400 transition-colors">
                  Kullanım Şartları
                </Link>
                <span>·</span>
                <Link href="/privacy" className="hover:text-gray-400 transition-colors">
                  Gizlilik Politikası
                </Link>
              </div>
              <p className="text-center text-xs text-gray-700">
                Giriş yaparak kullanım şartlarını kabul etmiş olursunuz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Shield,
    title: 'Uptime İzleme',
    description: 'Web sitelerinizi ve API\'lerinizi 1 dakika aralıklarla izleyin.',
    bg: 'bg-cyan-500/10',
    color: 'text-cyan-400',
  },
  {
    icon: BarChart3,
    title: 'Gerçek Trafik Gönderimi',
    description: 'Sitenize gerçek tarayıcı ziyaretçileri gönderin.',
    bg: 'bg-blue-500/10',
    color: 'text-blue-400',
  },
  {
    icon: Globe,
    title: 'Durum Sayfaları',
    description: 'Müşterileriniz için güzel durum sayfaları oluşturun.',
    bg: 'bg-green-500/10',
    color: 'text-green-400',
  },
  {
    icon: Zap,
    title: 'Cron Job Yönetimi',
    description: 'Zamanlanmış görevlerinizi takip edin, hatalardan haberdar olun.',
    bg: 'bg-amber-500/10',
    color: 'text-amber-400',
  },
];
