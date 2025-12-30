import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Changelog",
  description: "See what's new in CronUptime. Latest updates, features, and improvements.",
  alternates: {
    canonical: "https://www.cronuptime.com/changelog",
  },
  openGraph: {
    title: "Changelog - CronUptime",
    description: "See what's new in CronUptime. Latest updates, features, and improvements.",
  },
};

interface ChangelogEntry {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  title: string;
  changes: {
    type: "added" | "improved" | "fixed" | "removed";
    text: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "December 17, 2024",
    type: "minor",
    title: "API Access & Documentation",
    changes: [
      { type: "added", text: "API token management system with scope-based permissions" },
      { type: "added", text: "Complete REST API for monitors, cron jobs, and incidents" },
      { type: "added", text: "Comprehensive API documentation with code examples" },
      { type: "added", text: "Cron expression translator tool" },
      { type: "improved", text: "API authentication with Bearer token support" },
    ],
  },
  {
    version: "1.0.0",
    date: "December 15, 2024",
    type: "major",
    title: "Public Launch",
    changes: [
      { type: "added", text: "Guest cron jobs - try without signing up" },
      { type: "added", text: "Curl command parsing - paste any curl command" },
      { type: "added", text: "Beautiful landing page with live demo" },
      { type: "added", text: "Google OAuth authentication" },
      { type: "added", text: "Terms, Privacy, and About pages" },
      { type: "improved", text: "Dashboard UI with dark mode" },
    ],
  },
  {
    version: "0.9.0",
    date: "December 10, 2024",
    type: "minor",
    title: "Beta Release",
    changes: [
      { type: "added", text: "Cron job scheduling with intervals" },
      { type: "added", text: "Execution logs with response details" },
      { type: "added", text: "Custom headers and request body support" },
      { type: "added", text: "Test request before creating cron jobs" },
      { type: "fixed", text: "Timezone handling for cron expressions" },
    ],
  },
  {
    version: "0.8.0",
    date: "December 5, 2024",
    type: "minor",
    title: "Monitor Dashboard",
    changes: [
      { type: "added", text: "Uptime monitors with configurable checks" },
      { type: "added", text: "Monitor statistics and uptime percentages" },
      { type: "added", text: "Response time graphs" },
      { type: "improved", text: "Navigation and sidebar" },
    ],
  },
  {
    version: "0.5.0",
    date: "November 28, 2024",
    type: "minor",
    title: "Initial Alpha",
    changes: [
      { type: "added", text: "Basic cron job management" },
      { type: "added", text: "Cloudflare Workers scheduler" },
      { type: "added", text: "D1 database integration" },
      { type: "added", text: "User authentication system" },
    ],
  },
];

const typeColors = {
  added: "bg-green-500/20 text-green-400 border-green-500/30",
  improved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fixed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  removed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const versionColors = {
  major: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  minor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  patch: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function ChangelogPage() {
  return (
    <>
      <PageHeader
        title="Changelog"
        description="Stay up to date with the latest updates and improvements."
      />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12 lg:py-16">
        {/* Roadmap teaser */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-2">
            Coming Soon
          </h2>
          <ul className="text-gray-400 space-y-1 text-sm">
            <li>• Email notifications for failed cron jobs</li>
            <li>• Webhook integrations (Slack, Discord)</li>
            <li>• Team collaboration features</li>
            <li>• Advanced monitoring analytics</li>
          </ul>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10 ml-3" />

          {/* Entries */}
          <div className="space-y-12">
            {changelog.map((entry, index) => (
              <div key={index} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#0a0a0b] border-2 border-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                </div>

                {/* Content */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge variant="outline" className={versionColors[entry.type]}>
                      v{entry.version}
                    </Badge>
                    <span className="text-gray-500 text-sm">{entry.date}</span>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-4">
                    {entry.title}
                  </h3>

                  <ul className="space-y-2">
                    {entry.changes.map((change, changeIndex) => (
                      <li key={changeIndex} className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${typeColors[change.type]} text-xs shrink-0 mt-0.5`}
                        >
                          {change.type}
                        </Badge>
                        <span className="text-gray-400 text-sm">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

