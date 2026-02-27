import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateCampaignForm } from './create-campaign-form';

export default function CreateCampaignPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      <div className="mb-6">
        <Link href="/traffic-campaigns" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="inline mr-2 h-4 w-4" />
          Trafik Kampanyaları
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
        <span className="text-sm font-medium">Kampanya oluştur</span>
      </div>

      <CreateCampaignForm />
    </div>
  );
}
