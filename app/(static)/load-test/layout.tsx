import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yük Testi - Website ve API Load Test",
  description:
    "Website veya API'nize anlık 1k–100k istek gönderin. Kayıtsız 1k–3k ücretsiz; giriş yapın 5k–100k. UptimeTR.",
  alternates: {
    canonical: "https://www.uptimetr.com/load-test",
  },
  openGraph: {
    title: "Yük Testi - UptimeTR",
    description:
      "Website veya API'nize anlık yük testi. 1k–100k istek. Kayıtsız ücretsiz deneyin.",
    url: "https://www.uptimetr.com/load-test",
  },
};

export default function LoadTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
