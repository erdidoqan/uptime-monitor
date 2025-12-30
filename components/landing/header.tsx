"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GoogleSignInButton } from "./google-sign-in-button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/10">
      <nav className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image 
              src="/android-chrome-192x192.png" 
              alt="CronUptime Logo" 
              width={32} 
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-semibold text-white tracking-tight">CronUptime</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/pricing" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              About
            </Link>
            <Link href="/faq" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              FAQ
            </Link>
            <Link href="/contact" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Contact
            </Link>
            <Link href="/status" className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Status
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <GoogleSignInButton variant="default" />
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
              <Link href="/pricing" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Pricing
              </Link>
              <Link href="/about" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                About
              </Link>
              <Link href="/faq" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                FAQ
              </Link>
              <Link href="/contact" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Contact
              </Link>
              <Link href="/status" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Status
              </Link>
              <Link href="/changelog" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">
                Changelog
              </Link>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm text-gray-300 hover:text-white text-left"
                >
                  Sign in
                </Link>
                <GoogleSignInButton className="w-full" />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

