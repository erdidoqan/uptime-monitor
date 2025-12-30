'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function ClaimGuestCrons() {
  const { data: session } = useSession();
  const claimedRef = useRef(false);

  useEffect(() => {
    // Only run once per session
    if (claimedRef.current || !session?.user?.apiToken) {
      return;
    }

    // Check if we've already claimed in this browser session
    const claimedKey = `claimed_guest_crons_${session.user.id}`;
    if (sessionStorage.getItem(claimedKey)) {
      claimedRef.current = true;
      return;
    }

    const claimGuestCrons = async () => {
      try {
        const response = await fetch('/api/cron-jobs/claim-guest', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.user.apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.claimed > 0) {
            console.log(`Claimed ${data.claimed} guest cron job(s)`);
            // Optionally trigger a refresh of the cron jobs list
            window.dispatchEvent(new CustomEvent('cron-jobs-updated'));
          }
        }
      } catch (error) {
        console.error('Failed to claim guest cron jobs:', error);
      } finally {
        claimedRef.current = true;
        sessionStorage.setItem(claimedKey, 'true');
      }
    };

    claimGuestCrons();
  }, [session]);

  // This component doesn't render anything
  return null;
}

