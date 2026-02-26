import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to UptimeTR to manage your cron jobs and uptime monitors.",
  alternates: {
    canonical: "https://www.uptimetr.com/login",
  },
  openGraph: {
    title: "Login - UptimeTR",
    description: "Sign in to UptimeTR to manage your cron jobs and uptime monitors.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

