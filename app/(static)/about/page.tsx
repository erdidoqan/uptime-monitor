import { Metadata } from "next";
import Link from "next/link";
import { PageHeader, ProseContainer } from "@/components/static";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about CronUptime - simple and reliable cron job scheduling and uptime monitoring.",
  alternates: {
    canonical: "https://www.cronuptime.com/about",
  },
  openGraph: {
    title: "About CronUptime",
    description: "Learn about CronUptime - simple and reliable cron job scheduling and uptime monitoring.",
  },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About CronUptime"
        description="Simple, reliable cron job scheduling and uptime monitoring for developers."
      />
      <ProseContainer>
        <h2>Our Mission</h2>
        <p>
          CronUptime was built to solve a simple problem: developers need a reliable way 
          to schedule recurring tasks and monitor their services without managing complex 
          infrastructure.
        </p>
        <p>
          We believe monitoring should be simple, affordable, and just work. That&apos;s why 
          we created a platform that lets you set up cron jobs in seconds, without any 
          server configuration or complicated setup.
        </p>

        <h2>What We Do</h2>
        <p>
          CronUptime provides two core services:
        </p>
        <ul>
          <li>
            <strong>Cron Job Scheduling:</strong> Schedule HTTP requests to any endpoint 
            with flexible timing options. Perfect for triggering webhooks, running 
            background tasks, or keeping services alive.
          </li>
          <li>
            <strong>Uptime Monitoring:</strong> Monitor your websites and APIs around 
            the clock. Get notified instantly when something goes wrong.
          </li>
        </ul>

        <h2>Why CronUptime?</h2>
        
        <h3>Simple Setup</h3>
        <p>
          Create a cron job in under 30 seconds. Just paste your URL (or a curl command), 
          set your schedule, and you&apos;re done. No complex configuration needed.
        </p>

        <h3>Reliable Execution</h3>
        <p>
          Our infrastructure runs on Cloudflare&apos;s global network, ensuring your cron jobs 
          execute on time, every time. We handle retries, timeouts, and error logging 
          automatically.
        </p>

        <h3>Developer Friendly</h3>
        <p>
          Built by developers, for developers. We support all HTTP methods, custom headers, 
          request bodies, and provide detailed execution logs for debugging.
        </p>

        <h3>Free to Start</h3>
        <p>
          Try CronUptime without creating an account. Sign in with Google to unlock 
          more features and keep your cron jobs running permanently.
        </p>

        <h2>Our Technology</h2>
        <p>
          CronUptime is built on modern, reliable infrastructure:
        </p>
        <ul>
          <li><strong>Cloudflare Workers:</strong> Serverless execution at the edge</li>
          <li><strong>Cloudflare D1:</strong> Distributed SQLite database</li>
          <li><strong>Cloudflare R2:</strong> Object storage for logs and history</li>
          <li><strong>Next.js:</strong> React framework for the dashboard</li>
        </ul>

        <h2>Get Started</h2>
        <p>
          Ready to try CronUptime? Head to our <Link href="/">homepage</Link> and create your 
          first cron job in seconds. No sign-up required for your first job!
        </p>
        <p>
          Have questions? Check out our <Link href="/faq">FAQ</Link> or{" "}
          <Link href="/contact">contact us</Link>.
        </p>
      </ProseContainer>
    </>
  );
}

