'use client';

import { useState } from 'react';
import { ShieldCheck, Users, UserX, ShieldAlert } from 'lucide-react';
import { AdminUsers } from './admin-users';
import { AdminGuests } from './admin-guests';
import { AdminDomainAbuse } from './admin-domain-abuse';

type Tab = 'users' | 'guests' | 'domain-abuse';

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
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border mb-6 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Kullanıcılar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'guests'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserX className="h-4 w-4" />
          Misafirler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('domain-abuse')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'domain-abuse'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Domain İstismar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'guests' && <AdminGuests />}
      {activeTab === 'domain-abuse' && <AdminDomainAbuse />}
    </div>
  );
}
