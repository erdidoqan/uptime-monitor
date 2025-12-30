import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { FAQAccordion } from "@/components/static/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about CronUptime cron job scheduling and uptime monitoring.",
  alternates: {
    canonical: "https://www.cronuptime.com/faq",
  },
  openGraph: {
    title: "FAQ - CronUptime",
    description: "Frequently asked questions about CronUptime cron job scheduling and uptime monitoring.",
  },
};

const generalFAQs = [
  {
    question: "What is CronUptime?",
    answer: "CronUptime is a cron job scheduling and uptime monitoring service. You can schedule HTTP requests to run at specific intervals (like every 5 minutes) without managing your own servers.",
  },
  {
    question: "Do I need to create an account?",
    answer: "No! You can create one cron job without signing up. It will run for 7 days. If you want more cron jobs or permanent scheduling, you can sign in with Google.",
  },
  {
    question: "Is CronUptime free?",
    answer: "Yes, we offer a free tier with up to 5 cron jobs. Guest users can also try the service without signing up, with 1 cron job that runs for 7 days.",
  },
  {
    question: "How reliable is CronUptime?",
    answer: "We run on Cloudflare's global network with 99.9%+ uptime. Our distributed infrastructure ensures your cron jobs execute on time, every time.",
  },
];

const technicalFAQs = [
  {
    question: "What HTTP methods are supported?",
    answer: "We support GET, POST, PUT, PATCH, and DELETE methods. You can also add custom headers and request bodies for authenticated requests.",
  },
  {
    question: "Can I paste a curl command?",
    answer: "Yes! When creating a cron job, you can paste a curl command directly into the URL field. We'll automatically extract the URL, method, headers, and body.",
  },
  {
    question: "What's the minimum interval?",
    answer: "For guest users, the minimum interval is 5 minutes. For registered free users, it's 1 minute. Pro users can also use cron expressions for more complex schedules.",
  },
  {
    question: "How long are execution logs kept?",
    answer: "Guest users: 7 days. Free users: 30 days. Pro users: 90 days. Team users: 1 year. Logs include response status, duration, and response body (truncated to 10KB).",
  },
  {
    question: "What happens if my endpoint is slow?",
    answer: "We have a 30-second timeout for all requests. If your endpoint doesn't respond within that time, we'll mark the execution as failed and log a timeout error.",
  },
  {
    question: "Do you support webhooks and notifications?",
    answer: "Free users get email notifications for failures. Pro users also get webhook notifications so you can integrate with Slack, Discord, or your own systems.",
  },
];

const billingFAQs = [
  {
    question: "When will Pro and Team plans be available?",
    answer: "We're currently in beta with our Free tier. Pro and Team plans will be available soon. Sign up for our newsletter to be notified when they launch.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "When paid plans launch, we'll accept all major credit cards through Stripe. We may also support PayPal and other payment methods based on demand.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel at any time. Your cron jobs will continue running until the end of your billing period, then downgrade to the free tier limits.",
  },
];

export default function FAQPage() {
  return (
    <>
      <PageHeader
        title="Frequently Asked Questions"
        description="Find answers to common questions about CronUptime."
      />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* General */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">General</h2>
          <FAQAccordion items={generalFAQs} />
        </section>

        {/* Technical */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">Technical</h2>
          <FAQAccordion items={technicalFAQs} />
        </section>

        {/* Billing */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">Billing & Plans</h2>
          <FAQAccordion items={billingFAQs} />
        </section>

        {/* Still have questions */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <h3 className="text-lg font-semibold text-white mb-3">
            Still have questions?
          </h3>
          <p className="text-gray-400 mb-4">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </>
  );
}

