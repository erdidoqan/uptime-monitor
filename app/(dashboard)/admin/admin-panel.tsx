'use client';

import { useState } from 'react';
import { ShieldCheck, Users, UserX, ShieldAlert, MousePointerClick, Megaphone, MessageSquare } from 'lucide-react';
import { AdminUsers } from './admin-users';
import { AdminGuests } from './admin-guests';
import { AdminDomainAbuse } from './admin-domain-abuse';
import { AdminBrowserTests } from './admin-browser-tests';
import { AdminTrafficCampaigns } from './admin-traffic-campaigns';
import { AdminContactMessages } from './admin-contact-messages';

type Tab = 'users' | 'guests' | 'browser-tests' | 'traffic-campaigns' | 'contact-messages' | 'domain-abuse';

const tabs: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'users', label: 'Kullanıcılar', icon: Users },
  { value: 'guests', label: 'Misafirler', icon: UserX },
  { value: 'browser-tests', label: 'Trafik Gönderimleri', icon: MousePointerClick },
  { value: 'traffic-campaigns', label: 'Kampanyalar', icon: Megaphone },
  { value: 'contact-messages', label: 'Mesajlar', icon: MessageSquare },
  { value: 'domain-abuse', label: 'Domain İstismar', icon: ShieldAlert },
];

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Kullanıcı ve sistem yönetimi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border mb-6 overflow-x-auto">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'guests' && <AdminGuests />}
      {activeTab === 'browser-tests' && <AdminBrowserTests />}
      {activeTab === 'traffic-campaigns' && <AdminTrafficCampaigns />}
      {activeTab === 'contact-messages' && <AdminContactMessages />}
      {activeTab === 'domain-abuse' && <AdminDomainAbuse />}
    </div>
  );
}
