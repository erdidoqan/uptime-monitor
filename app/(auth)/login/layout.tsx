import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to CronUptime to manage your cron jobs and uptime monitors.",
  alternates: {
    canonical: "https://www.cronuptime.com/login",
  },
  openGraph: {
    title: "Login - CronUptime",
    description: "Sign in to CronUptime to manage your cron jobs and uptime monitors.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

