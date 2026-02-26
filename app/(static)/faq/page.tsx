import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { FAQAccordion } from "@/components/static/faq-accordion";

export const metadata: Metadata = {
  title: "SSS",
  description: "UptimeTR cron job zamanlama ve uptime izleme hakkında sık sorulan sorular.",
  alternates: {
    canonical: "https://www.uptimetr.com/faq",
  },
  openGraph: {
    title: "SSS - UptimeTR",
    description: "UptimeTR cron job zamanlama ve uptime izleme hakkında sık sorulan sorular.",
    url: "https://www.uptimetr.com/faq",
  },
};

const generalFAQs = [
  {
    question: "UptimeTR nedir?",
    answer: "UptimeTR, cron job zamanlama ve uptime izleme hizmetidir. Kendi sunucularınızı yönetmeden belirli aralıklarla (örneğin her 5 dakikada bir) HTTP istekleri zamanlayabilirsiniz.",
  },
  {
    question: "Hesap oluşturmam gerekiyor mu?",
    answer: "Hayır! Kayıt olmadan bir cron job oluşturabilirsiniz. 7 gün boyunca çalışır. Daha fazla cron job veya kalıcı zamanlama istiyorsanız, Google ile giriş yapabilirsiniz.",
  },
  {
    question: "UptimeTR ücretsiz mi?",
    answer: "Evet, 5 cron job'a kadar ücretsiz bir plan sunuyoruz. Misafir kullanıcılar da 7 gün çalışan 1 cron job ile kayıt olmadan hizmeti deneyebilir.",
  },
  {
    question: "UptimeTR ne kadar güvenilir?",
    answer: "Cloudflare'in %99.9+ uptime'lı global ağı üzerinde çalışıyoruz. Dağıtılmış altyapımız, cron job'larınızın her seferinde zamanında çalışmasını sağlar.",
  },
];

const technicalFAQs = [
  {
    question: "Hangi HTTP metodları destekleniyor?",
    answer: "GET, POST, PUT, PATCH ve DELETE metodlarını destekliyoruz. Kimlik doğrulamalı istekler için özel header'lar ve istek gövdeleri de ekleyebilirsiniz.",
  },
  {
    question: "Curl komutu yapıştırabilir miyim?",
    answer: "Evet! Cron job oluştururken, URL alanına doğrudan bir curl komutu yapıştırabilirsiniz. URL, metod, header'lar ve gövdeyi otomatik olarak çıkaracağız.",
  },
  {
    question: "Minimum aralık nedir?",
    answer: "Misafir kullanıcılar için minimum aralık 5 dakikadır. Kayıtlı ücretsiz kullanıcılar için 1 dakikadır. Pro kullanıcılar daha karmaşık zamanlamalar için cron ifadeleri de kullanabilir.",
  },
  {
    question: "Çalıştırma günlükleri ne kadar süre saklanıyor?",
    answer: "Misafir kullanıcılar: 7 gün. Ücretsiz kullanıcılar: 30 gün. Pro kullanıcılar: 90 gün. Takım kullanıcıları: 1 yıl. Günlükler yanıt durumu, süre ve yanıt gövdesini (10KB'ye kesilmiş) içerir.",
  },
  {
    question: "Endpoint'im yavaşsa ne olur?",
    answer: "Tüm istekler için 30 saniyelik bir zaman aşımı var. Endpoint'iniz bu süre içinde yanıt vermezse, çalıştırmayı başarısız olarak işaretleyeceğiz ve bir zaman aşımı hatası kaydedeceğiz.",
  },
  {
    question: "Webhook ve bildirimleri destekliyor musunuz?",
    answer: "Ücretsiz kullanıcılar hatalar için e-posta bildirimleri alır. Pro kullanıcılar ayrıca Slack, Discord veya kendi sistemlerinizle entegre olabilmeniz için webhook bildirimleri de alır.",
  },
];

const billingFAQs = [
  {
    question: "Pro ve Takım planları ne zaman kullanılabilir olacak?",
    answer: "Şu anda Ücretsiz planımızla beta aşamasındayız. Pro ve Takım planları yakında kullanılabilir olacak. Başlatıldığında bildirim almak için bültenimize kaydolun.",
  },
  {
    question: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
    answer: "Ücretli planlar başlatıldığında, Stripe üzerinden tüm büyük kredi kartlarını kabul edeceğiz. Talebe göre PayPal ve diğer ödeme yöntemlerini de destekleyebiliriz.",
  },
  {
    question: "Aboneliğimi istediğim zaman iptal edebilir miyim?",
    answer: "Evet, istediğiniz zaman iptal edebilirsiniz. Cron job'larınız fatura döneminizin sonuna kadar çalışmaya devam edecek, ardından ücretsiz plan limitlerine düşecek.",
  },
];

export default function FAQPage() {
  return (
    <>
      <PageHeader
        title="Sık Sorulan Sorular"
        description="UptimeTR hakkında sık sorulan soruların cevaplarını bulun."
      />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* General */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">Genel</h2>
          <FAQAccordion items={generalFAQs} />
        </section>

        {/* Technical */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">Teknik</h2>
          <FAQAccordion items={technicalFAQs} />
        </section>

        {/* Billing */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6">Faturalandırma ve Planlar</h2>
          <FAQAccordion items={billingFAQs} />
        </section>

        {/* Still have questions */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <h3 className="text-lg font-semibold text-white mb-3">
            Hâlâ sorularınız mı var?
          </h3>
          <p className="text-gray-400 mb-4">
            Aradığınızı bulamıyor musunuz? Yardımcı olmak için buradayız.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Bize Ulaşın
          </a>
        </div>
      </div>
    </>
  );
}
