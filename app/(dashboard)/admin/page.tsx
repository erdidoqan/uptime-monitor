import { redirect } from 'next/navigation';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { AdminPanel } from './admin-panel';

const ADMIN_EMAIL = 'erdi.doqan@gmail.com';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user || session.user.email !== ADMIN_EMAIL) {
    redirect('/');
  }

  return <AdminPanel />;
}
