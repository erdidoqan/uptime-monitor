import { StatusPageEdit } from './status-page-edit';

export default async function StatusPageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Sayfa hemen render edilir, data client-side'da progressive yüklenir
  return <StatusPageEdit statusPageId={id} />;
}
