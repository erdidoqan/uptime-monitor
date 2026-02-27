'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <SidebarTrigger className="-ml-1" />

      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/android-chrome-192x192.png"
          alt="UptimeTR Logo"
          width={24}
          height={24}
          className="rounded-sm"
        />
        <span className="font-semibold text-sm">UptimeTR</span>
      </Link>

      <ThemeToggle />
    </header>
  );
}
