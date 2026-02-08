import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import BanAppealsList from '@/components/admin/BanAppealsList';
import { AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Апелляции на бан - Админ панель',
  description: 'Рассмотрение апелляций на бан',
};

export default async function BanAppealsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

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

  // Получаем все апелляции
  const { data: appeals } = await serviceClient
    .from('ban_appeals')
    .select(`
      *,
      user:profiles!ban_appeals_user_id_fkey(
        id,
        email,
        first_name,
        last_name,
        avatar_url,
        is_banned,
        ban_reason,
        banned_at,
        ban_until
      ),
      reviewer:profiles!ban_appeals_reviewed_by_fkey(
        id,
        email,
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div>
      {/* Заголовок */}
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
            <span className="text-sm font-bold text-emerald-700">Апелляции</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <AlertCircle className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
          Апелляции на бан
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Рассмотрение апелляций от забаненных пользователей
        </p>
      </div>

      {/* Список апелляций */}
      <BanAppealsList appeals={appeals || []} currentUserId={user.id} />
    </div>
  );
}

