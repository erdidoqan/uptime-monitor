import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { PricingCard } from "@/components/static/pricing-card";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for CronUptime. Start for free, upgrade when you need more.",
  alternates: {
    canonical: "https://www.cronuptime.com/pricing",
  },
  openGraph: {
    title: "Pricing - CronUptime",
    description: "Simple, transparent pricing for CronUptime. Start for free, upgrade when you need more.",
  },
};

const pricingPlans = [
  {
    name: "Guest",
    price: "Free",
    description: "Try CronUptime without signing up.",
    features: [
      { text: "1 cron job", included: true },
      { text: "Runs for 7 days", included: true },
      { text: "5, 10, 15, or 30 min intervals", included: true },
      { text: "Basic execution logs", included: true },
      { text: "Email notifications", included: false },
      { text: "Custom headers & body", included: false },
      { text: "API access", included: false },
    ],
    buttonText: "Try Now",
    buttonHref: "/",
    highlighted: false,
  },
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For individual developers getting started.",
    features: [
      { text: "5 cron jobs", included: true },
      { text: "Unlimited duration", included: true },
      { text: "1 minute minimum interval", included: true },
      { text: "30 days log retention", included: true },
      { text: "Email notifications", included: true },
      { text: "Custom headers & body", included: true },
      { text: "API access", included: false },
    ],
    buttonText: "Get Started",
    buttonHref: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For developers and small teams.",
    features: [
      { text: "Unlimited cron jobs", included: true },
      { text: "Unlimited duration", included: true },
      { text: "1 minute minimum interval", included: true },
      { text: "90 days log retention", included: true },
      { text: "Email & webhook notifications", included: true },
      { text: "Custom headers & body", included: true },
      { text: "Full API access", included: true },
    ],
    buttonText: "Coming Soon",
    buttonHref: "#",
    highlighted: true,
    badge: "Popular",
  },
  {
    name: "Team",
    price: "$29",
    period: "/month",
    description: "For growing teams with advanced needs.",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Team collaboration", included: true },
      { text: "Role-based access control", included: true },
      { text: "1 year log retention", included: true },
      { text: "Priority support", included: true },
      { text: "Custom integrations", included: true },
      { text: "SLA guarantee", included: true },
    ],
    buttonText: "Coming Soon",
    buttonHref: "#",
    highlighted: false,
  },
];

const comparisonFeatures = [
  { feature: "Cron Jobs", guest: "1", free: "5", pro: "Unlimited", team: "Unlimited" },
  { feature: "Duration", guest: "7 days", free: "Unlimited", pro: "Unlimited", team: "Unlimited" },
  { feature: "Min Interval", guest: "5 min", free: "1 min", pro: "1 min", team: "1 min" },
  { feature: "Log Retention", guest: "7 days", free: "30 days", pro: "90 days", team: "1 year" },
  { feature: "Email Notifications", guest: "—", free: "✓", pro: "✓", team: "✓" },
  { feature: "Webhook Notifications", guest: "—", free: "—", pro: "✓", team: "✓" },
  { feature: "API Access", guest: "—", free: "—", pro: "✓", team: "✓" },
  { feature: "Team Members", guest: "—", free: "1", pro: "1", team: "Unlimited" },
  { feature: "Support", guest: "Community", free: "Email", pro: "Priority", team: "Dedicated" },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Simple, Transparent Pricing"
        description="Start for free, upgrade when you need more. No hidden fees."
      />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 lg:py-16">
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Compare Plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Guest</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Free</th>
                  <th className="text-center py-4 px-4 text-purple-400 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Team</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4 px-4 text-gray-300">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.guest}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.free}</td>
                    <td className="py-4 px-4 text-center text-gray-300">{row.pro}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            Have questions about our pricing?
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <Check className="h-4 w-4" />
            <a href="/faq" className="hover:underline">
              Check our FAQ
            </a>
            <span className="text-gray-500">or</span>
            <a href="/contact" className="hover:underline">
              Contact us
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

