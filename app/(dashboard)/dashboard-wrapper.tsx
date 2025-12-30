import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

interface DashboardWrapperProps {
  children: React.ReactNode;
  user: {
    email: string;
    image?: string | null;
  };
}

export function DashboardWrapper({ children, user }: DashboardWrapperProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex-1 flex flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
