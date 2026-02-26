'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { Navigation } from './components/navigation';

interface StatusHeaderProps {
  companyName: string;
  subdomain: string;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  contactUrl: string | null;
}

export function StatusHeader({ companyName, subdomain, logoUrl, logoLinkUrl, contactUrl }: StatusHeaderProps) {
  const Logo = () => (
    <div className="flex items-center">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={companyName}
          width={200}
          height={40}
          className="h-8 w-auto object-contain"
          style={{ maxWidth: '180px' }}
        />
      ) : (
        <div className="h-8 px-3 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm whitespace-nowrap">
            {companyName}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            {logoLinkUrl ? (
              <a
                href={logoLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Logo />
              </a>
            ) : (
              <Logo />
            )}
          </div>

          {/* Center: Navigation */}
          <div className="hidden sm:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <Navigation subdomain={subdomain} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {contactUrl && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
                asChild
              >
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  İletişim
                </a>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
