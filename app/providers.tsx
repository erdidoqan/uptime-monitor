'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { setApiToken, removeApiToken } from '@/lib/api-client';

function TokenSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.apiToken) {
      setApiToken(session.user.apiToken);
    } else {
      removeApiToken();
    }
  }, [session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <TokenSync />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}

