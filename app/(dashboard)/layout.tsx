import { redirect } from 'next/navigation';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { ClaimGuestCrons } from './claim-guest-crons';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side'da session al - ilk render'da user bilgisi mevcut olacak
  const session = await auth();

  // Authenticated değilse login'e yönlendir
  if (!session?.user) {
    redirect('/login');
  }

  const user = {
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <SidebarProvider>
      <ClaimGuestCrons />
      <div className="flex min-h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex-1 flex flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
