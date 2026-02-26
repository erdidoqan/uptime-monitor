import { Metadata } from "next";
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { DashboardWrapper } from './(dashboard)/dashboard-wrapper';
import DashboardPage from './(dashboard)/page';
import { Header, Hero, Features, HowItWorks, Footer } from '@/components/landing';

const baseUrl = "https://www.uptimetr.com";

export const metadata: Metadata = {
  alternates: {
    canonical: baseUrl,
  },
};

export default async function Home() {
  const session = await auth();
  
  // If authenticated, show dashboard with layout
  if (session?.user) {
    const user = {
      email: session.user.email!,
      image: session.user.image ?? null,
    };
    
    return (
      <DashboardWrapper user={user}>
        <DashboardPage />
      </DashboardWrapper>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
