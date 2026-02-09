import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ReviewDetails from '@/components/admin/ReviewDetails';
import { Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Детали отзыва - Админ панель',
  description: 'Детальная информация об отзыве',
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Загружаем отзыв с комментариями
  const { data: review, error } = await serviceClient
    .from('reviews')
    .select(`
      id,
      rating,
      text,
      created_at,
      is_approved,
      is_published,
      is_reported,
      reported_at,
      report_reason,
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
      ),
      review_comments:review_comments(
        id,
        message,
        created_at,
        is_reported,
        report_reason,
        user:profiles!review_comments_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          is_banned
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !review) {
    notFound();
  }

  // Преобразуем данные для компонента
  const userData = Array.isArray(review.user) ? review.user[0] : review.user;
  const tourData = Array.isArray(review.tour) ? review.tour[0] : review.tour;
  
  const reviewData = {
    id: review.id,
    rating: review.rating,
    text: review.text,
    created_at: review.created_at,
    is_approved: review.is_approved,
    is_published: review.is_published,
    is_reported: review.is_reported,
    reported_at: review.reported_at,
    report_reason: review.report_reason,
    user_name: userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Пользователь' : 'Пользователь',
    user_email: userData?.email || null,
    tour_title: tourData?.title || null,
    media: (review.review_media || []).map((m: { media_type: 'image' | 'video'; media_url: string }) => ({
      media_type: m.media_type,
      media_url: m.media_url,
    })),
    comments: (review.review_comments || []).map((c: {
      id: string;
      message: string;
      created_at: string;
      is_reported: boolean | null;
      report_reason: string | null;
      user: Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        avatar_url: string | null;
        is_banned: boolean | null;
      }> | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        avatar_url: string | null;
        is_banned: boolean | null;
      } | null;
    }) => {
      const commentUser = Array.isArray(c.user) ? c.user[0] : c.user;
      return {
        id: c.id,
        message: c.message,
        created_at: c.created_at,
        is_reported: c.is_reported,
        report_reason: c.report_reason,
        user: commentUser ? {
          id: commentUser.id,
          first_name: commentUser.first_name,
          last_name: commentUser.last_name,
          email: commentUser.email,
          avatar_url: commentUser.avatar_url,
          is_banned: commentUser.is_banned,
        } : null,
      };
    }),
  };

  return (
    <div>
      {/* Заголовок */}
      <div className="mb-8 py-6">
        <Link
          href="/admin/reviews"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold">Назад к списку отзывов</span>
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-yellow-100/50 border border-yellow-200/50 rounded-xl">
            <span className="text-sm font-bold text-yellow-700">Детали отзыва</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Star className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" />
          Детали отзыва
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Подробная информация и модерация отзыва
        </p>
      </div>

      <ReviewDetails review={reviewData} />
    </div>
  );
}
