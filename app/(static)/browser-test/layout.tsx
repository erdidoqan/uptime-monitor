import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gerçek Trafik - Sitenize Gerçek Kullanıcılar Gönderin",
  description:
    "Sitenize gerçek ziyaretçiler gönderin. Google Analytics'te organik kullanıcı olarak görünürler.",
  alternates: {
    canonical: "https://www.uptimetr.com/browser-test",
  },
  openGraph: {
    title: "Gerçek Trafik Gönderin - UptimeTR",
    description:
      "Sitenize gerçek ziyaretçiler gönderin. GA'da organik kullanıcı olarak görünürler.",
    url: "https://www.uptimetr.com/browser-test",
  },
};

export default function BrowserTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
