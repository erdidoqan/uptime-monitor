import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function StaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}






















