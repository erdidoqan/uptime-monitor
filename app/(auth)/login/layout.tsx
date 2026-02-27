import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap - UptimeTR",
  description: "UptimeTR hesabınıza giriş yaparak uptime izleme, cron job yönetimi ve trafik gönderimi özelliklerini kullanın.",
  alternates: {
    canonical: "https://www.uptimetr.com/login",
  },
  openGraph: {
    title: "Giriş Yap - UptimeTR",
    description: "UptimeTR hesabınıza giriş yaparak uptime izleme, cron job yönetimi ve trafik gönderimi özelliklerini kullanın.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

