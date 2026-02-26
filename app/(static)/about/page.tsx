import { Metadata } from "next";
import Link from "next/link";
import { PageHeader, ProseContainer } from "@/components/static";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "UptimeTR hakkında bilgi edinin - basit ve güvenilir cron job zamanlama ve uptime izleme.",
  alternates: {
    canonical: "https://www.uptimetr.com/about",
  },
  openGraph: {
    title: "Hakkımızda - UptimeTR",
    description: "UptimeTR hakkında bilgi edinin - basit ve güvenilir cron job zamanlama ve uptime izleme.",
    url: "https://www.uptimetr.com/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="UptimeTR Hakkında"
        description="Geliştiriciler için basit, güvenilir cron job zamanlama ve uptime izleme."
      />
      <ProseContainer>
        <h2>Misyonumuz</h2>
        <p>
          UptimeTR, basit bir sorunu çözmek için oluşturuldu: geliştiricilerin karmaşık 
          altyapı yönetimi olmadan tekrarlayan görevleri zamanlamak ve servislerini 
          izlemek için güvenilir bir yola ihtiyacı var.
        </p>
        <p>
          İzlemenin basit, uygun fiyatlı ve sadece çalışması gerektiğine inanıyoruz. 
          Bu yüzden saniyeler içinde cron job&apos;lar oluşturmanıza olanak tanıyan, 
          sunucu yapılandırması veya karmaşık kurulum gerektirmeyen bir platform oluşturduk.
        </p>

        <h2>Ne Yapıyoruz</h2>
        <p>
          UptimeTR iki temel hizmet sunar:
        </p>
        <ul>
          <li>
            <strong>Cron Job Zamanlama:</strong> Esnek zamanlama seçenekleriyle herhangi 
            bir endpoint&apos;e HTTP istekleri zamanlayın. Webhook&apos;ları tetiklemek, 
            arka plan görevleri çalıştırmak veya servisleri canlı tutmak için mükemmel.
          </li>
          <li>
            <strong>Uptime İzleme:</strong> Web sitelerinizi ve API&apos;lerinizi 7/24 
            izleyin. Bir şeyler ters gittiğinde anında bildirim alın.
          </li>
        </ul>

        <h2>Neden UptimeTR?</h2>
        
        <h3>Basit Kurulum</h3>
        <p>
          30 saniyeden kısa sürede bir cron job oluşturun. URL&apos;nizi (veya bir curl 
          komutu) yapıştırın, zamanlamanızı ayarlayın ve hazırsınız. Karmaşık yapılandırma gerekmez.
        </p>

        <h3>Güvenilir Çalıştırma</h3>
        <p>
          Altyapımız Cloudflare&apos;in global ağı üzerinde çalışır ve cron job&apos;larınızın 
          her seferinde zamanında çalışmasını sağlar. Yeniden denemeleri, zaman aşımlarını 
          ve hata günlüğünü otomatik olarak yönetiyoruz.
        </p>

        <h3>Geliştirici Dostu</h3>
        <p>
          Geliştiriciler tarafından, geliştiriciler için oluşturuldu. Tüm HTTP metodlarını, 
          özel header&apos;ları, istek gövdelerini destekliyoruz ve hata ayıklama için 
          ayrıntılı çalıştırma günlükleri sağlıyoruz.
        </p>

        <h3>Ücretsiz Başlangıç</h3>
        <p>
          Hesap oluşturmadan UptimeTR&apos;yi deneyin. Daha fazla özelliğin kilidini açmak 
          ve cron job&apos;larınızı kalıcı olarak çalıştırmak için Google ile giriş yapın.
        </p>

        <h2>Teknolojimiz</h2>
        <p>
          UptimeTR modern, güvenilir altyapı üzerine kurulmuştur:
        </p>
        <ul>
          <li><strong>Cloudflare Workers:</strong> Edge&apos;de sunucusuz çalıştırma</li>
          <li><strong>Cloudflare D1:</strong> Dağıtılmış SQLite veritabanı</li>
          <li><strong>Cloudflare R2:</strong> Günlükler ve geçmiş için nesne depolama</li>
          <li><strong>Next.js:</strong> Dashboard için React framework&apos;ü</li>
        </ul>

        <h2>Başlayın</h2>
        <p>
          UptimeTR&apos;yi denemeye hazır mısınız? <Link href="/">Ana sayfamıza</Link> gidin 
          ve saniyeler içinde ilk cron job&apos;unuzu oluşturun. İlk job&apos;unuz için 
          kayıt gerekmez!
        </p>
        <p>
          Sorularınız mı var? <Link href="/faq">SSS</Link> sayfamıza göz atın veya{" "}
          <Link href="/contact">bizimle iletişime geçin</Link>.
        </p>
      </ProseContainer>
    </>
  );
}
