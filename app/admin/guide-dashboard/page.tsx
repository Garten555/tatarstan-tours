import { redirect } from 'next/navigation';
import { getAdminViewer } from '@/lib/admin/get-admin-viewer';
import GuideDashboardClient from '@/components/admin/GuideDashboardClient';

export const metadata = {
  title: 'Панель гида - Админ панель',
  description: 'Панель управления гида',
};

export default async function GuideDashboard() {
  const viewer = await getAdminViewer();
  if (!viewer) {
    redirect('/auth');
  }

  if (viewer.role !== 'guide') {
    redirect('/admin');
  }

  return <GuideDashboardClient />;
}
