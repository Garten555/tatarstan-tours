import { redirect } from 'next/navigation';
import { getAdminViewer } from '@/lib/admin/get-admin-viewer';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminPusherSync from '@/components/admin/AdminPusherSync';
import AdminBodyScrollLock from '@/components/admin/AdminBodyScrollLock';

// Роли с доступом к админке (guide — панель гида и связанные пункты сайдбара)
const ADMIN_ROLES = ['super_admin', 'tour_admin', 'support_admin', 'guide'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getAdminViewer();

  if (!viewer) {
    redirect('/auth');
  }

  const userRole = viewer.role;

  // Проверяем права доступа
  if (!ADMIN_ROLES.includes(userRole)) {
    redirect('/');
  }

  return (
    <div className="admin-shell flex h-dvh min-h-0 overflow-hidden bg-gray-50">
      <AdminBodyScrollLock />
      <AdminPusherSync userId={viewer.userId} />
      {/* Sidebar */}
      <AdminSidebar 
        userRole={userRole}
        userName={`${viewer.firstName} ${viewer.lastName}`.trim()}
        avatarUrl={viewer.avatarUrl}
      />

      {/* Main content — отдельная прокрутка, не зависит от body.overflow */}
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 sm:p-6 md:p-8">
        <div className="max-w-[100%]">
          {children}
        </div>
      </main>
    </div>
  );
}

