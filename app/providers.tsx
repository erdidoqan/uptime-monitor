'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setApiToken, removeApiToken } from '@/lib/api-client';
import { trackRegistration } from '@/lib/analytics';

// Use useLayoutEffect on client, useEffect on server (SSR safety)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const REGISTRATION_KEY = 'uptimetr_registered';

function TokenSync() {
  const { data: session, status } = useSession();
  const hasTrackedRegistration = useRef(false);

  // Use layout effect to sync token before paint/render
  // This ensures token is available before other components make API calls
  useIsomorphicLayoutEffect(() => {
    if (status === 'authenticated' && session?.user?.apiToken) {
      setApiToken(session.user.apiToken);
    } else if (status === 'unauthenticated') {
      removeApiToken();
    }
  }, [session, status]);

  // Track registration for new users (CompleteRegistration event)
  useEffect(() => {
    if (
      status === 'authenticated' && 
      session?.user?.id && 
      !hasTrackedRegistration.current
    ) {
      // Check if user has registered before
      const hasRegistered = localStorage.getItem(REGISTRATION_KEY);
      
      if (!hasRegistered) {
        // First time user - track registration event
        trackRegistration({
          method: 'google',
          userId: session.user.id,
        });
        localStorage.setItem(REGISTRATION_KEY, 'true');
      }
      
      hasTrackedRegistration.current = true;
    }
  }, [status, session]);

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

