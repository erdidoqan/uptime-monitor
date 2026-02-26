'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Activity, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WelcomeCardProps {
  hasMonitors: boolean;
  hasCronJobs: boolean;
}

interface TaskItem {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  buttonText?: string;
  buttonHref?: string;
}

export function WelcomeCard({ hasMonitors, hasCronJobs }: WelcomeCardProps) {
  const { data: session } = useSession();
  const userImage = session?.user?.image;
  const userName = session?.user?.name;

  const tasks: TaskItem[] = [
    {
      id: 1,
      title: 'Hesap oluşturun',
      description: 'E-posta, fatura bilgileri ve daha fazlasını güncellemek için hesabınızı yönetebilirsiniz.',
      completed: true, // Always completed since user is logged in
    },
    {
      id: 2,
      title: 'Monitör kurun',
      description: 'Web sitelerinizin ve API\'lerinizin uptime\'ını takip etmek için monitör ekleyin.',
      completed: hasMonitors,
      buttonText: 'Monitör Oluştur',
      buttonHref: '/monitors/create',
    },
    {
      id: 3,
      title: 'Cron Job çalıştırın',
      description: 'Belirli aralıklarla çalışacak HTTP istekleri zamanlayın.',
      completed: hasCronJobs,
      buttonText: 'Cron Job Oluştur',
      buttonHref: '/cron-jobs',
    },
  ];

  return (
    <Card className="border bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        {/* User Avatar */}
        <div className="mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-[2px]">
            <div className="w-full h-full rounded-xl bg-background flex items-center justify-center overflow-hidden">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName || 'Kullanıcı avatarı'}
                  width={60}
                  height={60}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Activity className="h-8 w-8" />
              )}
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-semibold mb-2">UptimeTR&apos;ye Hoş Geldiniz!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Deneyiminizden en iyi şekilde yararlanmak için bu adımları izleyin. Servislerinizi takip edin, cron job&apos;lar zamanlayın ve sistem sağlığını izleyin.
        </p>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex gap-3">
              {/* Status Indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {task.completed ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">{task.id}</span>
                  </div>
                )}
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium mb-0.5">{task.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                
                {/* Action Button - only show if not completed */}
                {!task.completed && task.buttonText && task.buttonHref && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    asChild
                  >
                    <Link href={task.buttonHref}>{task.buttonText}</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
