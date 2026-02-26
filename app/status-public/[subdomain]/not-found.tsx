import Link from 'next/link';

export default function StatusPageNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        {/* 404 illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-muted mb-6">
            <span className="text-4xl font-bold text-muted-foreground">404</span>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Durum Sayfası Bulunamadı
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Aradığınız durum sayfası bulunamadı veya devre dışı bırakılmış.
        </p>

        {/* CTA */}
        <div className="space-y-4">
          <a
            href="https://uptimetr.com"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-medium transition-all"
          >
            Durum Sayfanızı Oluşturun
          </a>
          <p className="text-sm text-muted-foreground">
            Servislerinizi izleyin:{' '}
            <a
              href="https://uptimetr.com"
              className="text-purple-500 hover:underline"
            >
              UptimeTR
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
