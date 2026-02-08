import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ReviewsTable from '@/components/admin/ReviewsTable';
import { Star } from 'lucide-react';

export const metadata = {
  title: 'Отзывы - Админ панель',
  description: 'Модерация отзывов',
};

export default async function ReviewsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Проверяем права (support_admin, tour_admin или super_admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const typedProfile = (profile ?? null) as { role?: string | null } | null;
  const userRole = typedProfile?.role || 'user';

  if (!['super_admin', 'support_admin', 'tour_admin'].includes(userRole)) {
    redirect('/admin');
  }

  // Загружаем отзывы
  const { data: reviews, error } = await serviceClient
    .from('reviews')
    .select(`
      id,
      user_id,
      tour_id,
      rating,
      text,
      is_approved,
      is_published,
      is_reported,
      created_at,
      user:profiles!reviews_user_id_fkey(
        first_name,
        last_name,
        email
      ),
      tour:tours!reviews_tour_id_fkey(
        title
      ),
      review_media:review_media(
        media_type,
        media_url
      )
    `)
    .order('created_at', { ascending: false });

  // Преобразуем данные для компонента
  const reviewsData = (reviews || []).map((review: any) => {
    const userData = Array.isArray(review.user) ? review.user[0] : review.user;
    const tourData = Array.isArray(review.tour) ? review.tour[0] : review.tour;
    
    return {
      id: review.id,
      user_id: review.user_id,
      tour_id: review.tour_id,
      rating: review.rating,
      text: review.text,
      is_approved: review.is_approved,
      is_published: review.is_published,
      is_reported: review.is_reported,
      created_at: review.created_at,
      user_name: userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Пользователь' : 'Пользователь',
      user_email: userData?.email || '',
      tour_title: tourData?.title || 'Тур удален',
      media: (review.review_media || []).map((m: any) => ({
        media_type: m.media_type,
        media_url: m.media_url,
      })),
    };
  });

  return (
    <div>
      {/* Заголовок */}
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-yellow-100/50 border border-yellow-200/50 rounded-xl">
            <span className="text-sm font-bold text-yellow-700">Отзывы</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Star className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" />
          Модерация отзывов
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Управление и модерация отзывов пользователей
        </p>
      </div>

      <ReviewsTable initialReviews={reviewsData} />
    </div>
  );
}
