import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import UserList from '@/components/admin/UserList';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Управление пользователями - Админ панель',
  description: 'Управление пользователями и назначение ролей',
};

export default async function UsersPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем что пользователь - super_admin или support_admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const typedProfile = (profile ?? null) as { role?: string | null } | null;
  const userRole = typedProfile?.role || 'user';

  if (userRole !== 'super_admin' && userRole !== 'support_admin') {
    redirect('/admin');
  }

  // Получаем всех пользователей с username и данными о бане
  const { data: users } = await serviceClient
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at, avatar_url, username, is_banned, ban_reason, banned_at, ban_until')
    .order('created_at', { ascending: false });

  return (
    <div>
      {/* Заголовок в стиле главной страницы */}
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
            <span className="text-sm font-bold text-emerald-700">Пользователи</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
          Управление пользователями
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Управление ролями и правами пользователей
        </p>
      </div>

      {/* Список пользователей */}
      <UserList users={users || []} currentUserId={user.id} currentUserRole={userRole} />
    </div>
  );
}
