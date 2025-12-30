'use client';

import Image from 'next/image';

export function StatusFooter() {
  return (
    <footer className="mt-12 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <a
            href="https://cronuptime.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Powered by</span>
            <Image
              src="/android-chrome-192x192.png"
              alt="CronUptime"
              width={20}
              height={20}
              className="rounded"
            />
            <span className="font-semibold bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
              CronUptime
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
