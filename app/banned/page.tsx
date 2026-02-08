import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import BanAppealForm from '@/components/ban/BanAppealForm';
import { escapeHtml } from '@/lib/utils/sanitize';

export const metadata = {
  title: 'Доступ ограничен',
  description: 'Ваш аккаунт заблокирован',
};

export default async function BannedPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('is_banned, ban_reason, ban_until')
    .eq('id', user.id)
    .single();

  if (!profile?.is_banned) {
    redirect('/profile');
  }

  if (profile.ban_until) {
    const until = new Date(profile.ban_until);
    if (until.getTime() <= Date.now()) {
      await serviceClient
        .from('profiles')
        .update({ is_banned: false, ban_reason: null, ban_until: null, banned_at: null })
        .eq('id', user.id);
      redirect('/profile');
    }
  }

  // Проверяем существующие апелляции
  const { data: appeals } = await serviceClient
    .from('ban_appeals')
    .select('id, status, appeal_text, review_comment, reviewed_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
      <div className="max-w-3xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-red-200 p-6 sm:p-8 md:p-10 lg:p-12">
        <div className="text-center space-y-6 sm:space-y-8">
          {/* Иконка */}
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>

          {/* Заголовок */}
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-3 sm:mb-4 leading-tight">
              Аккаунт заблокирован
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 font-bold leading-relaxed">
              Доступ к вашему аккаунту ограничен
            </p>
          </div>

          {/* Причина бана */}
          {profile.ban_reason && (
            <div className="bg-red-50 border-2 sm:border-4 border-red-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 text-left">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-red-900 mb-3 sm:mb-4">Причина блокировки:</h2>
              <p className="text-base sm:text-lg md:text-xl font-bold text-red-800 leading-7 sm:leading-8 break-words">
                {escapeHtml(profile.ban_reason)}
              </p>
            </div>
          )}

          {/* Информация о сроке бана */}
          <div className="bg-gray-50 border-2 sm:border-4 border-gray-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8">
            {profile.ban_until ? (
              <div>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-700 mb-2 sm:mb-3">Блокировка действует до:</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-900 leading-tight">
                  {new Date(profile.ban_until).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-700 mb-2 sm:mb-3">Тип блокировки:</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-red-600 leading-tight">Блокировка бессрочная</p>
              </div>
            )}
          </div>

          {/* История апелляций */}
          {appeals && appeals.length > 0 && (
            <div className="bg-gray-50 border-2 sm:border-4 border-gray-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 text-left space-y-4 sm:space-y-5">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 mb-4">История апелляций</h2>
              {appeals.map((appeal: any) => (
                <div key={appeal.id} className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-bold ${
                      appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                      appeal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      appeal.status === 'reviewing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {appeal.status === 'approved' ? 'Одобрена' :
                       appeal.status === 'rejected' ? 'Отклонена' :
                       appeal.status === 'reviewing' ? 'На рассмотрении' :
                       'Ожидает рассмотрения'}
                    </span>
                    <span className="text-xs sm:text-sm md:text-base text-gray-600 font-semibold">
                      {new Date(appeal.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-3 sm:mb-4 leading-7 sm:leading-8 break-words">{escapeHtml(appeal.appeal_text)}</p>
                  {appeal.review_comment && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-gray-200">
                      <p className="text-xs sm:text-sm md:text-base font-bold text-gray-700 mb-2">Комментарий модератора:</p>
                      <p className="text-sm sm:text-base md:text-lg text-gray-800 font-semibold leading-7 sm:leading-8 break-words">{escapeHtml(appeal.review_comment)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Форма апелляции */}
          <BanAppealForm hasActiveAppeal={Boolean(appeals?.some((a: any) => ['pending', 'reviewing'].includes(a.status)))} />
        </div>
      </div>
    </div>
  );
}















