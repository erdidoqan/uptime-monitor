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
import { LayoutDashboard, Monitor, Timer, AlertTriangle, Key, Globe, Settings, ShieldCheck, Megaphone } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const ADMIN_EMAIL = 'erdi.doqan@gmail.com';

const navigation = [
  {
    title: 'Panel',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Monitörler',
    url: '/monitors',
    icon: Monitor,
  },
  {
    title: 'Cron Job\'lar',
    url: '/cron-jobs',
    icon: Timer,
  },
  {
    title: 'Olaylar',
    url: '/incidents',
    icon: AlertTriangle,
  },
  {
    title: 'Trafik Kampanyaları',
    url: '/traffic-campaigns',
    icon: Megaphone,
  },
  {
    title: 'Durum Sayfaları',
    url: '/status-pages',
    icon: Globe,
  },
  {
    title: 'API Anahtarları',
    url: '/api-tokens',
    icon: Key,
  },
  {
    title: 'Ayarlar',
    url: '/settings',
    icon: Settings,
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
    <Sidebar>
      <SidebarHeader className="border-b">
        <Link href="/" className="flex items-center gap-2 px-4 py-3 hover:opacity-80 transition-opacity">
          <Image 
            src="/android-chrome-192x192.png" 
            alt="UptimeTR Logo" 
            width={24} 
            height={24}
            className="rounded-sm"
          />
          <span className="font-semibold">UptimeTR</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigasyon</SidebarGroupLabel>
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
              {user?.email === ADMIN_EMAIL && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin')}
                  >
                    <Link href="/admin">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
                  alt="Profil"
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
              Çıkış Yap
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
