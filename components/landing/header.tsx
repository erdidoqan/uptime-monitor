"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "./google-sign-in-button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status } = useSession();
  const isAuth = status === "authenticated";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/10">
      <nav className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image 
              src="/android-chrome-192x192.png" 
              alt="UptimeTR Logo" 
              width={32} 
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-semibold text-white tracking-tight">UptimeTR</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/load-test" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Yük Testi
            </Link>
            <Link href="/pricing" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Fiyatlandırma
            </Link>
            <Link href="/about" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Hakkımızda
            </Link>
            <Link href="/faq" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              SSS
            </Link>
            <Link href="/contact" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              İletişim
            </Link>
            <Link href="/status" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Durum
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuth ? (
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Giriş Yap
                </Link>
                <GoogleSignInButton variant="default" />
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="lg:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-1">
              <Link href="/load-test" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Yük Testi
              </Link>
              <Link href="/pricing" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Fiyatlandırma
              </Link>
              <Link href="/about" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Hakkımızda
              </Link>
              <Link href="/faq" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                SSS
              </Link>
              <Link href="/contact" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                İletişim
              </Link>
              <Link href="/status" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Durum
              </Link>
              <Link href="/changelog" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Değişiklik Günlüğü
              </Link>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
                {isAuth ? (
                  <Link
                    href="/"
                    className="px-3 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg text-center"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-3 py-2 text-sm text-gray-300 hover:text-white text-left"
                    >
                      Giriş Yap
                    </Link>
                    <GoogleSignInButton className="w-full" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
