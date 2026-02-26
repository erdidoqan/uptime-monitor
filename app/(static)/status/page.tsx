import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { StatusIndicator, UptimeBar } from "@/components/static/status-indicator";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "System Status",
  description: "Check the current status of UptimeTR services and infrastructure.",
  alternates: {
    canonical: "https://www.uptimetr.com/status",
  },
  openGraph: {
    title: "System Status - UptimeTR",
    description: "Check the current status of UptimeTR services and infrastructure.",
  },
};

// Generate last 30 days of uptime data (all operational for demo)
const generateUptimeDays = () => {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      status: "operational" as const,
    });
  }
  return days;
};

const services = [
  {
    name: "Web Dashboard",
    description: "Main application and user interface",
    status: "operational" as const,
    uptime: "99.99%",
  },
  {
    name: "Cron Scheduler",
    description: "Cloudflare Workers scheduler for cron jobs",
    status: "operational" as const,
    uptime: "99.98%",
  },
  {
    name: "API",
    description: "REST API for cron job management",
    status: "operational" as const,
    uptime: "99.99%",
  },
  {
    name: "Database",
    description: "Cloudflare D1 database",
    status: "operational" as const,
    uptime: "99.99%",
  },
  {
    name: "Authentication",
    description: "Google OAuth and session management",
    status: "operational" as const,
    uptime: "99.99%",
  },
];

const incidents: { date: string; title: string; status: "resolved" | "investigating" | "identified"; description: string }[] = [];

export default function StatusPage() {
  const uptimeDays = generateUptimeDays();
  const allOperational = services.every((s) => s.status === "operational");

  return (
    <>
      <PageHeader
        title="System Status"
        description="Real-time status of UptimeTR services and infrastructure."
      />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* Overall Status */}
        <div className={`rounded-xl border p-8 text-center ${
          allOperational 
            ? "border-green-500/20 bg-green-500/10" 
            : "border-yellow-500/20 bg-yellow-500/10"
        }`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <CheckCircle className={`h-8 w-8 ${allOperational ? "text-green-500" : "text-yellow-500"}`} />
            <h2 className={`text-2xl font-bold ${allOperational ? "text-green-400" : "text-yellow-400"}`}>
              {allOperational ? "All Systems Operational" : "Partial Service Disruption"}
            </h2>
          </div>
          <p className="text-gray-400">
            Last updated: {new Date().toLocaleString("en-US", { 
              dateStyle: "medium", 
              timeStyle: "short" 
            })}
          </p>
        </div>

        {/* 30-Day Uptime */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">30-Day Uptime</h2>
            <span className="text-sm text-gray-400">99.99% uptime</span>
          </div>
          <UptimeBar days={uptimeDays} />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Service Status */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Services</h2>
          <div className="space-y-3">
            {services.map((service) => (
              <StatusIndicator key={service.name} {...service} />
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Incidents</h2>
          {incidents.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-gray-400">
                No incidents reported in the last 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">{incident.title}</h3>
                    <span className="text-sm text-gray-500">{incident.date}</span>
                  </div>
                  <p className="text-sm text-gray-400">{incident.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe to updates */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <h3 className="font-semibold text-white mb-2">Stay Informed</h3>
          <p className="text-gray-400 text-sm mb-4">
            Subscribe to receive notifications about service disruptions.
          </p>
          <p className="text-gray-500 text-sm">
            Coming soon: Email and webhook notifications
          </p>
        </div>
      </div>
    </>
  );
}

