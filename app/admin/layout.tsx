import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';

// Роли с доступом к админке
const ADMIN_ROLES = ['super_admin', 'tour_admin', 'support_admin'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Проверяем авторизацию
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Получаем роль пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single();

  // Явно подстрахуем тип, если генерация типов БД вернула never
  const typedProfile = (profile ?? null) as
    | { role?: string | null; first_name?: string | null; last_name?: string | null }
    | null;
  const userRole = typedProfile?.role || 'user';

  // Проверяем права доступа
  if (!ADMIN_ROLES.includes(userRole)) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar 
        userRole={userRole}
        userName={`${typedProfile?.first_name ?? ''} ${typedProfile?.last_name ?? ''}`}
      />

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}

