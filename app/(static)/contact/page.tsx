import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { ContactForm } from "@/components/static/contact-form";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "İletişim",
  description: "UptimeTR ekibiyle iletişime geçin. Yardımcı olmak için buradayız.",
  alternates: {
    canonical: "https://www.uptimetr.com/contact",
  },
  openGraph: {
    title: "İletişim - UptimeTR",
    description: "UptimeTR ekibiyle iletişime geçin. Yardımcı olmak için buradayız.",
    url: "https://www.uptimetr.com/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Bize Ulaşın"
        description="Sorularınız veya geri bildirimleriniz mi var? Sizden haber almak isteriz."
      />
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 lg:p-8">
              <h2 className="text-xl font-semibold text-white mb-6">
                Bize mesaj gönderin
              </h2>
              <ContactForm />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <MessageCircle className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white">Hızlı Destek</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Formu doldurarak bize ulaşabilirsiniz. Mesajınız doğrudan ekibimize iletilecek ve en kısa sürede dönüş yapılacaktır.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-semibold text-white mb-3">SSS</h3>
              <p className="text-gray-400 text-sm mb-3">
                Bize ulaşmadan önce cevabınızı SSS&apos;de bulabilirsiniz.
              </p>
              <a
                href="/faq"
                className="text-purple-400 hover:underline text-sm"
              >
                Sık Sorulan Soruları Görüntüle →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
