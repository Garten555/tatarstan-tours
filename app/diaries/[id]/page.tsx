// Страница просмотра дневника
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar, 
  Eye, 
  Heart, 
  MapPin, 
  User, 
  ArrowLeft,
  Edit,
  Trash2,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { escapeHtml } from '@/lib/utils/sanitize';
import { LikeButton } from '@/components/diaries/LikeButton';

interface DiaryPageProps {
  params: Promise<{ id: string }>;
}

export default async function DiaryPage({ params }: DiaryPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Получаем дневник
  const { data: diary, error } = await serviceClient
    .from('travel_diaries')
    .select(`
      *,
      user:profiles(id, username, avatar_url, public_profile_enabled),
      tour:tours(id, title, slug, cover_image, category)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !diary) {
    notFound();
  }

  // Проверка доступа
  const isOwner = user?.id === diary.user_id;
  const isPublic = diary.status === 'published' && diary.visibility === 'public';

  if (!isOwner && !isPublic) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Доступ ограничен</h2>
          <p className="text-gray-600 mb-6">Этот дневник недоступен для просмотра.</p>
          <Link
            href="/diaries"
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Вернуться к дневникам
          </Link>
        </div>
      </div>
    );
  }

  // Увеличиваем счетчик просмотров (только для опубликованных и не владельца)
  if (!isOwner && diary.status === 'published') {
    const { error: viewsError } = await serviceClient
      .from('travel_diaries')
      .update({ views_count: (diary.views_count || 0) + 1 })
      .eq('id', id);
    if (viewsError) {
      console.error('Error updating views:', viewsError);
    }
  }

  // Проверяем лайк
  let isLiked = false;
  if (user) {
    const { data: like } = await serviceClient
      .from('diary_likes')
      .select('id')
      .eq('diary_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    isLiked = !!like;
  }

  const mediaItems = (diary.media_items as any[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-8">
        {/* Кнопка назад */}
        <Link
          href="/my-diaries"
          className="inline-flex items-center text-emerald-700 hover:text-emerald-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">К моим дневникам</span>
        </Link>

        {/* Обложка */}
        {diary.cover_image_url && (
          <div className="relative h-96 rounded-2xl overflow-hidden mb-8 shadow-xl">
            <Image
              src={diary.cover_image_url}
              alt={escapeHtml(diary.title)}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1 className="text-4xl font-bold mb-2">{escapeHtml(diary.title)}</h1>
              {diary.travel_date && (
                <div className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  {format(new Date(diary.travel_date), 'dd MMMM yyyy', { locale: ru })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основной контент */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {!diary.cover_image_url && (
                <h1 className="text-4xl font-bold text-gray-900 mb-6">
                  {escapeHtml(diary.title)}
                </h1>
              )}

              {/* Метаданные */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-600">
                {diary.travel_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {format(new Date(diary.travel_date), 'dd MMMM yyyy', { locale: ru })}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {diary.views_count || 0} просмотров
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  {diary.likes_count || 0} лайков
                </div>
              </div>

              {/* Содержание */}
              {diary.content && (
                <div 
                  className="prose prose-lg max-w-none mb-8"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(diary.content).replace(/\n/g, '<br />') }}
                />
              )}

              {/* Медиа галерея */}
              {mediaItems.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Фотографии</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaItems.map((item, index) => (
                      <div key={index} className="relative h-48 rounded-xl overflow-hidden group">
                        <Image
                          src={item.url}
                          alt={item.description || `Фото ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                        {item.description && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm">
                            {escapeHtml(item.description)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Действия */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                {user && (
                  <LikeButton diaryId={id} isLiked={isLiked} />
                )}
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
                  <Share2 className="w-5 h-5" />
                  Поделиться
                </button>
                {isOwner && (
                  <>
                    <Link
                      href={`/diaries/${id}/edit`}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                    >
                      <Edit className="w-5 h-5" />
                      Редактировать
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Боковая панель */}
          <div className="lg:col-span-1">
            {/* Автор */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Автор</h3>
              <div className="flex items-center gap-4">
                {diary.user?.avatar_url ? (
                  <Image
                    src={diary.user.avatar_url}
                    alt={escapeHtml(diary.user.username || 'Автор')}
                    width={64}
                    height={64}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl font-bold">
                    {escapeHtml((diary.user?.username || 'А')[0].toUpperCase())}
                  </div>
                )}
                <div>
                  {diary.user?.public_profile_enabled && diary.user?.username ? (
                    <Link
                      href={`/users/${diary.user.username}`}
                      className="font-semibold text-gray-900 hover:text-emerald-600"
                    >
                      {escapeHtml(diary.user.username || 'Пользователь')}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-900">
                      {escapeHtml(diary.user?.username || 'Пользователь')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Связанный тур */}
            {diary.tour && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Связанный тур</h3>
                <Link
                  href={`/tours/${diary.tour.slug}`}
                  className="block group"
                >
                  {diary.tour.cover_image && (
                    <div className="relative h-32 rounded-xl overflow-hidden mb-3">
                      <Image
                        src={diary.tour.cover_image}
                        alt={escapeHtml(diary.tour.title)}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                  )}
                  <h4 className="font-semibold text-gray-900 group-hover:text-emerald-600">
                    {escapeHtml(diary.tour.title)}
                  </h4>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

