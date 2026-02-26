'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  subdomain: string;
}

const navItems = [
  { label: 'Durum', href: '' },
  { label: 'Bakım', href: '/maintenance' },
  { label: 'Geçmiş Olaylar', href: '/incidents' },
];

export function Navigation({ subdomain }: NavigationProps) {
  const pathname = usePathname();
  const [isSubdomainAccess, setIsSubdomainAccess] = useState(false);

  // Check if we're accessing via subdomain (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Check if it's a subdomain (not main domain and not localhost)
      const isSubdomain = 
        hostname !== 'uptimetr.com' && 
        hostname !== 'www.uptimetr.com' &&
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        (hostname.endsWith('.uptimetr.com') || hostname.endsWith('.localhost'));
      setIsSubdomainAccess(isSubdomain);
    }
  }, []);

  const basePath = `/status-public/${subdomain}`;

  const isActive = (href: string) => {
    // When accessing via subdomain, pathname is rewritten to basePath format
    // So we need to check against the rewritten pathname
    if (isSubdomainAccess) {
      // On subdomain, check if current pathname matches the href
      if (href === '') {
        return pathname === basePath || pathname === `${basePath}/`;
      }
      return pathname === `${basePath}${href}`;
    } else {
      // On main domain, use original logic
      const fullPath = href ? `${basePath}${href}` : basePath;
      if (href === '') {
        return pathname === basePath || pathname === `${basePath}/`;
      }
      return pathname.startsWith(fullPath);
    }
  };

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const active = isActive(item.href);
        // Use relative paths when accessing via subdomain
        const href = isSubdomainAccess 
          ? (item.href || '/')
          : (item.href ? `${basePath}${item.href}` : basePath);
        
        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}



