import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SupportChatAdmin from '@/components/admin/SupportChatAdmin';

export const metadata = {
  title: 'Чат поддержки - Админ панель',
  description: 'Управление чатами поддержки',
};

export default async function AdminChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role ?? 'user';
  if (role !== 'super_admin' && role !== 'support_admin') {
    redirect('/unauthorized');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Чат поддержки</h1>
        <p className="mt-2 text-gray-600">
          Управление сессиями поддержки и общение с пользователями
        </p>
      </div>

      <SupportChatAdmin />
    </div>
  );
}
