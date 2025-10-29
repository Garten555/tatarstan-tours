import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import UserList from '@/components/admin/UserList';

export const metadata = {
  title: 'Users Management - Admin Panel',
  description: 'Manage users and assign roles',
};

export default async function UsersPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем что пользователь - super_admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Получаем всех пользователей
  const { data: users } = await serviceClient
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
        <p className="mt-2 text-gray-600">
          Manage user roles and permissions
        </p>
      </div>

      {/* Список пользователей */}
      <UserList users={users || []} currentUserId={user.id} />
    </div>
  );
}

