import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ReviewDetails from '@/components/admin/ReviewDetails';
import { fetchProfilesByIds, mapReviewAuthor, unwrapRelation } from '@/lib/reviews/profile';
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

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

  const { data: review, error } = await serviceClient
    .from('reviews')
    .select(`
      id,
      user_id,
      rating,
      text,
      created_at,
      is_approved,
      is_published,
      is_reported,
      reported_at,
      report_reason,
      author:profiles!reviews_user_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      tours (
        title
      ),
      review_media (
        media_type,
        media_url
      ),
      review_comments (
        id,
        message,
        created_at,
        is_reported,
        report_reason,
        profiles (
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

  const reviewRecord = review as {
    id: string;
    user_id: string;
    rating: number;
    text: string | null;
    created_at: string;
    is_approved: boolean;
    is_published: boolean;
    is_reported: boolean;
    reported_at: string | null;
    report_reason: string | null;
    author?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      avatar_url: string | null;
    }[] | null;
    tours?: { title: string } | { title: string }[] | null;
    review_media?: { media_type: string; media_url: string }[] | null;
    review_comments?: {
      id: string;
      message: string;
      created_at: string;
      is_reported: boolean;
      report_reason: string | null;
      profiles?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        avatar_url: string | null;
        is_banned: boolean | null;
      } | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        avatar_url: string | null;
        is_banned: boolean | null;
      }[] | null;
    }[] | null;
  };

  const profileMap = unwrapRelation(reviewRecord.author)
    ? new Map<string, { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; avatar_url?: string | null }>()
    : await fetchProfilesByIds(serviceClient, [reviewRecord.user_id]);

  const author = mapReviewAuthor(
    reviewRecord.author,
    profileMap.get(reviewRecord.user_id) ?? null,
    reviewRecord.user_id
  );
  const tourData = unwrapRelation(reviewRecord.tours);

  const reviewData = {
    id: reviewRecord.id,
    rating: reviewRecord.rating,
    text: reviewRecord.text,
    created_at: reviewRecord.created_at,
    is_approved: reviewRecord.is_approved,
    is_published: reviewRecord.is_published,
    is_reported: reviewRecord.is_reported,
    reported_at: reviewRecord.reported_at,
    report_reason: reviewRecord.report_reason,
    user_name: author.user_name,
    user_email: author.user_email || null,
    user_avatar_url: author.user_avatar_url,
    tour_title: tourData?.title || null,
    media: (reviewRecord.review_media || []).map((m) => ({
      media_type: (m.media_type === 'image' || m.media_type === 'video' ? m.media_type : 'image') as 'image' | 'video',
      media_url: m.media_url,
    })),
    comments: (reviewRecord.review_comments || []).map((c) => {
      const commentUser = unwrapRelation(c.profiles);
      return {
        id: c.id,
        message: c.message,
        created_at: c.created_at,
        is_reported: c.is_reported,
        report_reason: c.report_reason,
        user: commentUser
          ? {
              id: commentUser.id,
              first_name: commentUser.first_name,
              last_name: commentUser.last_name,
              email: commentUser.email,
              avatar_url: commentUser.avatar_url,
              is_banned: commentUser.is_banned,
            }
          : null,
      };
    }),
  };

  return (
    <div>
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
