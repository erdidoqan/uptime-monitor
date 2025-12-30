'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Monitor, Timer, AlertTriangle, Key, Globe } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const navigation = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Monitors',
    url: '/monitors',
    icon: Monitor,
  },
  {
    title: 'Cron Jobs',
    url: '/cron-jobs',
    icon: Timer,
  },
  {
    title: 'Incidents',
    url: '/incidents',
    icon: AlertTriangle,
  },
  {
    title: 'Status Pages',
    url: '/status-pages',
    icon: Globe,
  },
  {
    title: 'API Tokens',
    url: '/api-tokens',
    icon: Key,
  },
];

interface AppSidebarProps {
  user: {
    email: string;
    image?: string | null;
  } | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <Sidebar className="hidden lg:flex">
      <SidebarHeader className="border-b">
        <Link href="/" className="flex items-center gap-2 px-4 py-3 hover:opacity-80 transition-opacity">
          <Image 
            src="/android-chrome-192x192.png" 
            alt="CronUptime Logo" 
            width={24} 
            height={24}
            className="rounded-sm"
          />
          <span className="font-semibold">CronUptime</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        {/* User bilgisi server-side'dan geliyor - anında gösterilir */}
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {user.image ? (
                <Image
                  src={user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {user.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.email}
                </p>
              </div>
              <ThemeToggle />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

