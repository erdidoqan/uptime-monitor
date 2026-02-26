import Link from "next/link";
import Image from "next/image";
import { GoogleSignInButton } from "./google-sign-in-button";

const footerLinks = {
  product: {
    title: "Ürün",
    links: [
      { name: "Özellikler", href: "#features" },
      { name: "Nasıl Çalışır", href: "#how-it-works" },
      { name: "Fiyatlandırma", href: "/pricing" },
      { name: "SSS", href: "/faq" },
    ],
  },
  resources: {
    title: "Kaynaklar",
    links: [
      { name: "API Dokümantasyonu", href: "/api-docs" },
      { name: "Durum", href: "/status" },
      { name: "Değişiklik Günlüğü", href: "/changelog" },
      { name: "İletişim", href: "/contact" },
    ],
  },
  company: {
    title: "Şirket",
    links: [
      { name: "Hakkımızda", href: "/about" },
      { name: "Kullanım Şartları", href: "/terms" },
      { name: "Gizlilik", href: "/privacy" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0b]">
      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            <span className="gradient-text">İzlemeye</span> başlamaya hazır mısınız?
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Saniyeler içinde ilk monitörünüzü oluşturun. Kredi kartı gerekmez.
          </p>
          <GoogleSignInButton className="px-8 py-3 text-base" />
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image 
                src="/android-chrome-192x192.png" 
                alt="UptimeTR Logo" 
                width={32} 
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-white tracking-tight">UptimeTR</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Basit, güvenilir uptime izleme ve bildirim servisi.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{footerLinks.product.title}</h4>
            <ul className="space-y-3">
              {footerLinks.product.links.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{footerLinks.resources.title}</h4>
            <ul className="space-y-3">
              {footerLinks.resources.links.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{footerLinks.company.title}</h4>
            <ul className="space-y-3">
              {footerLinks.company.links.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} UptimeTR. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/status" className="text-sm text-gray-500 hover:text-white transition-colors">
              Durum
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
